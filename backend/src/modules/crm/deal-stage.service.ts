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
    const stage = this.dealStageRepository.create(data);
    return await this.dealStageRepository.save(stage);
  }

  async update(id: number, data: Partial<DealStage>): Promise<DealStage | null> {
    await this.dealStageRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.dealStageRepository.delete(id);
  }
}
