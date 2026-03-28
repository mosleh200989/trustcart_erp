import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
import { StockReservation } from './entities/stock-reservation.entity';
import { DemandForecast } from './entities/demand-forecast.entity';
import * as bwipjs from 'bwip-js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger('InventoryService');
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
    @InjectRepository(StockReservation)
    private reservationRepo: Repository<StockReservation>,
    @InjectRepository(DemandForecast)
    private forecastRepo: Repository<DemandForecast>,
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

  // ── Phase 4: Sales Integration & Real-Time Stock ────────────────

  /**
   * 4.5 Public availability check for a product (storefront).
   * Returns total available across warehouses, per-variant breakdown, and earliest expiry.
   */
  async checkAvailability(productId: number): Promise<any> {
    // Aggregate stock across warehouses
    const levels = await this.stockLevelRepo.find({ where: { product_id: productId } });
    const warehouseMap: Record<number, { warehouse_id: number; available: number }> = {};
    const variantMap: Record<string, number> = {};
    let totalAvailable = 0;

    for (const sl of levels) {
      const avail = Math.max(0, (sl.quantity || 0) - (sl.reserved_quantity || 0));
      totalAvailable += avail;

      // Per-warehouse
      if (!warehouseMap[sl.warehouse_id]) {
        warehouseMap[sl.warehouse_id] = { warehouse_id: sl.warehouse_id, available: 0 };
      }
      warehouseMap[sl.warehouse_id].available += avail;

      // Per-variant
      const vk = sl.variant_key || '__base__';
      variantMap[vk] = (variantMap[vk] || 0) + avail;
    }

    // Earliest expiring available batch
    const earliestBatch = await this.batchRepo
      .createQueryBuilder('b')
      .where('b.product_id = :pid', { pid: productId })
      .andWhere('b.status = :s', { s: 'available' })
      .andWhere('b.remaining_quantity > 0')
      .andWhere('b.expiry_date IS NOT NULL')
      .orderBy('b.expiry_date', 'ASC')
      .getOne();

    const variants = Object.entries(variantMap)
      .filter(([k]) => k !== '__base__')
      .map(([variant_key, available]) => ({
        variant_key,
        available,
        is_in_stock: available > 0,
      }));

    return {
      product_id: productId,
      total_available: totalAvailable,
      is_in_stock: totalAvailable > 0,
      variants: variants.length > 0 ? variants : undefined,
      warehouses: Object.values(warehouseMap),
      earliest_expiry: earliestBatch?.expiry_date || null,
    };
  }

  /**
   * 4.5 Bulk availability check for multiple products (storefront cart validation).
   */
  async checkBulkAvailability(productIds: number[]): Promise<any[]> {
    if (!productIds.length) return [];
    const levels = await this.stockLevelRepo
      .createQueryBuilder('sl')
      .where('sl.product_id IN (:...ids)', { ids: productIds })
      .getMany();

    const map: Record<number, number> = {};
    for (const sl of levels) {
      const avail = Math.max(0, (sl.quantity || 0) - (sl.reserved_quantity || 0));
      map[sl.product_id] = (map[sl.product_id] || 0) + avail;
    }

    return productIds.map(pid => ({
      product_id: pid,
      available: map[pid] || 0,
      is_in_stock: (map[pid] || 0) > 0,
    }));
  }

  /**
   * 4.1 + 4.7 Reserve stock for a sales order (with overselling prevention).
   * Uses advisory lock per product for concurrency safety.
   */
  async reserveStock(params: {
    salesOrderId: number;
    items: Array<{ product_id: number; variant_key?: string; quantity: number }>;
  }): Promise<StockReservation[]> {
    return this.dataSource.transaction(async (manager) => {
      const reservations: StockReservation[] = [];

      for (const item of params.items) {
        // Advisory lock on product to prevent race conditions
        await manager.query('SELECT pg_advisory_xact_lock($1)', [item.product_id]);

        // Sum available stock (quantity - reserved_quantity) across all warehouses
        const result = await manager
          .createQueryBuilder(StockLevel, 'sl')
          .select('SUM(sl.quantity - sl.reserved_quantity)', 'available')
          .where('sl.product_id = :pid', { pid: item.product_id })
          .andWhere(item.variant_key ? 'sl.variant_key = :vk' : 'sl.variant_key IS NULL', { vk: item.variant_key })
          .getRawOne();

        const available = parseInt(result?.available || '0', 10);
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product #${item.product_id}. Available: ${available}, requested: ${item.quantity}`,
          );
        }

        // Find the warehouse(s) with stock, largest stock first
        const levels = await manager.find(StockLevel, {
          where: {
            product_id: item.product_id,
            ...(item.variant_key ? { variant_key: item.variant_key } : {}),
          },
          order: { quantity: 'DESC' },
        });

        let remaining = item.quantity;
        for (const level of levels) {
          if (remaining <= 0) break;
          const avail = (level.quantity || 0) - (level.reserved_quantity || 0);
          if (avail <= 0) continue;

          const reserveQty = Math.min(remaining, avail);

          // Increment reserved_quantity on stock level (optimistic check)
          const updateResult = await manager
            .createQueryBuilder()
            .update(StockLevel)
            .set({ reserved_quantity: () => `reserved_quantity + ${reserveQty}` })
            .where('id = :id', { id: level.id })
            .andWhere('(quantity - reserved_quantity) >= :qty', { qty: reserveQty })
            .execute();

          if (updateResult.affected === 0) {
            throw new BadRequestException(
              `Concurrent stock conflict for product #${item.product_id}. Please retry.`,
            );
          }

          // Create reservation record
          const reservation = manager.create(StockReservation, {
            product_id: item.product_id,
            variant_key: item.variant_key || undefined,
            warehouse_id: level.warehouse_id,
            sales_order_id: params.salesOrderId,
            quantity: reserveQty,
            status: 'active',
            reserved_at: new Date(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for placed orders
          } as any);
          reservations.push(await manager.save(StockReservation, reservation));
          remaining -= reserveQty;
        }
      }

      return reservations;
    });
  }

  /**
   * 4.3 Release reservation on order cancellation.
   * Decrements reserved_quantity on stock levels and marks reservations as released.
   */
  async releaseReservation(salesOrderId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reservations = await manager.find(StockReservation, {
        where: { sales_order_id: salesOrderId, status: 'active' },
      });

      for (const res of reservations) {
        // Decrement reserved_quantity
        await manager
          .createQueryBuilder()
          .update(StockLevel)
          .set({ reserved_quantity: () => `GREATEST(reserved_quantity - ${res.quantity}, 0)` })
          .where('product_id = :pid AND warehouse_id = :wid', {
            pid: res.product_id,
            wid: res.warehouse_id,
          })
          .execute();

        // Mark reservation as released
        res.status = 'released';
        res.released_at = new Date();
        await manager.save(StockReservation, res);
      }

      // Sync product.stock_quantity for each affected product
      const productIds = [...new Set(reservations.map(r => r.product_id))];
      for (const pid of productIds) {
        await this.syncProductStockQuantity(manager, pid);
      }
    });
  }

  /**
   * 4.2 Dispatch stock on order shipment (FEFO logic).
   * Deducts stock from earliest-expiring batches first, releases reservations,
   * records sales_dispatch movements, updates product.stock_quantity.
   */
  async dispatchStock(params: {
    salesOrderId: number;
    items: Array<{ product_id: number; variant_key?: string; quantity: number }>;
    performedBy: number;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const item of params.items) {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [item.product_id]);

        // Release active reservations for this order + product
        const reservations = await manager.find(StockReservation, {
          where: {
            sales_order_id: params.salesOrderId,
            product_id: item.product_id,
            status: 'active',
          },
        });

        let totalReserved = 0;
        for (const res of reservations) {
          totalReserved += res.quantity;
          // Decrement reserved_quantity
          await manager
            .createQueryBuilder()
            .update(StockLevel)
            .set({ reserved_quantity: () => `GREATEST(reserved_quantity - ${res.quantity}, 0)` })
            .where('product_id = :pid AND warehouse_id = :wid', {
              pid: res.product_id,
              wid: res.warehouse_id,
            })
            .execute();
          // Mark as fulfilled
          res.status = 'fulfilled';
          res.fulfilled_at = new Date();
          await manager.save(StockReservation, res);
        }

        // FEFO: deduct from earliest-expiring batches first
        let remainingToDeduct = item.quantity;
        const batches = await manager.find(StockBatch, {
          where: { product_id: item.product_id, status: 'available' },
          order: { expiry_date: { direction: 'ASC', nulls: 'LAST' }, received_date: 'ASC' },
        });

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          if (batch.remaining_quantity <= 0) continue;

          const deductQty = Math.min(remainingToDeduct, batch.remaining_quantity);
          batch.remaining_quantity -= deductQty;
          if (batch.remaining_quantity <= 0) batch.status = 'consumed';
          await manager.save(StockBatch, batch);
          remainingToDeduct -= deductQty;

          // Record stock movement for this batch deduction
          await this.stockMovementService.recordMovement({
            movement_type: 'sales_dispatch',
            product_id: item.product_id,
            variant_key: item.variant_key,
            batch_id: batch.id,
            source_warehouse_id: batch.warehouse_id,
            quantity: deductQty,
            unit_cost: batch.cost_price ? Number(batch.cost_price) : undefined,
            reason: 'Sales order dispatch (FEFO)',
            related_document_type: 'sales_order',
            related_document_id: params.salesOrderId,
            performed_by: params.performedBy,
          });
        }

        // If no batches available or not enough to cover, deduct directly from stock levels
        if (remainingToDeduct > 0) {
          const levels = await manager.find(StockLevel, {
            where: { product_id: item.product_id },
            order: { quantity: 'DESC' },
          });
          for (const level of levels) {
            if (remainingToDeduct <= 0) break;
            const canDeduct = Math.min(remainingToDeduct, level.quantity);
            if (canDeduct <= 0) continue;

            // Deduct quantity with optimistic check
            const upd = await manager
              .createQueryBuilder()
              .update(StockLevel)
              .set({ quantity: () => `quantity - ${canDeduct}` })
              .where('id = :id AND quantity >= :qty', { id: level.id, qty: canDeduct })
              .execute();
            if (upd.affected === 0) continue;
            remainingToDeduct -= canDeduct;

            // Record movement if not already recorded via batch path
            if (batches.length === 0) {
              await this.stockMovementService.recordMovement({
                movement_type: 'sales_dispatch',
                product_id: item.product_id,
                variant_key: item.variant_key,
                source_warehouse_id: level.warehouse_id,
                quantity: canDeduct,
                reason: 'Sales order dispatch',
                related_document_type: 'sales_order',
                related_document_id: params.salesOrderId,
                performed_by: params.performedBy,
              });
            }
          }
        }

        // Sync product.stock_quantity
        await this.syncProductStockQuantity(manager, item.product_id);
      }
    });
  }

  /**
   * 4.4 Return/restock integration.
   * Adds stock back for returned items (Grade A restock).
   */
  async restockReturn(params: {
    salesOrderId: number;
    items: Array<{ product_id: number; variant_key?: string; quantity: number; condition: 'restock' | 'damaged' | 'dispose' }>;
    warehouseId: number;
    performedBy: number;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const item of params.items) {
        if (item.condition === 'dispose') continue; // Write-off, no stock change

        if (item.condition === 'restock') {
          // Grade A: add back to stock
          await this.stockMovementService.recordMovement({
            movement_type: 'sales_return',
            product_id: item.product_id,
            variant_key: item.variant_key,
            destination_warehouse_id: params.warehouseId,
            quantity: item.quantity,
            reason: 'Customer return — restocked',
            related_document_type: 'sales_order',
            related_document_id: params.salesOrderId,
            performed_by: params.performedBy,
          });
        } else if (item.condition === 'damaged') {
          // Grade B: add to stock as damaged adjustment
          await this.stockMovementService.recordMovement({
            movement_type: 'adjustment_increase',
            product_id: item.product_id,
            variant_key: item.variant_key,
            destination_warehouse_id: params.warehouseId,
            quantity: item.quantity,
            reason: 'Customer return — damaged stock',
            related_document_type: 'sales_order',
            related_document_id: params.salesOrderId,
            performed_by: params.performedBy,
          });
          // Mark damaged quantity on stock level
          await manager
            .createQueryBuilder()
            .update(StockLevel)
            .set({ damaged_quantity: () => `damaged_quantity + ${item.quantity}` })
            .where('product_id = :pid AND warehouse_id = :wid', {
              pid: item.product_id,
              wid: params.warehouseId,
            })
            .execute();
        }

        // Sync product.stock_quantity
        await this.syncProductStockQuantity(manager, item.product_id);
      }
    });
  }

  /**
   * Release expired reservations (called periodically).
   * Returns the number of reservations released.
   */
  async releaseExpiredReservations(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const expired = await manager.find(StockReservation, {
        where: {
          status: 'active',
        },
      });

      // Filter to only truly expired ones (expires_at < now)
      const now = new Date();
      const toRelease = expired.filter(r => r.expires_at && r.expires_at < now);
      if (toRelease.length === 0) return 0;

      for (const res of toRelease) {
        await manager
          .createQueryBuilder()
          .update(StockLevel)
          .set({ reserved_quantity: () => `GREATEST(reserved_quantity - ${res.quantity}, 0)` })
          .where('product_id = :pid AND warehouse_id = :wid', {
            pid: res.product_id,
            wid: res.warehouse_id,
          })
          .execute();

        res.status = 'expired';
        res.released_at = now;
        await manager.save(StockReservation, res);
      }

      // Sync product quantities
      const productIds = [...new Set(toRelease.map(r => r.product_id))];
      for (const pid of productIds) {
        await this.syncProductStockQuantity(manager, pid);
      }

      return toRelease.length;
    });
  }

  /**
   * Get reservations for a sales order.
   */
  async getReservationsForOrder(salesOrderId: number): Promise<StockReservation[]> {
    return this.reservationRepo.find({
      where: { sales_order_id: salesOrderId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Sync product.stock_quantity from stock_levels.
   * Updates the product's stock_quantity = SUM(quantity - reserved_quantity) across all warehouses.
   */
  private async syncProductStockQuantity(manager: any, productId: number): Promise<void> {
    await manager.query(
      `UPDATE products SET stock_quantity = (
        SELECT COALESCE(SUM(sl.quantity - sl.reserved_quantity), 0)
        FROM stock_levels sl
        WHERE sl.product_id = $1
      ) WHERE id = $1`,
      [productId],
    );
  }

  // ══════════════════════════════════════════════════════
  // ── Phase 5: Alerts, Reorder & Reports ──────────────
  // ══════════════════════════════════════════════════════

  // ── Alert Creation ──────────────────────────────────

  async createAlert(params: {
    alert_type: string;
    product_id?: number;
    variant_key?: string;
    warehouse_id?: number;
    batch_id?: number;
    message: string;
    severity: string;
    metadata?: any;
  }): Promise<StockAlert> {
    const alert = this.alertRepo.create(params as any);
    const saved = await this.alertRepo.save(alert as any);
    return saved as unknown as StockAlert;
  }

  async getAlertUnreadCount(): Promise<number> {
    return this.alertRepo.count({ where: { is_read: false, is_resolved: false } });
  }

  async markAllAlertsRead(): Promise<{ updated: number }> {
    const result = await this.alertRepo
      .createQueryBuilder()
      .update(StockAlert)
      .set({ is_read: true })
      .where('is_read = false')
      .execute();
    return { updated: result.affected || 0 };
  }

  // ── 5.3 Low Stock Detection ─────────────────────────

  async evaluateReorderPoints(): Promise<{ alertsCreated: number; posCreated: number }> {
    const rules = await this.reorderRepo.find({ where: { is_active: true } });
    let alertsCreated = 0;
    let posCreated = 0;

    for (const rule of rules) {
      try {
        // Get available quantity for this product/warehouse
        const qb = this.stockLevelRepo
          .createQueryBuilder('sl')
          .select('COALESCE(SUM(sl.quantity - sl.reserved_quantity), 0)', 'available')
          .where('sl.product_id = :pid', { pid: rule.product_id });

        if (rule.warehouse_id) {
          qb.andWhere('sl.warehouse_id = :wid', { wid: rule.warehouse_id });
        }
        if (rule.variant_key) {
          qb.andWhere('sl.variant_key = :vk', { vk: rule.variant_key });
        }

        const result = await qb.getRawOne();
        const available = parseInt(result?.available || '0', 10);

        // Get product name for alert messages
        const product = await this.dataSource.query(
          'SELECT name_en, sku FROM products WHERE id = $1',
          [rule.product_id],
        );
        const productName = product?.[0]?.name_en || `Product #${rule.product_id}`;

        // Check overstock
        if (rule.max_stock_level && available > rule.max_stock_level) {
          const existing = await this.alertRepo.findOne({
            where: { alert_type: 'overstock', product_id: rule.product_id, is_resolved: false },
          });
          if (!existing) {
            await this.createAlert({
              alert_type: 'overstock',
              product_id: rule.product_id,
              variant_key: rule.variant_key || undefined,
              warehouse_id: rule.warehouse_id || undefined,
              message: `${productName} exceeds max stock: ${available} (max: ${rule.max_stock_level})`,
              severity: 'info',
              metadata: { available, max_stock_level: rule.max_stock_level },
            });
            alertsCreated++;
          }
        }

        // Check if below reorder point
        if (available <= rule.reorder_point) {
          const isOutOfStock = available === 0;
          const alertType = isOutOfStock ? 'out_of_stock' : 'low_stock';
          const severity = isOutOfStock ? 'critical' : 'warning';

          // Don't duplicate unresolved alerts for same product
          const existing = await this.alertRepo.findOne({
            where: { alert_type: alertType, product_id: rule.product_id, is_resolved: false },
          });

          if (!existing) {
            const message = isOutOfStock
              ? `${productName} is OUT OF STOCK${rule.warehouse_id ? ` at warehouse #${rule.warehouse_id}` : ''}`
              : `${productName} stock low: ${available} remaining (reorder point: ${rule.reorder_point})${rule.warehouse_id ? ` at warehouse #${rule.warehouse_id}` : ''}`;

            await this.createAlert({
              alert_type: alertType,
              product_id: rule.product_id,
              variant_key: rule.variant_key || undefined,
              warehouse_id: rule.warehouse_id || undefined,
              message,
              severity,
              metadata: { available, reorder_point: rule.reorder_point },
            });
            alertsCreated++;
          }

          // 5.5 Auto-reorder PO creation
          if (rule.auto_reorder && rule.preferred_supplier_id) {
            try {
              const po = await this.createAutoReorderPO(rule, productName);
              if (po) {
                posCreated++;
                await this.createAlert({
                  alert_type: 'reorder_triggered',
                  product_id: rule.product_id,
                  message: `Auto-reorder PO ${po.po_number} created for ${productName}: ${rule.reorder_quantity} units`,
                  severity: 'info',
                  metadata: { po_id: po.id, po_number: po.po_number, quantity: rule.reorder_quantity },
                });
                alertsCreated++;
              }
            } catch (poErr: any) {
              this.logger.warn(`Auto-reorder PO failed for product #${rule.product_id}: ${poErr?.message}`);
            }
          }
        }

        // Update last_triggered_at
        rule.last_triggered_at = new Date();
        await this.reorderRepo.save(rule);
      } catch (ruleErr: any) {
        this.logger.warn(`Reorder eval failed for rule #${rule.id}: ${ruleErr?.message}`);
      }
    }

    return { alertsCreated, posCreated };
  }

  // ── 5.5 Auto-Reorder PO Creation ───────────────────

  private async createAutoReorderPO(rule: ReorderRule, productName: string): Promise<any> {
    // Use DataSource directly to avoid circular dependency with PurchaseModule
    return this.dataSource.transaction(async (manager) => {
      // Generate PO number
      const lastPo = await manager.query(
        `SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1`,
      );
      const lastNum = lastPo?.[0]?.po_number
        ? parseInt(lastPo[0].po_number.replace(/\D/g, '') || '0', 10)
        : 0;
      const poNumber = `PO-${String(lastNum + 1).padStart(6, '0')}`;

      // Get unit price from supplier_products
      const supplierProduct = await manager.query(
        `SELECT unit_price FROM supplier_products WHERE supplier_id = $1 AND product_id = $2 AND is_active = true LIMIT 1`,
        [rule.preferred_supplier_id, rule.product_id],
      );
      const unitPrice = supplierProduct?.[0]?.unit_price || 0;
      const lineTotal = unitPrice * rule.reorder_quantity;

      // Create PO header
      const [po] = await manager.query(
        `INSERT INTO purchase_orders (po_number, supplier_id, warehouse_id, status, order_date, subtotal, total_amount, created_by, notes)
         VALUES ($1, $2, $3, 'draft', NOW(), $4, $4, 0, $5)
         RETURNING id, po_number`,
        [
          poNumber,
          rule.preferred_supplier_id,
          rule.warehouse_id || 1,
          lineTotal,
          `Auto-generated from reorder rule #${rule.id} for ${productName}`,
        ],
      );

      // Create PO item
      await manager.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, variant_key, quantity_ordered, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [po.id, rule.product_id, rule.variant_key || null, rule.reorder_quantity, unitPrice, lineTotal],
      );

      return po;
    });
  }

  // ── 5.4 Batch Expiry Monitoring ─────────────────────

  async checkExpiryAlerts(): Promise<number> {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let alertsCreated = 0;

    // Find batches that are available and have expiry dates
    const batches = await this.batchRepo
      .createQueryBuilder('b')
      .where('b.expiry_date IS NOT NULL')
      .andWhere('b.status = :status', { status: 'available' })
      .andWhere('b.remaining_quantity > 0')
      .andWhere('b.expiry_date <= :thirtyDays', { thirtyDays })
      .orderBy('b.expiry_date', 'ASC')
      .getMany();

    for (const batch of batches) {
      const expiryDate = new Date(batch.expiry_date);
      const productRows = await this.dataSource.query(
        'SELECT name_en FROM products WHERE id = $1',
        [batch.product_id],
      );
      const productName = productRows?.[0]?.name_en || `Product #${batch.product_id}`;
      const dateStr = expiryDate.toISOString().split('T')[0];

      if (expiryDate <= now) {
        // EXPIRED — mark batch as expired, create critical alert
        const existing = await this.alertRepo.findOne({
          where: { alert_type: 'expiry_critical', batch_id: batch.id, is_resolved: false },
        });
        if (!existing) {
          await this.batchRepo.update(batch.id, { status: 'expired' });
          await this.createAlert({
            alert_type: 'expiry_critical',
            product_id: batch.product_id,
            warehouse_id: batch.warehouse_id || undefined,
            batch_id: batch.id,
            message: `Batch ${batch.batch_number} of ${productName} has EXPIRED (${batch.remaining_quantity} units, expiry: ${dateStr})`,
            severity: 'critical',
            metadata: { batch_number: batch.batch_number, expiry_date: dateStr, remaining: batch.remaining_quantity },
          });
          alertsCreated++;
        }
      } else if (expiryDate <= sevenDays) {
        // Expiring within 7 days — warning
        const existing = await this.alertRepo.findOne({
          where: { alert_type: 'expiry_warning', batch_id: batch.id, severity: 'warning', is_resolved: false },
        });
        if (!existing) {
          await this.createAlert({
            alert_type: 'expiry_warning',
            product_id: batch.product_id,
            warehouse_id: batch.warehouse_id || undefined,
            batch_id: batch.id,
            message: `Batch ${batch.batch_number} of ${productName} expires on ${dateStr} (${batch.remaining_quantity} units)`,
            severity: 'warning',
            metadata: { batch_number: batch.batch_number, expiry_date: dateStr, remaining: batch.remaining_quantity },
          });
          alertsCreated++;
        }
      } else if (expiryDate <= thirtyDays) {
        // Expiring within 30 days — info
        const existing = await this.alertRepo.findOne({
          where: { alert_type: 'expiry_warning', batch_id: batch.id, severity: 'info', is_resolved: false },
        });
        if (!existing) {
          await this.createAlert({
            alert_type: 'expiry_warning',
            product_id: batch.product_id,
            warehouse_id: batch.warehouse_id || undefined,
            batch_id: batch.id,
            message: `Batch ${batch.batch_number} of ${productName} expires on ${dateStr} (${batch.remaining_quantity} units) — 30 day warning`,
            severity: 'info',
            metadata: { batch_number: batch.batch_number, expiry_date: dateStr, remaining: batch.remaining_quantity },
          });
          alertsCreated++;
        }
      }
    }

    return alertsCreated;
  }

  // ── 5.7 Dashboard KPIs ─────────────────────────────

  async getDashboardKpis(): Promise<any> {
    const [
      totalProducts,
      stockValue,
      lowStockItems,
      outOfStock,
      expiringSoon,
      pendingPOs,
      recentMovements,
      movementChart,
      topLowStock,
      expiringBatches,
    ] = await Promise.all([
      // Total active products with stock tracking
      this.dataSource.query(`SELECT COUNT(DISTINCT product_id) as count FROM stock_levels`),
      // Total stock value
      this.dataSource.query(`SELECT COALESCE(SUM(sl.quantity * sl.cost_price), 0) as total FROM stock_levels sl WHERE sl.quantity > 0`),
      // Low stock items count (where reorder rules exist and qty <= reorder_point)
      this.dataSource.query(`
        SELECT COUNT(*) as count FROM reorder_rules rr
        WHERE rr.is_active = true AND EXISTS (
          SELECT 1 FROM stock_levels sl
          WHERE sl.product_id = rr.product_id
          AND (rr.warehouse_id IS NULL OR sl.warehouse_id = rr.warehouse_id)
          GROUP BY sl.product_id
          HAVING COALESCE(SUM(sl.quantity - sl.reserved_quantity), 0) <= rr.reorder_point
          AND COALESCE(SUM(sl.quantity - sl.reserved_quantity), 0) > 0
        )
      `),
      // Out of stock count
      this.dataSource.query(`
        SELECT COUNT(*) as count FROM reorder_rules rr
        WHERE rr.is_active = true AND EXISTS (
          SELECT 1 FROM stock_levels sl
          WHERE sl.product_id = rr.product_id
          AND (rr.warehouse_id IS NULL OR sl.warehouse_id = rr.warehouse_id)
          GROUP BY sl.product_id
          HAVING COALESCE(SUM(sl.quantity - sl.reserved_quantity), 0) = 0
        )
      `),
      // Expiring within 7 days
      this.dataSource.query(`
        SELECT COUNT(*) as count FROM stock_batches
        WHERE status = 'available' AND remaining_quantity > 0
        AND expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '7 days'
        AND expiry_date > NOW()
      `),
      // Pending purchase orders
      this.dataSource.query(`SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('draft', 'pending_approval', 'approved')`),
      // Recent 20 movements
      this.dataSource.query(`
        SELECT sm.id, sm.reference_number, sm.movement_type, sm.product_id, sm.quantity,
               sm.created_at, p.name_en as product_name
        FROM stock_movements sm
        LEFT JOIN products p ON p.id = sm.product_id
        ORDER BY sm.created_at DESC LIMIT 20
      `),
      // Movement chart: receipts vs dispatches last 30 days
      this.dataSource.query(`
        SELECT
          TO_CHAR(sm.created_at, 'YYYY-MM-DD') as date,
          SUM(CASE WHEN sm.movement_type IN ('receipt', 'sales_return', 'transfer_in', 'adjustment_increase') THEN sm.quantity ELSE 0 END) as inbound,
          SUM(CASE WHEN sm.movement_type IN ('sales_dispatch', 'transfer_out', 'adjustment_decrease') THEN sm.quantity ELSE 0 END) as outbound
        FROM stock_movements sm
        WHERE sm.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY TO_CHAR(sm.created_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `),
      // Top 10 low stock items
      this.dataSource.query(`
        SELECT rr.product_id, rr.reorder_point, rr.reorder_quantity,
               p.name_en as product_name, p.sku,
               COALESCE(sub.available, 0) as available
        FROM reorder_rules rr
        LEFT JOIN products p ON p.id = rr.product_id
        LEFT JOIN LATERAL (
          SELECT SUM(sl.quantity - sl.reserved_quantity) as available
          FROM stock_levels sl WHERE sl.product_id = rr.product_id
        ) sub ON true
        WHERE rr.is_active = true AND COALESCE(sub.available, 0) <= rr.reorder_point
        ORDER BY COALESCE(sub.available, 0) ASC
        LIMIT 10
      `),
      // Expiring batches this month
      this.dataSource.query(`
        SELECT b.id, b.batch_number, b.product_id, b.expiry_date, b.remaining_quantity,
               p.name_en as product_name
        FROM stock_batches b
        LEFT JOIN products p ON p.id = b.product_id
        WHERE b.status = 'available' AND b.remaining_quantity > 0
        AND b.expiry_date IS NOT NULL AND b.expiry_date <= NOW() + INTERVAL '30 days'
        ORDER BY b.expiry_date ASC LIMIT 20
      `),
    ]);

    return {
      kpis: {
        totalProducts: parseInt(totalProducts?.[0]?.count || '0', 10),
        stockValue: parseFloat(stockValue?.[0]?.total || '0'),
        lowStockItems: parseInt(lowStockItems?.[0]?.count || '0', 10),
        outOfStock: parseInt(outOfStock?.[0]?.count || '0', 10),
        expiringSoon: parseInt(expiringSoon?.[0]?.count || '0', 10),
        pendingPOs: parseInt(pendingPOs?.[0]?.count || '0', 10),
      },
      recentMovements,
      movementChart,
      topLowStock,
      expiringBatches,
    };
  }

  // ── 5.8 Stock Valuation ─────────────────────────────

  async getStockValuation(warehouseId?: number): Promise<any[]> {
    let query = `
      SELECT sl.product_id, sl.warehouse_id, sl.variant_key,
             p.name_en as product_name, p.sku, p.category,
             w.name as warehouse_name,
             SUM(sl.quantity) as total_quantity,
             SUM(sl.reserved_quantity) as total_reserved,
             SUM(sl.quantity - sl.reserved_quantity) as total_available,
             AVG(sl.cost_price) as avg_cost,
             SUM(sl.quantity * sl.cost_price) as total_value
      FROM stock_levels sl
      LEFT JOIN products p ON p.id = sl.product_id
      LEFT JOIN warehouses w ON w.id = sl.warehouse_id
    `;
    const params: any[] = [];
    if (warehouseId) {
      query += ` WHERE sl.warehouse_id = $1`;
      params.push(warehouseId);
    }
    query += `
      GROUP BY sl.product_id, sl.warehouse_id, sl.variant_key, p.name_en, p.sku, p.category, w.name
      ORDER BY total_value DESC
    `;
    return this.dataSource.query(query, params);
  }

  // ── 5.9 Movement Log Report ─────────────────────────

  async getMovementReport(filters: {
    dateFrom?: string;
    dateTo?: string;
    product_id?: number;
    movement_type?: string;
    warehouse_id?: number;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT sm.*, p.name_en as product_name, p.sku
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.dateFrom) {
      query += ` AND sm.created_at >= $${paramIdx++}`;
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      query += ` AND sm.created_at <= $${paramIdx++}`;
      params.push(filters.dateTo);
    }
    if (filters.product_id) {
      query += ` AND sm.product_id = $${paramIdx++}`;
      params.push(filters.product_id);
    }
    if (filters.movement_type) {
      query += ` AND sm.movement_type = $${paramIdx++}`;
      params.push(filters.movement_type);
    }
    if (filters.warehouse_id) {
      query += ` AND (sm.source_warehouse_id = $${paramIdx} OR sm.dest_warehouse_id = $${paramIdx++})`;
      params.push(filters.warehouse_id);
    }

    query += ` ORDER BY sm.created_at DESC LIMIT $${paramIdx}`;
    params.push(filters.limit || 500);

    return this.dataSource.query(query, params);
  }

  // ── 5.10 Supplier Performance ───────────────────────

  async getSupplierPerformance(supplierId?: number): Promise<any[]> {
    let query = `
      SELECT
        po.supplier_id,
        s.company_name as supplier_name,
        COUNT(po.id) as total_orders,
        SUM(CASE WHEN po.status IN ('received', 'closed') THEN 1 ELSE 0 END) as completed_orders,
        ROUND(AVG(CASE
          WHEN po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL
          THEN EXTRACT(EPOCH FROM (po.actual_delivery_date - po.expected_delivery_date)) / 86400
        END)::numeric, 1) as avg_delivery_variance_days,
        ROUND(
          (SUM(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END)::numeric /
          NULLIF(SUM(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL THEN 1 ELSE 0 END), 0) * 100)::numeric
        , 1) as on_time_rate,
        COALESCE(grn_stats.acceptance_rate, 0) as quality_acceptance_rate,
        ROUND(AVG(CASE
          WHEN po.actual_delivery_date IS NOT NULL
          THEN EXTRACT(EPOCH FROM (po.actual_delivery_date - po.order_date)) / 86400
        END)::numeric, 1) as avg_lead_time_days,
        SUM(po.total_amount) as total_spend,
        COALESCE(fill_stats.fill_rate, 0) as fill_rate
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN LATERAL (
        SELECT ROUND(
          (SUM(CASE WHEN gi.quality_status = 'accepted' THEN 1 ELSE 0 END)::numeric /
          NULLIF(COUNT(gi.id), 0) * 100)::numeric, 1) as acceptance_rate
        FROM goods_received_notes grn
        LEFT JOIN grn_items gi ON gi.grn_id = grn.id
        WHERE grn.supplier_id = po.supplier_id
      ) grn_stats ON true
      LEFT JOIN LATERAL (
        SELECT ROUND(
          (SUM(poi.quantity_received)::numeric / NULLIF(SUM(poi.quantity_ordered), 0) * 100)::numeric, 1) as fill_rate
        FROM purchase_order_items poi
        WHERE poi.purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = po.supplier_id AND status IN ('received', 'closed'))
      ) fill_stats ON true
    `;
    const params: any[] = [];
    if (supplierId) {
      query += ` WHERE po.supplier_id = $1`;
      params.push(supplierId);
    }
    query += ` GROUP BY po.supplier_id, s.company_name, grn_stats.acceptance_rate, fill_stats.fill_rate ORDER BY total_orders DESC`;

    return this.dataSource.query(query, params);
  }

  // ── 5.11 ABC Analysis ──────────────────────────────

  async getAbcAnalysis(): Promise<any[]> {
    // ABC classification by total stock value
    const items = await this.dataSource.query(`
      SELECT sl.product_id, p.name_en as product_name, p.sku, p.category,
             SUM(sl.quantity) as total_quantity,
             SUM(sl.quantity * sl.cost_price) as total_value
      FROM stock_levels sl
      LEFT JOIN products p ON p.id = sl.product_id
      WHERE sl.quantity > 0
      GROUP BY sl.product_id, p.name_en, p.sku, p.category
      ORDER BY total_value DESC
    `);

    let cumulativeValue = 0;
    const grandTotal = items.reduce((sum: number, i: any) => sum + parseFloat(i.total_value || '0'), 0);

    return items.map((item: any) => {
      cumulativeValue += parseFloat(item.total_value || '0');
      const cumulativePercent = grandTotal > 0 ? (cumulativeValue / grandTotal) * 100 : 0;
      let classification = 'C';
      if (cumulativePercent <= 80) classification = 'A';
      else if (cumulativePercent <= 95) classification = 'B';

      return {
        ...item,
        total_value: parseFloat(item.total_value || '0'),
        cumulative_percent: Math.round(cumulativePercent * 100) / 100,
        classification,
      };
    });
  }

  // ── 5.12 Dead Stock / Fast-Slow Movers ──────────────

  async getDeadStock(daysSinceMovement: number = 90): Promise<any[]> {
    return this.dataSource.query(`
      SELECT sl.product_id, p.name_en as product_name, p.sku, p.category,
             SUM(sl.quantity) as total_quantity,
             SUM(sl.quantity * sl.cost_price) as total_value,
             MAX(sm.created_at) as last_movement_date,
             EXTRACT(DAY FROM NOW() - MAX(sm.created_at))::int as days_since_movement
      FROM stock_levels sl
      LEFT JOIN products p ON p.id = sl.product_id
      LEFT JOIN stock_movements sm ON sm.product_id = sl.product_id
      WHERE sl.quantity > 0
      GROUP BY sl.product_id, p.name_en, p.sku, p.category
      HAVING MAX(sm.created_at) IS NULL OR MAX(sm.created_at) < NOW() - INTERVAL '1 day' * $1
      ORDER BY days_since_movement DESC NULLS FIRST
    `, [daysSinceMovement]);
  }

  async getFastSlowMovers(dateFrom?: string, dateTo?: string): Promise<any[]> {
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];

    const items = await this.dataSource.query(`
      SELECT sm.product_id, p.name_en as product_name, p.sku, p.category,
             SUM(CASE WHEN sm.movement_type = 'sales_dispatch' THEN sm.quantity ELSE 0 END) as units_sold,
             COUNT(CASE WHEN sm.movement_type = 'sales_dispatch' THEN 1 END) as dispatch_count,
             SUM(sm.quantity) as total_movement
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id
      WHERE sm.created_at BETWEEN $1 AND $2
      GROUP BY sm.product_id, p.name_en, p.sku, p.category
      ORDER BY units_sold DESC
    `, [fromDate, toDate]);

    // Classify: top 20% = fast, middle 60% = normal, bottom 20% = slow
    const total = items.length;
    return items.map((item: any, idx: number) => {
      const percentile = total > 0 ? ((idx + 1) / total) * 100 : 100;
      let velocity = 'normal';
      if (percentile <= 20) velocity = 'fast';
      else if (percentile > 80) velocity = 'slow';

      return { ...item, units_sold: parseInt(item.units_sold || '0', 10), velocity };
    });
  }

  // ── 5.13 Inventory Count Variance Report ────────────

  async getCountVarianceReport(countId?: number): Promise<any> {
    let whereClause = '';
    const params: any[] = [];
    if (countId) {
      whereClause = 'WHERE ic.id = $1';
      params.push(countId);
    }

    const counts = await this.dataSource.query(`
      SELECT ic.id, ic.count_number, ic.warehouse_id, ic.count_type, ic.status,
             ic.started_at, ic.completed_at,
             w.name as warehouse_name,
             COUNT(ici.id) as total_items,
             SUM(CASE WHEN ici.variance = 0 THEN 1 ELSE 0 END) as matched_items,
             SUM(CASE WHEN ici.variance != 0 THEN 1 ELSE 0 END) as variance_items,
             ROUND(
               (SUM(CASE WHEN ici.variance = 0 THEN 1 ELSE 0 END)::numeric /
               NULLIF(COUNT(ici.id), 0) * 100)::numeric
             , 1) as accuracy_percent,
             SUM(ABS(ici.variance)) as total_absolute_variance
      FROM inventory_counts ic
      LEFT JOIN warehouses w ON w.id = ic.warehouse_id
      LEFT JOIN inventory_count_items ici ON ici.count_id = ic.id
      ${whereClause}
      GROUP BY ic.id, ic.count_number, ic.warehouse_id, ic.count_type, ic.status,
               ic.started_at, ic.completed_at, w.name
      ORDER BY ic.created_at DESC
    `, params);

    // If specific count, also get item-level details
    if (countId && counts.length > 0) {
      const items = await this.dataSource.query(`
        SELECT ici.*, p.name_en as product_name, p.sku
        FROM inventory_count_items ici
        LEFT JOIN products p ON p.id = ici.product_id
        WHERE ici.count_id = $1
        ORDER BY ABS(ici.variance) DESC
      `, [countId]);
      return { summary: counts[0], items };
    }

    return counts;
  }

  // ── 5.14 CSV Export ─────────────────────────────────

  generateCsv(data: any[], columns: { key: string; header: string }[]): string {
    const headers = columns.map((c) => c.header);
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape CSV: wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  // ── 6.2 Barcode Generation ─────────────────────────

  async generateBarcode(text: string, type: string = 'code128'): Promise<Buffer> {
    const bcidMap: Record<string, string> = {
      code128: 'code128',
      ean13: 'ean13',
      qrcode: 'qrcode',
      datamatrix: 'datamatrix',
    };
    const bcid = bcidMap[type.toLowerCase()] || 'code128';
    const png = await (bwipjs as any).toBuffer({
      bcid,
      text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    return png;
  }

  async getBatchLabelData(batchId: number): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT sb.*, p.name as product_name, p.sku as product_sku
       FROM stock_batches sb
       LEFT JOIN products p ON p.id = sb.product_id
       WHERE sb.id = $1`, [batchId],
    );
    if (!rows.length) throw new NotFoundException('Batch not found');
    const batch = rows[0];
    return {
      batch,
      barcode_text: batch.batch_number,
      label_fields: {
        product: batch.product_name,
        sku: batch.product_sku,
        batch: batch.batch_number,
        expiry: batch.expiry_date,
        quantity: batch.current_quantity,
      },
    };
  }

  async getLocationLabelData(locationId: number): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT wl.*, wz.name as zone_name, w.name as warehouse_name
       FROM warehouse_locations wl
       LEFT JOIN warehouse_zones wz ON wz.id = wl.zone_id
       LEFT JOIN warehouses w ON w.id = wz.warehouse_id
       WHERE wl.id = $1`, [locationId],
    );
    if (!rows.length) throw new NotFoundException('Location not found');
    const loc = rows[0];
    return {
      location: loc,
      barcode_text: loc.barcode || loc.code,
      label_fields: {
        warehouse: loc.warehouse_name,
        zone: loc.zone_name,
        location: loc.code,
        type: loc.type,
      },
    };
  }

  async getPoLabelData(poId: number): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT po.*, s.company_name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`, [poId],
    );
    if (!rows.length) throw new NotFoundException('Purchase order not found');
    const po = rows[0];
    const items = await this.dataSource.query(
      `SELECT poi.*, p.name as product_name, p.sku
       FROM purchase_order_items poi
       LEFT JOIN products p ON p.id = poi.product_id
       WHERE poi.purchase_order_id = $1`, [poId],
    );
    return {
      po,
      items,
      barcode_text: po.po_number,
      label_fields: {
        po_number: po.po_number,
        supplier: po.supplier_name,
        date: po.order_date,
        items_count: items.length,
      },
    };
  }

  async barcodeLookup(code: string): Promise<any> {
    // Search products by SKU/barcode
    const products = await this.dataSource.query(
      `SELECT id, name, sku FROM products WHERE sku = $1 OR barcode = $1 LIMIT 5`, [code],
    );
    if (products.length) {
      return { found: true, type: 'product', data: products[0] };
    }
    // Search batches by batch number
    const batches = await this.dataSource.query(
      `SELECT sb.id, sb.batch_number, sb.product_id, p.name as product_name
       FROM stock_batches sb LEFT JOIN products p ON p.id = sb.product_id
       WHERE sb.batch_number = $1 LIMIT 5`, [code],
    );
    if (batches.length) {
      return { found: true, type: 'batch', data: batches[0] };
    }
    // Search locations by code/barcode
    const locations = await this.dataSource.query(
      `SELECT wl.id, wl.code, wl.barcode, wz.name as zone_name
       FROM warehouse_locations wl
       LEFT JOIN warehouse_zones wz ON wz.id = wl.zone_id
       WHERE wl.code = $1 OR wl.barcode = $1 LIMIT 5`, [code],
    );
    if (locations.length) {
      return { found: true, type: 'location', data: locations[0] };
    }
    // Search POs by number
    const pos = await this.dataSource.query(
      `SELECT id, po_number, status FROM purchase_orders WHERE po_number = $1 LIMIT 5`, [code],
    );
    if (pos.length) {
      return { found: true, type: 'purchase_order', data: pos[0] };
    }
    return { found: false };
  }

  // ── 6.6 Demand Forecasting ────────────────────────

  async getForecasts(warehouseId?: number): Promise<DemandForecast[]> {
    const where: any = {};
    if (warehouseId) where.warehouse_id = warehouseId;
    return this.forecastRepo.find({ where, order: { created_at: 'DESC' }, take: 500 });
  }

  async generateForecasts(): Promise<{ generated: number }> {
    // Get products with sales movements in last 12 months
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);

    const salesData = await this.dataSource.query(
      `SELECT sm.product_id, sm.source_warehouse_id as warehouse_id,
              DATE_TRUNC('month', sm.created_at) as month,
              SUM(sm.quantity) as total_qty
       FROM stock_movements sm
       WHERE sm.movement_type = 'sales_dispatch'
         AND sm.created_at >= $1
       GROUP BY sm.product_id, sm.source_warehouse_id, DATE_TRUNC('month', sm.created_at)
       ORDER BY sm.product_id, sm.source_warehouse_id, month`, [cutoff],
    );

    // Group by product+warehouse
    const groups: Record<string, { product_id: number; warehouse_id: number; monthly: number[] }> = {};
    for (const row of salesData) {
      const key = `${row.product_id}-${row.warehouse_id}`;
      if (!groups[key]) {
        groups[key] = { product_id: row.product_id, warehouse_id: row.warehouse_id, monthly: [] };
      }
      groups[key].monthly.push(Number(row.total_qty));
    }

    let generated = 0;
    const now = new Date();
    const effectiveFrom = now.toISOString().split('T')[0];

    for (const g of Object.values(groups)) {
      for (const period of [3, 6, 12]) {
        const slice = g.monthly.slice(-period);
        if (slice.length === 0) continue;

        const avg = Math.round(slice.reduce((s, v) => s + v, 0) / slice.length);
        const stdDev = Math.round(
          Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / slice.length),
        );
        const reorderQty = Math.round(avg + stdDev * 1.5); // safety stock

        // Velocity classification
        let velocity = 'normal';
        if (avg > 100) velocity = 'fast';
        else if (avg < 10) velocity = 'slow';
        else if (avg === 0) velocity = 'dead';

        const forecastDate = new Date(now);
        forecastDate.setMonth(forecastDate.getMonth() + period);

        // Upsert: delete old forecast with same key, insert new
        await this.forecastRepo.delete({
          product_id: g.product_id,
          warehouse_id: g.warehouse_id,
          forecast_period: period,
        });

        await this.forecastRepo.save({
          product_id: g.product_id,
          warehouse_id: g.warehouse_id,
          forecast_period: period,
          moving_average_qty: avg,
          historical_std_dev: stdDev,
          suggested_reorder_qty: reorderQty,
          velocity,
          forecasted_date: forecastDate.toISOString().split('T')[0],
          effective_from: effectiveFrom,
        });
        generated++;
      }
    }

    return { generated };
  }

  async getForecastAccuracy(): Promise<any> {
    // Compare forecast vs actual for last period
    const rows = await this.dataSource.query(
      `SELECT df.product_id, df.warehouse_id, df.forecast_period,
              df.moving_average_qty as forecast_qty,
              COALESCE(actual.total_qty, 0) as actual_qty,
              p.name as product_name
       FROM demand_forecasts df
       LEFT JOIN products p ON p.id = df.product_id
       LEFT JOIN LATERAL (
         SELECT SUM(sm.quantity) as total_qty
         FROM stock_movements sm
         WHERE sm.product_id = df.product_id
           AND sm.source_warehouse_id = df.warehouse_id
           AND sm.movement_type = 'sales_dispatch'
           AND sm.created_at >= df.effective_from::timestamp
       ) actual ON true
       WHERE df.forecast_period = 3
       ORDER BY df.product_id
       LIMIT 100`,
    );

    const items = rows.map((r: any) => {
      const forecast = Number(r.forecast_qty);
      const actual = Number(r.actual_qty);
      const error = forecast > 0 ? Math.abs(forecast - actual) / forecast * 100 : 0;
      return { ...r, accuracy_pct: Math.max(0, Math.round(100 - error)) };
    });

    const avgAccuracy = items.length > 0
      ? Math.round(items.reduce((s: number, i: any) => s + i.accuracy_pct, 0) / items.length)
      : 0;

    return { items, average_accuracy_pct: avgAccuracy };
  }

  // ── 6.9 Bulk Import ───────────────────────────────

  async validateImport(importType: string, rows: any[]): Promise<{ valid: boolean; errors: any[] }> {
    const errors: any[] = [];
    const validTypes = ['products', 'stock_levels', 'suppliers'];
    if (!validTypes.includes(importType)) {
      return { valid: false, errors: [{ row: 0, message: `Invalid import type. Must be one of: ${validTypes.join(', ')}` }] };
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      switch (importType) {
        case 'products':
          if (!row.name) errors.push({ row: i + 1, field: 'name', message: 'Name is required' });
          if (!row.sku) errors.push({ row: i + 1, field: 'sku', message: 'SKU is required' });
          if (row.price !== undefined && isNaN(Number(row.price))) errors.push({ row: i + 1, field: 'price', message: 'Price must be a number' });
          break;
        case 'stock_levels':
          if (!row.product_id && !row.sku) errors.push({ row: i + 1, field: 'product_id', message: 'Product ID or SKU is required' });
          if (!row.warehouse_id) errors.push({ row: i + 1, field: 'warehouse_id', message: 'Warehouse ID is required' });
          if (row.quantity === undefined) errors.push({ row: i + 1, field: 'quantity', message: 'Quantity is required' });
          break;
        case 'suppliers':
          if (!row.company_name) errors.push({ row: i + 1, field: 'company_name', message: 'Company name is required' });
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async executeImport(importType: string, rows: any[], userId?: number): Promise<{ imported: number; errors: any[] }> {
    const validation = await this.validateImport(importType, rows);
    if (!validation.valid) {
      return { imported: 0, errors: validation.errors };
    }

    let imported = 0;
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        switch (importType) {
          case 'products':
            await this.dataSource.query(
              `INSERT INTO products (name, sku, description, price, category_id, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
               ON CONFLICT (sku) DO UPDATE SET name = $1, description = $3, price = $4, updated_at = NOW()`,
              [rows[i].name, rows[i].sku, rows[i].description || '', Number(rows[i].price) || 0, rows[i].category_id || null],
            );
            imported++;
            break;
          case 'stock_levels': {
            let productId = rows[i].product_id;
            if (!productId && rows[i].sku) {
              const found = await this.dataSource.query(`SELECT id FROM products WHERE sku = $1`, [rows[i].sku]);
              if (found.length) productId = found[0].id;
              else { errors.push({ row: i + 1, message: `SKU "${rows[i].sku}" not found` }); continue; }
            }
            await this.dataSource.query(
              `INSERT INTO stock_levels (product_id, warehouse_id, quantity, reserved_quantity, available_quantity, updated_at)
               VALUES ($1, $2, $3, 0, $3, NOW())
               ON CONFLICT (product_id, warehouse_id) DO UPDATE
               SET quantity = $3, available_quantity = $3 - stock_levels.reserved_quantity, updated_at = NOW()`,
              [productId, rows[i].warehouse_id, Number(rows[i].quantity)],
            );
            imported++;
            break;
          }
          case 'suppliers':
            await this.dataSource.query(
              `INSERT INTO suppliers (company_name, contact_person, email, phone, address, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
               ON CONFLICT DO NOTHING`,
              [rows[i].company_name, rows[i].contact_person || '', rows[i].email || '', rows[i].phone || '', rows[i].address || ''],
            );
            imported++;
            break;
        }
      } catch (err: any) {
        errors.push({ row: i + 1, message: err?.message || 'Import error' });
      }
    }

    return { imported, errors };
  }

  // ── 6.5 Inventory Audit Trail ─────────────────────

  async getAuditTrail(filters: {
    productId?: number;
    warehouseId?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.productId) {
      conditions.push(`sm.product_id = $${paramIdx++}`);
      params.push(filters.productId);
    }
    if (filters.warehouseId) {
      conditions.push(`(sm.source_warehouse_id = $${paramIdx} OR sm.dest_warehouse_id = $${paramIdx++})`);
      params.push(filters.warehouseId);
    }
    if (filters.dateFrom) {
      conditions.push(`sm.created_at >= $${paramIdx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`sm.created_at <= $${paramIdx++}`);
      params.push(filters.dateTo);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;

    return this.dataSource.query(
      `SELECT sm.*, p.name as product_name, p.sku as product_sku,
              sw.name as source_warehouse_name, dw.name as dest_warehouse_name,
              u.first_name || ' ' || u.last_name as performed_by_name
       FROM stock_movements sm
       LEFT JOIN products p ON p.id = sm.product_id
       LEFT JOIN warehouses sw ON sw.id = sm.source_warehouse_id
       LEFT JOIN warehouses dw ON dw.id = sm.dest_warehouse_id
       LEFT JOIN users u ON u.id = sm.performed_by
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT ${limit}`,
      params,
    );
  }

  // ── 6.7 Warehouse Visual Map ──────────────────────

  async getWarehouseMap(warehouseId: number): Promise<any> {
    const warehouses = await this.dataSource.query(
      `SELECT * FROM warehouses WHERE id = $1`, [warehouseId],
    );
    if (!warehouses.length) throw new NotFoundException('Warehouse not found');

    const zones = await this.dataSource.query(
      `SELECT * FROM warehouse_zones WHERE warehouse_id = $1 ORDER BY name`, [warehouseId],
    );

    const locations = await this.dataSource.query(
      `SELECT wl.*, wz.name as zone_name
       FROM warehouse_locations wl
       JOIN warehouse_zones wz ON wz.id = wl.zone_id
       WHERE wz.warehouse_id = $1
       ORDER BY wz.name, wl.code`, [warehouseId],
    );

    // Get stock per location
    const stockByLocation = await this.dataSource.query(
      `SELECT sl.warehouse_id, wl.id as location_id, wl.code as location_code,
              COUNT(DISTINCT sl.product_id) as product_count,
              SUM(sl.quantity) as total_quantity
       FROM stock_levels sl
       JOIN warehouse_locations wl ON wl.id = sl.warehouse_id
       WHERE sl.warehouse_id = $1
       GROUP BY sl.warehouse_id, wl.id, wl.code`, [warehouseId],
    );

    const stockMap: Record<number, any> = {};
    for (const s of stockByLocation) {
      stockMap[s.location_id] = { product_count: s.product_count, total_quantity: s.total_quantity };
    }

    const zonesWithLocations = zones.map((z: any) => ({
      ...z,
      locations: locations
        .filter((l: any) => l.zone_id === z.id)
        .map((l: any) => ({
          ...l,
          stock: stockMap[l.id] || { product_count: 0, total_quantity: 0 },
        })),
    }));

    return {
      warehouse: warehouses[0],
      zones: zonesWithLocations,
      summary: {
        total_zones: zones.length,
        total_locations: locations.length,
        occupied_locations: stockByLocation.length,
      },
    };
  }
}
