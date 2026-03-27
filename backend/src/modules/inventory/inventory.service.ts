import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockLevel } from './entities/stock-level.entity';
import { StockBatch } from './entities/stock-batch.entity';
import { StockAlert } from './entities/stock-alert.entity';
import { ReorderRule } from './entities/reorder-rule.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import { StockAdjustmentItem } from './entities/stock-adjustment-item.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferItem } from './entities/stock-transfer-item.entity';
import { InventoryCount } from './entities/inventory-count.entity';
import { InventoryCountItem } from './entities/inventory-count-item.entity';
import { StockQueryDto } from './dto/stock-query.dto';
import { CreateReorderRuleDto } from './dto/create-reorder-rule.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CreateInventoryCountDto, RecordCountItemDto } from './dto/create-inventory-count.dto';
import { StockMovementService } from './stock-movement.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockLevel)
    private stockLevelRepo: Repository<StockLevel>,
    @InjectRepository(StockBatch)
    private batchRepo: Repository<StockBatch>,
    @InjectRepository(StockAlert)
    private alertRepo: Repository<StockAlert>,
    @InjectRepository(ReorderRule)
    private reorderRepo: Repository<ReorderRule>,
    @InjectRepository(StockAdjustment)
    private adjustmentRepo: Repository<StockAdjustment>,
    @InjectRepository(StockAdjustmentItem)
    private adjustmentItemRepo: Repository<StockAdjustmentItem>,
    @InjectRepository(StockTransfer)
    private transferRepo: Repository<StockTransfer>,
    @InjectRepository(StockTransferItem)
    private transferItemRepo: Repository<StockTransferItem>,
    @InjectRepository(InventoryCount)
    private countRepo: Repository<InventoryCount>,
    @InjectRepository(InventoryCountItem)
    private countItemRepo: Repository<InventoryCountItem>,
    private dataSource: DataSource,
    private stockMovementService: StockMovementService,
  ) {}

  // ── Stock Levels ────────────────────────────────────

  async getStockLevels(query: StockQueryDto): Promise<StockLevel[]> {
    const where: any = {};
    if (query.product_id) where.product_id = query.product_id;
    if (query.warehouse_id) where.warehouse_id = query.warehouse_id;
    if (query.location_id) where.location_id = query.location_id;
    if (query.batch_id) where.batch_id = query.batch_id;
    return this.stockLevelRepo.find({ where, order: { updated_at: 'DESC' } });
  }

  async getStockByProduct(productId: number): Promise<StockLevel[]> {
    return this.stockLevelRepo.find({
      where: { product_id: productId },
      order: { warehouse_id: 'ASC' },
    });
  }

  async getStockByWarehouse(warehouseId: number): Promise<StockLevel[]> {
    return this.stockLevelRepo.find({
      where: { warehouse_id: warehouseId },
      order: { product_id: 'ASC' },
    });
  }

  async getStockSummary(): Promise<any[]> {
    return this.stockLevelRepo
      .createQueryBuilder('sl')
      .select('sl.product_id', 'product_id')
      .addSelect('sl.variant_key', 'variant_key')
      .addSelect('SUM(sl.quantity)', 'total_quantity')
      .addSelect('SUM(sl.reserved_quantity)', 'total_reserved')
      .addSelect('SUM(sl.quantity - sl.reserved_quantity)', 'total_available')
      .groupBy('sl.product_id')
      .addGroupBy('sl.variant_key')
      .orderBy('sl.product_id', 'ASC')
      .getRawMany();
  }

  // ── Stock Batches ───────────────────────────────────

  async getBatches(productId?: number, warehouseId?: number): Promise<StockBatch[]> {
    const where: any = {};
    if (productId) where.product_id = productId;
    if (warehouseId) where.warehouse_id = warehouseId;
    return this.batchRepo.find({ where, order: { expiry_date: 'ASC' } });
  }

  async getBatch(id: number): Promise<StockBatch> {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch #${id} not found`);
    return batch;
  }

  async getExpiringBatches(daysAhead: number = 30): Promise<StockBatch[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.batchRepo
      .createQueryBuilder('b')
      .where('b.expiry_date <= :cutoff', { cutoff })
      .andWhere('b.status = :status', { status: 'available' })
      .andWhere('b.remaining_quantity > 0')
      .orderBy('b.expiry_date', 'ASC')
      .getMany();
  }

  // ── Stock Alerts ────────────────────────────────────

  async getAlerts(unreadOnly: boolean = false): Promise<StockAlert[]> {
    const where: any = {};
    if (unreadOnly) where.is_read = false;
    return this.alertRepo.find({ where, order: { created_at: 'DESC' }, take: 100 });
  }

  async markAlertRead(id: number): Promise<StockAlert> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert #${id} not found`);
    alert.is_read = true;
    return this.alertRepo.save(alert);
  }

  async resolveAlert(id: number, userId: number, notes?: string): Promise<StockAlert> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert #${id} not found`);
    alert.is_resolved = true;
    alert.resolved_by = userId;
    alert.resolved_at = new Date();
    if (notes) alert.resolution_notes = notes;
    return this.alertRepo.save(alert);
  }

  // ── Reorder Rules ──────────────────────────────────

  async getReorderRules(productId?: number): Promise<ReorderRule[]> {
    const where: any = {};
    if (productId) where.product_id = productId;
    return this.reorderRepo.find({ where, order: { product_id: 'ASC' } });
  }

  async createReorderRule(dto: CreateReorderRuleDto): Promise<ReorderRule> {
    const entity = this.reorderRepo.create(dto);
    return this.reorderRepo.save(entity);
  }

  async updateReorderRule(id: number, dto: Partial<CreateReorderRuleDto>): Promise<ReorderRule> {
    const rule = await this.reorderRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Reorder rule #${id} not found`);
    Object.assign(rule, dto);
    return this.reorderRepo.save(rule);
  }

  async removeReorderRule(id: number): Promise<{ message: string }> {
    const rule = await this.reorderRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Reorder rule #${id} not found`);
    await this.reorderRepo.remove(rule);
    return { message: `Reorder rule #${id} deleted` };
  }

  // ══════════════════════════════════════════════════════
  // ── Stock Adjustments ───────────────────────────────
  // ══════════════════════════════════════════════════════

  async getAdjustments(filters?: { status?: string; warehouse_id?: number; adjustment_type?: string }): Promise<StockAdjustment[]> {
    const qb = this.adjustmentRepo.createQueryBuilder('a').leftJoinAndSelect('a.items', 'items');
    if (filters?.status) qb.andWhere('a.status = :status', { status: filters.status });
    if (filters?.warehouse_id) qb.andWhere('a.warehouse_id = :wid', { wid: filters.warehouse_id });
    if (filters?.adjustment_type) qb.andWhere('a.adjustment_type = :type', { type: filters.adjustment_type });
    qb.orderBy('a.created_at', 'DESC');
    return qb.getMany();
  }

  async getAdjustment(id: number): Promise<StockAdjustment> {
    const adj = await this.adjustmentRepo.findOne({ where: { id }, relations: ['items'] });
    if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
    return adj;
  }

  async createAdjustment(dto: CreateStockAdjustmentDto, userId: number): Promise<StockAdjustment> {
    return this.dataSource.transaction(async (manager) => {
      const adjNumber = await this.generateAdjustmentNumber(manager);
      const adjustment = manager.create(StockAdjustment, {
        adjustment_number: adjNumber,
        warehouse_id: dto.warehouse_id,
        adjustment_type: dto.adjustment_type,
        status: 'draft',
        reason: dto.reason,
        notes: dto.notes,
        created_by: userId,
      });
      const savedAdj = await manager.save(StockAdjustment, adjustment);

      let totalValueImpact = 0;
      for (const item of dto.items) {
        const valueImpact = (item.unit_cost || 0) * item.quantity_change;
        totalValueImpact += valueImpact;
        const adjItem = manager.create(StockAdjustmentItem, {
          adjustment_id: savedAdj.id,
          product_id: item.product_id,
          variant_key: item.variant_key,
          batch_id: item.batch_id,
          location_id: item.location_id,
          quantity_before: item.quantity_before,
          quantity_after: item.quantity_after,
          quantity_change: item.quantity_change,
          unit_cost: item.unit_cost,
          value_impact: valueImpact,
          reason: item.reason,
        });
        await manager.save(StockAdjustmentItem, adjItem);
      }

      savedAdj.total_value_impact = totalValueImpact;
      await manager.save(StockAdjustment, savedAdj);
      return this.getAdjustment(savedAdj.id);
    });
  }

  async updateAdjustment(id: number, dto: Partial<CreateStockAdjustmentDto>): Promise<StockAdjustment> {
    const adj = await this.adjustmentRepo.findOne({ where: { id } });
    if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
    if (adj.status !== 'draft') throw new BadRequestException('Only draft adjustments can be edited');
    Object.assign(adj, {
      warehouse_id: dto.warehouse_id ?? adj.warehouse_id,
      adjustment_type: dto.adjustment_type ?? adj.adjustment_type,
      reason: dto.reason ?? adj.reason,
      notes: dto.notes ?? adj.notes,
    });
    await this.adjustmentRepo.save(adj);
    return this.getAdjustment(id);
  }

  async submitAdjustment(id: number): Promise<StockAdjustment> {
    const adj = await this.adjustmentRepo.findOne({ where: { id }, relations: ['items'] });
    if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
    if (adj.status !== 'draft') throw new BadRequestException('Only draft adjustments can be submitted');

    // Auto-approve expiry and recount types
    if (['expiry', 'recount'].includes(adj.adjustment_type)) {
      return this.applyAdjustment(adj, adj.created_by);
    }

    adj.status = 'pending_approval';
    await this.adjustmentRepo.save(adj);
    return this.getAdjustment(id);
  }

  async approveAdjustment(id: number, userId: number): Promise<StockAdjustment> {
    const adj = await this.adjustmentRepo.findOne({ where: { id }, relations: ['items'] });
    if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
    if (adj.status !== 'pending_approval') throw new BadRequestException('Adjustment is not pending approval');
    return this.applyAdjustment(adj, userId);
  }

  async rejectAdjustment(id: number, userId: number, reason?: string): Promise<StockAdjustment> {
    const adj = await this.adjustmentRepo.findOne({ where: { id } });
    if (!adj) throw new NotFoundException(`Adjustment #${id} not found`);
    if (adj.status !== 'pending_approval') throw new BadRequestException('Adjustment is not pending approval');
    adj.status = 'rejected';
    adj.rejected_by = userId;
    adj.rejected_at = new Date();
    adj.rejection_reason = reason || '';
    await this.adjustmentRepo.save(adj);
    return this.getAdjustment(id);
  }

  private async applyAdjustment(adj: StockAdjustment, userId: number): Promise<StockAdjustment> {
    return this.dataSource.transaction(async (manager) => {
      for (const item of adj.items) {
        const movementType = item.quantity_change > 0 ? 'adjustment_increase' : 'adjustment_decrease';
        await this.stockMovementService.recordMovement({
          movement_type: movementType,
          product_id: item.product_id,
          variant_key: item.variant_key || undefined,
          batch_id: item.batch_id || undefined,
          source_warehouse_id: item.quantity_change < 0 ? adj.warehouse_id : undefined,
          source_location_id: item.quantity_change < 0 ? (item.location_id || undefined) : undefined,
          destination_warehouse_id: item.quantity_change > 0 ? adj.warehouse_id : undefined,
          destination_location_id: item.quantity_change > 0 ? (item.location_id || undefined) : undefined,
          quantity: Math.abs(item.quantity_change),
          unit_cost: item.unit_cost ? Number(item.unit_cost) : undefined,
          reason: item.reason || adj.reason,
          related_document_type: 'stock_adjustment',
          related_document_id: adj.id,
          performed_by: userId,
        });

        // Sync product.stock_quantity
        await manager.query(
          `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + $1 WHERE id = $2`,
          [item.quantity_change, item.product_id],
        );
      }

      adj.status = 'approved';
      adj.approved_by = userId;
      adj.approved_at = new Date();
      await manager.save(StockAdjustment, adj);
      return this.getAdjustment(adj.id);
    });
  }

  private async generateAdjustmentNumber(manager: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ADJ-${dateStr}-`;
    const last = await manager
      .createQueryBuilder(StockAdjustment, 'a')
      .where('a.adjustment_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('a.adjustment_number', 'DESC')
      .getOne();
    let seq = 1;
    if (last) {
      const parts = last.adjustment_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }

  // ══════════════════════════════════════════════════════
  // ── Stock Transfers ─────────────────────────────────
  // ══════════════════════════════════════════════════════

  async getTransfers(filters?: { status?: string; warehouse_id?: number }): Promise<StockTransfer[]> {
    const qb = this.transferRepo.createQueryBuilder('t').leftJoinAndSelect('t.items', 'items');
    if (filters?.status) qb.andWhere('t.status = :status', { status: filters.status });
    if (filters?.warehouse_id) {
      qb.andWhere('(t.source_warehouse_id = :wid OR t.destination_warehouse_id = :wid)', { wid: filters.warehouse_id });
    }
    qb.orderBy('t.created_at', 'DESC');
    return qb.getMany();
  }

  async getTransfer(id: number): Promise<StockTransfer> {
    const t = await this.transferRepo.findOne({ where: { id }, relations: ['items'] });
    if (!t) throw new NotFoundException(`Transfer #${id} not found`);
    return t;
  }

  async createTransfer(dto: CreateStockTransferDto, userId: number): Promise<StockTransfer> {
    if (dto.source_warehouse_id === dto.destination_warehouse_id) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }
    return this.dataSource.transaction(async (manager) => {
      const txNumber = await this.generateTransferNumber(manager);
      const transfer = manager.create(StockTransfer, {
        transfer_number: txNumber,
        source_warehouse_id: dto.source_warehouse_id,
        destination_warehouse_id: dto.destination_warehouse_id,
        status: 'draft',
        priority: dto.priority || 'normal',
        requested_by: userId,
        requested_at: new Date(),
        notes: dto.notes,
      });
      const saved = await manager.save(StockTransfer, transfer);

      for (const item of dto.items) {
        const txItem = manager.create(StockTransferItem, {
          transfer_id: saved.id,
          product_id: item.product_id,
          variant_key: item.variant_key,
          batch_id: item.batch_id,
          quantity_requested: item.quantity_requested,
          quantity_shipped: 0,
          quantity_received: 0,
          source_location_id: item.source_location_id,
          destination_location_id: item.destination_location_id,
          notes: item.notes,
        });
        await manager.save(StockTransferItem, txItem);
      }
      return this.getTransfer(saved.id);
    });
  }

  async updateTransfer(id: number, dto: Partial<CreateStockTransferDto>): Promise<StockTransfer> {
    const t = await this.transferRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Transfer #${id} not found`);
    if (t.status !== 'draft') throw new BadRequestException('Only draft transfers can be edited');
    Object.assign(t, {
      priority: dto.priority ?? t.priority,
      notes: dto.notes ?? t.notes,
    });
    await this.transferRepo.save(t);
    return this.getTransfer(id);
  }

  async approveTransfer(id: number, userId: number): Promise<StockTransfer> {
    const t = await this.transferRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Transfer #${id} not found`);
    if (t.status !== 'draft' && t.status !== 'pending_approval') {
      throw new BadRequestException('Transfer cannot be approved from current status');
    }
    t.status = 'approved';
    t.approved_by = userId;
    t.approved_at = new Date();
    await this.transferRepo.save(t);
    return this.getTransfer(id);
  }

  async shipTransfer(id: number, userId: number, shipData?: { items?: Array<{ id: number; quantity_shipped: number }> }): Promise<StockTransfer> {
    const t = await this.transferRepo.findOne({ where: { id }, relations: ['items'] });
    if (!t) throw new NotFoundException(`Transfer #${id} not found`);
    if (t.status !== 'approved') throw new BadRequestException('Only approved transfers can be shipped');

    return this.dataSource.transaction(async (manager) => {
      for (const item of t.items) {
        const shipped = shipData?.items?.find(si => si.id === item.id)?.quantity_shipped ?? item.quantity_requested;
        item.quantity_shipped = shipped;
        await manager.save(StockTransferItem, item);

        if (shipped > 0) {
          await this.stockMovementService.recordMovement({
            movement_type: 'transfer_out',
            product_id: item.product_id,
            variant_key: item.variant_key || undefined,
            batch_id: item.batch_id || undefined,
            source_warehouse_id: t.source_warehouse_id,
            source_location_id: item.source_location_id || undefined,
            quantity: shipped,
            reason: `Transfer ${t.transfer_number}`,
            related_document_type: 'stock_transfer',
            related_document_id: t.id,
            performed_by: userId,
          });

          await manager.query(
            `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) - $1 WHERE id = $2`,
            [shipped, item.product_id],
          );
        }
      }

      t.status = 'in_transit';
      t.shipped_by = userId;
      t.shipped_at = new Date();
      await manager.save(StockTransfer, t);
      return this.getTransfer(id);
    });
  }

  async receiveTransfer(id: number, userId: number, receiveData?: { items?: Array<{ id: number; quantity_received: number }> }): Promise<StockTransfer> {
    const t = await this.transferRepo.findOne({ where: { id }, relations: ['items'] });
    if (!t) throw new NotFoundException(`Transfer #${id} not found`);
    if (t.status !== 'in_transit') throw new BadRequestException('Only in-transit transfers can be received');

    return this.dataSource.transaction(async (manager) => {
      for (const item of t.items) {
        const received = receiveData?.items?.find(ri => ri.id === item.id)?.quantity_received ?? item.quantity_shipped;
        item.quantity_received = received;
        await manager.save(StockTransferItem, item);

        if (received > 0) {
          await this.stockMovementService.recordMovement({
            movement_type: 'transfer_in',
            product_id: item.product_id,
            variant_key: item.variant_key || undefined,
            batch_id: item.batch_id || undefined,
            destination_warehouse_id: t.destination_warehouse_id,
            destination_location_id: item.destination_location_id || undefined,
            quantity: received,
            reason: `Transfer ${t.transfer_number}`,
            related_document_type: 'stock_transfer',
            related_document_id: t.id,
            performed_by: userId,
          });

          await manager.query(
            `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + $1 WHERE id = $2`,
            [received, item.product_id],
          );
        }
      }

      t.status = 'received';
      t.received_by = userId;
      t.received_at = new Date();
      await manager.save(StockTransfer, t);
      return this.getTransfer(id);
    });
  }

  async cancelTransfer(id: number, userId: number): Promise<StockTransfer> {
    const t = await this.transferRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Transfer #${id} not found`);
    if (['received', 'cancelled'].includes(t.status)) {
      throw new BadRequestException('Transfer cannot be cancelled');
    }
    t.status = 'cancelled';
    await this.transferRepo.save(t);
    return this.getTransfer(id);
  }

  private async generateTransferNumber(manager: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ST-${dateStr}-`;
    const last = await manager
      .createQueryBuilder(StockTransfer, 't')
      .where('t.transfer_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.transfer_number', 'DESC')
      .getOne();
    let seq = 1;
    if (last) {
      const parts = last.transfer_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }

  // ══════════════════════════════════════════════════════
  // ── Inventory Counts ────────────────────────────────
  // ══════════════════════════════════════════════════════

  async getCounts(filters?: { status?: string; warehouse_id?: number; count_type?: string }): Promise<InventoryCount[]> {
    const qb = this.countRepo.createQueryBuilder('c').leftJoinAndSelect('c.items', 'items');
    if (filters?.status) qb.andWhere('c.status = :status', { status: filters.status });
    if (filters?.warehouse_id) qb.andWhere('c.warehouse_id = :wid', { wid: filters.warehouse_id });
    if (filters?.count_type) qb.andWhere('c.count_type = :type', { type: filters.count_type });
    qb.orderBy('c.created_at', 'DESC');
    return qb.getMany();
  }

  async getCount(id: number): Promise<InventoryCount> {
    const c = await this.countRepo.findOne({ where: { id }, relations: ['items'] });
    if (!c) throw new NotFoundException(`Inventory count #${id} not found`);
    return c;
  }

  async createCount(dto: CreateInventoryCountDto, userId: number): Promise<InventoryCount> {
    return this.dataSource.transaction(async (manager) => {
      const countNumber = await this.generateCountNumber(manager);
      const count = manager.create(InventoryCount, {
        count_number: countNumber,
        warehouse_id: dto.warehouse_id,
        count_type: dto.count_type,
        scope_zone_id: dto.scope_zone_id,
        scope_category_id: dto.scope_category_id,
        status: 'planned',
        started_by: userId,
        notes: dto.notes,
      });
      const saved = await manager.save(InventoryCount, count);

      // Pre-populate items if provided (e.g. spot count with specific products)
      if (dto.items?.length) {
        for (const it of dto.items) {
          // Look up current system quantity
          const sl = await manager.findOne(StockLevel, {
            where: { product_id: it.product_id, warehouse_id: dto.warehouse_id },
          });
          const countItem = manager.create(InventoryCountItem, {
            count_id: saved.id,
            product_id: it.product_id,
            variant_key: it.variant_key,
            location_id: it.location_id,
            batch_id: it.batch_id,
            system_quantity: sl?.quantity ?? 0,
            counted_quantity: 0,
            status: 'pending',
          });
          await manager.save(InventoryCountItem, countItem);
        }
      }

      return this.getCount(saved.id);
    });
  }

  async startCount(id: number, userId: number): Promise<InventoryCount> {
    const c = await this.countRepo.findOne({ where: { id }, relations: ['items'] });
    if (!c) throw new NotFoundException(`Inventory count #${id} not found`);
    if (c.status !== 'planned') throw new BadRequestException('Only planned counts can be started');

    // If no items yet (full/cycle), populate from stock levels for that warehouse
    if (!c.items?.length) {
      const qb = this.stockLevelRepo.createQueryBuilder('sl')
        .where('sl.warehouse_id = :wid', { wid: c.warehouse_id })
        .andWhere('sl.quantity > 0');
      const levels = await qb.getMany();

      for (const sl of levels) {
        const countItem = this.countItemRepo.create({
          count_id: c.id,
          product_id: sl.product_id,
          variant_key: sl.variant_key,
          location_id: sl.location_id,
          batch_id: sl.batch_id,
          system_quantity: sl.quantity,
          counted_quantity: 0,
          status: 'pending',
        });
        await this.countItemRepo.save(countItem);
      }
    }

    c.status = 'in_progress';
    c.started_at = new Date();
    c.started_by = userId;
    await this.countRepo.save(c);
    return this.getCount(id);
  }

  async recordCountItems(id: number, userId: number, items: RecordCountItemDto[]): Promise<InventoryCount> {
    const c = await this.countRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Inventory count #${id} not found`);
    if (c.status !== 'in_progress') throw new BadRequestException('Count must be in progress to record items');

    for (const dto of items) {
      // Find or create the count item
      let countItem = await this.countItemRepo.findOne({
        where: { count_id: id, product_id: dto.product_id, location_id: dto.location_id ?? undefined as any },
      });

      if (countItem) {
        countItem.counted_quantity = dto.counted_quantity;
        countItem.counted_by = userId;
        countItem.counted_at = new Date();
        countItem.variance_reason = dto.variance_reason || countItem.variance_reason;
        countItem.status = 'counted';
      } else {
        const sl = await this.stockLevelRepo.findOne({
          where: { product_id: dto.product_id, warehouse_id: c.warehouse_id },
        });
        countItem = this.countItemRepo.create({
          count_id: id,
          product_id: dto.product_id,
          variant_key: dto.variant_key,
          location_id: dto.location_id,
          batch_id: dto.batch_id,
          system_quantity: sl?.quantity ?? 0,
          counted_quantity: dto.counted_quantity,
          counted_by: userId,
          counted_at: new Date(),
          variance_reason: dto.variance_reason,
          status: 'counted',
        });
      }
      await this.countItemRepo.save(countItem);
    }

    return this.getCount(id);
  }

  async completeCount(id: number): Promise<InventoryCount> {
    const c = await this.countRepo.findOne({ where: { id }, relations: ['items'] });
    if (!c) throw new NotFoundException(`Inventory count #${id} not found`);
    if (c.status !== 'in_progress') throw new BadRequestException('Only in-progress counts can be completed');

    // Calculate totals
    let counted = 0;
    let variances = 0;
    let varianceValue = 0;
    for (const item of c.items) {
      if (item.status === 'counted' || item.status === 'verified') {
        counted++;
        const variance = item.counted_quantity - item.system_quantity;
        if (variance !== 0) {
          variances++;
          varianceValue += Math.abs(variance) * (Number(item.variance_value) || 0);
        }
      }
    }

    c.status = 'pending_review';
    c.completed_at = new Date();
    c.total_items_counted = counted;
    c.total_variances = variances;
    c.total_variance_value = varianceValue;
    await this.countRepo.save(c);
    return this.getCount(id);
  }

  async approveCount(id: number, userId: number): Promise<InventoryCount> {
    const c = await this.countRepo.findOne({ where: { id }, relations: ['items'] });
    if (!c) throw new NotFoundException(`Inventory count #${id} not found`);
    if (c.status !== 'pending_review') throw new BadRequestException('Only completed counts pending review can be approved');

    return this.dataSource.transaction(async (manager) => {
      // For each item with variance, create adjustment movements
      for (const item of c.items) {
        const variance = item.counted_quantity - item.system_quantity;
        if (variance === 0) continue;

        const movementType = variance > 0 ? 'count_adjustment' : 'count_adjustment';
        await this.stockMovementService.recordMovement({
          movement_type: variance > 0 ? 'adjustment_increase' : 'adjustment_decrease',
          product_id: item.product_id,
          variant_key: item.variant_key || undefined,
          batch_id: item.batch_id || undefined,
          source_warehouse_id: variance < 0 ? c.warehouse_id : undefined,
          source_location_id: variance < 0 ? (item.location_id || undefined) : undefined,
          destination_warehouse_id: variance > 0 ? c.warehouse_id : undefined,
          destination_location_id: variance > 0 ? (item.location_id || undefined) : undefined,
          quantity: Math.abs(variance),
          reason: `Inventory count ${c.count_number}: ${item.variance_reason || 'count variance'}`,
          related_document_type: 'inventory_count',
          related_document_id: c.id,
          performed_by: userId,
        });

        // Update product.stock_quantity
        await manager.query(
          `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + $1 WHERE id = $2`,
          [variance, item.product_id],
        );

        item.status = 'approved';
        await manager.save(InventoryCountItem, item);
      }

      c.status = 'approved';
      c.approved_by = userId;
      c.approved_at = new Date();
      await manager.save(InventoryCount, c);
      return this.getCount(id);
    });
  }

  private async generateCountNumber(manager: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `IC-${dateStr}-`;
    const last = await manager
      .createQueryBuilder(InventoryCount, 'c')
      .where('c.count_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('c.count_number', 'DESC')
      .getOne();
    let seq = 1;
    if (last) {
      const parts = last.count_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }
}
