import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // =====================================================
  // MEMBERSHIP ENDPOINTS
  // =====================================================

  @Get('membership/:customerId')
  async getCustomerMembership(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getCustomerMembership(customerId);
  }

  @Get('memberships')
  async getAllMemberships(@Query('tier') tier?: string) {
    return await this.loyaltyService.getAllMemberships(tier);
  }

  @Put('membership/:customerId/tier')
  async updateMembershipTier(
    @Param('customerId') customerId: number,
    @Body('tier') tier: 'none' | 'silver' | 'gold' | 'permanent',
  ) {
    return await this.loyaltyService.updateMembershipTierV2(customerId, tier);
  }

  @Post('membership/:customerId/evaluate')
  async evaluateMembership(
    @Param('customerId') customerId: number,
    @Body() thresholds?: {
      silverOrders?: number;
      silverSpend?: number;
      goldOrders?: number;
      goldSpend?: number;
      permanentOrders?: number;
      permanentSpend?: number;
    },
  ) {
    return await this.loyaltyService.evaluateAndUpgradeMembership(customerId, thresholds);
  }

  // =====================================================
  // CONSUMPTION PROFILES & REMINDERS
  // =====================================================

  @Get('consumption-profiles')
  async listConsumptionProfiles() {
    return await this.loyaltyService.listConsumptionProfiles();
  }

  @Post('consumption-profiles')
  async upsertConsumptionProfile(@Body() data: any) {
    return await this.loyaltyService.upsertConsumptionProfile({
      productId: data.productId ?? data.product_id ?? null,
      categoryId: data.categoryId ?? data.category_id ?? null,
      avgConsumptionDays: Number(data.avgConsumptionDays ?? data.avg_consumption_days),
      bufferDays: data.bufferDays != null ? Number(data.bufferDays) : undefined,
      minDays: data.minDays != null ? Number(data.minDays) : undefined,
      maxDays: data.maxDays != null ? Number(data.maxDays) : undefined,
      isActive: typeof data.isActive === 'boolean' ? data.isActive : data.is_active,
    });
  }

  @Delete('consumption-profiles/:id')
  async deleteConsumptionProfile(@Param('id') id: number) {
    return await this.loyaltyService.deleteConsumptionProfile(id);
  }

  @Post('reminders/generate')
  async generateReminders(@Query('date') date?: string) {
    return await this.loyaltyService.generateProductReminders(date);
  }

  @Get('reminders/due')
  async listDueReminders(
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.loyaltyService.listDueProductReminders(date, limit ? Number(limit) : 100);
  }

  @Put('reminders/:id/sent')
  async markReminderSent(
    @Param('id') id: number,
    @Body('channel') channel: 'whatsapp' | 'sms' | 'call' | 'email',
  ) {
    return await this.loyaltyService.markProductReminderSent(id, channel);
  }

  // =====================================================
  // WALLET ENDPOINTS
  // =====================================================

  @Get('wallet/:customerId')
  async getCustomerWallet(@Param('customerId') customerId: string) {
    return await this.loyaltyService.getCustomerWallet(customerId);
  }

  @Post('wallet/:customerId/credit')
  async creditWallet(
    @Param('customerId') customerId: string,
    @Body() data: { amount: number; source: string; description?: string; referenceId?: number; idempotencyKey?: string },
  ) {
    return await this.loyaltyService.creditWallet(
      customerId,
      data.amount,
      data.source,
      data.description,
      data.referenceId,
      data.idempotencyKey,
    );
  }

  @Post('wallet/:customerId/debit')
  async debitWallet(
    @Param('customerId') customerId: string,
    @Body() data: { amount: number; source: string; description?: string; idempotencyKey?: string },
  ) {
    return await this.loyaltyService.debitWallet(
      customerId,
      data.amount,
      data.source,
      data.description,
      data.idempotencyKey,
    );
  }

  @Get('wallet/:customerId/transactions')
  async getWalletTransactions(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: number,
  ) {
    return await this.loyaltyService.getWalletTransactions(
      customerId,
      limit ? Number(limit) : 50,
    );
  }

  // =====================================================
  // REFERRAL ENDPOINTS
  // =====================================================

  @Post('referral')
  @UseGuards(JwtAuthGuard)
  async createReferral(@Body() data: {
    referrerCustomerId: number;
    referredEmail: string;
    referredPhone?: string;
  }) {
    return await this.loyaltyService.createReferral(
      data.referrerCustomerId,
      data.referredEmail,
      data.referredPhone,
    );
  }

  @Get('referrals/:customerId')
  @UseGuards(JwtAuthGuard)
  async getReferralsByCustomer(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getReferralsByCustomer(customerId);
  }

  // Server-driven shareable referral code for a customer
  @Get('referral-code/:customerId')
  @UseGuards(JwtAuthGuard)
  async getReferralCode(@Param('customerId') customerId: number) {
    return { referralCode: await this.loyaltyService.getShareReferralCode(customerId) };
  }

  @Put('referral/:referralId/complete')
  @UseGuards(JwtAuthGuard)
  async markReferralComplete(
    @Param('referralId') referralId: number,
    @Body('referredCustomerId') referredCustomerId?: number,
    @Body('orderId') orderId?: number,
  ) {
    return await this.loyaltyService.markReferralComplete(referralId, referredCustomerId, orderId);
  }

  @Get('referrals/:customerId/stats')
  @UseGuards(JwtAuthGuard)
  async getReferralStats(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getReferralStats(customerId);
  }

  // =====================================================
  // REFERRAL CAMPAIGNS & PARTNERS (admin)
  // =====================================================

  @Get('referral-campaigns')
  async listReferralCampaigns(@Query('includeInactive') includeInactive?: string) {
    return await this.loyaltyService.listReferralCampaigns(includeInactive === 'true');
  }

  @Post('referral-campaigns')
  async createReferralCampaign(@Body() data: any) {
    return await this.loyaltyService.createReferralCampaign(data);
  }

  @Put('referral-campaigns/:id')
  async updateReferralCampaign(@Param('id') id: string, @Body() data: any) {
    return await this.loyaltyService.updateReferralCampaign(id, data);
  }

  @Get('referral-partners')
  async listReferralPartners(@Query('includeInactive') includeInactive?: string) {
    return await this.loyaltyService.listReferralPartners(includeInactive === 'true');
  }

  @Post('referral-partners')
  async createReferralPartner(@Body() data: any) {
    return await this.loyaltyService.createReferralPartner(data);
  }

  @Put('referral-partners/:id')
  async updateReferralPartner(@Param('id') id: string, @Body() data: any) {
    return await this.loyaltyService.updateReferralPartner(id, data);
  }

  @Get('referral-partners/:code/report')
  async getReferralPartnerReport(
    @Param('code') code: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.loyaltyService.getReferralPartnerReportByCode(code, {
      from,
      to,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  // =====================================================
  // WALLET WITHDRAWALS (cash-out workflow)
  // =====================================================

  @Post('wallet/:customerId/withdrawals')
  async createWithdrawal(
    @Param('customerId') customerId: number,
    @Body() data: { amount: number; method?: string; account: string; notes?: string },
  ) {
    return await this.loyaltyService.createWalletWithdrawalRequest(Number(customerId), data);
  }

  @Get('wallet/:customerId/withdrawals')
  async listWithdrawals(
    @Param('customerId') customerId: number,
    @Query('status') status?: string,
  ) {
    return await this.loyaltyService.listWalletWithdrawalRequests({ customerId: Number(customerId), status });
  }

  @Put('wallet/withdrawals/:id/status')
  async updateWithdrawalStatus(
    @Param('id') id: string,
    @Body() data: { status: 'pending' | 'approved' | 'rejected' | 'paid'; notes?: string },
  ) {
    return await this.loyaltyService.updateWalletWithdrawalStatus(id, data.status, data.notes);
  }

  // =====================================================
  // POINTS ENDPOINTS
  // =====================================================

  @Get('points/:customerId')
  async getCustomerPoints(@Param('customerId') customerId: string) {
    return await this.loyaltyService.getCustomerPoints(customerId);
  }

  @Get('points/:customerId/transactions')
  async getPointTransactions(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: number,
  ) {
    return await this.loyaltyService.getPointTransactions(customerId, limit ? Number(limit) : 50);
  }

  @Post('points/:customerId/earn')
  async earnPoints(
    @Param('customerId') customerId: string,
    @Body() data: { points: number; source: string; description?: string; referenceId?: number; idempotencyKey?: string },
  ) {
    return await this.loyaltyService.earnPoints(
      customerId,
      data.points,
      data.source,
      data.description,
      data.referenceId,
      data.idempotencyKey,
    );
  }

  @Post('points/:customerId/redeem')
  async redeemPoints(
    @Param('customerId') customerId: string,
    @Body() data: { points: number; source: string; description?: string; referenceId?: number; idempotencyKey?: string },
  ) {
    return await this.loyaltyService.redeemPoints(
      customerId,
      data.points,
      data.source,
      data.description,
      data.referenceId,
      data.idempotencyKey,
    );
  }

  // =====================================================
  // GROCERY LIST ENDPOINTS
  // =====================================================

  @Get('grocery-lists/:customerId')
  async getCustomerGroceryLists(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getCustomerGroceryLists(customerId);
  }

  @Post('grocery-list')
  async createGroceryList(@Body() data: {
    customerId: number;
    listName: string;
    isSubscription?: boolean;
    subscriptionDay?: number;
  }) {
    return await this.loyaltyService.createGroceryList(
      data.customerId,
      data.listName,
      data.isSubscription,
      data.subscriptionDay,
    );
  }

  @Get('grocery-list/:listId/items')
  async getGroceryListItems(@Param('listId') listId: number) {
    return await this.loyaltyService.getGroceryListItems(listId);
  }

  @Post('grocery-list/:listId/item')
  async addItemToGroceryList(
    @Param('listId') listId: number,
    @Body() data: { productId: number; quantity: number; lastPurchasePrice?: number },
  ) {
    return await this.loyaltyService.addItemToGroceryList(
      listId,
      data.productId,
      data.quantity,
      data.lastPurchasePrice,
    );
  }

  @Put('grocery-list/item/:itemId')
  async updateGroceryListItem(
    @Param('itemId') itemId: number,
    @Body('quantity') quantity: number,
  ) {
    return await this.loyaltyService.updateGroceryListItem(itemId, quantity);
  }

  @Delete('grocery-list/item/:itemId')
  async removeItemFromGroceryList(@Param('itemId') itemId: number) {
    return await this.loyaltyService.removeItemFromGroceryList(itemId);
  }

  @Put('grocery-list/:listId/subscription')
  async toggleSubscription(
    @Param('listId') listId: number,
    @Body() data: { isSubscription: boolean; subscriptionDay?: number },
  ) {
    return await this.loyaltyService.toggleSubscription(
      listId,
      data.isSubscription,
      data.subscriptionDay,
    );
  }

  @Get('subscriptions/due-today')
  async getSubscriptionDueToday() {
    return await this.loyaltyService.getSubscriptionDueToday();
  }

  // =====================================================
  // PRICE LOCK ENDPOINTS
  // =====================================================

  @Post('price-lock')
  async lockPrice(@Body() data: {
    customerId: number;
    productId: number;
    lockedPrice: number;
  }) {
    return await this.loyaltyService.lockPrice(
      data.customerId,
      data.productId,
      data.lockedPrice,
    );
  }

  @Get('price-locks/:customerId')
  async getCustomerPriceLocks(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getCustomerPriceLocks(customerId);
  }

  @Get('price-locks/:customerId/savings')
  async getPriceLockSavings(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getPriceLockSavings(customerId);
  }

  // =====================================================
  // KPI & DASHBOARD ENDPOINTS
  // =====================================================

  @Get('kpis')
  async getLoyaltyKPIs() {
    return await this.loyaltyService.getLoyaltyKPIs();
  }

  @Get('benefits/:customerId')
  async getMemberBenefits(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getMemberBenefits(customerId);
  }

  @Get('dashboard')
  async getLoyaltyDashboard() {
    return await this.loyaltyService.getLoyaltyDashboard();
  }
}
