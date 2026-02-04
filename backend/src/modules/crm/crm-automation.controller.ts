import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CrmAutomationService } from './crm-automation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm/automation')
export class CrmAutomationController {
  constructor(private readonly automationService: CrmAutomationService) {}

  // ==================== CALL TASKS ====================
  
  @Get('tasks/today')
  async getTodayTasks(@Query('agentId') agentId?: number) {
    return await this.automationService.getTodayCallTasks(agentId);
  }
  
  @Put('tasks/:id/status')
  async updateTaskStatus(
    @Param('id') id: number,
    @Body() body: { status: string; outcome?: string; notes?: string }
  ) {
    return await this.automationService.updateCallTaskStatus(
      id,
      body.status as any,
      body.outcome,
      body.notes
    );
  }
  
  @Put('tasks/:id/assign')
  async assignTask(@Param('id') id: number, @Body() body: { agentId: number }) {
    return await this.automationService.assignCallTask(id, body.agentId);
  }
  
  @Post('tasks/generate')
  async generateDailyTasks() {
    return await this.automationService.generateDailyCallTasks();
  }
  
  // ==================== CUSTOMER INTELLIGENCE ====================
  
  @Get('intelligence/:customerId')
  async getCustomerIntelligence(@Param('customerId') customerId: string) {
    return await this.automationService.getCustomerIntelligence(customerId);
  }
  
  @Get('customers/hot')
  async getHotCustomers(@Query('limit') limit?: number) {
    return await this.automationService.getHotCustomers(limit || 20);
  }
  
  @Get('customers/warm')
  async getWarmCustomers(@Query('limit') limit?: number) {
    return await this.automationService.getWarmCustomers(limit || 30);
  }
  
  @Get('customers/cold')
  async getColdCustomers(@Query('limit') limit?: number) {
    return await this.automationService.getColdCustomers(limit || 50);
  }
  
  // ==================== RECOMMENDATIONS ====================
  
  @Get('recommendations/:customerId')
  async getRecommendations(@Param('customerId') customerId: string) {
    return await this.automationService.getCustomerRecommendations(customerId);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('call-tasks/:taskId/suggested-script')
  async getSuggestedScript(@Param('taskId') taskId: string) {
    return await this.automationService.getSuggestedCallScript(Number(taskId));
  }
  
  @Get('recommendation-rules')
  async getAllRules() {
    return await this.automationService.getAllRecommendationRules();
  }
  
  @Post('recommendation-rules')
  async createRule(@Body() data: any) {
    return await this.automationService.createRecommendationRule(data);
  }
  
  @Put('recommendation-rules/:id')
  async updateRule(@Param('id') id: number, @Body() data: any) {
    return await this.automationService.updateRecommendationRule(id, data);
  }
  
  @Delete('recommendation-rules/:id')
  async deleteRule(@Param('id') id: number) {
    return await this.automationService.deleteRecommendationRule(id);
  }
  
  // ==================== ENGAGEMENT TRACKING ====================
  
  @Post('engagement')
  async trackEngagement(@Body() data: any) {
    return await this.automationService.trackEngagement(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer/:customerId/mark-called')
  async markCustomerAsCalled(
    @Param('customerId') customerId: string,
    @Body() body: { notes?: string; taskId?: number },
    @Request() req: any
  ) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    return await this.automationService.markCustomerAsCalled(customerId, agentId, body.notes, body.taskId);
  }
  
  @Get('engagement/:customerId')
  async getEngagementHistory(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: number
  ) {
    return await this.automationService.getCustomerEngagementHistory(customerId, limit || 50);
  }
  
  @Get('engagement/:customerId/stats')
  async getEngagementStats(@Param('customerId') customerId: string) {
    return await this.automationService.getEngagementStats(customerId);
  }
  
  // ==================== MARKETING CAMPAIGNS ====================
  
  @Get('campaigns')
  async getAllCampaigns() {
    return await this.automationService.getAllCampaigns();
  }
  
  @Get('campaigns/active')
  async getActiveCampaigns() {
    return await this.automationService.getActiveCampaigns();
  }
  
  @Post('campaigns')
  async createCampaign(@Body() data: any) {
    return await this.automationService.createCampaign(data);
  }
  
  @Put('campaigns/:id')
  async updateCampaign(@Param('id') id: number, @Body() data: any) {
    return await this.automationService.updateCampaign(id, data);
  }
  
  @Put('campaigns/:id/toggle')
  async toggleCampaign(@Param('id') id: number, @Body() body: { isActive: boolean }) {
    return await this.automationService.toggleCampaign(id, body.isActive);
  }
  
  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: number) {
    return await this.automationService.deleteCampaign(id);
  }
  
  @Get('campaigns/:id/stats')
  async getCampaignStats(@Param('id') id: number) {
    return await this.automationService.getCampaignStats(id);
  }
  
  // ==================== AGENT DASHBOARD ====================
  
  @Get('agent/performance')
  async getPerformance(@Query('agentId') agentId?: number) {
    return await this.automationService.getAgentPerformance(agentId);
  }
  
  @Get('agent/:id/dashboard')
  async getAgentDashboard(@Param('id') id: number) {
    return await this.automationService.getAgentDashboard(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agent/me/dashboard')
  async getMyAgentDashboard(@Request() req: any) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    return await this.automationService.getAgentDashboard(agentId);
  }
  
  @Get('agent/:id/next-action')
  async getNextBestAction(@Param('id') id: number) {
    return await this.automationService.getNextBestAction(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agent/me/next-action')
  async getMyNextBestAction(@Request() req: any) {
    const agentId = Number(req.user?.id ?? req.user?.userId);
    return await this.automationService.getNextBestAction(agentId);
  }
}
