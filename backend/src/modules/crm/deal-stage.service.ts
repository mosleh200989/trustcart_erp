import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealStage } from './entities/deal-stage.entity';

@Injectable()
export class DealStageService {
  constructor(
    @InjectRepository(DealStage)
    private dealStageRepository: Repository<DealStage>,
  ) {}

  async findAll(): Promise<DealStage[]> {
    return await this.dealStageRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  async findOne(id: number): Promise<DealStage | null> {
    return await this.dealStageRepository.findOne({
      where: { id },
    });
  }

  async create(data: Partial<DealStage>): Promise<DealStage> {
    // Shift existing stages with same or greater displayOrder
    if (data.displayOrder !== undefined) {
      await this.shiftDisplayOrders(data.displayOrder);
    }
    
    const stage = this.dealStageRepository.create(data);
    return await this.dealStageRepository.save(stage);
  }

  async update(id: number, data: Partial<DealStage>): Promise<DealStage | null> {
    // If displayOrder is being changed, shift other stages
    if (data.displayOrder !== undefined) {
      const existing = await this.findOne(id);
      if (existing && existing.displayOrder !== data.displayOrder) {
        await this.shiftDisplayOrders(data.displayOrder, id);
      }
    }
    
    await this.dealStageRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.dealStageRepository.delete(id);
  }

  /**
   * Shift displayOrder of stages >= the given order by +1
   */
  private async shiftDisplayOrders(fromOrder: number, excludeId?: number): Promise<void> {
    let query = this.dealStageRepository
      .createQueryBuilder()
      .update(DealStage)
      .set({ displayOrder: () => 'display_order + 1' })
      .where('display_order >= :fromOrder', { fromOrder });
    
    if (excludeId) {
      query = query.andWhere('id != :excludeId', { excludeId });
    }
    
    await query.execute();
  }
}
