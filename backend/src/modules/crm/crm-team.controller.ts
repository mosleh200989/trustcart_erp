import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CrmTeamService } from './crm-team.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('crm/team')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmTeamController {
  constructor(private readonly crmTeamService: CrmTeamService) {}

  @Post('leads/:customerId/assign')
  @RequirePermissions('assign-leads-to-team')
  async assignLead(@Param('customerId') customerId: string, @Body() body: any, @Request() req: any) {
    return await this.crmTeamService.assignLeadToAgent(customerId, body.agentId, req.user.id);
  }

  @Post('leads/bulk-assign')
  @RequirePermissions('assign-leads-to-team')
  async bulkAssignLeads(@Body() body: { customerIds: (number | string)[]; agentId: number }, @Request() req: any) {
    return await this.crmTeamService.bulkAssignLeads(body.customerIds, body.agentId, req.user.id);
  }

  @Get('agents/search')
  @RequirePermissions('view-team-leader-dashboard')
  async searchAgents(@Query('q') searchTerm: string, @Request() req: any) {
    return await this.crmTeamService.searchAgents(req.user.id, searchTerm || '');
  }

  @Put('leads/:customerId/reassign')
  @RequirePermissions('reassign-customers')
  async reassignCustomer(@Param('customerId') customerId: string, @Body() body: any, @Request() req: any) {
    return await this.crmTeamService.reassignCustomer(customerId, body.newAgentId, req.user.id);
  }

  @Put('leads/:customerId/priority')
  @RequirePermissions('set-lead-priority')
  async setLeadPriority(@Param('customerId') customerId: string, @Body() body: any) {
    return await this.crmTeamService.setLeadPriority(customerId, body.priority);
  }

  @Post('leads/:customerId/convert')
  @RequirePermissions('edit-leads')
  async convertLead(
    @Param('customerId') customerId: string, 
    @Body() body: any,
    @Request() req: any
  ) {
    return await this.crmTeamService.convertLeadToCustomer(customerId, req.user.id, {
      customerType: body?.customerType,
    });
  }

  @Get('leads')
  @RequirePermissions('receive-new-leads')
  async getTeamLeads(@Query() query: any, @Request() req: any) {
    return await this.crmTeamService.getTeamLeads(req.user.id, query);
  }

  // Agent self view (no RBAC permission required; returns only own customers)
  // NOTE: Must be declared before the dynamic `agent/:agentId/...` route.
  @Get('agent/me/customers')
  async getMyCustomers(@Query() query: any, @Request() req: any) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    return await this.crmTeamService.getAgentCustomers(agentId, query);
  }

  @Get('agent/:agentId/customers')
  async getAgentCustomers(@Param('agentId') agentId: string, @Query() query: any, @Request() req: any) {
    const requesterId = Number(req.user?.id ?? req.user?.userId);
    return await this.crmTeamService.getAgentCustomersForRequester(
      { id: requesterId, roleSlug: req.user?.roleSlug },
      Number(agentId),
      query,
    );
  }

  @Get('performance')
  @RequirePermissions('view-team-performance')
  async getTeamPerformance(@Request() req: any) {
    return await this.crmTeamService.getTeamPerformance(req.user.id);
  }

  @Get('escalations')
  @RequirePermissions('handle-escalations')
  async getEscalatedCustomers(@Request() req: any) {
    return await this.crmTeamService.getEscalatedCustomers(req.user.id);
  }

  @Get('dashboard')
  @RequirePermissions('view-team-leader-dashboard')
  async getTeamLeaderDashboard(@Request() req: any) {
    return await this.crmTeamService.getTeamLeaderDashboard(req.user.id);
  }

  @Post('ops/generate-calls')
  @RequirePermissions('view-team-leader-dashboard')
  async generateDailyAutoCalls(
    @Body()
    body: {
      date?: string;
      perAgentLimit?: number;
      reminderQuota?: number;
      offerQuota?: number;
      followupQuota?: number;
    },
    @Request() req: any,
  ) {
    return await this.crmTeamService.generateDailyAutoCalls(req.user.id, body);
  }

  @Get('lead-aging')
  @RequirePermissions('view-team-leader-dashboard')
  async getLeadAging(@Request() req: any) {
    return await this.crmTeamService.getLeadAging(req.user.id);
  }

  @Get('missed-followups')
  @RequirePermissions('monitor-missed-follow-ups')
  async getMissedFollowups(@Request() req: any) {
    return await this.crmTeamService.getMissedFollowups(req.user.id);
  }

  // ==================== TEAM MANAGEMENT ====================

  @Get('teams')
  @RequirePermissions('view-team-leader-dashboard')
  async getTeams(@Request() req: any) {
    return await this.crmTeamService.getTeamsForLeader(req.user.id);
  }

  @Post('teams')
  @RequirePermissions('view-team-leader-dashboard')
  async createTeam(@Body() body: { name: string; code?: string }, @Request() req: any) {
    return await this.crmTeamService.createTeam(req.user.id, body);
  }

  @Put('teams/:teamId')
  @RequirePermissions('view-team-leader-dashboard')
  async updateTeam(
    @Param('teamId') teamId: string,
    @Body() body: { name?: string; code?: string | null },
    @Request() req: any,
  ) {
    return await this.crmTeamService.updateTeam(req.user.id, Number(teamId), body);
  }

  @Delete('teams/:teamId')
  @RequirePermissions('view-team-leader-dashboard')
  async deleteTeam(@Param('teamId') teamId: string, @Request() req: any) {
    return await this.crmTeamService.deleteTeam(req.user.id, Number(teamId));
  }

  @Post('teams/:teamId/assign-agent')
  @RequirePermissions('assign-leads-to-team')
  async assignAgentToTeam(
    @Param('teamId') teamId: string,
    @Body() body: { agentId: number },
    @Request() req: any,
  ) {
    return await this.crmTeamService.assignAgentToTeam(req.user.id, Number(teamId), body.agentId);
  }

  @Get('available-agents')
  @RequirePermissions('view-team-leader-dashboard')
  async getAvailableAgents(@Request() req: any) {
    return await this.crmTeamService.getAvailableAgentsForTeamLeader(req.user.id);
  }

  // ==================== TEAM AGENT REPORTS ====================

  @Get('agents')
  @RequirePermissions('view-team-leader-dashboard')
  async getTeamAgents(@Request() req: any) {
    return await this.crmTeamService.getTeamAgents(req.user.id);
  }

  @Get('agents/report')
  @RequirePermissions('view-team-leader-dashboard')
  async getTeamAgentsReport(@Query() query: any, @Request() req: any) {
    return await this.crmTeamService.getTeamAgentsReport(req.user.id, {
      from: query.from,
      to: query.to,
    });
  }

  @Get('agents/:agentId/history')
  @RequirePermissions('view-team-leader-dashboard')
  async getAgentHistory(
    @Param('agentId') agentId: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return await this.crmTeamService.getAgentHistory(req.user.id, Number(agentId), {
      from: query.from,
      to: query.to,
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('agents/:agentId/report')
  @RequirePermissions('view-team-leader-dashboard')
  async getAgentReport(
    @Param('agentId') agentId: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return await this.crmTeamService.getAgentReport(req.user.id, Number(agentId), {
      from: query.from,
      to: query.to,
    });
  }

  // ==================== DASHBOARD CONFIG ENDPOINTS ====================

  @Get('dashboard/config')
  @RequirePermissions('view-team-leader-dashboard')
  async getAllDashboardConfigs(@Request() req: any) {
    return await this.crmTeamService.getAllDashboardConfigs(req.user.id);
  }

  @Get('dashboard/config/:configKey')
  @RequirePermissions('view-team-leader-dashboard')
  async getDashboardConfig(
    @Param('configKey') configKey: string,
    @Request() req: any,
  ) {
    return await this.crmTeamService.getDashboardConfig(req.user.id, configKey);
  }

  @Put('dashboard/config/:configKey')
  @RequirePermissions('manage-team-members') // Only team leaders can edit
  async saveDashboardConfig(
    @Param('configKey') configKey: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return await this.crmTeamService.saveDashboardConfig(req.user.id, configKey, body.value);
  }

  @Delete('dashboard/config/:configKey')
  @RequirePermissions('manage-team-members') // Only team leaders can delete
  async deleteDashboardConfig(
    @Param('configKey') configKey: string,
    @Request() req: any,
  ) {
    return await this.crmTeamService.deleteDashboardConfig(req.user.id, configKey);
  }
}
