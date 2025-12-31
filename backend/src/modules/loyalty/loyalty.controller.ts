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
    @Body('tier') tier: 'none' | 'silver' | 'gold',
  ) {
    return await this.loyaltyService.updateMembershipTier(customerId, tier);
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
  ) {
    return await this.loyaltyService.markReferralComplete(referralId, referredCustomerId);
  }

  @Get('referrals/:customerId/stats')
  @UseGuards(JwtAuthGuard)
  async getReferralStats(@Param('customerId') customerId: number) {
    return await this.loyaltyService.getReferralStats(customerId);
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
