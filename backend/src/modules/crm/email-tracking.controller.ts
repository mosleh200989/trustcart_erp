import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailTrackingService } from './email-tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CommunicationsService } from './communications.service';

@Controller('crm/emails')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailTrackingController {
  constructor(
    private readonly emailTrackingService: EmailTrackingService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    return await this.communicationsService.sendEmail({
      customerId: data.customerId,
      toAddress: data.toAddress,
      subject: data.subject,
      body: data.body,
      ccAddresses: data.ccAddresses,
      bccAddresses: data.bccAddresses,
      templateId: data.templateId,
      templateUsed: data.templateUsed,
      variables: data.variables,
      sentBy: req.user.id,
    });
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

  @Get(':id/pixel')
  @Public()
  async openTrackingPixel(@Param('id') id: number, @Res({ passthrough: true }) res: Response) {
    await this.emailTrackingService.markAsOpened(id);
    // 1x1 transparent GIF
    const gif = Buffer.from(
      'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64',
    );
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return gif;
  }

  @Put(':id/clicked')
  @Public()
  async markAsClicked(@Param('id') id: number, @Body('link') link: string) {
    return await this.emailTrackingService.markAsClicked(id, link);
  }

  @Get(':id/click')
  @Public()
  async clickRedirect(
    @Param('id') id: number,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    const decoded = decodeURIComponent(url || '');
    if (!/^https?:\/\//i.test(decoded)) {
      return res.status(400).send('Invalid url');
    }

    await this.emailTrackingService.markAsClicked(id, decoded);
    return res.redirect(decoded);
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
