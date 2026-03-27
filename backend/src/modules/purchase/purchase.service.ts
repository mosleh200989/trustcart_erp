import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceivedNote } from './entities/goods-received-note.entity';
import { GrnItem } from './entities/grn-item.entity';

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

  // ── Helpers ─────────────────────────────────────────

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
}
