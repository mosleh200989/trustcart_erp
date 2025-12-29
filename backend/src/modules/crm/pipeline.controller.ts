import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('crm/pipelines')
@Public()
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  getAllPipelines() {
    return this.pipelineService.getAllPipelines();
  }

  @Get(':id')
  getPipelineById(@Param('id') id: number) {
    return this.pipelineService.getPipelineById(id);
  }

  @Post()
  async createPipeline(@Body() data: any) {
    try {
      return await this.pipelineService.createPipeline(data);
    } catch (error) {
      throw new Error(`Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id')
  updatePipeline(@Param('id') id: number, @Body() data: any) {
    return this.pipelineService.updatePipeline(id, data);
  }

  @Delete(':id')
  deletePipeline(@Param('id') id: number) {
    return this.pipelineService.deletePipeline(id);
  }

  @Get(':id/stages')
  getStagesByPipeline(@Param('id') pipelineId: number) {
    return this.pipelineService.getStagesByPipeline(pipelineId);
  }

  @Get(':id/stats')
  getStageStats(@Param('id') pipelineId: number) {
    return this.pipelineService.getStageStats(pipelineId);
  }

  @Post('stages')
  async createStage(@Body() data: any) {
    try {
      return await this.pipelineService.createStage(data);
    } catch (error) {
      throw new Error(`Failed to create stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put('stages/:id')
  updateStage(@Param('id') id: number, @Body() data: any) {
    return this.pipelineService.updateStage(id, data);
  }

  @Delete('stages/:id')
  deleteStage(@Param('id') id: number) {
    return this.pipelineService.deleteStage(id);
  }

  @Post(':id/stages/reorder')
  reorderStages(@Param('id') pipelineId: number, @Body() body: { stageIds?: number[], stageOrders?: Array<{id: number, position: number}> }) {
    const stageIds = body.stageIds || (body.stageOrders?.map(s => s.id) || []);
    return this.pipelineService.reorderStages(pipelineId, stageIds);
  }
}
