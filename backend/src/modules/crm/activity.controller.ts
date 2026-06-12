import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/activities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  private canModerateNotes(req: any): boolean {
    const roleSlug = String(req.user?.roleSlug || '').toLowerCase();
    return ['super-admin', 'admin', 'data-analyst'].includes(roleSlug);
  }

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

  @Get('recent')
  async getRecent(
    @Query('userId') userId?: number,
    @Query('rangeDays') rangeDays?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.activityService.getRecentActivities({
      userId,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      limit: limit != null ? Number(limit) : 10,
    });
  }

  @Get('customer/:customerId/notes')
  async getCustomerNotes(@Param('customerId') customerId: number) {
    return await this.activityService.findCustomerNotes(Number(customerId));
  }

  @Post('customer/:customerId/notes')
  async createCustomerNote(
    @Param('customerId') customerId: number,
    @Body() body: { note: string; subject?: string },
    @Request() req: any,
  ) {
    return await this.activityService.createCustomerNote({
      customerId: Number(customerId),
      userId: req.user.id,
      note: body.note,
      subject: body.subject,
    });
  }

  @Put('customer-notes/:id')
  async updateCustomerNote(@Param('id') id: number, @Body() body: { note?: string; subject?: string }, @Request() req: any) {
    if (!this.canModerateNotes(req)) {
      throw new ForbiddenException('Only Data Analysts can edit customer notes');
    }
    return await this.activityService.updateCustomerNote(Number(id), body);
  }

  @Delete('customer-notes/:id')
  async deleteCustomerNote(@Param('id') id: number, @Request() req: any) {
    if (!this.canModerateNotes(req)) {
      throw new ForbiddenException('Only Data Analysts can delete customer notes');
    }
    await this.activityService.deleteCustomerNote(Number(id));
    return { message: 'Customer note deleted successfully' };
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
