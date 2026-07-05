import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RbacService } from '../rbac/rbac.service';
import { TelephonyService } from './telephony.service';
import { TelephonyReportsService } from './telephony-reports.service';

@Controller('telephony')
export class TelephonyController {
  constructor(
    private readonly telephonyService: TelephonyService,
    private readonly telephonyReports: TelephonyReportsService,
    private readonly rbacService: RbacService,
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view-call-logs')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view-call-logs')
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

  @Get('order-assignments')
  @UseGuards(JwtAuthGuard)
  async listMyOrderAssignments(
    @Req() req: ExpressRequest,
    @Query('assignmentType') assignmentType?: string,
    @Query('q') q?: string,
    @Query('productName') productName?: string,
    @Query('customerType') customerType?: string,
    @Query('status') status?: string,
    @Query('calledStatus') calledStatus?: string,
    @Query('outcome') outcome?: string,
    @Query('suggestion') suggestion?: string,
    @Query('foreignOnly') foreignOnly?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = Number((req as any).user?.id);
    const canViewCallLogs = await this.rbacService.checkPermission(userId, 'view-call-logs');
    return this.telephonyService.listMyOrderAssignments(Number((req as any).user?.id), {
      assignmentType,
      q,
      productName,
      customerType,
      status,
      calledStatus,
      outcome,
      suggestion,
      foreignOnly: foreignOnly === 'true',
      startDate,
      endDate,
      page: page != null ? Number(page) : undefined,
      limit: limit != null ? Number(limit) : undefined,
      includeCallLogs: canViewCallLogs,
    });
  }

  @Post('order-assignments/:orderId/outcome')
  @UseGuards(JwtAuthGuard)
  async updateOrderAssignmentOutcome(
    @Req() req: ExpressRequest,
    @Param('orderId') orderId: string,
    @Body() body: { assignmentType?: string; outcome?: string; suggestion?: string; notes?: string },
  ) {
    return this.telephonyService.updateOrderAssignmentOutcome(Number((req as any).user?.id), Number(orderId), body);
  }

  @Get('order-assignments/:orderId/call-history')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view-call-logs')
  async listOrderAssignmentCallHistory(
    @Req() req: ExpressRequest,
    @Param('orderId') orderId: string,
    @Query('assignmentType') assignmentType?: string,
  ) {
    return this.telephonyService.listOrderAssignmentCallHistory(
      Number((req as any).user?.id),
      Number(orderId),
      assignmentType,
    );
  }

  @Post('order-assignments/:orderId/unreachable-handoff')
  @UseGuards(JwtAuthGuard)
  async handoffUnreachableOrderAssignment(
    @Req() req: ExpressRequest,
    @Param('orderId') orderId: string,
    @Body() body: { outcome?: string; notes?: string },
  ) {
    return this.telephonyService.handoffUnreachableOrderAssignment(Number((req as any).user?.id), Number(orderId), body);
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('view-call-logs')
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
