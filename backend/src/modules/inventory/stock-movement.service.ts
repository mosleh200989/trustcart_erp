import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockMovement } from './entities/stock-movement.entity';
import { StockLevel } from './entities/stock-level.entity';

export interface RecordMovementParams {
  movement_type: string;
  product_id: number;
  variant_key?: string;
  batch_id?: number;
  source_warehouse_id?: number;
  source_location_id?: number;
  destination_warehouse_id?: number;
  destination_location_id?: number;
  quantity: number;
  unit_cost?: number;
  reason?: string;
  notes?: string;
  related_document_type?: string;
  related_document_id?: number;
  performed_by: number;
}

@Injectable()
export class StockMovementService {
  constructor(
    @InjectRepository(StockMovement)
    private movementRepo: Repository<StockMovement>,
    @InjectRepository(StockLevel)
    private stockLevelRepo: Repository<StockLevel>,
    private dataSource: DataSource,
  ) {}

  async getMovements(filters: {
    product_id?: number;
    warehouse_id?: number;
    movement_type?: string;
    limit?: number;
  }): Promise<StockMovement[]> {
    const qb = this.movementRepo.createQueryBuilder('m');

    if (filters.product_id) qb.andWhere('m.product_id = :pid', { pid: filters.product_id });
    if (filters.warehouse_id) {
      qb.andWhere('(m.source_warehouse_id = :wid OR m.destination_warehouse_id = :wid)', { wid: filters.warehouse_id });
    }
    if (filters.movement_type) qb.andWhere('m.movement_type = :mt', { mt: filters.movement_type });

    qb.orderBy('m.created_at', 'DESC');
    if (filters.limit) qb.take(filters.limit);

    return qb.getMany();
  }

  async getMovement(id: number): Promise<StockMovement> {
    const movement = await this.movementRepo.findOne({ where: { id } });
    if (!movement) throw new NotFoundException(`Stock movement #${id} not found`);
    return movement;
  }

  async recordMovement(params: RecordMovementParams): Promise<StockMovement> {
    return this.dataSource.transaction(async (manager) => {
      // Generate reference number
      const refNumber = await this.generateReferenceNumber(manager);

      // Determine balance before/after based on movement direction
      const isInbound = ['receipt', 'sales_return', 'transfer_in', 'adjustment_increase', 'production_output', 'opening_balance'].includes(params.movement_type);
      const warehouseId = isInbound ? params.destination_warehouse_id : params.source_warehouse_id;

      let balanceBefore = 0;
      if (warehouseId) {
        const existing = await manager.findOne(StockLevel, {
          where: {
            product_id: params.product_id,
            warehouse_id: warehouseId,
          },
        });
        balanceBefore = existing?.quantity ?? 0;
      }

      const balanceAfter = isInbound
        ? balanceBefore + params.quantity
        : balanceBefore - params.quantity;

      // Create movement record
      const movement = manager.create(StockMovement, {
        reference_number: refNumber,
        movement_type: params.movement_type,
        product_id: params.product_id,
        variant_key: params.variant_key,
        batch_id: params.batch_id,
        source_warehouse_id: params.source_warehouse_id,
        source_location_id: params.source_location_id,
        destination_warehouse_id: params.destination_warehouse_id,
        destination_location_id: params.destination_location_id,
        quantity: params.quantity,
        unit_cost: params.unit_cost,
        total_cost: params.unit_cost ? params.unit_cost * params.quantity : undefined,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reason: params.reason,
        notes: params.notes,
        related_document_type: params.related_document_type,
        related_document_id: params.related_document_id,
        performed_by: params.performed_by,
      });
      const saved = await manager.save(StockMovement, movement);

      // Update stock level
      if (warehouseId) {
        await this.updateStockLevel(manager, {
          product_id: params.product_id,
          variant_key: params.variant_key,
          warehouse_id: warehouseId,
          location_id: isInbound ? params.destination_location_id : params.source_location_id,
          batch_id: params.batch_id,
          quantity_change: isInbound ? params.quantity : -params.quantity,
          cost_price: params.unit_cost,
        });
      }

      return saved;
    });
  }

  private async updateStockLevel(
    manager: any,
    params: {
      product_id: number;
      variant_key?: string;
      warehouse_id: number;
      location_id?: number;
      batch_id?: number;
      quantity_change: number;
      cost_price?: number;
    },
  ): Promise<void> {
    let level = await manager.findOne(StockLevel, {
      where: {
        product_id: params.product_id,
        warehouse_id: params.warehouse_id,
      },
    });

    if (level) {
      level.quantity = level.quantity + params.quantity_change;
      if (params.cost_price) level.cost_price = params.cost_price;
      await manager.save(StockLevel, level);
    } else {
      const newLevel = manager.create(StockLevel, {
        product_id: params.product_id,
        variant_key: params.variant_key,
        warehouse_id: params.warehouse_id,
        location_id: params.location_id,
        batch_id: params.batch_id,
        quantity: Math.max(0, params.quantity_change),
        cost_price: params.cost_price,
      });
      await manager.save(StockLevel, newLevel);
    }
  }

  private async generateReferenceNumber(manager: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SM-${dateStr}-`;

    const last = await manager
      .createQueryBuilder(StockMovement, 'm')
      .where('m.reference_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('m.reference_number', 'DESC')
      .getOne();

    let seq = 1;
    if (last) {
      const parts = last.reference_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
