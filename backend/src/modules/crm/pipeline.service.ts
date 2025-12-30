import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomDealStage } from './entities/custom-deal-stage.entity';
import { SalesPipeline } from './entities/sales-pipeline.entity';

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(CustomDealStage)
    private stageRepository: Repository<CustomDealStage>,
    @InjectRepository(SalesPipeline)
    private pipelineRepository: Repository<SalesPipeline>,
  ) {}

  // Pipeline Management
  async getAllPipelines() {
    return this.pipelineRepository.find({
      where: { isActive: true },
      relations: ['stages'],
      order: { id: 'ASC' }
    });
  }

  async getPipelineById(id: number) {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id },
      relations: ['stages']
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async createPipeline(data: Partial<SalesPipeline>) {
    const pipeline = this.pipelineRepository.create(data);
    return this.pipelineRepository.save(pipeline);
  }

  async updatePipeline(id: number, data: Partial<SalesPipeline>) {
    await this.pipelineRepository.update(id, data);
    return this.getPipelineById(id);
  }

  async deletePipeline(id: number) {
    const pipeline = await this.getPipelineById(id);
    if (pipeline.isDefault) {
      throw new Error('Cannot delete default pipeline');
    }
    pipeline.isActive = false;
    return this.pipelineRepository.save(pipeline);
  }

  // Stage Management
  async getStagesByPipeline(pipelineId: number) {
    return this.stageRepository.find({
      where: { pipelineId, isActive: true },
      order: { position: 'ASC' }
    });
  }

  async getStageById(id: number) {
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) throw new NotFoundException('Stage not found');
    return stage;
  }

  async createStage(data: Partial<CustomDealStage>) {
    // Get max position for this pipeline
    const maxPosition = await this.stageRepository
      .createQueryBuilder('stage')
      .select('MAX(stage.position)', 'max')
      .where('stage.pipelineId = :pipelineId', { pipelineId: data.pipelineId })
      .getRawOne();
    
    const stage = this.stageRepository.create({
      ...data,
      position: (maxPosition?.max || 0) + 1
    });
    return this.stageRepository.save(stage);
  }

  async updateStage(id: number, data: Partial<CustomDealStage>) {
    const stage = await this.getStageById(id);
    if (stage.isSystem && data.name) {
      throw new Error('Cannot rename system stages');
    }
    await this.stageRepository.update(id, data);
    return this.getStageById(id);
  }

  async deleteStage(id: number) {
    const stage = await this.getStageById(id);
    if (stage.isSystem) {
      throw new Error('Cannot delete system stages');
    }
    stage.isActive = false;
    return this.stageRepository.save(stage);
  }

  async reorderStages(pipelineId: number, stageIds: number[]) {
    const stages = await this.getStagesByPipeline(pipelineId);
    const updates = stageIds.map((stageId, index) => {
      const stage = stages.find(s => s.id === stageId);
      if (stage) {
        stage.position = index + 1;
        return this.stageRepository.save(stage);
      }
    });
    await Promise.all(updates);
    return this.getStagesByPipeline(pipelineId);
  }

  async getStageStats(pipelineId: number) {
    const stages = await this.getStagesByPipeline(pipelineId);
    
    const stats = await Promise.all(
      stages.map(async (stage) => {
        const dealCount = await this.stageRepository.manager
          .createQueryBuilder()
          .select('COUNT(*)', 'count')
          .from('deals', 'deal')
          .where('deal.stage = :stageName', { stageName: stage.name })
          .andWhere('deal.pipelineId = :pipelineId', { pipelineId })
          .getRawOne();

        const totalValue = await this.stageRepository.manager
          .createQueryBuilder()
          .select('COALESCE(SUM(deal.value), 0)', 'total')
          .from('deals', 'deal')
          .where('deal.stage = :stageName', { stageName: stage.name })
          .andWhere('deal.pipelineId = :pipelineId', { pipelineId })
          .getRawOne();

        return {
          stage,
          dealCount: parseInt(dealCount.count),
          totalValue: parseFloat(totalValue.total)
        };
      })
    );

    return stats;
  }
}
