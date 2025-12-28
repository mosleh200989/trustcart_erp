import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DealService } from './deal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm/deals')
@UseGuards(JwtAuthGuard)
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    data.ownerId = req.user.id;
    return await this.dealService.create(data);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const filters: any = {};
    
    if (query.my === 'true') {
      filters.ownerId = req.user.id;
    } else if (query.ownerId) {
      filters.ownerId = query.ownerId;
    }

    if (query.status) filters.status = query.status;
    if (query.stage) filters.stage = query.stage;
    if (query.priority) filters.priority = query.priority;

    return await this.dealService.findAll(filters);
  }

  @Get('pipeline-stats')
  async getPipelineStats(@Query('ownerId') ownerId?: number) {
    return await this.dealService.getPipelineStats(ownerId);
  }

  @Get('win-rate')
  async getWinRate(@Query('ownerId') ownerId?: number) {
    return await this.dealService.getWinRateStats(ownerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.dealService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return await this.dealService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.dealService.delete(id);
    return { message: 'Deal deleted successfully' };
  }
}
