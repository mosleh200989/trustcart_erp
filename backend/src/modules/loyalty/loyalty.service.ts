import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerMembership } from './entities/customer-membership.entity';
import { CustomerWallet } from './entities/customer-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CustomerReferral } from './entities/customer-referral.entity';
import { MonthlyGroceryList } from './entities/monthly-grocery-list.entity';
import { GroceryListItem } from './entities/grocery-list-item.entity';
import { PriceLock } from './entities/price-lock.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(CustomerMembership)
    private membershipRepo: Repository<CustomerMembership>,
    @InjectRepository(CustomerWallet)
    private walletRepo: Repository<CustomerWallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepo: Repository<WalletTransaction>,
    @InjectRepository(CustomerReferral)
    private referralRepo: Repository<CustomerReferral>,
    @InjectRepository(MonthlyGroceryList)
    private groceryListRepo: Repository<MonthlyGroceryList>,
    @InjectRepository(GroceryListItem)
    private groceryItemRepo: Repository<GroceryListItem>,
    @InjectRepository(PriceLock)
    private priceLockRepo: Repository<PriceLock>,
  ) {}

  // =====================================================
  // MEMBERSHIP MANAGEMENT
  // =====================================================

  async getCustomerMembership(customerId: number) {
    let membership = await this.membershipRepo.findOne({ where: { customerId } });
    
    if (!membership) {
      membership = this.membershipRepo.create({ customerId });
      await this.membershipRepo.save(membership);
    }
    
    return membership;
  }

  async getAllMemberships(tier?: string) {
    const query: any = {};
    if (tier) query.membershipTier = tier;
    return await this.membershipRepo.find({ where: query, order: { currentMonthSpend: 'DESC' } });
  }

  async updateMembershipTier(customerId: number, tier: 'none' | 'silver' | 'gold') {
    const membership = await this.getCustomerMembership(customerId);
    
    membership.membershipTier = tier;
    membership.discountPercentage = tier === 'gold' ? 10 : tier === 'silver' ? 4 : 0;
    membership.freeDeliveryCount = tier === 'gold' ? 1 : 0;
    membership.priceLockEnabled = tier === 'gold';
    membership.tierAchievedAt = new Date();
    
    return await this.membershipRepo.save(membership);
  }

  // =====================================================
  // WALLET MANAGEMENT
  // =====================================================

  async getCustomerWallet(customerId: number) {
    let wallet = await this.walletRepo.findOne({ where: { customerId } });
    
    if (!wallet) {
      wallet = this.walletRepo.create({ customerId, balance: 0 });
      await this.walletRepo.save(wallet);
    }
    
    return wallet;
  }

  async creditWallet(customerId: number, amount: number, source: string, description?: string, referenceId?: number) {
    const wallet = await this.getCustomerWallet(customerId);
    
    wallet.balance += amount;
    wallet.totalEarned += amount;
    await this.walletRepo.save(wallet);
    
    // Log transaction
    const transaction = this.transactionRepo.create({
      walletId: wallet.id,
      customerId,
      transactionType: 'credit',
      amount,
      source: source as any,
      description,
      referenceId,
      balanceAfter: wallet.balance,
    });
    
    return await this.transactionRepo.save(transaction);
  }

  async debitWallet(customerId: number, amount: number, source: string, description?: string) {
    const wallet = await this.getCustomerWallet(customerId);
    
    if (wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    
    wallet.balance -= amount;
    wallet.totalSpent += amount;
    await this.walletRepo.save(wallet);
    
    // Log transaction
    const transaction = this.transactionRepo.create({
      walletId: wallet.id,
      customerId,
      transactionType: 'debit',
      amount,
      source: source as any,
      description,
      balanceAfter: wallet.balance,
    });
    
    return await this.transactionRepo.save(transaction);
  }

  async getWalletTransactions(customerId: number, limit: number = 50) {
    return await this.transactionRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // =====================================================
  // REFERRAL PROGRAM
  // =====================================================

  async generateReferralCode(customerId: number): Promise<string> {
    const code = `REF${customerId}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return code;
  }

  async createReferral(referrerCustomerId: number, referredEmail: string, referredPhone?: string) {
    const referralCode = await this.generateReferralCode(referrerCustomerId);
    
    const referral = this.referralRepo.create({
      referrerCustomerId,
      referredEmail,
      referredPhone,
      referralCode,
      rewardAmount: 100,
    });
    
    return await this.referralRepo.save(referral);
  }

  async getReferralsByCustomer(customerId: number) {
    return await this.referralRepo.find({
      where: { referrerCustomerId: customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async markReferralComplete(referralId: number, referredCustomerId: number) {
    const referral = await this.referralRepo.findOne({ where: { id: referralId } });
    
    if (!referral) {
      throw new Error('Referral not found');
    }
    
    referral.referredCustomerId = referredCustomerId;
    referral.firstOrderPlaced = true;
    referral.firstOrderDate = new Date();
    referral.status = 'completed';
    
    // Credit will be handled by database trigger
    return await this.referralRepo.save(referral);
  }

  async getReferralStats(customerId: number) {
    const query = `
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_referrals,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_referrals,
        COALESCE(SUM(reward_amount) FILTER (WHERE reward_credited = true), 0) as total_rewards_earned
      FROM customer_referrals
      WHERE referrer_customer_id = $1
    `;
    
    const result = await this.referralRepo.query(query, [customerId]);
    return result[0] || {};
  }

  // =====================================================
  // MONTHLY GROCERY LISTS
  // =====================================================

  async getCustomerGroceryLists(customerId: number) {
    return await this.groceryListRepo.find({
      where: { customerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createGroceryList(customerId: number, listName: string, isSubscription: boolean = false, subscriptionDay?: number) {
    const list = this.groceryListRepo.create({
      customerId,
      listName,
      isSubscription,
      subscriptionDay: subscriptionDay || 1,
      nextOrderDate: subscriptionDay ? this.calculateNextOrderDate(subscriptionDay) : new Date(),
    });
    
    return await this.groceryListRepo.save(list);
  }

  async addItemToGroceryList(listId: number, productId: number, quantity: number, lastPurchasePrice?: number) {
    const item = this.groceryItemRepo.create({
      listId,
      productId,
      quantity,
      lastPurchasePrice,
    });
    
    return await this.groceryItemRepo.save(item);
  }

  async getGroceryListItems(listId: number) {
    return await this.groceryItemRepo.find({
      where: { listId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateGroceryListItem(itemId: number, quantity: number) {
    await this.groceryItemRepo.update(itemId, { quantity });
    return await this.groceryItemRepo.findOne({ where: { id: itemId } });
  }

  async removeItemFromGroceryList(itemId: number) {
    return await this.groceryItemRepo.delete(itemId);
  }

  async toggleSubscription(listId: number, isSubscription: boolean, subscriptionDay?: number) {
    const list = await this.groceryListRepo.findOne({ where: { id: listId } });
    
    if (!list) {
      throw new Error('Grocery list not found');
    }
    
    list.isSubscription = isSubscription;
    list.subscriptionDay = subscriptionDay || list.subscriptionDay || 1;
    list.nextOrderDate = subscriptionDay ? this.calculateNextOrderDate(subscriptionDay) : list.nextOrderDate;
    
    return await this.groceryListRepo.save(list);
  }

  private calculateNextOrderDate(dayOfMonth: number): Date {
    const now = new Date();
    const nextDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    
    if (nextDate <= now) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate;
  }

  async getSubscriptionDueToday() {
    const today = new Date().toISOString().split('T')[0];
    
    return await this.groceryListRepo.find({
      where: { 
        isSubscription: true, 
        isActive: true,
      },
    });
  }

  // =====================================================
  // PRICE LOCKS (Gold Members)
  // =====================================================

  async lockPrice(customerId: number, productId: number, lockedPrice: number) {
    const priceLock = this.priceLockRepo.create({
      customerId,
      productId,
      lockedPrice,
      currentPrice: lockedPrice,
    });
    
    return await this.priceLockRepo.save(priceLock);
  }

  async getCustomerPriceLocks(customerId: number) {
    return await this.priceLockRepo.find({
      where: { customerId, isActive: true },
      order: { lockedAt: 'DESC' },
    });
  }

  async updatePriceLockCurrentPrice(productId: number, newPrice: number) {
    // Update all active price locks for this product
    await this.priceLockRepo
      .createQueryBuilder()
      .update()
      .set({ currentPrice: newPrice })
      .where('product_id = :productId AND is_active = true', { productId })
      .execute();
  }

  async getPriceLockSavings(customerId: number) {
    const query = `
      SELECT 
        COUNT(*) as total_locked_products,
        COALESCE(SUM(current_price - locked_price), 0) as total_savings
      FROM price_locks
      WHERE customer_id = $1 AND is_active = true
    `;
    
    const result = await this.priceLockRepo.query(query, [customerId]);
    return result[0] || {};
  }

  // =====================================================
  // KPI METRICS
  // =====================================================

  async getLoyaltyKPIs() {
    const query = `SELECT * FROM loyalty_kpi_metrics`;
    const result = await this.membershipRepo.query(query);
    return result[0] || {};
  }

  async getMemberBenefits(customerId: number) {
    const query = `
      SELECT * FROM member_benefits_summary
      WHERE customer_id = $1
    `;
    
    const result = await this.membershipRepo.query(query, [customerId]);
    return result[0] || {};
  }

  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  async getLoyaltyDashboard() {
    const [kpis, silverCount, goldCount, activeSubscriptions, pendingReferrals] = await Promise.all([
      this.getLoyaltyKPIs(),
      this.membershipRepo.count({ where: { membershipTier: 'silver' } }),
      this.membershipRepo.count({ where: { membershipTier: 'gold' } }),
      this.groceryListRepo.count({ where: { isSubscription: true, isActive: true } }),
      this.referralRepo.count({ where: { status: 'pending' } }),
    ]);

    return {
      ...kpis,
      silver_members: silverCount,
      gold_members: goldCount,
      active_subscriptions: activeSubscriptions,
      pending_referrals: pendingReferrals,
    };
  }
}
