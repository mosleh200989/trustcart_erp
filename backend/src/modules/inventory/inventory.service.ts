import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from './entities/stock-level.entity';
import { StockBatch } from './entities/stock-batch.entity';
import { StockAlert } from './entities/stock-alert.entity';
import { ReorderRule } from './entities/reorder-rule.entity';
import { StockQueryDto } from './dto/stock-query.dto';
import { CreateReorderRuleDto } from './dto/create-reorder-rule.dto';

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
}
