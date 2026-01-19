import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelephonyService } from './telephony.service';
import { TelephonyReportsService } from './telephony-reports.service';

@Controller('telephony')
export class TelephonyController {
  constructor(
    private readonly telephonyService: TelephonyService,
    private readonly telephonyReports: TelephonyReportsService,
  ) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Query('rangeDays') rangeDays?: string, @Query('agentUserId') agentUserId?: string) {
    return this.telephonyService.getDashboardStats({
      rangeDays: rangeDays != null ? Number(rangeDays) : 30,
      agentUserId: agentUserId != null ? Number(agentUserId) : undefined,
    });
  }

  @Get('calls')
  @UseGuards(JwtAuthGuard)
  async listCalls(
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('agentUserId') agentUserId?: string,
    @Query('customerPhone') customerPhone?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.telephonyService.listCalls({
      status,
      direction,
      agentUserId: agentUserId != null ? Number(agentUserId) : undefined,
      customerPhone,
      from,
      to,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get('calls/:id')
  @UseGuards(JwtAuthGuard)
  async getCall(@Param('id') id: string) {
    return this.telephonyService.getCallById(Number(id));
  }

  @Get('agents/me/status')
  @UseGuards(JwtAuthGuard)
  async getMyStatus(@Req() req: ExpressRequest) {
    const userId = (req as any).user?.id;
    return this.telephonyService.getAgentPresence(Number(userId));
  }

  @Post('agents/me/status')
  @UseGuards(JwtAuthGuard)
  async setMyStatus(@Req() req: ExpressRequest, @Body() body: { status: any }) {
    const userId = (req as any).user?.id;
    return this.telephonyService.setAgentPresence(Number(userId), body.status);
  }

  @Get('agents/status')
  @UseGuards(JwtAuthGuard)
  async listAgentStatus(@Query('teamId') teamId?: string) {
    return this.telephonyService.listAgentPresence({ teamId: teamId != null ? Number(teamId) : undefined });
  }

  @Post('calls/initiate')
  @UseGuards(JwtAuthGuard)
  async initiateCall(@Body() body: { taskId: number; agentUserId?: number; agentPhone?: string }) {
    return this.telephonyService.initiateCall({
      taskId: Number(body.taskId),
      agentUserId: body.agentUserId != null ? Number(body.agentUserId) : undefined,
      agentPhone: body.agentPhone,
    });
  }

  // =========================
  // Advanced Reporting Suite
  // =========================

  @Get('reports/cdr')
  @UseGuards(JwtAuthGuard)
  async getCdr(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rangeDays') rangeDays?: string,
    @Query('agentUserId') agentUserId?: string,
    @Query('direction') direction?: string,
    @Query('status') status?: string,
    @Query('queueName') queueName?: string,
    @Query('trunkName') trunkName?: string,
    @Query('disposition') disposition?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.telephonyReports.getCdr({
      from,
      to,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      agentUserId: agentUserId != null ? Number(agentUserId) : undefined,
      direction,
      status,
      queueName,
      trunkName,
      disposition,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get('reports/queues')
  @UseGuards(JwtAuthGuard)
  async getQueueReport(@Query('from') from?: string, @Query('to') to?: string, @Query('rangeDays') rangeDays?: string) {
    return this.telephonyReports.getQueueReport({ from, to, rangeDays: rangeDays != null ? Number(rangeDays) : undefined });
  }

  @Get('reports/trunks')
  @UseGuards(JwtAuthGuard)
  async getTrunkReport(@Query('from') from?: string, @Query('to') to?: string, @Query('rangeDays') rangeDays?: string) {
    return this.telephonyReports.getTrunkReport({ from, to, rangeDays: rangeDays != null ? Number(rangeDays) : undefined });
  }

  @Get('reports/agents/calls')
  @UseGuards(JwtAuthGuard)
  async getAgentCallReport(@Query('from') from?: string, @Query('to') to?: string, @Query('rangeDays') rangeDays?: string) {
    return this.telephonyReports.getAgentCallReport({ from, to, rangeDays: rangeDays != null ? Number(rangeDays) : undefined });
  }

  @Get('reports/wait-hold')
  @UseGuards(JwtAuthGuard)
  async getWaitHoldReport(@Query('from') from?: string, @Query('to') to?: string, @Query('rangeDays') rangeDays?: string) {
    return this.telephonyReports.getWaitHoldReport({ from, to, rangeDays: rangeDays != null ? Number(rangeDays) : undefined });
  }

  @Get('reports/agents/presence')
  @UseGuards(JwtAuthGuard)
  async getAgentPresenceReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rangeDays') rangeDays?: string,
    @Query('userId') userId?: string,
  ) {
    return this.telephonyReports.getAgentPresenceReport({
      from,
      to,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      userId: userId != null ? Number(userId) : undefined,
    });
  }

  // Webhook endpoint for Bracknet to send call events/status updates
  @Post('webhook/bracknet')
  async bracknetWebhook(@Body() body: any, @Headers() headers: any) {
    return this.telephonyService.handleBracknetWebhook(body, headers);
  }
}
