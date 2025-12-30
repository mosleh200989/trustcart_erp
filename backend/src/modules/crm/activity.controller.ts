import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/activities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    data.userId = req.user.id;
    return await this.activityService.create(data);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const filters: any = {};
    
    if (query.my === 'true') {
      filters.userId = req.user.id;
    } else if (query.userId) {
      filters.userId = query.userId;
    }

    if (query.customerId) filters.customerId = query.customerId;
    if (query.dealId) filters.dealId = query.dealId;
    if (query.type) filters.type = query.type;

    return await this.activityService.findAll(filters);
  }

  @Get('stats')
  async getStats(@Query('userId') userId?: number) {
    return await this.activityService.getActivityStats(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.activityService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return await this.activityService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.activityService.delete(id);
    return { message: 'Activity deleted successfully' };
  }
}
