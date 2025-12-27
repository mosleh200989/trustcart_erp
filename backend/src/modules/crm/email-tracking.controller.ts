import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EmailTrackingService } from './email-tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('crm/emails')
@UseGuards(JwtAuthGuard)
export class EmailTrackingController {
  constructor(private readonly emailTrackingService: EmailTrackingService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    data.sentBy = req.user.id;
    data.sentAt = new Date();
    return await this.emailTrackingService.create(data);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const filters: any = {};
    
    if (query.my === 'true') {
      filters.sentBy = req.user.id;
    } else if (query.sentBy) {
      filters.sentBy = query.sentBy;
    }

    if (query.customerId) filters.customerId = query.customerId;

    return await this.emailTrackingService.findAll(filters);
  }

  @Get('stats')
  async getStats(@Request() req: any, @Query('userId') userId?: number) {
    return await this.emailTrackingService.getEmailStats(userId || req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.emailTrackingService.findOne(id);
  }

  @Put(':id/opened')
  @Public()
  async markAsOpened(@Param('id') id: number) {
    return await this.emailTrackingService.markAsOpened(id);
  }

  @Put(':id/clicked')
  @Public()
  async markAsClicked(@Param('id') id: number, @Body('link') link: string) {
    return await this.emailTrackingService.markAsClicked(id, link);
  }

  @Put(':id/replied')
  async markAsReplied(@Param('id') id: number) {
    return await this.emailTrackingService.markAsReplied(id);
  }

  @Put(':id/bounced')
  async markAsBounced(@Param('id') id: number) {
    return await this.emailTrackingService.markAsBounced(id);
  }
}
