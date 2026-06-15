import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SalesManagerService } from './sales-manager.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAnyPermission } from '../../common/decorators/permissions.decorator';

@Controller(['crm/sales-manager', 'crm/data-analyst'])
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesManagerController {
  constructor(private readonly salesManagerService: SalesManagerService) {}

  @Get('dashboard')
  @RequireAnyPermission('view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async getDashboard() {
    return await this.salesManagerService.getDashboard();
  }

  @Get('team-leaders')
  @RequireAnyPermission('view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async getTeamLeaders() {
    return await this.salesManagerService.getTeamLeadersForManager();
  }

  @Get('agents')
  @RequireAnyPermission('view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async getAgents() {
    return await this.salesManagerService.getAgentsForDataAnalyst();
  }

  @Get('customer-tags')
  @RequireAnyPermission('view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async getCustomerTags() {
    return await this.salesManagerService.getCustomerTagsForLeadFilters();
  }

  @Get('unassigned-leads')
  @RequireAnyPermission('view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async getUnassignedLeads(@Query() query: any) {
    return await this.salesManagerService.getUnassignedLeads(query);
  }

  @Post('assign-leads')
  @RequireAnyPermission('assign-leads-data-analyst', 'view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async assignLeadsToTeamLeader(
    @Body() body: { customerIds: number[]; agentId?: number; teamLeaderId?: number },
    @Request() req: any,
  ) {
    return await this.salesManagerService.assignLeadToAgent(
      body.customerIds,
      Number(body.agentId ?? body.teamLeaderId),
      req.user.id,
    );
  }

  @Post('reassign-leads')
  @RequireAnyPermission('assign-leads-data-analyst', 'view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async reassignLeads(
    @Body() body: { customerIds: number[]; fromTeamLeaderId?: number; toTeamLeaderId?: number; fromAgentId?: number; toAgentId?: number },
    @Request() req: any,
  ) {
    return await this.salesManagerService.reassignLeadsBetweenAgents(
      body.customerIds,
      Number(body.fromAgentId ?? body.fromTeamLeaderId),
      Number(body.toAgentId ?? body.toTeamLeaderId),
      req.user.id,
    );
  }

  @Post('unassign-leads')
  @RequireAnyPermission('assign-leads-data-analyst', 'view-data-analyst-dashboard', 'view-sales-manager-dashboard')
  async unassignLeads(
    @Body() body: { customerIds: number[] },
    @Request() req: any,
  ) {
    return await this.salesManagerService.unassignLeadsFromAgent(
      body.customerIds,
      req.user.id,
    );
  }
}
