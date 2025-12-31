import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CdmService } from './cdm.service';
import { CreateFamilyMemberDto, UpdateFamilyMemberDto } from './dto/family-member.dto';

@Controller('cdm')
export class CdmController {
  constructor(private readonly cdmService: CdmService) {}

  // =====================================================
  // CUSTOMER 360° VIEW
  // =====================================================

  @Get('customer360/:customerId')
  async getCustomer360(@Param('customerId') customerId: number) {
    return await this.cdmService.getCustomer360(customerId);
  }

  @Get('customer360')
  async getAllCustomers360(
    @Query('customerType') customerType?: string,
    @Query('lifecycleStage') lifecycleStage?: string,
    @Query('temperature') temperature?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.cdmService.getAllCustomers360({
      customerType,
      lifecycleStage,
      temperature,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });
  }

  // =====================================================
  // FAMILY MEMBERS
  // =====================================================

  @Get('family/:customerId')
  async getFamilyMembers(@Param('customerId') customerId: number) {
    return await this.cdmService.getFamilyMembers(customerId);
  }

  @Post('family')
  async addFamilyMember(@Body() data: CreateFamilyMemberDto) {
    const payload: any = {
      ...data,
    };

    if (data.dateOfBirth) {
      payload.dateOfBirth = new Date(data.dateOfBirth);
    }
    if (data.anniversaryDate) {
      payload.anniversaryDate = new Date(data.anniversaryDate);
    }

    return await this.cdmService.addFamilyMember(payload);
  }

  @Put('family/:id')
  async updateFamilyMember(
    @Param('id') id: number,
    @Body() data: UpdateFamilyMemberDto,
  ) {
    const payload: any = {
      ...data,
    };

    if (Object.prototype.hasOwnProperty.call(data, 'dateOfBirth')) {
      payload.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'anniversaryDate')) {
      payload.anniversaryDate = data.anniversaryDate
        ? new Date(data.anniversaryDate)
        : null;
    }

    return await this.cdmService.updateFamilyMember(id, payload);
  }

  @Delete('family/:id')
  async deleteFamilyMember(@Param('id') id: number) {
    return await this.cdmService.deleteFamilyMember(id);
  }

  // =====================================================
  // INTERACTIONS
  // =====================================================

  @Get('interactions/:customerId')
  async getCustomerInteractions(
    @Param('customerId') customerId: number,
    @Query('type') interactionType?: string,
    @Query('limit') limit?: number,
  ) {
    return await this.cdmService.getCustomerInteractions(customerId, {
      interactionType,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post('interactions')
  async trackInteraction(@Body() data: any) {
    return await this.cdmService.trackInteraction(data);
  }

  @Get('interactions/:customerId/stats')
  async getInteractionStats(@Param('customerId') customerId: number) {
    return await this.cdmService.getInteractionStats(customerId);
  }

  // =====================================================
  // BEHAVIOR TRACKING
  // =====================================================

  @Post('behavior')
  async trackBehavior(@Body() data: any) {
    return await this.cdmService.trackBehavior(data);
  }

  @Get('behavior/:customerId')
  async getCustomerBehaviors(
    @Param('customerId') customerId: number,
    @Query('type') behaviorType?: string,
    @Query('productId') productId?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.cdmService.getCustomerBehaviors(customerId, {
      behaviorType,
      productId: productId ? Number(productId) : undefined,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('behavior/:customerId/stats')
  async getBehaviorStats(@Param('customerId') customerId: number) {
    return await this.cdmService.getBehaviorStats(customerId);
  }

  @Get('behavior/:customerId/most-viewed')
  async getMostViewedProducts(
    @Param('customerId') customerId: number,
    @Query('limit') limit?: number,
  ) {
    return await this.cdmService.getMostViewedProducts(
      customerId,
      limit ? Number(limit) : 10,
    );
  }

  // =====================================================
  // DROP-OFF TRACKING
  // =====================================================

  @Post('dropoff')
  async trackDropoff(@Body() data: any) {
    return await this.cdmService.trackDropoff(data);
  }

  @Get('dropoff/:customerId')
  async getCustomerDropoffs(@Param('customerId') customerId: number) {
    return await this.cdmService.getCustomerDropoffs(customerId);
  }

  @Put('dropoff/:dropoffId/recover')
  async markDropoffRecovered(@Param('dropoffId') dropoffId: number) {
    return await this.cdmService.markDropoffRecovered(dropoffId);
  }

  @Get('dropoff/stats/all')
  async getDropoffStats() {
    return await this.cdmService.getDropoffStats();
  }

  // =====================================================
  // BIRTHDAY & ANNIVERSARY REMINDERS
  // =====================================================

  @Get('events/birthdays')
  async getUpcomingBirthdays(@Query('days') daysAhead?: number) {
    return await this.cdmService.getUpcomingBirthdays(
      daysAhead ? Number(daysAhead) : 7,
    );
  }

  @Get('events/anniversaries')
  async getUpcomingAnniversaries(@Query('days') daysAhead?: number) {
    return await this.cdmService.getUpcomingAnniversaries(
      daysAhead ? Number(daysAhead) : 7,
    );
  }

  @Get('events/today')
  async getTodayEvents() {
    return await this.cdmService.getTodayEvents();
  }

  // =====================================================
  // AI CALL RECOMMENDATIONS
  // =====================================================

  @Get('ai/recommendations')
  async getAICallRecommendations(@Query('limit') limit?: number) {
    return await this.cdmService.getAICallRecommendations(
      limit ? Number(limit) : 50,
    );
  }

  @Get('ai/top-priority')
  async getTopPriorityCustomers(@Query('limit') limit?: number) {
    return await this.cdmService.getTopPriorityCustomers(
      limit ? Number(limit) : 10,
    );
  }

  @Get('ai/recommendation/:customerId')
  async getCustomerRecommendation(@Param('customerId') customerId: number) {
    return await this.cdmService.getCustomerRecommendation(customerId);
  }

  // =====================================================
  // LIFECYCLE & SEGMENTATION
  // =====================================================

  @Get('lifecycle/:stage')
  async getCustomersByLifecycle(@Param('stage') stage: string) {
    return await this.cdmService.getCustomersByLifecycle(stage);
  }

  @Get('type/:type')
  async getCustomersByType(@Param('type') type: string) {
    return await this.cdmService.getCustomersByType(type);
  }

  @Get('temperature/:temperature')
  async getCustomersByTemperature(@Param('temperature') temperature: string) {
    return await this.cdmService.getCustomersByTemperature(temperature);
  }

  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  @Get('stats/dashboard')
  async getDashboardStats() {
    return await this.cdmService.getDashboardStats();
  }
}
