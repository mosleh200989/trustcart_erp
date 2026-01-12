import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Offer, OfferType } from './entities/offer.entity';
import { OfferCondition, ConditionType } from './entities/offer-condition.entity';
import { OfferReward, RewardType } from './entities/offer-reward.entity';
import { OfferProduct } from './entities/offer-product.entity';
import { OfferCategory } from './entities/offer-category.entity';
import { OfferUsage } from './entities/offer-usage.entity';
import { OfferCode } from './entities/offer-code.entity';

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  category_id?: number;
  brand?: string;
}

export interface OfferEvaluation {
  offer: Offer;
  applicable: boolean;
  discountAmount: number;
  freeProducts?: Array<{ productId: number; quantity: number }>;
  reason?: string;
}

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offerRepo: Repository<Offer>,
    @InjectRepository(OfferCondition)
    private conditionRepo: Repository<OfferCondition>,
    @InjectRepository(OfferReward)
    private rewardRepo: Repository<OfferReward>,
    @InjectRepository(OfferProduct)
    private productRepo: Repository<OfferProduct>,
    @InjectRepository(OfferCategory)
    private categoryRepo: Repository<OfferCategory>,
    @InjectRepository(OfferUsage)
    private usageRepo: Repository<OfferUsage>,
    @InjectRepository(OfferCode)
    private codeRepo: Repository<OfferCode>,
  ) {}

  private normalizeCode(code?: string | null) {
    const c = typeof code === 'string' ? code.trim() : '';
    return c ? c.toUpperCase() : '';
  }

  private now() {
    return new Date();
  }

  async getOfferByCode(params: { code: string; customerId?: number | null }) {
    const code = this.normalizeCode(params.code);
    if (!code) throw new Error('Invalid offer code');

    const offerCode = await this.codeRepo.findOne({ where: { code } });
    if (!offerCode || !offerCode.isActive) throw new Error('Offer code not found');

    if (offerCode.maxUses != null && offerCode.currentUses >= offerCode.maxUses) {
      throw new Error('Offer code usage limit reached');
    }

    const customerId = params.customerId != null ? Number(params.customerId) : null;
    if (offerCode.assignedCustomerId != null) {
      if (!customerId || Number(customerId) !== Number(offerCode.assignedCustomerId)) {
        throw new Error('Offer code is not valid for this customer');
      }
    }

    const now = this.now();
    if (offerCode.validFrom && now < new Date(offerCode.validFrom)) {
      throw new Error('Offer code is not active yet');
    }
    if (offerCode.validTo && now > new Date(offerCode.validTo)) {
      throw new Error('Offer code has expired');
    }

    if (offerCode.maxUsesPerCustomer != null && customerId) {
      const usedCount = await this.usageRepo.count({ where: { offerId: offerCode.offerId, customerId } });
      if (usedCount >= Number(offerCode.maxUsesPerCustomer)) {
        throw new Error('Offer code per-customer usage limit reached');
      }
    }

    const offer = await this.findOne(offerCode.offerId);
    if (!offer) throw new Error('Offer not found for code');

    // Validate offer window/status
    const offerNow = this.now();
    if (offer.status !== 'active') throw new Error('Offer is inactive');
    if (offer.startTime && offerNow < new Date(offer.startTime)) throw new Error('Offer not started');
    if (offer.endTime && offerNow > new Date(offer.endTime)) throw new Error('Offer ended');

    return { offer, offerCode };
  }

  async evaluateOfferCode(params: { code: string; cart: CartItem[]; customerId?: number; customerData?: any }) {
    const { offer, offerCode } = await this.getOfferByCode({ code: params.code, customerId: params.customerId });
    const evaluation = await this.evaluateSingleOffer(offer, params.cart, params.customerData);
    if (!evaluation.applicable) {
      throw new Error(evaluation.reason || 'Offer code is not applicable');
    }
    return { ...evaluation, offerCode: offerCode.code };
  }

  async issueOfferCode(params: {
    offerId: number;
    assignedCustomerId?: number | null;
    prefix?: string;
    maxUses?: number | null;
    maxUsesPerCustomer?: number | null;
    validFrom?: Date | null;
    validTo?: Date | null;
  }) {
    const offerId = Number(params.offerId);
    if (!Number.isFinite(offerId) || offerId <= 0) throw new Error('Invalid offerId');

    const prefix = (params.prefix || 'TC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'TC';

    const makeCode = () => {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      const stamp = Date.now().toString(36).slice(-4).toUpperCase();
      return `${prefix}-${stamp}${rand}`.slice(0, 50);
    };

    // retry a few times for uniqueness
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      const exists = await this.codeRepo.findOne({ where: { code } });
      if (exists) continue;

      const row = this.codeRepo.create({
        offerId,
        code,
        maxUses: params.maxUses ?? 1,
        currentUses: 0,
        isActive: true,
        assignedCustomerId: params.assignedCustomerId != null ? Number(params.assignedCustomerId) : null,
        maxUsesPerCustomer: params.maxUsesPerCustomer != null ? Number(params.maxUsesPerCustomer) : null,
        validFrom: params.validFrom ?? null,
        validTo: params.validTo ?? null,
      });

      return await this.codeRepo.save(row);
    }

    throw new Error('Failed to generate unique offer code');
  }

  // =====================================================
  // ADMIN: CRUD OPERATIONS
  // =====================================================

  async create(data: any) {
    const offer = this.offerRepo.create({
      name: data.name,
      description: data.description,
      offerType: data.offerType,
      startTime: data.startTime,
      endTime: data.endTime,
      priority: data.priority || 0,
      status: data.status || 'active',
      autoApply: data.autoApply || false,
      maxUsageTotal: data.maxUsageTotal,
      maxUsagePerUser: data.maxUsagePerUser || 1,
      minCartAmount: data.minCartAmount,
      maxDiscountAmount: data.maxDiscountAmount,
      createdBy: data.createdBy,
    });

    const savedOffer = await this.offerRepo.save(offer);

    // Save conditions
    if (data.conditions && data.conditions.length > 0) {
      const conditions = data.conditions.map((c: any) => 
        this.conditionRepo.create({
          offerId: savedOffer.id,
          conditionType: c.conditionType,
          operator: c.operator,
          value: c.value,
        })
      );
      await this.conditionRepo.save(conditions);
    }

    // Save rewards
    if (data.rewards && data.rewards.length > 0) {
      const rewards = data.rewards.map((r: any) =>
        this.rewardRepo.create({
          offerId: savedOffer.id,
          rewardType: r.rewardType,
          value: r.value,
          maxFreeQty: r.maxFreeQty || 1,
        })
      );
      await this.rewardRepo.save(rewards);
    }

    // Save applicable products
    if (data.productIds && data.productIds.length > 0) {
      const products = data.productIds.map((pid: number) =>
        this.productRepo.create({
          offerId: savedOffer.id,
          productId: pid,
        })
      );
      await this.productRepo.save(products);
    }

    // Save applicable categories
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categories = data.categoryIds.map((cid: number) =>
        this.categoryRepo.create({
          offerId: savedOffer.id,
          categoryId: cid,
        })
      );
      await this.categoryRepo.save(categories);
    }

    return this.findOne(savedOffer.id);
  }

  async findAll(includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.status = 'active';
    }

    return this.offerRepo.find({
      where,
      relations: ['conditions', 'rewards', 'products', 'categories'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    return this.offerRepo.findOne({
      where: { id },
      relations: ['conditions', 'rewards', 'products', 'categories', 'usages'],
    });
  }

  async update(id: number, data: any) {
    await this.offerRepo.update(id, data);
    return this.findOne(id);
  }

  async delete(id: number) {
    return this.offerRepo.delete(id);
  }

  // =====================================================
  // OFFER ENGINE: EVALUATION LOGIC
  // =====================================================

  async getActiveOffers(customerId?: number) {
    const now = new Date();
    
    const offers = await this.offerRepo
      .createQueryBuilder('offer')
      .where('offer.status = :status', { status: 'active' })
      .andWhere('offer.start_time <= :now', { now })
      .andWhere('offer.end_time >= :now', { now })
      .leftJoinAndSelect('offer.conditions', 'conditions')
      .leftJoinAndSelect('offer.rewards', 'rewards')
      .leftJoinAndSelect('offer.products', 'products')
      .leftJoinAndSelect('offer.categories', 'categories')
      .orderBy('offer.priority', 'DESC')
      .getMany();

    // Filter by usage limits
    const validOffers = [];
    for (const offer of offers) {
      // Check total usage limit
      if (offer.maxUsageTotal && offer.currentUsage >= offer.maxUsageTotal) {
        continue;
      }

      // Check per-user usage limit
      if (customerId && offer.maxUsagePerUser) {
        const userUsage = await this.usageRepo.count({
          where: { offerId: offer.id, customerId },
        });
        if (userUsage >= offer.maxUsagePerUser) {
          continue;
        }
      }

      validOffers.push(offer);
    }

    return validOffers;
  }

  async evaluateOffers(
    cart: CartItem[],
    customerId?: number,
    customerData?: any,
  ): Promise<OfferEvaluation[]> {
    const activeOffers = await this.getActiveOffers(customerId);
    const evaluations: OfferEvaluation[] = [];

    for (const offer of activeOffers) {
      const evaluation = await this.evaluateSingleOffer(offer, cart, customerData);
      evaluations.push(evaluation);
    }

    return evaluations.filter(e => e.applicable);
  }

  private async evaluateSingleOffer(
    offer: Offer,
    cart: CartItem[],
    customerData?: any,
  ): Promise<OfferEvaluation> {
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check minimum cart amount
    if (offer.minCartAmount && cartTotal < offer.minCartAmount) {
      return {
        offer,
        applicable: false,
        discountAmount: 0,
        reason: `Minimum cart amount ৳${offer.minCartAmount} required`,
      };
    }

    // Evaluate all conditions
    const conditionsMet = await this.checkConditions(offer.conditions, cart, customerData);
    if (!conditionsMet.success) {
      return {
        offer,
        applicable: false,
        discountAmount: 0,
        reason: conditionsMet.reason,
      };
    }

    // Calculate rewards
    const reward = await this.calculateRewards(offer, cart, cartTotal);

    return {
      offer,
      applicable: true,
      discountAmount: reward.discountAmount,
      freeProducts: reward.freeProducts,
    };
  }

  private async checkConditions(
    conditions: OfferCondition[],
    cart: CartItem[],
    customerData?: any,
  ): Promise<{ success: boolean; reason?: string }> {
    if (!conditions || conditions.length === 0) {
      return { success: true };
    }

    for (const condition of conditions) {
      const result = await this.checkSingleCondition(condition, cart, customerData);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  private async checkSingleCondition(
    condition: OfferCondition,
    cart: CartItem[],
    customerData?: any,
  ): Promise<{ success: boolean; reason?: string }> {
    switch (condition.conditionType) {
      case ConditionType.CART_TOTAL:
        const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return this.compareValue(cartTotal, condition.operator, condition.value.amount);

      case ConditionType.PRODUCT_QTY:
        const productQty = cart
          .filter(item => item.product_id === condition.value.product_id)
          .reduce((sum, item) => sum + item.quantity, 0);
        return this.compareValue(productQty, condition.operator, condition.value.min);

      case ConditionType.MIN_ITEMS:
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        return this.compareValue(totalItems, condition.operator, condition.value.min);

      case ConditionType.CATEGORY:
        const hasCategory = cart.some(item => item.category_id === condition.value.category_id);
        return { success: hasCategory, reason: hasCategory ? undefined : 'Category not in cart' };

      case ConditionType.FIRST_ORDER:
        if (customerData && customerData.totalOrders !== undefined) {
          const isFirstOrder = customerData.totalOrders === 0;
          return { success: isFirstOrder, reason: isFirstOrder ? undefined : 'Not first order' };
        }
        return { success: true };

      case ConditionType.USER_LEVEL:
        if (customerData && customerData.level !== undefined) {
          return this.compareValue(customerData.level, condition.operator, condition.value.level);
        }
        return { success: true };

      default:
        return { success: true };
    }
  }

  private compareValue(
    actual: number,
    operator: string,
    expected: number,
  ): { success: boolean; reason?: string } {
    let success = false;
    
    switch (operator) {
      case '>=':
        success = actual >= expected;
        break;
      case '>':
        success = actual > expected;
        break;
      case '<=':
        success = actual <= expected;
        break;
      case '<':
        success = actual < expected;
        break;
      case '=':
        success = actual === expected;
        break;
      default:
        success = true;
    }

    return {
      success,
      reason: success ? undefined : `Condition not met: ${actual} ${operator} ${expected}`,
    };
  }

  private async calculateRewards(
    offer: Offer,
    cart: CartItem[],
    cartTotal: number,
  ): Promise<{ discountAmount: number; freeProducts?: Array<{ productId: number; quantity: number }> }> {
    let discountAmount = 0;
    const freeProducts: Array<{ productId: number; quantity: number }> = [];

    for (const reward of offer.rewards) {
      switch (reward.rewardType) {
        case RewardType.DISCOUNT_PERCENT:
          const percentDiscount = (cartTotal * reward.value.percent) / 100;
          discountAmount += Math.min(
            percentDiscount,
            offer.maxDiscountAmount || Infinity,
          );
          break;

        case RewardType.DISCOUNT_FLAT:
          discountAmount += Math.min(
            reward.value.amount,
            offer.maxDiscountAmount || Infinity,
          );
          break;

        case RewardType.FREE_PRODUCT:
          freeProducts.push({
            productId: reward.value.product_id,
            quantity: reward.maxFreeQty,
          });
          break;

        case RewardType.FREE_SHIPPING:
          // Handle in checkout logic
          break;
      }
    }

    return { discountAmount, freeProducts };
  }

  // =====================================================
  // APPLY BEST OFFER (Conflict Resolution)
  // =====================================================

  async getBestOffer(cart: CartItem[], customerId?: number, customerData?: any) {
    const evaluations = await this.evaluateOffers(cart, customerId, customerData);
    
    if (evaluations.length === 0) {
      return null;
    }

    // Sort by discount amount (best first)
    evaluations.sort((a, b) => b.discountAmount - a.discountAmount);

    return evaluations[0];
  }

  // =====================================================
  // TRACK USAGE
  // =====================================================

  async recordUsage(offerId: number, customerId: number, orderId: number, discountAmount: number) {
    // Record usage
    const usage = this.usageRepo.create({
      offerId,
      customerId,
      orderId,
      discountAmount,
    });
    await this.usageRepo.save(usage);

    // Increment current usage count
    await this.offerRepo.increment({ id: offerId }, 'currentUsage', 1);

    // If the order used a customer-assigned offer code, it should be incremented separately.
    // We do not have the code value here, so caller is responsible for updating offer_codes.current_uses.

    return usage;
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  async getOfferStats(offerId: number) {
    const [offer, usages] = await Promise.all([
      this.findOne(offerId),
      this.usageRepo.find({ where: { offerId } }),
    ]);

    const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discountAmount), 0);
    const uniqueCustomers = new Set(usages.map(u => u.customerId)).size;

    return {
      offer,
      totalUsages: usages.length,
      uniqueCustomers,
      totalDiscountGiven: totalDiscount,
      usages,
    };
  }
}
