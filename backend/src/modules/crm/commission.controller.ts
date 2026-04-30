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
import { RequireAnyPermission } from '../../common/decorators/permissions.decorator';

@Controller('crm/commissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all commission settings (Admin)
   */
  @Get('settings')
  @RequireAnyPermission('view-commission-settings', 'manage-commission-settings')
  async getAllSettings() {
    return await this.commissionService.getAllSettings();
  }

  /**
   * Get global commission settings (Admin)
   */
  @Get('settings/global')
  @RequireAnyPermission('view-commission-settings', 'manage-commission-settings')
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

  // ==================== COMMISSION SLABS ====================

  /**
   * Get all commission slabs (both agent and team_leader)
   */
  @Get('slabs')
  @RequireAnyPermission('view-commission-settings', 'manage-commission-settings')
  async getAllSlabs() {
    return await this.commissionService.getAllSlabs();
  }

  /**
   * Save slabs for a role type (replaces all existing)
   */
  @Post('slabs/:roleType')
  @RequirePermissions('manage-commission-settings')
  async saveSlabs(
    @Param('roleType') roleType: string,
    @Body() body: { slabs: Array<{ agentTier: string; slabType: string; minOrderCount: number; maxOrderCount: number | null; commissionAmount: number }> },
    @Request() req: any,
  ) {
    const saved = await this.commissionService.saveSlabs(roleType, body.slabs, req.user.id);
    return { success: true, count: saved.length, data: saved };
  }

  /**
   * Get agent-wise commission summary report
   */
  @Get('agents')
  @RequireAnyPermission('view-agent-commissions', 'view-commission-reports')
  async getAgentCommissionReport(@Query() query: any) {
    return await this.commissionService.getAgentCommissionReport(query);
  }

  /**
   * Get team-leader-wise commission summary report
   */
  @Get('team-leaders')
  @RequireAnyPermission('view-tl-commissions', 'view-commission-reports')
  async getTeamLeaderCommissionReport(@Query() query: any) {
    return await this.commissionService.getTeamLeaderCommissionReport(query);
  }

  /**
   * Get payment breakdown for a team leader (daily order counts by agents under them)
   */
  @Get('tl-payment-breakdown')
  @RequireAnyPermission('view-tl-commissions', 'view-commission-reports')
  async getTLPaymentBreakdown(@Query() query: any) {
    return await this.commissionService.getTLPaymentBreakdown(query);
  }

  /**
   * Get payment breakdown for an agent (daily order/upsell/cross-sell counts with slab rates)
   */
  @Get('payment-breakdown')
  @RequireAnyPermission('view-payment-breakdown', 'view-commission-reports')
  async getPaymentBreakdown(@Query() query: { agentId: string; month: string }) {
    return await this.commissionService.getPaymentBreakdown(query);
  }

  /**
   * Save extra partial amount for an agent+month
   */
  @Put('extra-partial')
  @RequireAnyPermission('manage-agent-commissions', 'view-commission-reports')
  async saveExtraPartial(@Body() body: { agentId: number; month: string; amount: number; notes?: string }, @Request() req: any) {
    return await this.commissionService.saveExtraPartial(body.agentId, body.month, body.amount, req.user.id, body.notes);
  }

  /**
   * Get commission sales data (orders with commission details)
   */
  @Get('sales')
  @RequireAnyPermission('view-commission-sales', 'view-commission-reports')
  async getCommissionSales(@Query() query: any) {
    return await this.commissionService.getCommissionSales(query);
  }

  /**
   * Update editable fields on a commission sales row
   */
  @Put('sales/:orderId')
  @RequireAnyPermission('manage-commission-sales', 'view-commission-reports')
  async updateCommissionSaleFields(
    @Param('orderId') orderId: string,
    @Body() body: { totalAmount?: number; deliveryCharge?: number; codAmount?: number; commissionAmount?: number },
  ) {
    return await this.commissionService.updateCommissionSaleFields(Number(orderId), body);
  }

  /**
   * Get all commissions (Admin view)
   */
  @Get()
  @RequireAnyPermission('view-agent-commissions', 'view-commission-reports')
  async getAllCommissions(@Query() query: any) {
    return await this.commissionService.getAllCommissions(query);
  }

  /**
   * Get commission report (Admin)
   */
  @Get('report')
  @RequireAnyPermission('view-agent-commissions', 'view-commission-reports')
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

  // ==================== PAYMENT REQUESTS ====================

  @Post('payment-requests')
  @RequireAnyPermission('manage-payment-requests', 'approve-commissions')
  async createPaymentRequest(@Body() body: { agentId: number; requestedAmount: number; paymentMethod?: string; notes?: string }, @Request() req: any) {
    return await this.commissionService.createPaymentRequest({ ...body, requestedBy: req.user.id });
  }

  @Get('payment-requests')
  @RequireAnyPermission('view-payment-requests', 'manage-payment-requests', 'view-commission-reports')
  async getPaymentRequests(@Query() query: any) {
    return await this.commissionService.getPaymentRequests(query);
  }

  @Put('payment-requests/:id/approve')
  @RequireAnyPermission('manage-payment-requests', 'approve-commissions')
  async approvePaymentRequest(@Param('id') id: string, @Body() body: { approvedAmount?: number }, @Request() req: any) {
    return await this.commissionService.approvePaymentRequest(Number(id), req.user.id, body.approvedAmount);
  }

  @Put('payment-requests/:id/pay')
  @RequireAnyPermission('manage-payment-requests', 'approve-commissions')
  async markPaymentRequestPaid(
    @Param('id') id: string,
    @Body() body: { paymentMethod?: string; paymentReference?: string; adminNotes?: string },
    @Request() req: any,
  ) {
    return await this.commissionService.markPaymentRequestPaid(Number(id), req.user.id, body.paymentMethod, body.paymentReference, body.adminNotes);
  }

  @Put('payment-requests/:id/reject')
  @RequireAnyPermission('manage-payment-requests', 'approve-commissions')
  async rejectPaymentRequest(@Param('id') id: string, @Body() body: { adminNotes?: string }, @Request() req: any) {
    return await this.commissionService.rejectPaymentRequest(Number(id), req.user.id, body.adminNotes);
  }

  @Get('payment-history')
  @RequireAnyPermission('view-payment-history', 'view-commission-reports')
  async getPaymentHistory(@Query() query: any) {
    return await this.commissionService.getPaymentHistory(query);
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
  @RequireAnyPermission('view-agent-commissions', 'view-commission-reports')
  async getAgentCommissionSummary(@Param('agentId') agentId: string) {
    return await this.commissionService.getAgentCommissionSummary(Number(agentId));
  }

  /**
   * Get commissions for a specific agent (Admin/Team Lead)
   */
  @Get('agent/:agentId')
  @RequireAnyPermission('view-agent-commissions', 'view-commission-reports')
  async getAgentCommissions(@Param('agentId') agentId: string, @Query() query: any) {
    return await this.commissionService.getAgentCommissions(Number(agentId), query);
  }
}
