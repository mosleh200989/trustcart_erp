import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CouponCampaign } from './entities/coupon-campaign.entity';
import { CampaignCustomer } from './entities/campaign-customer.entity';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponCampaign)
    private campaignRepo: Repository<CouponCampaign>,
    @InjectRepository(CampaignCustomer)
    private customerRepo: Repository<CampaignCustomer>,
  ) {}

  // â”€â”€â”€ CAMPAIGN CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listCampaigns(query: any = {}) {
    const { page = 1, limit = 20, search, isActive } = query;
    const qb = this.campaignRepo.createQueryBuilder('c');

    if (search) {
      qb.andWhere('(LOWER(c.name) LIKE LOWER(:s) OR LOWER(c.code) LIKE LOWER(:s) OR LOWER(c.description) LIKE LOWER(:s))', { s: `%${search}%` });
    }
    if (isActive !== undefined && isActive !== '') {
      qb.andWhere('c.is_active = :isActive', { isActive: isActive === 'true' || isActive === true });
    }

    qb.orderBy('c.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();
    return { data, total };
  }

  async getCampaign(id: number) {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (campaign) {
      const customers = await this.customerRepo.find({ where: { campaignId: id } });
      (campaign as any).customers = customers;
    }
    return campaign;
  }

  async createCampaign(data: any) {
    if (data.code?.trim()) {
      const code = data.code.trim().toUpperCase();
      const exists = await this.campaignRepo
        .createQueryBuilder('c')
        .where('UPPER(c.code) = :code', { code })
        .getOne();
      if (exists) throw new BadRequestException(`Coupon code "${code}" is already in use by another campaign`);
    }

    const campaign = this.campaignRepo.create({
      name: data.name,
      code: data.code?.trim()?.toUpperCase() || null,
      description: data.description || null,
      triggerProductId: data.triggerProductId || null,
      discountType: data.discountType || 'fixed',
      discountValue: Number(data.discountValue) || 0,
      minOrderAmount: Number(data.minOrderAmount) || 0,
      maxDiscountAmount: data.maxDiscountAmount != null ? Number(data.maxDiscountAmount) : null,
      maxUses: data.maxUses != null ? Number(data.maxUses) : null,
      perCustomerLimit: data.perCustomerLimit != null ? Number(data.perCustomerLimit) : 1,
      expiryDays: Number(data.expiryDays) || 30,
      validFrom: data.validFrom || null,
      validUntil: data.validUntil || null,
      isRestricted: data.isRestricted === true,
      isActive: data.isActive !== false,
      createdBy: data.createdBy || null,
    });
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(id: number, data: any) {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new BadRequestException('Campaign not found');

    if (data.code !== undefined) {
      const newCode = (data.code || '').trim().toUpperCase() || null;
      if (newCode && newCode !== (campaign.code || '').toUpperCase()) {
        const exists = await this.campaignRepo
          .createQueryBuilder('c')
          .where('UPPER(c.code) = :code AND c.id != :id', { code: newCode, id })
          .getOne();
        if (exists) throw new BadRequestException(`Coupon code "${newCode}" is already in use by another campaign`);
      }
      campaign.code = newCode;
    }

    if (data.name !== undefined) campaign.name = data.name;
    if (data.description !== undefined) campaign.description = data.description;
    if (data.triggerProductId !== undefined) campaign.triggerProductId = data.triggerProductId || null;
    if (data.discountType !== undefined) campaign.discountType = data.discountType;
    if (data.discountValue !== undefined) campaign.discountValue = Number(data.discountValue);
    if (data.minOrderAmount !== undefined) campaign.minOrderAmount = Number(data.minOrderAmount);
    if (data.maxDiscountAmount !== undefined) campaign.maxDiscountAmount = data.maxDiscountAmount != null ? Number(data.maxDiscountAmount) : null;
    if (data.maxUses !== undefined) campaign.maxUses = data.maxUses != null ? Number(data.maxUses) : null;
    if (data.perCustomerLimit !== undefined) campaign.perCustomerLimit = Number(data.perCustomerLimit) || 1;
    if (data.expiryDays !== undefined) campaign.expiryDays = Number(data.expiryDays);
    if (data.validFrom !== undefined) campaign.validFrom = data.validFrom || null;
    if (data.validUntil !== undefined) campaign.validUntil = data.validUntil || null;
    if (data.isRestricted !== undefined) campaign.isRestricted = data.isRestricted;
    if (data.isActive !== undefined) campaign.isActive = data.isActive;

    return this.campaignRepo.save(campaign);
  }

  async deleteCampaign(id: number) {
    return this.campaignRepo.delete(id);
  }

  // â”€â”€â”€ CUSTOMER ASSIGNMENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async listCustomers(query: any = {}) {
    const { page = 1, limit = 20, campaignId, search } = query;
    const qb = this.customerRepo.createQueryBuilder('cc');

    if (campaignId) qb.andWhere('cc.campaign_id = :campaignId', { campaignId: Number(campaignId) });
    if (search) {
      qb.andWhere('(cc.customer_phone LIKE :s OR cc.customer_name LIKE :s OR CAST(cc.customer_id AS TEXT) LIKE :s)',
        { s: `%${search}%` });
    }

    qb.orderBy('cc.created_at', 'DESC');
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    // Load campaigns separately to avoid relation-join metadata issue with tenant proxy
    if (data.length > 0) {
      const campaignIds = [...new Set(data.map(d => d.campaignId))];
      const campaigns = await this.campaignRepo.find({ where: { id: In(campaignIds) } });
      const campMap = new Map(campaigns.map(c => [c.id, c]));
      for (const d of data) {
        (d as any).campaign = campMap.get(d.campaignId) || null;
      }
    }

    return { data, total };
  }

  async assignCustomer(data: {
    campaignId: number;
    customerId?: number | null;
    customerPhone?: string | null;
    customerName?: string | null;
  }) {
    const campaign = await this.campaignRepo.findOne({ where: { id: data.campaignId } });
    if (!campaign) throw new BadRequestException('Campaign not found');

    if (data.customerId) {
      const existing = await this.customerRepo.findOne({
        where: { campaignId: data.campaignId, customerId: Number(data.customerId) },
      });
      if (existing) throw new BadRequestException('This customer is already assigned to this campaign');
    } else if (data.customerPhone) {
      const phone = data.customerPhone.replace(/^\+88/, '').trim();
      const existing = await this.customerRepo.findOne({
        where: { campaignId: data.campaignId, customerPhone: phone },
      });
      if (existing) throw new BadRequestException('This phone number is already assigned to this campaign');
    }

    const record = this.customerRepo.create({
      campaignId: data.campaignId,
      customerId: data.customerId != null ? Number(data.customerId) : null,
      customerPhone: data.customerPhone?.replace(/^\+88/, '').trim() || null,
      customerName: data.customerName || null,
      timesUsed: 0,
      isActive: true,
    });
    return this.customerRepo.save(record);
  }

  async bulkAssignCustomers(data: {
    campaignId: number;
    customers: Array<{ customerId?: number; customerPhone?: string; customerName?: string }>;
  }) {
    const campaign = await this.campaignRepo.findOne({ where: { id: data.campaignId } });
    if (!campaign) throw new BadRequestException('Campaign not found');

    let added = 0;
    let skipped = 0;

    for (const cust of data.customers) {
      try {
        const phone = cust.customerPhone?.replace(/^\+88/, '').trim() || null;
        const custId = cust.customerId ? Number(cust.customerId) : null;

        if (custId) {
          const existing = await this.customerRepo.findOne({
            where: { campaignId: data.campaignId, customerId: custId },
          });
          if (existing) { skipped++; continue; }
        } else if (phone) {
          const existing = await this.customerRepo.findOne({
            where: { campaignId: data.campaignId, customerPhone: phone },
          });
          if (existing) { skipped++; continue; }
        } else {
          skipped++; continue;
        }

        const record = this.customerRepo.create({
          campaignId: data.campaignId,
          customerId: custId,
          customerPhone: phone,
          customerName: cust.customerName || null,
          timesUsed: 0,
          isActive: true,
        });
        await this.customerRepo.save(record);
        added++;
      } catch {
        skipped++;
      }
    }
    return { added, skipped, total: data.customers.length };
  }

  async removeCustomer(id: number) {
    await this.customerRepo.delete(id);
    return { success: true };
  }

  // â”€â”€â”€ CHECKOUT VALIDATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async validateCoupon(params: {
    code: string;
    customerId?: number | null;
    customerPhone?: string | null;
    cartTotal: number;
  }): Promise<{
    valid: boolean;
    campaignId: number;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    minOrderAmount: number;
    code: string;
    message: string;
  }> {
    const code = (params.code || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Please enter a coupon code');

    const campaign = await this.campaignRepo
      .createQueryBuilder('c')
      .where('UPPER(c.code) = :code', { code })
      .getOne();
    if (!campaign) throw new BadRequestException('Invalid coupon code');
    if (!campaign.isActive) throw new BadRequestException('This coupon is no longer active');

    const now = new Date();
    if (campaign.validFrom && now < new Date(campaign.validFrom)) throw new BadRequestException('This coupon is not yet valid');
    if (campaign.validUntil && now > new Date(campaign.validUntil)) throw new BadRequestException('This coupon has expired');
    if (campaign.maxUses != null && campaign.usageCount >= campaign.maxUses) throw new BadRequestException('This coupon has reached its usage limit');

    const custId = params.customerId != null ? Number(params.customerId) : null;
    const phone = (params.customerPhone || '').replace(/^\+88/, '').trim();

    // Always check customer is listed in the coupon's customer list
    {
      let assignment: CampaignCustomer | null = null;
      if (custId) {
        assignment = await this.customerRepo.findOne({
          where: { campaignId: campaign.id, customerId: custId, isActive: true },
        });
      }
      if (!assignment && phone) {
        assignment = await this.customerRepo.findOne({
          where: { campaignId: campaign.id, customerPhone: phone, isActive: true },
        });
      }
      if (!assignment) throw new BadRequestException('This coupon is not valid for your account');
      if (assignment.timesUsed >= campaign.perCustomerLimit) throw new BadRequestException('You have already used this coupon the maximum number of times');
    }


    const cartTotal = Number(params.cartTotal) || 0;
    if (campaign.minOrderAmount > 0 && cartTotal < Number(campaign.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount of BDT ${campaign.minOrderAmount} required to use this coupon`);
    }

    let discountAmount = 0;
    if (campaign.discountType === 'percentage') {
      discountAmount = (cartTotal * Number(campaign.discountValue)) / 100;
      if (campaign.maxDiscountAmount != null && discountAmount > Number(campaign.maxDiscountAmount)) {
        discountAmount = Number(campaign.maxDiscountAmount);
      }
    } else {
      discountAmount = Number(campaign.discountValue);
    }
    if (discountAmount > cartTotal) discountAmount = cartTotal;

    return {
      valid: true,
      campaignId: campaign.id,
      discountType: campaign.discountType,
      discountValue: Number(campaign.discountValue),
      discountAmount: Math.round(discountAmount * 100) / 100,
      minOrderAmount: Number(campaign.minOrderAmount),
      code: campaign.code!,
      message: campaign.discountType === 'percentage'
? `${campaign.discountValue}% off applied - you save BDT ${discountAmount.toFixed(0)}`
        : `BDT ${discountAmount.toFixed(0)} discount applied`,
    };
  }

  // ─── AVAILABLE COUPONS FOR A CUSTOMER ─────────────────────────

  async getAvailableCoupons(phone: string) {
    const normalizedPhone = (phone || '').replace(/^\+88/, '').trim();
    if (!normalizedPhone) return [];

    // Find all active assignments for this phone
    const assignments = await this.customerRepo.find({
      where: { customerPhone: normalizedPhone, isActive: true },
    });
    if (!assignments.length) return [];

    // Load their campaigns
    const campaignIds = [...new Set(assignments.map(a => a.campaignId))];
    const campaigns = await this.campaignRepo.find({ where: { id: In(campaignIds) } });
    const campMap = new Map(campaigns.map(c => [c.id, c]));

    const now = new Date();
    const available: Array<{
      campaignId: number;
      code: string;
      name: string;
      discountType: string;
      discountValue: number;
      minOrderAmount: number;
      maxDiscountAmount: number | null;
      timesUsed: number;
      perCustomerLimit: number;
    }> = [];

    for (const a of assignments) {
      const camp = campMap.get(a.campaignId);
      if (!camp || !camp.isActive) continue;
      if (!camp.code) continue;
      if (camp.validFrom && now < new Date(camp.validFrom)) continue;
      if (camp.validUntil && now > new Date(camp.validUntil)) continue;
      if (camp.maxUses != null && camp.usageCount >= camp.maxUses) continue;
      if (a.timesUsed >= camp.perCustomerLimit) continue;

      available.push({
        campaignId: camp.id,
        code: camp.code,
        name: camp.name,
        discountType: camp.discountType,
        discountValue: Number(camp.discountValue),
        minOrderAmount: Number(camp.minOrderAmount),
        maxDiscountAmount: camp.maxDiscountAmount != null ? Number(camp.maxDiscountAmount) : null,
        timesUsed: a.timesUsed,
        perCustomerLimit: camp.perCustomerLimit,
      });
    }

    return available;
  }

  async redeemCoupon(code: string, orderId: number, customerId?: number | null, customerPhone?: string | null) {
    const campaign = await this.campaignRepo
      .createQueryBuilder('c')
      .where('UPPER(c.code) = :code', { code: (code || '').trim().toUpperCase() })
      .getOne();
    if (!campaign) return;

    campaign.usageCount = (campaign.usageCount || 0) + 1;
    await this.campaignRepo.save(campaign);

    const custId = customerId != null ? Number(customerId) : null;
    const phone = (customerPhone || '').replace(/^\+88/, '').trim();

    let assignment: CampaignCustomer | null = null;
    if (custId) {
      assignment = await this.customerRepo.findOne({ where: { campaignId: campaign.id, customerId: custId } });
    }
    if (!assignment && phone) {
      assignment = await this.customerRepo.findOne({ where: { campaignId: campaign.id, customerPhone: phone } });
    }

    if (assignment) {
      assignment.timesUsed = (assignment.timesUsed || 0) + 1;
      assignment.lastUsedAt = new Date();
      assignment.lastUsedOrderId = orderId;
      await this.customerRepo.save(assignment);
    } else {
      const record = this.customerRepo.create({
        campaignId: campaign.id,
        customerId: custId,
        customerPhone: phone || null,
        timesUsed: 1,
        lastUsedAt: new Date(),
        lastUsedOrderId: orderId,
        isActive: true,
      });
      await this.customerRepo.save(record);
    }
  }

  async generateCouponsForOrder(params: {
    orderId: number;
    customerId: number | null;
    customerPhone: string | null;
    productIds: number[];
  }): Promise<void> {
    if (!params.productIds.length) return;

    const campaigns = await this.campaignRepo.find({
      where: { triggerProductId: In(params.productIds), isActive: true },
    });

    for (const campaign of campaigns) {
      try {
        const custId = params.customerId != null ? Number(params.customerId) : null;
        const phone = (params.customerPhone || '').replace(/^\+88/, '').trim();

        let existing: CampaignCustomer | null = null;
        if (custId) {
          existing = await this.customerRepo.findOne({ where: { campaignId: campaign.id, customerId: custId } });
        }
        if (!existing && phone) {
          existing = await this.customerRepo.findOne({ where: { campaignId: campaign.id, customerPhone: phone } });
        }
        if (!existing) {
          const record = this.customerRepo.create({
            campaignId: campaign.id,
            customerId: custId,
            customerPhone: phone || null,
            timesUsed: 0,
            isActive: true,
          });
          await this.customerRepo.save(record);
        }
      } catch (err) {
        console.error(`Failed to assign customer to campaign ${campaign.id}:`, err);
      }
    }
  }
}
