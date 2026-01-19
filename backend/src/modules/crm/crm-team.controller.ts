import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
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
  async convertLead(@Param('customerId') customerId: string, @Request() req: any) {
    return await this.crmTeamService.convertLeadToCustomer(customerId, req.user.id);
  }

  @Get('leads')
  @RequirePermissions('receive-new-leads')
  async getTeamLeads(@Query() query: any, @Request() req: any) {
    return await this.crmTeamService.getTeamLeads(req.user.id, query);
  }

  @Get('agent/:agentId/customers')
  @RequirePermissions('view-team-follow-ups')
  async getAgentCustomers(@Param('agentId') agentId: number, @Query() query: any) {
    return await this.crmTeamService.getAgentCustomers(agentId, query);
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

  @Post('teams/:teamId/assign-agent')
  @RequirePermissions('assign-leads-to-team')
  async assignAgentToTeam(
    @Param('teamId') teamId: string,
    @Body() body: { agentId: number },
    @Request() req: any,
  ) {
    return await this.crmTeamService.assignAgentToTeam(req.user.id, Number(teamId), body.agentId);
  }
}
