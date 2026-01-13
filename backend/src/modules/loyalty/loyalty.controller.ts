import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  private async requireMyCustomerId(req: any): Promise<number> {
    const email = req?.user?.email as string | undefined;
    const phone = (req?.user?.phone as string | null | undefined) ?? null;
    const customerId = await this.loyaltyService.findCustomerIdForContact(email, phone);
    if (!customerId) {
      throw new UnauthorizedException('Customer profile not found for current user');
    }
    return customerId;
  }

  // =====================================================
  // MEMBERSHIP ENDPOINTS
  // =====================================================

  @Get('membership/:customerId')
  @RequirePermissions('view-mlm-reports')
  async getCustomerMembership(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getCustomerMembership(customerId);
  }

  @Get('memberships')
  @RequirePermissions('view-mlm-reports')
  async getAllMemberships(@Query('tier') tier?: string) {
    return await this.loyaltyService.getAllMemberships(tier);
  }

  @Put('membership/:customerId/tier')
  @RequirePermissions('manage-mlm-settings')
  async updateMembershipTier(
    @Param('customerId') customerId: number,
    @Body('tier') tier: 'none' | 'silver' | 'gold' | 'permanent',
  ) {
    return await this.loyaltyService.updateMembershipTierV2(customerId, tier);
  }

  @Post('membership/:customerId/evaluate')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async listConsumptionProfiles() {
    return await this.loyaltyService.listConsumptionProfiles();
  }

  @Post('consumption-profiles')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('manage-mlm-settings')
  async deleteConsumptionProfile(@Param('id') id: number) {
    return await this.loyaltyService.deleteConsumptionProfile(id);
  }

  @Post('reminders/generate')
  @RequirePermissions('manage-mlm-settings')
  async generateReminders(@Query('date') date?: string) {
    return await this.loyaltyService.generateProductReminders(date);
  }

  @Get('reminders/due')
  @RequirePermissions('view-mlm-reports')
  async listDueReminders(
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.loyaltyService.listDueProductReminders(date, limit ? Number(limit) : 100);
  }

  @Put('reminders/:id/sent')
  @RequirePermissions('manage-mlm-settings')
  async markReminderSent(
    @Param('id') id: number,
    @Body('channel') channel: 'whatsapp' | 'sms' | 'call' | 'email',
  ) {
    return await this.loyaltyService.markProductReminderSent(id, channel);
  }

  // =====================================================
  // WALLET ENDPOINTS
  // =====================================================

  // Customer self wallet (safe)
  @Get('me/wallet')
  @RequirePermissions('view-own-wallet')
  async getMyWallet(@Request() req: any) {
    const customerId = await this.requireMyCustomerId(req);
    return await this.loyaltyService.getCustomerWallet(customerId);
  }

  @Get('me/wallet/transactions')
  @RequirePermissions('view-own-wallet')
  async getMyWalletTransactions(@Request() req: any, @Query('limit') limit?: number) {
    const customerId = await this.requireMyCustomerId(req);
    return await this.loyaltyService.getWalletTransactions(customerId, limit ? Number(limit) : 50);
  }

  @Get('wallet/:customerId')
  @RequirePermissions('view-mlm-reports')
  async getCustomerWallet(@Param('customerId') customerId: string) {
    return await this.loyaltyService.getCustomerWallet(customerId);
  }

  @Post('wallet/:customerId/credit')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
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

  // Customer self referrals (safe)
  @Get('me/referrals')
  @RequirePermissions('share-referral-link')
  async getMyReferrals(@Request() req: any) {
    const customerId = await this.requireMyCustomerId(req);
    return await this.loyaltyService.getReferralsByCustomer(customerId);
  }

  @Get('me/referrals/stats')
  @RequirePermissions('share-referral-link')
  async getMyReferralStats(@Request() req: any) {
    const customerId = await this.requireMyCustomerId(req);
    return await this.loyaltyService.getReferralStats(customerId);
  }

  @Get('me/referral-code')
  @RequirePermissions('share-referral-link')
  async getMyReferralCode(@Request() req: any) {
    const customerId = await this.requireMyCustomerId(req);
    return { referralCode: await this.loyaltyService.getShareReferralCode(customerId) };
  }

  @Post('me/referral')
  @RequirePermissions('share-referral-link')
  async createMyReferral(@Request() req: any, @Body() data: { referredEmail: string; referredPhone?: string }) {
    const customerId = await this.requireMyCustomerId(req);
    return await this.loyaltyService.createReferral(customerId, data.referredEmail, data.referredPhone);
  }

  @Post('referral')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async getReferralsByCustomer(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getReferralsByCustomer(customerId);
  }

  // Server-driven shareable referral code for a customer
  @Get('referral-code/:customerId')
  @RequirePermissions('view-mlm-reports')
  async getReferralCode(@Param('customerId') customerId: number) {
    return { referralCode: await this.loyaltyService.getShareReferralCode(customerId) };
  }

  @Put('referral/:referralId/complete')
  @RequirePermissions('manage-mlm-settings')
  async markReferralComplete(
    @Param('referralId') referralId: number,
    @Body('referredCustomerId') referredCustomerId?: number,
    @Body('orderId') orderId?: number,
  ) {
    return await this.loyaltyService.markReferralComplete(referralId, referredCustomerId, orderId);
  }

  @Get('referrals/:customerId/stats')
  @RequirePermissions('view-mlm-reports')
  async getReferralStats(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getReferralStats(customerId);
  }

  // =====================================================
  // REFERRAL CAMPAIGNS & PARTNERS (admin)
  // =====================================================

  @Get('referral-campaigns')
  @RequirePermissions('view-mlm-reports')
  async listReferralCampaigns(@Query('includeInactive') includeInactive?: string) {
    return await this.loyaltyService.listReferralCampaigns(includeInactive === 'true');
  }

  @Post('referral-campaigns')
  @RequirePermissions('manage-mlm-settings')
  async createReferralCampaign(@Body() data: any) {
    return await this.loyaltyService.createReferralCampaign(data);
  }

  @Put('referral-campaigns/:id')
  @RequirePermissions('manage-mlm-settings')
  async updateReferralCampaign(@Param('id') id: string, @Body() data: any) {
    return await this.loyaltyService.updateReferralCampaign(id, data);
  }

  @Get('referral-partners')
  @RequirePermissions('view-mlm-reports')
  async listReferralPartners(@Query('includeInactive') includeInactive?: string) {
    return await this.loyaltyService.listReferralPartners(includeInactive === 'true');
  }

  @Post('referral-partners')
  @RequirePermissions('manage-mlm-settings')
  async createReferralPartner(@Body() data: any) {
    return await this.loyaltyService.createReferralPartner(data);
  }

  @Put('referral-partners/:id')
  @RequirePermissions('manage-mlm-settings')
  async updateReferralPartner(@Param('id') id: string, @Body() data: any) {
    return await this.loyaltyService.updateReferralPartner(id, data);
  }

  @Get('referral-partners/:code/report')
  @RequirePermissions('view-mlm-reports')
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
  @RequirePermissions('manage-mlm-settings')
  async createWithdrawal(
    @Param('customerId') customerId: number,
    @Body() data: { amount: number; method?: string; account: string; notes?: string },
  ) {
    return await this.loyaltyService.createWalletWithdrawalRequest(Number(customerId), data);
  }

  @Get('wallet/:customerId/withdrawals')
  @RequirePermissions('view-mlm-reports')
  async listWithdrawals(
    @Param('customerId') customerId: number,
    @Query('status') status?: string,
  ) {
    return await this.loyaltyService.listWalletWithdrawalRequests({ customerId: Number(customerId), status });
  }

  @Put('wallet/withdrawals/:id/status')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async getCustomerPoints(@Param('customerId') customerId: string) {
    return await this.loyaltyService.getCustomerPoints(customerId);
  }

  @Get('points/:customerId/transactions')
  @RequirePermissions('view-mlm-reports')
  async getPointTransactions(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: number,
  ) {
    return await this.loyaltyService.getPointTransactions(customerId, limit ? Number(limit) : 50);
  }

  @Post('points/:customerId/earn')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async getCustomerGroceryLists(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getCustomerGroceryLists(customerId);
  }

  @Post('grocery-list')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async getGroceryListItems(@Param('listId') listId: number) {
    return await this.loyaltyService.getGroceryListItems(listId);
  }

  @Post('grocery-list/:listId/item')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('manage-mlm-settings')
  async updateGroceryListItem(
    @Param('itemId') itemId: number,
    @Body('quantity') quantity: number,
  ) {
    return await this.loyaltyService.updateGroceryListItem(itemId, quantity);
  }

  @Delete('grocery-list/item/:itemId')
  @RequirePermissions('manage-mlm-settings')
  async removeItemFromGroceryList(@Param('itemId') itemId: number) {
    return await this.loyaltyService.removeItemFromGroceryList(itemId);
  }

  @Put('grocery-list/:listId/subscription')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async getSubscriptionDueToday() {
    return await this.loyaltyService.getSubscriptionDueToday();
  }

  // =====================================================
  // PRICE LOCK ENDPOINTS
  // =====================================================

  @Post('price-lock')
  @RequirePermissions('manage-mlm-settings')
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
  @RequirePermissions('view-mlm-reports')
  async getCustomerPriceLocks(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getCustomerPriceLocks(customerId);
  }

  @Get('price-locks/:customerId/savings')
  @RequirePermissions('view-mlm-reports')
  async getPriceLockSavings(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getPriceLockSavings(customerId);
  }

  // =====================================================
  // KPI & DASHBOARD ENDPOINTS
  // =====================================================

  @Get('kpis')
  @RequirePermissions('view-mlm-reports')
  async getLoyaltyKPIs() {
    return await this.loyaltyService.getLoyaltyKPIs();
  }

  @Get('benefits/:customerId')
  @RequirePermissions('view-mlm-reports')
  async getMemberBenefits(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getMemberBenefits(customerId);
  }

  @Get('dashboard')
  @RequirePermissions('view-mlm-reports')
  async getLoyaltyDashboard() {
    return await this.loyaltyService.getLoyaltyDashboard();
  }
}
