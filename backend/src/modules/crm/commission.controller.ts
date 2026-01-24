import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommissionService, CommissionSettingsDto } from './commission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('crm/commissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all commission settings (Admin)
   */
  @Get('settings')
  @RequirePermissions('manage-commission-settings')
  async getAllSettings() {
    return await this.commissionService.getAllSettings();
  }

  /**
   * Get global commission settings (Admin)
   */
  @Get('settings/global')
  @RequirePermissions('manage-commission-settings')
  async getGlobalSettings() {
    return await this.commissionService.getGlobalSettings();
  }

  /**
   * Create or update commission settings (Admin)
   */
  @Post('settings')
  @RequirePermissions('manage-commission-settings')
  async upsertSettings(@Body() dto: CommissionSettingsDto, @Request() req: any) {
    return await this.commissionService.upsertSettings(dto, req.user.id);
  }

  /**
   * Delete commission settings (Admin)
   */
  @Delete('settings/:id')
  @RequirePermissions('manage-commission-settings')
  async deleteSettings(@Param('id') id: string) {
    await this.commissionService.deleteSettings(Number(id));
    return { success: true, message: 'Commission settings deleted' };
  }

  /**
   * Get all commissions (Admin view)
   */
  @Get()
  @RequirePermissions('view-commission-reports')
  async getAllCommissions(@Query() query: any) {
    return await this.commissionService.getAllCommissions(query);
  }

  /**
   * Get commission report (Admin)
   */
  @Get('report')
  @RequirePermissions('view-commission-reports')
  async getCommissionReport(@Query() query: { startDate?: string; endDate?: string }) {
    return await this.commissionService.getCommissionReport(query);
  }

  /**
   * Approve a commission (Admin)
   */
  @Put(':id/approve')
  @RequirePermissions('approve-commissions')
  async approveCommission(@Param('id') id: string, @Request() req: any) {
    return await this.commissionService.approveCommission(Number(id), req.user.id);
  }

  /**
   * Mark commission as paid (Admin)
   */
  @Put(':id/paid')
  @RequirePermissions('approve-commissions')
  async markCommissionPaid(@Param('id') id: string, @Request() req: any) {
    return await this.commissionService.markCommissionPaid(Number(id), req.user.id);
  }

  /**
   * Cancel a commission (Admin)
   */
  @Put(':id/cancel')
  @RequirePermissions('approve-commissions')
  async cancelCommission(@Param('id') id: string, @Body() body: { reason: string }) {
    return await this.commissionService.cancelCommission(Number(id), body.reason || 'Cancelled by admin');
  }

  /**
   * Bulk approve commissions (Admin)
   */
  @Post('bulk-approve')
  @RequirePermissions('approve-commissions')
  async bulkApprove(@Body() body: { commissionIds: number[] }, @Request() req: any) {
    const count = await this.commissionService.bulkApprove(body.commissionIds, req.user.id);
    return { success: true, approvedCount: count };
  }

  // ==================== AGENT ENDPOINTS ====================

  /**
   * Get my commission summary (Agent)
   */
  @Get('my/summary')
  async getMyCommissionSummary(@Request() req: any) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    return await this.commissionService.getAgentCommissionSummary(agentId);
  }

  /**
   * Get my commissions list (Agent)
   */
  @Get('my')
  async getMyCommissions(@Query() query: any, @Request() req: any) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    return await this.commissionService.getAgentCommissions(agentId, query);
  }

  /**
   * Get my effective commission settings (Agent)
   */
  @Get('my/settings')
  async getMyCommissionSettings(@Request() req: any) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    const settings = await this.commissionService.getEffectiveSettings(agentId);
    if (!settings) {
      return {
        configured: false,
        message: 'No commission settings configured for your account',
      };
    }
    return {
      configured: true,
      commissionType: settings.commissionType,
      fixedAmount: settings.commissionType === 'fixed' ? parseFloat(String(settings.fixedAmount)) : null,
      percentageRate: settings.commissionType === 'percentage' ? parseFloat(String(settings.percentageRate)) : null,
      minOrderValue: parseFloat(String(settings.minOrderValue)),
      maxCommission: settings.maxCommission ? parseFloat(String(settings.maxCommission)) : null,
    };
  }

  // ==================== SPECIFIC AGENT VIEW (Admin/Team Lead) ====================

  /**
   * Get commission summary for a specific agent (Admin/Team Lead)
   */
  @Get('agent/:agentId/summary')
  @RequirePermissions('view-commission-reports')
  async getAgentCommissionSummary(@Param('agentId') agentId: string) {
    return await this.commissionService.getAgentCommissionSummary(Number(agentId));
  }

  /**
   * Get commissions for a specific agent (Admin/Team Lead)
   */
  @Get('agent/:agentId')
  @RequirePermissions('view-commission-reports')
  async getAgentCommissions(@Param('agentId') agentId: string, @Query() query: any) {
    return await this.commissionService.getAgentCommissions(Number(agentId), query);
  }
}
