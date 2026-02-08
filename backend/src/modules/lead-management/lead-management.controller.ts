import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeadManagementService } from './lead-management.service';

@Controller('lead-management')
@UseGuards(JwtAuthGuard)
export class LeadManagementController {
  constructor(private readonly leadService: LeadManagementService) {}

  private getAuthUserId(req: any): number {
    return Number(req?.user?.id ?? req?.user?.userId);
  }

  // ============================================
  // SESSION TRACKING
  // ============================================

  @Post('session/track')
  async trackSession(@Body() data: any) {
    return this.leadService.trackSession(data);
  }

  @Put('session/:sessionId')
  async updateSession(@Param('sessionId') sessionId: string, @Body() data: any) {
    return this.leadService.updateSession(sessionId, data);
  }

  @Get('session/customer/:customerId')
  async getCustomerSessions(@Param('customerId') customerId: number) {
    return this.leadService.getCustomerSessions(customerId);
  }

  @Get('session/campaign/:campaignId')
  async getSessionsByCampaign(@Param('campaignId') campaignId: string) {
    return this.leadService.getSessionByCampaign(campaignId);
  }

  // ============================================
  // INCOMPLETE ORDERS
  // ============================================

  @Post('incomplete-order')
  async trackIncompleteOrder(@Body() data: any) {
    return this.leadService.trackIncompleteOrder(data);
  }

  @Get('incomplete-order')
  async getIncompleteOrders(@Query('customerId') customerId?: number) {
    return this.leadService.getIncompleteOrders(customerId);
  }

  @Put('incomplete-order/:id/recover')
  async markOrderRecovered(
    @Param('id') id: number,
    @Body('recoveredOrderId') recoveredOrderId: number,
  ) {
    return this.leadService.markOrderRecovered(id, recoveredOrderId);
  }

  @Put('incomplete-order/:id/send-recovery-email')
  async sendRecoveryEmail(@Param('id') id: number) {
    await this.leadService.sendRecoveryEmail(id);
    return { success: true };
  }

  // ============================================
  // UNASSIGNED LEADS
  // ============================================

  @Get('leads/unassigned')
  async getUnassignedLeads(@Query('limit') limit?: number) {
    return this.leadService.getUnassignedLeads(limit || 50);
  }

  // ============================================
  // TEAM ASSIGNMENTS
  // ============================================

  @Post('assignment')
  async assignLeadToTeam(@Body() data: {
    customerId: number;
    teamType: string;
    assignedById: number;
    assignedToId: number;
    notes?: string;
  }) {
    return this.leadService.assignLeadToTeam(data);
  }

  @Get('assignment')
  async getTeamAssignments(
    @Query('teamType') teamType?: string,
    @Query('assignedToId') assignedToId?: number,
    @Query('status') status?: string,
  ) {
    return this.leadService.getTeamAssignments(teamType, assignedToId, status);
  }

  @Get('assignment/my')
  async getMyTeamAssignments(
    @Request() req: any,
    @Query('teamType') teamType?: string,
    @Query('status') status?: string,
  ) {
    const userId = this.getAuthUserId(req);
    return this.leadService.getTeamAssignments(teamType, userId, status);
  }

  @Put('assignment/:id/status')
  async updateAssignmentStatus(
    @Param('id') id: number,
    @Body('status') status: string,
  ) {
    return this.leadService.updateAssignmentStatus(id, status);
  }

  // ============================================
  // TEAM A DATA
  // ============================================

  @Post('team-a')
  async saveTeamAData(@Body() data: any, @Request() req: any) {
    data.collectedById = this.getAuthUserId(req);
    return this.leadService.saveTeamAData(data);
  }

  @Get('team-a/:customerId')
  async getTeamAData(@Param('customerId') customerId: number) {
    return this.leadService.getTeamAData(customerId);
  }

  // ============================================
  // TEAM B DATA
  // ============================================

  @Post('team-b')
  async saveTeamBData(@Body() data: any, @Request() req: any) {
    data.collectedById = this.getAuthUserId(req);
    return this.leadService.saveTeamBData(data);
  }

