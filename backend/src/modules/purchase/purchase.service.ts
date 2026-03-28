import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceivedNote } from './entities/goods-received-note.entity';
import { GrnItem } from './entities/grn-item.entity';
import { StockMovementService } from '../inventory/stock-movement.service';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private poItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(GoodsReceivedNote)
    private grnRepo: Repository<GoodsReceivedNote>,
    @InjectRepository(GrnItem)
    private grnItemRepo: Repository<GrnItem>,
    private dataSource: DataSource,
    private stockMovementService: StockMovementService,
  ) {}

  // ── Purchase Orders ─────────────────────────────────

  async findAll(status?: string): Promise<PurchaseOrder[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.poRepo.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['items'],
    });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({ where: { id }, relations: ['items'] });
    if (!po) throw new NotFoundException(`Purchase order #${id} not found`);
    return po;
  }

  async create(dto: any, userId: number): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const poNumber = await this.generatePoNumber(manager);
      const { items, ...header } = dto;

      const po = manager.create(PurchaseOrder, {
        ...header,
        po_number: poNumber,
        created_by: userId,
        order_date: header.order_date || new Date(),
      });
      const savedPo = await manager.save(PurchaseOrder, po);

      if (items && items.length > 0) {
        let subtotal = 0;
        let totalTax = 0;
        for (const item of items) {
          const lineTotal = item.quantity_ordered * item.unit_price - (item.discount_amount || 0);
          const taxAmt = lineTotal * ((item.tax_rate || 0) / 100);
          subtotal += lineTotal;
          totalTax += taxAmt;

          const poItem = manager.create(PurchaseOrderItem, {
            ...item,
            purchase_order_id: savedPo.id,
            line_total: lineTotal,
            tax_amount: taxAmt,
          });
          await manager.save(PurchaseOrderItem, poItem);
        }
        savedPo.subtotal = subtotal;
        savedPo.tax_amount = totalTax;
        savedPo.total_amount = subtotal + totalTax + (savedPo.shipping_cost || 0) - (savedPo.discount_amount || 0);
        await manager.save(PurchaseOrder, savedPo);
      }

      return this.findOne(savedPo.id);
    });
  }

  async update(id: number, dto: any): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (!['draft', 'rejected'].includes(po.status)) {
      throw new BadRequestException(`Cannot edit purchase order in "${po.status}" status`);
    }
    Object.assign(po, dto);
    await this.poRepo.save(po);
    return this.findOne(id);
  }

  async submitForApproval(id: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status !== 'draft') throw new BadRequestException('Only draft POs can be submitted');
    po.status = 'pending_approval';
    return this.poRepo.save(po);
  }

  async approve(id: number, userId: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status !== 'pending_approval') throw new BadRequestException('PO is not pending approval');
    po.status = 'approved';
    po.approved_by = userId;
    po.approved_at = new Date();
    return this.poRepo.save(po);
  }

  async reject(id: number, userId: number, reason?: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status !== 'pending_approval') throw new BadRequestException('PO is not pending approval');
    po.status = 'rejected';
    po.cancel_reason = reason || '';
    return this.poRepo.save(po);
  }

  async cancel(id: number, userId: number, reason: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (['closed', 'cancelled'].includes(po.status)) throw new BadRequestException('Cannot cancel this PO');
    po.status = 'cancelled';
    po.cancelled_by = userId;
    po.cancelled_at = new Date();
    po.cancel_reason = reason;
    return this.poRepo.save(po);
  }

  async remove(id: number): Promise<{ message: string }> {
    const po = await this.findOne(id);
    if (po.status !== 'draft') throw new BadRequestException('Only draft POs can be deleted');
    await this.poRepo.remove(po);
    return { message: `Purchase order #${id} deleted` };
  }

  // ── GRN ─────────────────────────────────────────────

  async findAllGrns(poId?: number): Promise<GoodsReceivedNote[]> {
    const where: any = {};
    if (poId) where.purchase_order_id = poId;
    return this.grnRepo.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['items'],
    });
  }

  async findOneGrn(id: number): Promise<GoodsReceivedNote> {
    const grn = await this.grnRepo.findOne({ where: { id }, relations: ['items'] });
    if (!grn) throw new NotFoundException(`GRN #${id} not found`);
    return grn;
  }

  async createGrn(dto: any, userId: number): Promise<GoodsReceivedNote> {
    return this.dataSource.transaction(async (manager) => {
      // Validate PO if linked
      if (dto.purchase_order_id) {
        const po = await manager.findOne(PurchaseOrder, {
          where: { id: dto.purchase_order_id },
        });
        if (!po) throw new NotFoundException(`Purchase order #${dto.purchase_order_id} not found`);
        if (!['approved', 'partially_received'].includes(po.status)) {
          throw new BadRequestException(`Cannot receive goods for PO in "${po.status}" status`);
        }
      }

      const grnNumber = await this.generateGrnNumber(manager);
      const { items, ...header } = dto;

      const grn = manager.create(GoodsReceivedNote, {
        ...header,
        grn_number: grnNumber,
        received_by: userId,
        received_date: header.received_date || new Date(),
        status: 'draft',
      });
      const savedGrn = await manager.save(GoodsReceivedNote, grn);

      if (items && items.length > 0) {
        for (const item of items) {
          const grnItem = manager.create(GrnItem, {
            ...item,
            grn_id: savedGrn.id,
            quantity_accepted: item.quantity_accepted ?? 0,
            quantity_rejected: item.quantity_rejected ?? 0,
          });
          await manager.save(GrnItem, grnItem);
        }
      }

      return this.findOneGrn(savedGrn.id);
    });
  }

  async updateGrn(id: number, dto: any): Promise<GoodsReceivedNote> {
    const grn = await this.findOneGrn(id);
    if (grn.status !== 'draft') {
      throw new BadRequestException(`Cannot edit GRN in "${grn.status}" status`);
    }
    const { items, ...header } = dto;
    Object.assign(grn, header);
    await this.grnRepo.save(grn);
    return this.findOneGrn(id);
  }

  async acceptGrn(id: number, userId: number): Promise<GoodsReceivedNote> {
    return this.dataSource.transaction(async (manager) => {
      const grn = await manager.findOne(GoodsReceivedNote, {
        where: { id },
        relations: ['items'],
      });
      if (!grn) throw new NotFoundException(`GRN #${id} not found`);
      if (!['draft', 'pending_qc'].includes(grn.status)) {
        throw new BadRequestException(`Cannot accept GRN in "${grn.status}" status`);
      }

      // 1. Process each accepted item
      for (const item of grn.items) {
        const acceptedQty = item.quantity_accepted || item.quantity_received;
        if (acceptedQty <= 0) continue;

        // Create stock batch if batch_number provided
        let batchId: number | undefined;
        if (item.batch_number) {
          const batchResult = await manager.query(
            `INSERT INTO stock_batches 
             (batch_number, lot_number, product_id, variant_key, supplier_id, purchase_order_id, grn_id, warehouse_id,
              manufacturing_date, expiry_date, received_date, initial_quantity, remaining_quantity, cost_price, status, quality_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, $11, $11, $12, 'available', 'accepted')
             RETURNING id`,
            [
              item.batch_number,
              item.lot_number || null,
              item.product_id,
              item.variant_key || null,
              grn.supplier_id,
              grn.purchase_order_id || null,
              grn.id,
              grn.warehouse_id,
              item.manufacturing_date || null,
              item.expiry_date || null,
              acceptedQty,
              item.unit_cost,
            ],
          );
          batchId = batchResult[0]?.id;
        }

        // Record stock movement (receipt)
        await this.stockMovementService.recordMovement({
          movement_type: 'receipt',
          product_id: item.product_id,
          variant_key: item.variant_key || undefined,
          batch_id: batchId,
          destination_warehouse_id: grn.warehouse_id,
          destination_location_id: item.location_id || undefined,
          quantity: acceptedQty,
          unit_cost: Number(item.unit_cost),
          reason: `GRN ${grn.grn_number} accepted`,
          notes: item.quality_notes || undefined,
          related_document_type: 'grn',
          related_document_id: grn.id,
          performed_by: userId,
        });

        // Update product.stock_quantity
        await manager.query(
          `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + $1 WHERE id = $2`,
          [acceptedQty, item.product_id],
        );

        // Update PO item quantity_received if linked
        if (item.po_item_id) {
          await manager.query(
            `UPDATE purchase_order_items SET quantity_received = COALESCE(quantity_received, 0) + $1 WHERE id = $2`,
            [acceptedQty, item.po_item_id],
          );
        }
      }

      // 2. Update GRN status
      grn.status = 'accepted';
      grn.quality_checked_by = userId;
      grn.quality_checked_at = new Date();
      await manager.save(GoodsReceivedNote, grn);

      // 3. Update PO status based on received quantities
      if (grn.purchase_order_id) {
        await this.updatePoStatusAfterGrn(manager, grn.purchase_order_id);
      }

      return this.findOneGrn(id);
    });
  }

  async rejectGrn(id: number, userId: number, reason?: string): Promise<GoodsReceivedNote> {
    const grn = await this.findOneGrn(id);
    if (!['draft', 'pending_qc'].includes(grn.status)) {
      throw new BadRequestException(`Cannot reject GRN in "${grn.status}" status`);
    }
    grn.status = 'rejected';
    grn.quality_checked_by = userId;
    grn.quality_checked_at = new Date();
    if (reason) grn.notes = (grn.notes ? grn.notes + '\n' : '') + `Rejection reason: ${reason}`;
    return this.grnRepo.save(grn);
  }

  async duplicatePo(id: number, userId: number): Promise<PurchaseOrder> {
    const original = await this.findOne(id);
    return this.create(
      {
        supplier_id: original.supplier_id,
        warehouse_id: original.warehouse_id,
        expected_delivery_date: null,
        priority: original.priority,
        payment_terms: original.payment_terms,
        notes: original.notes,
        items: original.items.map((item) => ({
          product_id: item.product_id,
          variant_key: item.variant_key,
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount_amount: item.discount_amount,
        })),
      },
      userId,
    );
  }

  // ── Helpers ─────────────────────────────────────────

  private async updatePoStatusAfterGrn(manager: any, poId: number): Promise<void> {
    const po = await manager.findOne(PurchaseOrder, {
      where: { id: poId },
      relations: ['items'],
    });
    if (!po) return;

    const allFullyReceived = po.items.every(
      (item: PurchaseOrderItem) => Number(item.quantity_received) >= Number(item.quantity_ordered),
    );
    const anyReceived = po.items.some(
      (item: PurchaseOrderItem) => Number(item.quantity_received) > 0,
    );

    if (allFullyReceived) {
      po.status = 'closed';
      po.actual_delivery_date = new Date();
    } else if (anyReceived) {
      po.status = 'partially_received';
    }

    await manager.save(PurchaseOrder, po);
  }

  private async generatePoNumber(manager: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${dateStr}-`;

    const last = await manager
      .createQueryBuilder(PurchaseOrder, 'po')
      .where('po.po_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('po.po_number', 'DESC')
      .getOne();

    let seq = 1;
    if (last) {
      const parts = last.po_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }

  private async generateGrnNumber(manager: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `GRN-${dateStr}-`;

    const last = await manager
      .createQueryBuilder(GoodsReceivedNote, 'g')
      .where('g.grn_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('g.grn_number', 'DESC')
      .getOne();

    let seq = 1;
    if (last) {
      const parts = last.grn_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }
}
