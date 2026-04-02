import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SalesManagerService } from './sales-manager.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('crm/sales-manager')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesManagerController {
  constructor(private readonly salesManagerService: SalesManagerService) {}

  @Get('dashboard')
  @RequirePermissions('view-sales-manager-dashboard')
  async getDashboard() {
    return await this.salesManagerService.getDashboard();
  }

  @Get('team-leaders')
  @RequirePermissions('view-sales-manager-dashboard')
  async getTeamLeaders() {
    return await this.salesManagerService.getTeamLeadersForManager();
  }

  @Get('unassigned-leads')
  @RequirePermissions('view-sales-manager-dashboard')
  async getUnassignedLeads(@Query() query: any) {
    return await this.salesManagerService.getUnassignedLeads(query);
  }

  @Post('assign-leads')
  @RequirePermissions('view-sales-manager-dashboard')
  async assignLeadsToTeamLeader(
    @Body() body: { customerIds: number[]; teamLeaderId: number },
    @Request() req: any,
  ) {
    return await this.salesManagerService.assignLeadToTeamLeader(
      body.customerIds,
      body.teamLeaderId,
      req.user.id,
    );
  }

  @Post('reassign-leads')
  @RequirePermissions('view-sales-manager-dashboard')
  async reassignLeads(
    @Body() body: { customerIds: number[]; fromTeamLeaderId: number; toTeamLeaderId: number },
    @Request() req: any,
  ) {
    return await this.salesManagerService.reassignLeadsBetweenTeamLeaders(
      body.customerIds,
      body.fromTeamLeaderId,
      body.toTeamLeaderId,
      req.user.id,
    );
  }

  @Post('unassign-leads')
  @RequirePermissions('view-sales-manager-dashboard')
  async unassignLeads(
    @Body() body: { customerIds: number[] },
    @Request() req: any,
  ) {
    return await this.salesManagerService.unassignLeadsFromTeamLeader(
      body.customerIds,
      req.user.id,
    );
  }
}