  @Get('team-b/:customerId')
  async getTeamBData(@Param('customerId') customerId: number) {
    return this.leadService.getTeamBData(customerId);
  }

  // ============================================
  // TEAM C DATA
  // ============================================

  @Post('team-c')
  async saveTeamCData(@Body() data: any, @Request() req: any) {
    data.collectedById = this.getAuthUserId(req);
    return this.leadService.saveTeamCData(data);
  }

  @Get('team-c/:customerId')
  async getTeamCData(@Param('customerId') customerId: number) {
    return this.leadService.getTeamCData(customerId);
  }

  // ============================================
  // TEAM D DATA
  // ============================================

  @Post('team-d')
  async saveTeamDData(@Body() data: any, @Request() req: any) {
    data.collectedById = this.getAuthUserId(req);
    return this.leadService.saveTeamDData(data);
  }

  @Get('team-d/:customerId')
  async getTeamDData(@Param('customerId') customerId: number) {
    return this.leadService.getTeamDData(customerId);
  }

  // ============================================
  // TEAM E DATA
  // ============================================

  @Post('team-e')
  async saveTeamEData(@Body() data: any, @Request() req: any) {
    data.collectedById = this.getAuthUserId(req);
    return this.leadService.saveTeamEData(data);
  }

  @Get('team-e/:customerId')
  async getTeamEData(@Param('customerId') customerId: number) {
    return this.leadService.getTeamEData(customerId);
  }

  // ============================================
  // CUSTOMER TIER MANAGEMENT
  // ============================================

  @Get('tiers/all')
  async getAllCustomersWithTiers(
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadService.getAllCustomersWithTiers({
      tier,
      status,
      assignedTo: assignedTo ? parseInt(assignedTo, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Post('tier')
  async updateCustomerTier(@Body() data: any, @Request() req: any) {
    data.tierAssignedById = this.getAuthUserId(req);
    return this.leadService.updateCustomerTier(data);
  }

  @Get('team-types')
  async getTeamTypes() {
    return [
      { code: 'A', name: 'Team A' },
      { code: 'B', name: 'Team B' },
      { code: 'C', name: 'Team C' },
      { code: 'D', name: 'Team D' },
      { code: 'E', name: 'Team E' },
    ];
  }

  @Get('tier/:customerId')
  async getCustomerTier(@Param('customerId') customerId: number) {
    return this.leadService.getCustomerTier(customerId);
  }

  @Get('tier/by-tier/:tier')
  async getCustomersByTier(@Param('tier') tier: string) {
    return this.leadService.getCustomersByTier(tier);
  }

  @Get('tier/inactive/list')
  async getInactiveCustomers(@Query('daysThreshold') daysThreshold?: number) {
    return this.leadService.getInactiveCustomers(daysThreshold || 30);
  }

  // ============================================
  // TEAM MEMBER MANAGEMENT
  // ============================================

  @Post('team-member')
  async addTeamMember(@Body() data: any) {
    return this.leadService.addTeamMember(data);
  }

  @Get('team-member/list/:teamLeaderId')
  async getTeamMembers(
    @Param('teamLeaderId') teamLeaderId: number,
    @Query('teamType') teamType?: string,
  ) {
    return this.leadService.getTeamMembers(teamLeaderId, teamType);
  }

  @Get('team-member/stats/:userId')
  async getTeamMemberStats(@Param('userId') userId: number) {
    return this.leadService.getTeamMemberStats(userId);
  }

  // ============================================
  // DASHBOARDS
  // ============================================

  @Get('dashboard/team-leader/:teamLeaderId')
  async getTeamLeaderDashboard(@Param('teamLeaderId') teamLeaderId: number) {
    return this.leadService.getTeamLeaderDashboard(teamLeaderId);
  }

  @Get('customer-profile/:customerId')
  async getCustomerCompleteProfile(@Param('customerId') customerId: number) {
    return this.leadService.getCustomerCompleteProfile(customerId);
  }
}
