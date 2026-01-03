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
  ) {}

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
        c.first_name,
        c.last_name,
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
    const referrals = await this.referralRepo.find({
      where: { referrerCustomerId: customerId },
      order: { createdAt: 'DESC' },
    });

    if (referrals.length === 0) return referrals;

    const referralIds = referrals.map((r) => r.id);
    const rewardTxs = await this.transactionRepo.find({
      where: {
        source: 'referral' as any,
        transactionType: 'credit' as any,
        referenceId: In(referralIds) as any,
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

  async markReferralComplete(referralId: number, referredCustomerId?: number) {
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
    if (referral.rewardCredited) return;
    if (referral.status !== 'completed') return;
    if (!referral.referrerCustomerId) return;

    // Credit referrer wallet once.
    const idempotencyKey = `referral:${referral.id}:referrer`;
    await this.creditWallet(
      referral.referrerCustomerId,
      Number(referral.rewardAmount || 0),
      'referral',
      'Referral reward',
      referral.id,
      idempotencyKey,
    );

    referral.rewardCredited = true;
    await this.referralRepo.save(referral);
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
