import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { DealStageService } from './deal-stage.service';
import { DealStage } from './entities/deal-stage.entity';

@Controller('crm/deal-stages')
@Public()
export class DealStageController {
  constructor(private readonly dealStageService: DealStageService) {}

  @Get()
  async findAll(): Promise<DealStage[]> {
    return await this.dealStageService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<DealStage | null> {
    return await this.dealStageService.findOne(id);
  }

  @Post()
  async create(@Body() data: Partial<DealStage>): Promise<DealStage> {
    return await this.dealStageService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: number, @Body() data: Partial<DealStage>): Promise<DealStage | null> {
    return await this.dealStageService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return await this.dealStageService.delete(id);
  }
}
