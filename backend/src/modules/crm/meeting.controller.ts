import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/meetings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    data.organizerId = req.user.id;
    return await this.meetingService.create(data);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const filters: any = {};
    
    if (query.my === 'true') {
      filters.organizerId = req.user.id;
    } else if (query.organizerId) {
      filters.organizerId = query.organizerId;
    }

    if (query.customerId) filters.customerId = query.customerId;
    if (query.dealId) filters.dealId = query.dealId;
    if (query.status) filters.status = query.status;
    if (query.upcoming === 'true') filters.upcoming = true;

    return await this.meetingService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.meetingService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return await this.meetingService.update(id, data);
  }

  @Put(':id/complete')
  async complete(@Param('id') id: number, @Body() data: any) {
    return await this.meetingService.complete(id, data);
  }

  @Put(':id/cancel')
  async cancel(@Param('id') id: number) {
    return await this.meetingService.cancel(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.meetingService.delete(id);
    return { message: 'Meeting deleted successfully' };
  }
}
