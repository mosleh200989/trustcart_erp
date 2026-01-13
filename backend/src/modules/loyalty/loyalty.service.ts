import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { In } from 'typeorm';
import { CustomerMembership } from './entities/customer-membership.entity';
import { CustomerWallet } from './entities/customer-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { CustomerReferral } from './entities/customer-referral.entity';
import { MonthlyGroceryList } from './entities/monthly-grocery-list.entity';
import { GroceryListItem } from './entities/grocery-list-item.entity';
import { PriceLock } from './entities/price-lock.entity';
import { QueryFailedError } from 'typeorm';
import { CustomerPoints } from './entities/customer-points.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { ProductConsumptionProfile } from './entities/product-consumption-profile.entity';
import { CustomerProductReminder, ReminderChannel } from './entities/customer-product-reminder.entity';
import { WalletWithdrawalRequest } from './entities/wallet-withdrawal-request.entity';
import { OffersService } from '../offers/offers.service';

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

    @InjectRepository(CustomerPoints)
    private pointsRepo: Repository<CustomerPoints>,

    @InjectRepository(PointTransaction)
    private pointTxRepo: Repository<PointTransaction>,

    @InjectRepository(ProductConsumptionProfile)
    private consumptionProfileRepo: Repository<ProductConsumptionProfile>,

    @InjectRepository(CustomerProductReminder)
    private customerProductReminderRepo: Repository<CustomerProductReminder>,

    @InjectRepository(WalletWithdrawalRequest)
    private withdrawalRepo: Repository<WalletWithdrawalRequest>,

    private offersService: OffersService,
  ) {}

  private now(): Date {
    return new Date();
  }

  async findCustomerIdForContact(email?: string | null, phone?: string | null): Promise<number | null> {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!normalizedEmail && !normalizedPhone) return null;

    try {
      const rows = await this.walletRepo.query(
        `SELECT id::int AS id
         FROM customers
         WHERE (
           $1::text IS NOT NULL
           AND email IS NOT NULL
           AND lower(email) = $1
         )
         OR (
           $2::text IS NOT NULL
           AND phone = $2
         )
         ORDER BY id ASC
         LIMIT 1;`,
        [normalizedEmail || null, normalizedPhone || null],
      );
      const id = Number(rows?.[0]?.id);
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  }

  private normalizeTier(tier?: string | null): 'none' | 'silver' | 'gold' | 'permanent' {
    const t = String(tier || '').trim().toLowerCase();
    if (t === 'silver' || t === 'gold' || t === 'permanent') return t;
    return 'none';
  }

  private normalizeReferralRewardType(value?: any): 'wallet' | 'points' | 'coupon' | 'free_product' | 'membership' {
    const t = String(value || 'wallet').trim().toLowerCase();
    if (t === 'points') return 'points';
    if (t === 'coupon') return 'coupon';
    if (t === 'free_product') return 'free_product';
    if (t === 'membership') return 'membership';
    return 'wallet';
  }

  private async countDeliveredOrdersForCustomer(customerId: number): Promise<number> {
    try {
      const rows = await this.referralRepo.query(
        `SELECT COUNT(*)::int AS cnt FROM sales_orders WHERE customer_id = $1 AND lower(status::text) = 'delivered'`,
        [Number(customerId)],
      );
      return Number(rows?.[0]?.cnt || 0);
    } catch {
      return 0;
    }
  }

  private getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private generatePermanentCardNumber(customerId: number): string {
    const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return `PERM-${customerId}-${suffix}`;
  }

  private normalizeMoneyAmount(amount: number): number {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new Error('Invalid amount');
    }
    const rounded = Math.round(amount * 100) / 100;
    if (rounded <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return rounded;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driverError: any = (error as any).driverError;
    return driverError?.code === '23505';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private resolveCustomerSelector(customerIdOrUuid: string | number):
    | { kind: 'uuid'; customerUuid: string }
    | { kind: 'legacy-int'; customerId: number } {
    if (typeof customerIdOrUuid === 'number') {
      return { kind: 'legacy-int', customerId: customerIdOrUuid };
    }

    const trimmed = String(customerIdOrUuid).trim();
    if (this.isUuid(trimmed)) {
      return { kind: 'uuid', customerUuid: trimmed };
    }

    const legacyCustomerId = Number(trimmed);
    if (!Number.isFinite(legacyCustomerId) || !Number.isInteger(legacyCustomerId)) {
      throw new Error('Invalid customer identifier');
    }
    return { kind: 'legacy-int', customerId: legacyCustomerId };
  }

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

  async updateMembershipTierV2(customerId: number, tier: 'none' | 'silver' | 'gold' | 'permanent') {
    const membership = await this.getCustomerMembership(customerId);

    membership.membershipTier = tier;
    membership.discountPercentage =
      tier === 'permanent' ? 12 : tier === 'gold' ? 10 : tier === 'silver' ? 4 : 0;
    membership.freeDeliveryCount = tier === 'permanent' ? 2 : tier === 'gold' ? 1 : 0;
    membership.priceLockEnabled = tier === 'gold' || tier === 'permanent';
    membership.tierAchievedAt = new Date();

    if (tier === 'permanent' && !membership.permanentCardNumber) {
      membership.permanentCardNumber = this.generatePermanentCardNumber(customerId);
    }

    return await this.membershipRepo.save(membership);
  }

  async evaluateAndUpgradeMembership(
    customerId: number,
    thresholds?: {
      silverOrders?: number;
      silverSpend?: number;
      goldOrders?: number;
      goldSpend?: number;
      permanentOrders?: number;
      permanentSpend?: number;
    },
  ) {
    const t = {
      silverOrders: thresholds?.silverOrders ?? 3,
      silverSpend: thresholds?.silverSpend ?? 5000,
      goldOrders: thresholds?.goldOrders ?? 6,
      goldSpend: thresholds?.goldSpend ?? 12000,
      permanentOrders: thresholds?.permanentOrders ?? 12,
      permanentSpend: thresholds?.permanentSpend ?? 25000,
    };

    const [stats] = await this.membershipRepo.query(
      `
      SELECT
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(total_amount), 0)::numeric AS total_spend
      FROM sales_orders
      WHERE customer_id = $1
      `,
      [customerId],
    );

    const totalOrders = Number(stats?.total_orders ?? 0);
    const totalSpend = Number(stats?.total_spend ?? 0);

    let nextTier: 'none' | 'silver' | 'gold' | 'permanent' = 'none';
    if (totalOrders >= t.permanentOrders || totalSpend >= t.permanentSpend) nextTier = 'permanent';
    else if (totalOrders >= t.goldOrders || totalSpend >= t.goldSpend) nextTier = 'gold';
    else if (totalOrders >= t.silverOrders || totalSpend >= t.silverSpend) nextTier = 'silver';

    const updated = await this.updateMembershipTierV2(customerId, nextTier);

    return {
      customerId,
      totalOrders,
      totalSpend,
      tier: updated.membershipTier,
      permanentCardNumber: updated.permanentCardNumber ?? null,
      thresholds: t,
    };
  }

  // =====================================================
  // CONSUMPTION PROFILES (Admin Config)
  // =====================================================

  async listConsumptionProfiles() {
    return await this.consumptionProfileRepo.find({
      order: { isActive: 'DESC', updatedAt: 'DESC' },
    });
  }

  async upsertConsumptionProfile(data: {
    productId?: number | null;
    categoryId?: number | null;
    avgConsumptionDays: number;
    bufferDays?: number;
    minDays?: number;
    maxDays?: number;
    isActive?: boolean;
  }) {
    const productId = data.productId ?? null;
    const categoryId = data.categoryId ?? null;

    if ((productId == null && categoryId == null) || (productId != null && categoryId != null)) {
      throw new Error('Provide exactly one of productId or categoryId');
    }

    const where: any = productId != null ? { productId } : { categoryId };
    let profile = await this.consumptionProfileRepo.findOne({ where });

    if (!profile) {
      profile = this.consumptionProfileRepo.create({
        productId,
        categoryId,
        avgConsumptionDays: data.avgConsumptionDays,
        bufferDays: data.bufferDays ?? 7,
        minDays: data.minDays ?? 7,
        maxDays: data.maxDays ?? 180,
        isActive: data.isActive ?? true,
      });
    } else {
      profile.avgConsumptionDays = data.avgConsumptionDays;
      profile.bufferDays = data.bufferDays ?? profile.bufferDays;
      profile.minDays = data.minDays ?? profile.minDays;
      profile.maxDays = data.maxDays ?? profile.maxDays;
      if (typeof data.isActive === 'boolean') profile.isActive = data.isActive;
    }

    return await this.consumptionProfileRepo.save(profile);
  }

  async deleteConsumptionProfile(id: number) {
    return await this.consumptionProfileRepo.delete(id);
  }

  // =====================================================
  // PER-PRODUCT REMINDERS
  // =====================================================

  async generateProductReminders(asOfDate?: string) {
    const asOf = (asOfDate || this.getTodayDateString()).slice(0, 10);

    // Upsert current reminder state per (customer, product)
    await this.membershipRepo.query(
      `
      INSERT INTO customer_product_reminders (
        customer_id,
        product_id,
        last_order_id,
        last_order_date,
        reminder_due_date,
        reminder_sent,
        created_at,
        updated_at
      )
      SELECT
        x.customer_id,
        x.product_id,
        x.last_order_id,
        x.last_order_date,
        (
          x.last_order_date
          + (GREATEST(LEAST(x.consumption_days, x.max_days), x.min_days) - GREATEST(LEAST(x.buffer_days, 60), 0)) * INTERVAL '1 day'
        )::date AS reminder_due_date,
        false AS reminder_sent,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM (
        SELECT DISTINCT ON (so.customer_id, soi.product_id)
          so.customer_id,
          soi.product_id,
          so.id AS last_order_id,
          so.order_date::date AS last_order_date,
          COALESCE(pp.avg_consumption_days, cp.avg_consumption_days, 30) AS consumption_days,
          COALESCE(pp.buffer_days, cp.buffer_days, 7) AS buffer_days,
          COALESCE(pp.min_days, cp.min_days, 7) AS min_days,
          COALESCE(pp.max_days, cp.max_days, 180) AS max_days
        FROM sales_orders so
        JOIN sales_order_items soi ON soi.sales_order_id = so.id
        LEFT JOIN products p ON p.id = soi.product_id
        LEFT JOIN product_consumption_profiles pp
          ON pp.product_id = soi.product_id AND pp.is_active = true
        LEFT JOIN product_consumption_profiles cp
          ON cp.category_id = p.category_id AND cp.product_id IS NULL AND cp.is_active = true
        WHERE so.customer_id IS NOT NULL
        ORDER BY so.customer_id, soi.product_id, so.order_date DESC, so.id DESC
      ) x
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET
        last_order_id = EXCLUDED.last_order_id,
        last_order_date = EXCLUDED.last_order_date,
        reminder_due_date = EXCLUDED.reminder_due_date,
        reminder_sent = CASE
          WHEN customer_product_reminders.last_order_date <> EXCLUDED.last_order_date THEN false
          ELSE customer_product_reminders.reminder_sent
        END,
        reminder_sent_at = CASE
          WHEN customer_product_reminders.last_order_date <> EXCLUDED.last_order_date THEN NULL
          ELSE customer_product_reminders.reminder_sent_at
        END,
        reminder_channel = CASE
          WHEN customer_product_reminders.last_order_date <> EXCLUDED.last_order_date THEN NULL
          ELSE customer_product_reminders.reminder_channel
        END,
        updated_at = CURRENT_TIMESTAMP;
      `,
    );

    // Create CRM call tasks for due reminders (idempotent)
    await this.membershipRepo.query(
      `
      INSERT INTO crm_call_tasks (
        customer_id,
        priority,
        call_reason,
        task_date,
        recommended_product_id,
        status
      )
      SELECT
        r.customer_id::text,
        CASE WHEN cm.membership_tier IN ('gold','permanent') THEN 'hot' ELSE 'warm' END,
        'Repeat purchase reminder',
        $1::date,
        r.product_id,
        'pending'
      FROM customer_product_reminders r
      LEFT JOIN customer_memberships cm ON cm.customer_id = r.customer_id
      WHERE r.reminder_due_date <= $1::date
        AND r.reminder_sent = false
        AND NOT EXISTS (
          SELECT 1 FROM crm_call_tasks ct
          WHERE ct.customer_id = r.customer_id::text
            AND ct.task_date = $1::date
            AND ct.recommended_product_id = r.product_id
            AND ct.call_reason = 'Repeat purchase reminder'
        );
      `,
      [asOf],
    );

    return { success: true, asOfDate: asOf };
  }

  async listDueProductReminders(asOfDate?: string, limit = 100) {
    const asOf = (asOfDate || this.getTodayDateString()).slice(0, 10);
    const lim = Math.max(1, Math.min(1000, Number(limit) || 100));

    const rows = await this.membershipRepo.query(
      `
      SELECT
        r.id,
        r.customer_id,
        r.product_id,
        r.last_order_date,
        r.reminder_due_date,
        r.reminder_sent,
        r.reminder_channel,
        c.name AS first_name,
        NULL::text AS last_name,
        c.phone,
        p.name_en AS product_name
      FROM customer_product_reminders r
      LEFT JOIN customers c ON c.id = r.customer_id
      LEFT JOIN products p ON p.id = r.product_id
      WHERE r.reminder_due_date <= $1::date
        AND r.reminder_sent = false
      ORDER BY r.reminder_due_date ASC
      LIMIT $2;
      `,
      [asOf, lim],
    );

    return { asOfDate: asOf, count: rows.length, reminders: rows };
  }

  async markProductReminderSent(id: number, channel: ReminderChannel) {
    const reminder = await this.customerProductReminderRepo.findOne({ where: { id } });
    if (!reminder) throw new Error('Reminder not found');

    reminder.reminderSent = true;
    reminder.reminderChannel = channel;
    reminder.reminderSentAt = new Date();

    return await this.customerProductReminderRepo.save(reminder);
  }

  // =====================================================
  // WALLET MANAGEMENT
  // =====================================================

  async getCustomerWallet(customerIdOrUuid: string | number) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const where =
      selector.kind === 'uuid'
        ? ({ customerUuid: selector.customerUuid } as any)
        : ({ customerId: selector.customerId } as any);

    return await this.walletRepo.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(CustomerWallet);

      let wallet = await walletRepo.findOne({ where, lock: { mode: 'pessimistic_write' } });

      if (!wallet) {
        wallet =
          selector.kind === 'uuid'
            ? walletRepo.create({ customerUuid: selector.customerUuid, balance: 0, totalEarned: 0, totalSpent: 0 })
            : walletRepo.create({ customerId: selector.customerId, balance: 0, totalEarned: 0, totalSpent: 0 });

        try {
          await walletRepo.save(wallet);
        } catch (e) {
          // Another request may have created the wallet concurrently.
          if (!this.isUniqueViolation(e)) throw e;
          wallet = await walletRepo.findOne({ where, lock: { mode: 'pessimistic_write' } });
        }
      }

      if (!wallet) {
        throw new Error('Failed to create or load wallet');
      }

      return wallet;
    });
  }

  async creditWallet(
    customerIdOrUuid: string | number,
    amount: number,
    source: string,
    description?: string,
    referenceId?: number,
    idempotencyKey?: string,
  ) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const normalizedAmount = this.normalizeMoneyAmount(amount);

    return await this.walletRepo.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(CustomerWallet);
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } as any });
        if (existing) return existing;
      }

      const walletWhere =
        selector.kind === 'uuid'
          ? ({ customerUuid: selector.customerUuid } as any)
          : ({ customerId: selector.customerId } as any);

      let wallet = await walletRepo.findOne({ where: walletWhere, lock: { mode: 'pessimistic_write' } });
      if (!wallet) {
        wallet =
          selector.kind === 'uuid'
            ? walletRepo.create({ customerUuid: selector.customerUuid, balance: 0, totalEarned: 0, totalSpent: 0 })
            : walletRepo.create({ customerId: selector.customerId, balance: 0, totalEarned: 0, totalSpent: 0 });
        await walletRepo.save(wallet);
      }

      wallet.balance = Number(wallet.balance) + normalizedAmount;
      wallet.totalEarned = Number(wallet.totalEarned) + normalizedAmount;
      await walletRepo.save(wallet);

      const baseTx: Partial<WalletTransaction> = {
        walletId: wallet.id,
        idempotencyKey: idempotencyKey || undefined,
        status: 'posted',
        transactionType: 'credit',
        amount: normalizedAmount,
        source: source as any,
        description,
        referenceId,
        balanceAfter: wallet.balance,
      };

      if (selector.kind === 'uuid') baseTx.customerUuid = selector.customerUuid;
      else baseTx.customerId = selector.customerId;

      const transaction = txRepo.create(baseTx as any);

      return await txRepo.save(transaction);
    });
  }

  async debitWallet(
    customerIdOrUuid: string | number,
    amount: number,
    source: string,
    description?: string,
    idempotencyKey?: string,
  ) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const normalizedAmount = this.normalizeMoneyAmount(amount);

    return await this.walletRepo.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(CustomerWallet);
      const txRepo = manager.getRepository(WalletTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } as any });
        if (existing) return existing;
      }

      const walletWhere =
        selector.kind === 'uuid'
          ? ({ customerUuid: selector.customerUuid } as any)
          : ({ customerId: selector.customerId } as any);

      const wallet = await walletRepo.findOne({ where: walletWhere, lock: { mode: 'pessimistic_write' } });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (Number(wallet.balance) < normalizedAmount) {
        throw new Error('Insufficient wallet balance');
      }

      wallet.balance = Number(wallet.balance) - normalizedAmount;
      wallet.totalSpent = Number(wallet.totalSpent) + normalizedAmount;
      await walletRepo.save(wallet);

      const baseTx: Partial<WalletTransaction> = {
        walletId: wallet.id,
        idempotencyKey: idempotencyKey || undefined,
        status: 'posted',
        transactionType: 'debit',
        amount: normalizedAmount,
        source: source as any,
        description,
        balanceAfter: wallet.balance,
      };

      if (selector.kind === 'uuid') baseTx.customerUuid = selector.customerUuid;
      else baseTx.customerId = selector.customerId;

      const transaction = txRepo.create(baseTx as any);

      return await txRepo.save(transaction);
    });
  }

  async getWalletTransactions(customerIdOrUuid: string | number, limit: number = 50) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const where =
      selector.kind === 'uuid'
        ? ({ customerUuid: selector.customerUuid } as any)
        : ({ customerId: selector.customerId } as any);

    return await this.transactionRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // =====================================================
  // REFERRAL PROGRAM
  // =====================================================

  tryParseShareReferralCode(code: string): number | null {
    if (code == null) return null;
    const normalized = String(code).trim().toUpperCase();
    // Share codes are stable: REF000123 (digits only after REF)
    const m = normalized.match(/^REF(\d+)$/);
    if (!m) return null;
    const id = Number(m[1]);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }

  async recordReferralEvent(input: {
    eventType: string;
    referralId?: number;
    referrerCustomerId?: number;
    referredCustomerId?: number;
    orderId?: number;
    shareCodeUsed?: string;
    partnerCode?: string;
    sourceChannel?: string;
    payload?: any;
  }) {
    try {
      await this.referralRepo.query(
        `
        INSERT INTO referral_events (
          event_type,
          referral_id,
          referrer_customer_id,
          referred_customer_id,
          order_id,
          share_code_used,
          partner_code,
          source_channel,
          payload
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          input.eventType,
          input.referralId ?? null,
          input.referrerCustomerId ?? null,
          input.referredCustomerId ?? null,
          input.orderId ?? null,
          input.shareCodeUsed ?? null,
          input.partnerCode ?? null,
          input.sourceChannel ?? null,
          input.payload ?? null,
        ],
      );
    } catch {
      // never block business flows on audit logging
    }
  }

  private async resolveReferralCampaignConfig(input?: {
    campaignId?: string;
  }): Promise<{
    campaignId: string | null;
    rewardType: 'wallet' | 'points' | 'coupon' | 'free_product' | 'membership';
    referrerRewardAmount: number;
    referredRewardAmount: number;
    referrerRewardPoints: number;
    referredRewardPoints: number;
    referrerOfferId: number | null;
    referredOfferId: number | null;
    vipReferralsThreshold: number | null;
    vipMembershipTier: 'none' | 'silver' | 'gold' | 'permanent';
  }> {
    const requested = input?.campaignId ? String(input.campaignId) : null;

    try {
      if (requested) {
        const rows = await this.referralRepo.query(
          `SELECT id::text AS id, reward_referrer_amount, reward_referred_amount
           , reward_type, reward_referrer_points, reward_referred_points, referrer_offer_id, referred_offer_id,
             vip_referrals_threshold, vip_membership_tier
           FROM referral_campaigns WHERE id = $1 LIMIT 1`,
          [requested],
        );
        const row = rows?.[0];
        if (row?.id) {
          return {
            campaignId: row.id,
            rewardType: this.normalizeReferralRewardType(row.reward_type),
            referrerRewardAmount: Number(row.reward_referrer_amount ?? 0),
            referredRewardAmount: Number(row.reward_referred_amount ?? 0),
            referrerRewardPoints: Number(row.reward_referrer_points ?? 0),
            referredRewardPoints: Number(row.reward_referred_points ?? 0),
            referrerOfferId: row.referrer_offer_id != null ? Number(row.referrer_offer_id) : null,
            referredOfferId: row.referred_offer_id != null ? Number(row.referred_offer_id) : null,
            vipReferralsThreshold: row.vip_referrals_threshold != null ? Number(row.vip_referrals_threshold) : null,
            vipMembershipTier: this.normalizeTier(row.vip_membership_tier),
          };
        }
      }
    } catch {
      // ignore and fall back
    }

    try {
      const rows = await this.referralRepo.query(
        `SELECT id::text AS id, reward_referrer_amount, reward_referred_amount
         , reward_type, reward_referrer_points, reward_referred_points, referrer_offer_id, referred_offer_id,
           vip_referrals_threshold, vip_membership_tier
         FROM referral_campaigns WHERE name = $1 ORDER BY created_at ASC LIMIT 1`,
        ['Default Referral Campaign'],
      );
      const row = rows?.[0];
      if (row?.id) {
        return {
          campaignId: row.id,
          rewardType: this.normalizeReferralRewardType(row.reward_type),
          referrerRewardAmount: Number(row.reward_referrer_amount ?? 100),
          referredRewardAmount: Number(row.reward_referred_amount ?? 0),
          referrerRewardPoints: Number(row.reward_referrer_points ?? 0),
          referredRewardPoints: Number(row.reward_referred_points ?? 0),
          referrerOfferId: row.referrer_offer_id != null ? Number(row.referrer_offer_id) : null,
          referredOfferId: row.referred_offer_id != null ? Number(row.referred_offer_id) : null,
          vipReferralsThreshold: row.vip_referrals_threshold != null ? Number(row.vip_referrals_threshold) : null,
          vipMembershipTier: this.normalizeTier(row.vip_membership_tier),
        };
      }
    } catch {
      // ignore
    }

    return {
      campaignId: null,
      rewardType: 'wallet',
      referrerRewardAmount: 100,
      referredRewardAmount: 0,
      referrerRewardPoints: 0,
      referredRewardPoints: 0,
      referrerOfferId: null,
      referredOfferId: null,
      vipReferralsThreshold: null,
      vipMembershipTier: 'none',
    };
  }

  async registerReferralFromShareCode(input: {
    referrerCustomerId: number;
    referredCustomerId: number;
    referredEmail?: string;
    referredPhone?: string;
    shareCodeUsed?: string;
    sourceChannel?: string;
    campaignId?: string;
  }) {
    if (!input?.referrerCustomerId || !input?.referredCustomerId) return null;
    if (Number(input.referrerCustomerId) === Number(input.referredCustomerId)) return null;

    const existing = await this.referralRepo.findOne({
      where: { referredCustomerId: Number(input.referredCustomerId) } as any,
    });
    if (existing) return existing;

    const campaign = await this.resolveReferralCampaignConfig({ campaignId: input.campaignId });
    const referralCode = await this.generateReferralCode(Number(input.referrerCustomerId));

    const referral = this.referralRepo.create({
      referrerCustomerId: Number(input.referrerCustomerId),
      referredCustomerId: Number(input.referredCustomerId),
      referredEmail: input.referredEmail ?? null,
      referredPhone: input.referredPhone ?? null,
      referralCode,
      shareCodeUsed: input.shareCodeUsed ?? null,
      sourceChannel: input.sourceChannel ?? null,
      campaignId: campaign.campaignId,
      rewardAmount: campaign.referrerRewardAmount,
      referredRewardAmount: campaign.referredRewardAmount,
      status: 'registered',
    } as any) as any;

    const saved = (await this.referralRepo.save(referral as any)) as any;

    await this.recordReferralEvent({
      eventType: 'registered',
      referralId: saved.id,
      referrerCustomerId: saved.referrerCustomerId,
      referredCustomerId: saved.referredCustomerId,
      shareCodeUsed: saved.shareCodeUsed ?? undefined,
      sourceChannel: saved.sourceChannel ?? undefined,
      payload: { campaignId: saved.campaignId ?? null },
    });

    return saved;
  }

  async autoCompleteReferralForDeliveredOrder(input: { orderId: number; customerId: number | null }) {
    const customerId = input?.customerId != null ? Number(input.customerId) : null;
    if (!customerId) return null;

    // Only complete on the first delivered order (fraud / abuse prevention)
    const deliveredCount = await this.countDeliveredOrdersForCustomer(customerId);
    if (deliveredCount > 1) {
      return null;
    }

    const referral = await this.referralRepo.findOne({
      where: { referredCustomerId: customerId } as any,
    });
    if (!referral) return null;
    if ((referral as any).status === 'completed') return referral;

    const completed = await this.markReferralComplete(referral.id, customerId, input.orderId);

    await this.recordReferralEvent({
      eventType: 'completed',
      referralId: referral.id,
      referrerCustomerId: (referral as any).referrerCustomerId,
      referredCustomerId: customerId,
      orderId: input.orderId,
      shareCodeUsed: (referral as any).shareCodeUsed ?? undefined,
      sourceChannel: (referral as any).sourceChannel ?? undefined,
    });

    return completed;
  }

  async generateReferralCode(customerId: number): Promise<string> {
    const code = `REF${customerId}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return code;
  }

  async createReferral(referrerCustomerId: number, referredEmail?: string | null, referredPhone?: string | null) {
    const referralCode = await this.generateReferralCode(referrerCustomerId);

    const email = referredEmail != null && String(referredEmail).trim().length ? String(referredEmail).trim() : null;
    const phone = referredPhone != null && String(referredPhone).trim().length ? String(referredPhone).trim() : null;

    const referral = this.referralRepo.create({
      referrerCustomerId,
      referredEmail: email as any,
      referredPhone: phone as any,
      referralCode,
      rewardAmount: 100,
    });

    return await this.referralRepo.save(referral);
  }

  async createAgentReferral(input: {
    referrerCustomerId: number;
    referredEmail?: string;
    referredPhone?: string;
    agentUserId: number;
    campaignId?: string;
    partnerId?: string;
    notes?: string;
  }) {
    const referrerCustomerId = Number(input.referrerCustomerId);
    if (!Number.isFinite(referrerCustomerId) || referrerCustomerId <= 0) {
      throw new Error('Invalid referrerCustomerId');
    }
    const agentUserId = Number(input.agentUserId);
    if (!Number.isFinite(agentUserId) || agentUserId <= 0) {
      throw new Error('Invalid agentUserId');
    }

    const referralCode = await this.generateReferralCode(referrerCustomerId);
    const shareCodeUsed = await this.getShareReferralCode(referrerCustomerId);
    const cfg = await this.resolveReferralCampaignConfig({ campaignId: input.campaignId });

    const email = input.referredEmail != null && String(input.referredEmail).trim().length ? String(input.referredEmail).trim() : null;
    const phone = input.referredPhone != null && String(input.referredPhone).trim().length ? String(input.referredPhone).trim() : null;

    const referral = this.referralRepo.create({
      referrerCustomerId,
      referredEmail: email as any,
      referredPhone: phone as any,
      referralCode,
      rewardAmount: cfg.referrerRewardAmount,
      referredRewardAmount: cfg.referredRewardAmount,
      status: 'pending' as any,
    });

    (referral as any).sourceChannel = 'agent_referral';
    (referral as any).shareCodeUsed = shareCodeUsed;
    (referral as any).campaignId = cfg.campaignId;
    (referral as any).partnerId = input.partnerId != null ? String(input.partnerId) : null;
    (referral as any).agentUserId = agentUserId;

    const saved = await this.referralRepo.save(referral);

    await this.recordReferralEvent({
      eventType: 'invited',
      referralId: saved.id,
      referrerCustomerId,
      shareCodeUsed,
      sourceChannel: 'agent_referral',
      payload: {
        agentUserId,
        notes: input.notes != null ? String(input.notes) : null,
      },
    });

    return saved;
  }

  async listAgentReferrals(agentUserId: number, limit = 100) {
    const id = Number(agentUserId);
    if (!Number.isFinite(id) || id <= 0) return [];

    const take = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 100;
    const rows = await this.referralRepo.query(
      `SELECT * FROM customer_referrals
       WHERE agent_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [id, take],
    );
    return rows || [];
  }

  async getReferralsByCustomer(customerId: number) {
    const referrals = await this.referralRepo.find({
      where: { referrerCustomerId: customerId },
      order: { createdAt: 'DESC' },
    });

    if (referrals.length === 0) return referrals;

    const referralIds = referrals.map((r) => r.id);
    // Only map the referrer's reward transactions (avoid mixing in referred bonuses)
    const rewardTxs = await this.transactionRepo.find({
      where: {
        source: 'referral' as any,
        transactionType: 'credit' as any,
        referenceId: In(referralIds) as any,
        customerId,
      } as any,
      order: { createdAt: 'DESC' },
    });

    const rewardTxByReferralId = new Map<number, { id: number; createdAt: Date }>();
    for (const tx of rewardTxs) {
      if (tx.referenceId != null && !rewardTxByReferralId.has(Number(tx.referenceId))) {
        rewardTxByReferralId.set(Number(tx.referenceId), { id: tx.id, createdAt: tx.createdAt });
      }
    }

    return referrals.map((r: any) => {
      const tx = rewardTxByReferralId.get(r.id);
      return {
        ...r,
        rewardTransactionId: tx?.id ?? null,
        rewardCreditedAt: tx?.createdAt ?? null,
      };
    });
  }

  async getShareReferralCode(customerId: number): Promise<string> {
    // Stable, server-driven code for sharing links (not tied to per-referral records)
    const id = Number(customerId);
    if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid customerId');
    return `REF${String(id).padStart(6, '0')}`;
  }

  async markReferralComplete(referralId: number, referredCustomerId?: number, orderId?: number) {
    const referral = await this.referralRepo.findOne({ where: { id: referralId } });
    
    if (!referral) {
      throw new Error('Referral not found');
    }

    // Idempotent: if already completed, just ensure reward credited and return.
    if (referral.status === 'completed') {
      await this.ensureReferralRewardCredited(referral.id);
      return await this.referralRepo.findOne({ where: { id: referralId } });
    }

    if (referredCustomerId != null) {
      referral.referredCustomerId = referredCustomerId;
    }

    if (orderId != null) {
      (referral as any).qualifyingOrderId = Number(orderId);
    }
    
    referral.firstOrderPlaced = true;
    referral.firstOrderDate = new Date();
    referral.status = 'completed';
    referral.completedAt = new Date();
    
    // Primary path: DB trigger from membership-loyalty-migration.sql.
    // Fallback: if trigger is not installed, credit via application (idempotent).
    const saved = await this.referralRepo.save(referral);
    await this.ensureReferralRewardCredited(saved.id);
    return await this.referralRepo.findOne({ where: { id: referralId } });
  }

  private async ensureReferralRewardCredited(referralId: number) {
    const referral = await this.referralRepo.findOne({ where: { id: referralId } });
    if (!referral) return;
    if (referral.status !== 'completed') return;
    if (!referral.referrerCustomerId) return;

    const campaignId = (referral as any).campaignId ? String((referral as any).campaignId) : undefined;
    const campaign = await this.resolveReferralCampaignConfig({ campaignId });
    const rewardType = campaign.rewardType;

    const referredId = (referral as any).referredCustomerId ? Number((referral as any).referredCustomerId) : null;

    if (rewardType === 'points') {
      // Referrer points
      if (!referral.rewardCredited && campaign.referrerRewardPoints > 0) {
        const idempotencyKey = `referral:${referral.id}:referrer:points`;
        await this.earnPoints(referral.referrerCustomerId, campaign.referrerRewardPoints, 'referral', 'Referral reward (points)', referral.id, idempotencyKey);
        referral.rewardCredited = true;
      }

      // Referred points
      if (referredId && campaign.referredRewardPoints > 0 && !(referral as any).referredRewardCredited) {
        const idempotencyKey = `referral:${referral.id}:referred:points`;
        await this.earnPoints(referredId, campaign.referredRewardPoints, 'referral', 'Referral welcome bonus (points)', referral.id, idempotencyKey);
        (referral as any).referredRewardCredited = true;
      }
    } else if (rewardType === 'coupon' || rewardType === 'free_product') {
      // Issue customer-assigned offer codes (single-use)
      if (!referral.rewardCredited && campaign.referrerOfferId) {
        const code = await this.offersService.issueOfferCode({
          offerId: campaign.referrerOfferId,
          assignedCustomerId: referral.referrerCustomerId,
          prefix: rewardType === 'free_product' ? 'FREE' : 'REF',
          maxUses: 1,
          maxUsesPerCustomer: 1,
        });
        referral.rewardCredited = true;
        await this.recordReferralEvent({
          eventType: rewardType === 'free_product' ? 'reward_issued_free_product' : 'reward_issued_coupon',
          referralId: referral.id,
          referrerCustomerId: referral.referrerCustomerId,
          referredCustomerId: referredId ?? undefined,
          payload: { offerCode: code.code, offerId: campaign.referrerOfferId, side: 'referrer' },
        });
      }

      if (referredId && !(referral as any).referredRewardCredited && campaign.referredOfferId) {
        const code = await this.offersService.issueOfferCode({
          offerId: campaign.referredOfferId,
          assignedCustomerId: referredId,
          prefix: rewardType === 'free_product' ? 'FREE' : 'WELCOME',
          maxUses: 1,
          maxUsesPerCustomer: 1,
        });
        (referral as any).referredRewardCredited = true;
        await this.recordReferralEvent({
          eventType: rewardType === 'free_product' ? 'reward_issued_free_product' : 'reward_issued_coupon',
          referralId: referral.id,
          referrerCustomerId: referral.referrerCustomerId,
          referredCustomerId: referredId,
          payload: { offerCode: code.code, offerId: campaign.referredOfferId, side: 'referred' },
        });
      }
    } else {
      // Default: wallet amounts
      if (!referral.rewardCredited) {
        const idempotencyKey = `referral:${referral.id}:referrer:wallet`;
        await this.creditWallet(
          referral.referrerCustomerId,
          Number((referral as any).rewardAmount || campaign.referrerRewardAmount || 0),
          'referral',
          'Referral reward',
          referral.id,
          idempotencyKey,
        );
        referral.rewardCredited = true;
      }

      const referredAmount = Number((referral as any).referredRewardAmount || campaign.referredRewardAmount || 0);
      if (referredId && referredAmount > 0 && !(referral as any).referredRewardCredited) {
        const idempotencyKey = `referral:${referral.id}:referred:wallet`;
        await this.creditWallet(
          referredId,
          referredAmount,
          'referral',
          'Referral welcome bonus',
          referral.id,
          idempotencyKey,
        );
        (referral as any).referredRewardCredited = true;
      }
    }

    // VIP / membership automation for referrer
    if (campaign.vipReferralsThreshold && campaign.vipReferralsThreshold > 0) {
      try {
        const stats = await this.getReferralStats(referral.referrerCustomerId);
        const completed = Number((stats as any)?.completed_referrals || 0);
        if (completed >= campaign.vipReferralsThreshold) {
          const tier = campaign.vipMembershipTier !== 'none' ? campaign.vipMembershipTier : 'gold';
          await this.updateMembershipTierV2(referral.referrerCustomerId, tier);
        }
      } catch {
        // non-blocking
      }
    }

    await this.referralRepo.save(referral as any);
  }

  async listReferralCampaigns(includeInactive = false) {
    const where = includeInactive ? '' : 'WHERE is_active = true';
    const rows = await this.referralRepo.query(
      `SELECT id::text AS id, name, is_active, reward_type,
              reward_referrer_amount, reward_referred_amount,
              reward_referrer_points, reward_referred_points,
              referrer_offer_id, referred_offer_id,
              vip_referrals_threshold, vip_membership_tier,
              starts_at, ends_at, created_at, updated_at
       FROM referral_campaigns
       ${where}
       ORDER BY created_at DESC`,
    );
    return rows || [];
  }

  async createReferralCampaign(data: any) {
    const name = String(data?.name || '').trim();
    if (!name) throw new Error('Campaign name is required');

    const rewardType = this.normalizeReferralRewardType(data?.rewardType ?? data?.reward_type);
    const isActive = data?.isActive != null ? Boolean(data.isActive) : data?.is_active != null ? Boolean(data.is_active) : true;

    const referrerAmount = Number(data?.rewardReferrerAmount ?? data?.reward_referrer_amount ?? 0);
    const referredAmount = Number(data?.rewardReferredAmount ?? data?.reward_referred_amount ?? 0);
    const referrerPoints = Number(data?.rewardReferrerPoints ?? data?.reward_referrer_points ?? 0);
    const referredPoints = Number(data?.rewardReferredPoints ?? data?.reward_referred_points ?? 0);
    const referrerOfferId = data?.referrerOfferId ?? data?.referrer_offer_id;
    const referredOfferId = data?.referredOfferId ?? data?.referred_offer_id;
    const vipThreshold = data?.vipReferralsThreshold ?? data?.vip_referrals_threshold;
    const vipTier = this.normalizeTier(data?.vipMembershipTier ?? data?.vip_membership_tier);

    const startsAt = data?.startsAt ?? data?.starts_at;
    const endsAt = data?.endsAt ?? data?.ends_at;

    const rows = await this.referralRepo.query(
      `INSERT INTO referral_campaigns (
        name, is_active, reward_type,
        reward_referrer_amount, reward_referred_amount,
        reward_referrer_points, reward_referred_points,
        referrer_offer_id, referred_offer_id,
        vip_referrals_threshold, vip_membership_tier,
        starts_at, ends_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id::text AS id, name, is_active, reward_type,
        reward_referrer_amount, reward_referred_amount,
        reward_referrer_points, reward_referred_points,
        referrer_offer_id, referred_offer_id,
        vip_referrals_threshold, vip_membership_tier,
        starts_at, ends_at, created_at, updated_at`,
      [
        name,
        isActive,
        rewardType,
        referrerAmount,
        referredAmount,
        referrerPoints,
        referredPoints,
        referrerOfferId != null ? Number(referrerOfferId) : null,
        referredOfferId != null ? Number(referredOfferId) : null,
        vipThreshold != null ? Number(vipThreshold) : null,
        vipTier !== 'none' ? vipTier : null,
        startsAt ? new Date(startsAt) : null,
        endsAt ? new Date(endsAt) : null,
      ],
    );
    return rows?.[0] || null;
  }

  async updateReferralCampaign(id: string, data: any) {
    const campaignId = String(id).trim();
    if (!campaignId) throw new Error('Invalid campaign id');

    const name = data?.name != null ? String(data.name).trim() : undefined;
    const isActive = data?.isActive != null ? Boolean(data.isActive) : data?.is_active != null ? Boolean(data.is_active) : undefined;
    const rewardTypeRaw = data?.rewardType ?? data?.reward_type;
    const rewardType = rewardTypeRaw != null ? this.normalizeReferralRewardType(rewardTypeRaw) : undefined;

    const referrerAmount = data?.rewardReferrerAmount ?? data?.reward_referrer_amount;
    const referredAmount = data?.rewardReferredAmount ?? data?.reward_referred_amount;
    const referrerPoints = data?.rewardReferrerPoints ?? data?.reward_referrer_points;
    const referredPoints = data?.rewardReferredPoints ?? data?.reward_referred_points;
    const referrerOfferId = data?.referrerOfferId ?? data?.referrer_offer_id;
    const referredOfferId = data?.referredOfferId ?? data?.referred_offer_id;
    const vipThreshold = data?.vipReferralsThreshold ?? data?.vip_referrals_threshold;
    const vipTierRaw = data?.vipMembershipTier ?? data?.vip_membership_tier;
    const vipTier = vipTierRaw != null ? this.normalizeTier(vipTierRaw) : undefined;
    const startsAt = data?.startsAt ?? data?.starts_at;
    const endsAt = data?.endsAt ?? data?.ends_at;

    const existing = await this.referralRepo.query(`SELECT id::text AS id FROM referral_campaigns WHERE id = $1 LIMIT 1`, [campaignId]);
    if (!existing?.[0]?.id) throw new Error('Campaign not found');

    await this.referralRepo.query(
      `UPDATE referral_campaigns SET
        name = COALESCE($2, name),
        is_active = COALESCE($3, is_active),
        reward_type = COALESCE($4, reward_type),
        reward_referrer_amount = COALESCE($5, reward_referrer_amount),
        reward_referred_amount = COALESCE($6, reward_referred_amount),
        reward_referrer_points = COALESCE($7, reward_referrer_points),
        reward_referred_points = COALESCE($8, reward_referred_points),
        referrer_offer_id = COALESCE($9, referrer_offer_id),
        referred_offer_id = COALESCE($10, referred_offer_id),
        vip_referrals_threshold = COALESCE($11, vip_referrals_threshold),
        vip_membership_tier = COALESCE($12, vip_membership_tier),
        starts_at = COALESCE($13, starts_at),
        ends_at = COALESCE($14, ends_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [
        campaignId,
        name ?? null,
        isActive != null ? isActive : null,
        rewardType ?? null,
        referrerAmount != null ? Number(referrerAmount) : null,
        referredAmount != null ? Number(referredAmount) : null,
        referrerPoints != null ? Number(referrerPoints) : null,
        referredPoints != null ? Number(referredPoints) : null,
        referrerOfferId != null ? Number(referrerOfferId) : null,
        referredOfferId != null ? Number(referredOfferId) : null,
        vipThreshold != null ? Number(vipThreshold) : null,
        vipTier != null ? (vipTier === 'none' ? null : vipTier) : null,
        startsAt != null ? new Date(startsAt) : null,
        endsAt != null ? new Date(endsAt) : null,
      ],
    );

    const rows = await this.referralRepo.query(
      `SELECT id::text AS id, name, is_active, reward_type,
              reward_referrer_amount, reward_referred_amount,
              reward_referrer_points, reward_referred_points,
              referrer_offer_id, referred_offer_id,
              vip_referrals_threshold, vip_membership_tier,
              starts_at, ends_at, created_at, updated_at
       FROM referral_campaigns WHERE id = $1 LIMIT 1`,
      [campaignId],
    );
    return rows?.[0] || null;
  }

  async listReferralPartners(includeInactive = false) {
    const where = includeInactive ? '' : 'WHERE is_active = true';
    const rows = await this.referralRepo.query(
      `SELECT id::text AS id, code, partner_type, name, is_active, created_at
       FROM referral_partners
       ${where}
       ORDER BY created_at DESC`,
    );
    return rows || [];
  }

  async createReferralPartner(data: any) {
    const code = String(data?.code || '').trim();
    if (!code) throw new Error('Partner code is required');
    const partnerType = String(data?.partnerType ?? data?.partner_type ?? 'influencer').trim() || 'influencer';
    const name = data?.name != null ? String(data.name) : null;
    const isActive = data?.isActive != null ? Boolean(data.isActive) : data?.is_active != null ? Boolean(data.is_active) : true;

    const rows = await this.referralRepo.query(
      `INSERT INTO referral_partners (code, partner_type, name, is_active)
       VALUES ($1,$2,$3,$4)
       RETURNING id::text AS id, code, partner_type, name, is_active, created_at`,
      [code, partnerType, name, isActive],
    );
    return rows?.[0] || null;
  }

  async updateReferralPartner(id: string, data: any) {
    const partnerId = String(id).trim();
    if (!partnerId) throw new Error('Invalid partner id');

    const code = data?.code != null ? String(data.code).trim() : null;
    const partnerType = data?.partnerType != null ? String(data.partnerType).trim() : data?.partner_type != null ? String(data.partner_type).trim() : null;
    const name = data?.name != null ? String(data.name) : null;
    const isActive = data?.isActive != null ? Boolean(data.isActive) : data?.is_active != null ? Boolean(data.is_active) : null;

    await this.referralRepo.query(
      `UPDATE referral_partners SET
        code = COALESCE($2, code),
        partner_type = COALESCE($3, partner_type),
        name = COALESCE($4, name),
        is_active = COALESCE($5, is_active)
      WHERE id = $1`,
      [partnerId, code, partnerType, name, isActive],
    );

    const rows = await this.referralRepo.query(
      `SELECT id::text AS id, code, partner_type, name, is_active, created_at
       FROM referral_partners WHERE id = $1 LIMIT 1`,
      [partnerId],
    );
    return rows?.[0] || null;
  }

  async getReferralPartnerReportByCode(code: string, input?: { from?: string; to?: string; limit?: number }) {
    const partnerCode = String(code || '').trim();
    if (!partnerCode) throw new Error('Partner code is required');

    const from = input?.from ? new Date(input.from) : null;
    const to = input?.to ? new Date(input.to) : null;
    const limit = input?.limit != null && Number.isFinite(Number(input.limit)) ? Math.max(1, Math.min(500, Math.floor(Number(input.limit)))) : 50;

    // Funnel stats from referral_events
    const funnelRows = await this.referralRepo.query(
      `SELECT
         COUNT(*)::int AS total_events,
         COUNT(*) FILTER (WHERE event_type = 'invited')::int AS invited,
         COUNT(*) FILTER (WHERE event_type = 'registered')::int AS registered,
         COUNT(*) FILTER (WHERE event_type = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE event_type = 'reward_credited')::int AS reward_credited,
         COUNT(DISTINCT referred_customer_id) FILTER (WHERE referred_customer_id IS NOT NULL)::int AS unique_referred_customers,
         COUNT(DISTINCT order_id) FILTER (WHERE order_id IS NOT NULL)::int AS attributed_orders
       FROM referral_events
       WHERE partner_code = $1
         AND ($2::timestamp IS NULL OR created_at >= $2)
         AND ($3::timestamp IS NULL OR created_at <= $3)`,
      [partnerCode, from, to],
    );
    const funnel = funnelRows?.[0] || {};

    // Revenue + discount from sales_orders (attributed via referral_events.order_id)
    const revenueRows = await this.referralRepo.query(
      `SELECT
         COALESCE(SUM(o.total_amount), 0)::numeric AS total_revenue,
         COALESCE(SUM(o.discount_amount), 0)::numeric AS total_discount,
         COUNT(DISTINCT o.id)::int AS order_count
       FROM sales_orders o
       WHERE o.id IN (
         SELECT DISTINCT order_id
         FROM referral_events
         WHERE partner_code = $1
           AND order_id IS NOT NULL
           AND ($2::timestamp IS NULL OR created_at >= $2)
           AND ($3::timestamp IS NULL OR created_at <= $3)
       )`,
      [partnerCode, from, to],
    );
    const revenue = revenueRows?.[0] || {};

    // Recent attributed orders
    const orders = await this.referralRepo.query(
      `SELECT o.id, o.sales_order_number, o.customer_id, o.total_amount, o.discount_amount,
              o.offer_code, o.offer_id, o.status, o.created_at, o.delivered_at
       FROM sales_orders o
       WHERE o.id IN (
         SELECT DISTINCT order_id
         FROM referral_events
         WHERE partner_code = $1
           AND order_id IS NOT NULL
           AND ($2::timestamp IS NULL OR created_at >= $2)
           AND ($3::timestamp IS NULL OR created_at <= $3)
       )
       ORDER BY o.created_at DESC
       LIMIT $4`,
      [partnerCode, from, to, limit],
    );

    return {
      partner_code: partnerCode,
      window: { from: from ? from.toISOString() : null, to: to ? to.toISOString() : null },
      funnel,
      revenue: {
        order_count: Number(revenue.order_count ?? 0),
        total_revenue: Number(revenue.total_revenue ?? 0),
        total_discount: Number(revenue.total_discount ?? 0),
      },
      orders: orders || [],
    };
  }

  // =====================================================
  // WALLET WITHDRAWALS (cash-out workflow)
  // =====================================================

  async createWalletWithdrawalRequest(customerId: number, input: { amount: number; method?: string; account: string; notes?: string }) {
    const amount = this.normalizeMoneyAmount(Number(input.amount));
    const method = String(input.method || 'bkash').trim() || 'bkash';
    const account = String(input.account || '').trim();
    if (!account) throw new Error('Account is required');

    // Ensure wallet exists and has sufficient balance
    const wallet = await this.getCustomerWallet(customerId);
    const balance = Number((wallet as any).balance || 0);
    if (balance < amount) throw new Error('Insufficient wallet balance');

    const req = this.withdrawalRepo.create({
      customerId: Number(customerId),
      amount,
      method,
      account,
      status: 'pending',
      notes: input.notes ? String(input.notes) : null,
    });

    return await this.withdrawalRepo.save(req);
  }

  async listWalletWithdrawalRequests(params: { customerId?: number; status?: string }) {
    const where: any = {};
    if (params.customerId != null) where.customerId = Number(params.customerId);
    if (params.status) where.status = String(params.status);
    return await this.withdrawalRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async updateWalletWithdrawalStatus(id: string | number, status: 'pending' | 'approved' | 'rejected' | 'paid', notes?: string) {
    const req = await this.withdrawalRepo.findOne({ where: { id: String(id) } as any });
    if (!req) throw new Error('Withdrawal request not found');
    req.status = status;
    req.notes = notes != null ? String(notes) : req.notes;
    return await this.withdrawalRepo.save(req);
  }

  // =====================================================
  // POINTS MANAGEMENT (Ledger-based)
  // =====================================================

  private normalizePoints(points: number): number {
    if (typeof points !== 'number' || !Number.isFinite(points) || !Number.isInteger(points)) {
      throw new Error('Invalid points');
    }
    if (points <= 0) {
      throw new Error('Points must be greater than 0');
    }
    return points;
  }

  async getCustomerPoints(customerIdOrUuid: string | number) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const where =
      selector.kind === 'uuid'
        ? ({ customerUuid: selector.customerUuid } as any)
        : ({ customerId: selector.customerId } as any);

    return await this.pointsRepo.manager.transaction(async (manager) => {
      const pointsRepo = manager.getRepository(CustomerPoints);

      let points = await pointsRepo.findOne({ where, lock: { mode: 'pessimistic_write' } });

      if (!points) {
        points =
          selector.kind === 'uuid'
            ? pointsRepo.create({ customerUuid: selector.customerUuid, activePoints: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 })
            : pointsRepo.create({ customerId: selector.customerId, activePoints: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 });
        try {
          await pointsRepo.save(points);
        } catch (e) {
          if (!this.isUniqueViolation(e)) throw e;
          points = await pointsRepo.findOne({ where, lock: { mode: 'pessimistic_write' } });
        }
      }

      if (!points) throw new Error('Failed to create or load points');
      return points;
    });
  }

  async earnPoints(
    customerIdOrUuid: string | number,
    points: number,
    source: string,
    description?: string,
    referenceId?: number,
    idempotencyKey?: string,
  ) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const normalizedPoints = this.normalizePoints(points);

    return await this.pointsRepo.manager.transaction(async (manager) => {
      const pointsRepo = manager.getRepository(CustomerPoints);
      const txRepo = manager.getRepository(PointTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } as any });
        if (existing) return existing;
      }

      const where =
        selector.kind === 'uuid'
          ? ({ customerUuid: selector.customerUuid } as any)
          : ({ customerId: selector.customerId } as any);

      let summary = await pointsRepo.findOne({ where, lock: { mode: 'pessimistic_write' } });
      if (!summary) {
        summary =
          selector.kind === 'uuid'
            ? pointsRepo.create({ customerUuid: selector.customerUuid, activePoints: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 })
            : pointsRepo.create({ customerId: selector.customerId, activePoints: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 });
        await pointsRepo.save(summary);
      }

      summary.activePoints += normalizedPoints;
      summary.lifetimeEarned += normalizedPoints;
      await pointsRepo.save(summary);

      const baseTx: Partial<PointTransaction> = {
        idempotencyKey: idempotencyKey || undefined,
        transactionType: 'earn',
        points: normalizedPoints,
        source,
        description,
        referenceId,
        balanceAfter: summary.activePoints,
      };

      if (selector.kind === 'uuid') baseTx.customerUuid = selector.customerUuid;
      else baseTx.customerId = selector.customerId;

      const tx = txRepo.create(baseTx as any);

      return await txRepo.save(tx);
    });
  }

  async redeemPoints(
    customerIdOrUuid: string | number,
    points: number,
    source: string,
    description?: string,
    referenceId?: number,
    idempotencyKey?: string,
  ) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const normalizedPoints = this.normalizePoints(points);

    return await this.pointsRepo.manager.transaction(async (manager) => {
      const pointsRepo = manager.getRepository(CustomerPoints);
      const txRepo = manager.getRepository(PointTransaction);

      if (idempotencyKey) {
        const existing = await txRepo.findOne({ where: { idempotencyKey } as any });
        if (existing) return existing;
      }

      const where =
        selector.kind === 'uuid'
          ? ({ customerUuid: selector.customerUuid } as any)
          : ({ customerId: selector.customerId } as any);

      const summary = await pointsRepo.findOne({ where, lock: { mode: 'pessimistic_write' } });
      if (!summary) {
        throw new Error('Points summary not found');
      }

      if (summary.activePoints < normalizedPoints) {
        throw new Error('Insufficient points');
      }

      summary.activePoints -= normalizedPoints;
      summary.lifetimeRedeemed += normalizedPoints;
      await pointsRepo.save(summary);

      const baseTx: Partial<PointTransaction> = {
        idempotencyKey: idempotencyKey || undefined,
        transactionType: 'redeem',
        points: normalizedPoints,
        source,
        description,
        referenceId,
        balanceAfter: summary.activePoints,
      };

      if (selector.kind === 'uuid') baseTx.customerUuid = selector.customerUuid;
      else baseTx.customerId = selector.customerId;

      const tx = txRepo.create(baseTx as any);

      return await txRepo.save(tx);
    });
  }

  async getPointTransactions(customerIdOrUuid: string | number, limit: number = 50) {
    const selector = this.resolveCustomerSelector(customerIdOrUuid);
    const where =
      selector.kind === 'uuid'
        ? ({ customerUuid: selector.customerUuid } as any)
        : ({ customerId: selector.customerId } as any);

    return await this.pointTxRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
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
    // Compute KPIs directly from base tables (avoid relying on a DB view that may not exist)
    const query = `
      WITH
      customers_total AS (
        SELECT COUNT(*)::int AS total_customers
        FROM customers
      ),
      delivered_orders AS (
        SELECT
          customer_id,
          COUNT(*)::int AS delivered_count,
          COALESCE(SUM(total_amount), 0)::float8 AS delivered_spend
        FROM sales_orders
        WHERE customer_id IS NOT NULL
          AND lower(status::text) = 'delivered'
        GROUP BY customer_id
      ),
      order_agg AS (
        SELECT
          COALESCE(SUM(delivered_count), 0)::int AS total_delivered_orders,
          COALESCE(SUM(delivered_spend), 0)::float8 AS total_delivered_revenue,
          COUNT(*) FILTER (WHERE delivered_count >= 1)::int AS customers_with_delivered,
          COUNT(*) FILTER (WHERE delivered_count >= 2)::int AS repeat_customers
        FROM delivered_orders
      ),
      membership_agg AS (
        SELECT
          COUNT(*) FILTER (WHERE membership_tier IS NOT NULL AND membership_tier <> 'none')::int AS members
        FROM customer_memberships
      ),
      referral_agg AS (
        SELECT
          COUNT(*) FILTER (WHERE lower(status::text) = 'completed')::int AS completed_referrals,
          COUNT(*)::int AS total_referrals
        FROM customer_referrals
      ),
      wallet_referral_agg AS (
        SELECT
          COALESCE(SUM(amount), 0)::float8 AS total_referral_rewards_paid
        FROM wallet_transactions
        WHERE transaction_type = 'credit'
          AND source = 'referral'
          AND status = 'posted'
      )
      SELECT
        ct.total_customers,
        CASE
          WHEN oa.customers_with_delivered > 0
            THEN ROUND((oa.repeat_customers::numeric / oa.customers_with_delivered::numeric) * 100, 2)::float8
          ELSE 0::float8
        END AS first_to_repeat_percentage,
        CASE
          WHEN ct.total_customers > 0
            THEN ROUND((ma.members::numeric / ct.total_customers::numeric) * 100, 2)::float8
          ELSE 0::float8
        END AS member_conversion_rate,
        CASE
          WHEN ct.total_customers > 0
            THEN ROUND((oa.total_delivered_orders::numeric / ct.total_customers::numeric), 4)::float8
          ELSE 0::float8
        END AS avg_orders_per_customer,
        CASE
          WHEN ct.total_customers > 0
            THEN ROUND((ra.total_referrals::numeric / ct.total_customers::numeric), 4)::float8
          ELSE 0::float8
        END AS avg_referrals_per_customer,
        CASE
          WHEN ct.total_customers > 0
            THEN ROUND((oa.total_delivered_revenue::numeric / ct.total_customers::numeric), 2)::float8
          ELSE 0::float8
        END AS avg_customer_lifetime_value,
        ra.completed_referrals,
        ROUND(wra.total_referral_rewards_paid::numeric, 2)::float8 AS total_referral_rewards_paid
      FROM customers_total ct
      CROSS JOIN order_agg oa
      CROSS JOIN membership_agg ma
      CROSS JOIN referral_agg ra
      CROSS JOIN wallet_referral_agg wra;
    `;

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
    const [kpis, silverCount, goldCount, permanentCount, activeSubscriptions, pendingReferrals] = await Promise.all([
      this.getLoyaltyKPIs(),
      this.membershipRepo.count({ where: { membershipTier: 'silver' } }),
      this.membershipRepo.count({ where: { membershipTier: 'gold' } }),
      this.membershipRepo.count({ where: { membershipTier: 'permanent' } }),
      this.groceryListRepo.count({ where: { isSubscription: true, isActive: true } }),
      this.referralRepo.count({ where: { status: 'pending' } }),
    ]);

    return {
      ...kpis,
      silver_members: silverCount,
      gold_members: goldCount,
      permanent_members: permanentCount,
      active_subscriptions: activeSubscriptions,
      pending_referrals: pendingReferrals,
    };
  }
}
