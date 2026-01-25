import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyMember } from './entities/family-member.entity';
import { Customer } from './customer.entity';
import { CustomerInteraction } from './entities/customer-interaction.entity';
import { CustomerBehavior } from './entities/customer-behavior.entity';
import { CustomerDropoff } from './entities/customer-dropoff.entity';

@Injectable()
export class CdmService {
  constructor(
    @InjectRepository(FamilyMember)
    private familyMemberRepo: Repository<FamilyMember>,
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(CustomerInteraction)
    private interactionRepo: Repository<CustomerInteraction>,
    @InjectRepository(CustomerBehavior)
    private behaviorRepo: Repository<CustomerBehavior>,
    @InjectRepository(CustomerDropoff)
    private dropoffRepo: Repository<CustomerDropoff>,
  ) {}

  private normalizePhone(value: any): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private displayNameFromCustomer(customer: any): string {
    const first = (customer?.name || '').toString().trim();
    const last = (customer?.lastName || customer?.last_name || '').toString().trim();
    return `${first} ${last}`.trim() || first || customer?.phone || 'Customer';
  }

  private async ensureCustomerAccountByPhone(phone: string, suggestedName?: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Phone number is required');
    }

    const existing = await this.customersRepository
      .createQueryBuilder('customer')
      .addSelect('customer.password')
      .where('customer.phone = :phone', { phone: normalizedPhone })
      .getOne();

    if (existing) return existing;

    const created = this.customersRepository.create({
      phone: normalizedPhone,
      name: (suggestedName || '').toString().trim() || `Guest ${normalizedPhone.slice(-4)}`,
      isGuest: true,
      status: 'active',
      customerType: 'new',
      lifecycleStage: 'lead',
      isActive: true,
    } as any);

    return await this.customersRepository.save(created);
  }

  private async upsertFamilyMemberRow(params: {
    customerId: number;
    name: string;
    phone: string;
    relationship: any;
    dateOfBirth?: Date | null;
    anniversaryDate?: Date | null;
  }) {
    const phone = this.normalizePhone(params.phone);
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    const existing = await this.familyMemberRepo.findOne({
      where: {
        customerId: params.customerId,
        phone,
      } as any,
    });

    const patch: any = {
      customerId: params.customerId,
      name: params.name,
      phone,
      relationship: params.relationship,
      isActive: true,
    };

    if (Object.prototype.hasOwnProperty.call(params, 'dateOfBirth')) {
      patch.dateOfBirth = params.dateOfBirth ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(params, 'anniversaryDate')) {
      patch.anniversaryDate = params.anniversaryDate ?? null;
    }

    if (existing) {
      await this.familyMemberRepo.update(existing.id, patch);
      return await this.familyMemberRepo.findOne({ where: { id: existing.id } });
    }

    const created = this.familyMemberRepo.create(patch);
    return await this.familyMemberRepo.save(created);
  }

  // =====================================================
  // CUSTOMER 360° VIEW
  // =====================================================

  async getCustomer360(customerId: number) {
    const query = `
      SELECT * FROM customer_360_view
      WHERE customer_id = $1
    `;
    
    const result = await this.familyMemberRepo.query(query, [customerId]);
    return result[0] || null;
  }

  async getAllCustomers360(filters?: {
    customerType?: string;
    lifecycleStage?: string;
    temperature?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = `SELECT * FROM customer_360_view WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.customerType) {
      query += ` AND customer_type = $${paramIndex}`;
      params.push(filters.customerType);
      paramIndex++;
    }

    if (filters?.lifecycleStage) {
      query += ` AND lifecycle_stage = $${paramIndex}`;
      params.push(filters.lifecycleStage);
      paramIndex++;
    }

    if (filters?.temperature) {
      query += ` AND customer_temperature = $${paramIndex}`;
      params.push(filters.temperature);
      paramIndex++;
    }

    query += ` ORDER BY lifetime_value DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    return await this.familyMemberRepo.query(query, params);
  }

  // =====================================================
  // FAMILY MEMBERS
  // =====================================================

  async getFamilyMembers(customerId: number) {
    // Return family members plus linked customer account info (by phone).
    // This makes it easy for the customer panel to show that an account exists.
    const query = `
      SELECT
        cfm.*,
        c.id AS linked_customer_id,
        c.name AS linked_customer_name,
        c.last_name AS linked_customer_last_name,
        c.email AS linked_customer_email,
        c.phone AS linked_customer_phone
      FROM customer_family_members cfm
      LEFT JOIN customers c ON c.phone = cfm.phone
      WHERE cfm.customer_id = $1 AND cfm.is_active = true
      ORDER BY cfm.relationship ASC, cfm.created_at DESC
    `;

    return await this.familyMemberRepo.query(query, [customerId]);
  }

  async addFamilyMember(data: Partial<FamilyMember>) {
    const customerId = Number((data as any).customerId);
    const phone = this.normalizePhone((data as any).phone);
    const name = ((data as any).name || '').toString().trim();

    if (!customerId || Number.isNaN(customerId)) {
      throw new BadRequestException('customerId is required');
    }
    if (!name) {
      throw new BadRequestException('name is required');
    }
    if (!phone) {
      throw new BadRequestException('phone is required');
    }

    const ownerCustomer = await this.customersRepository.findOne({
      where: { id: customerId as any } as any,
    });
    if (!ownerCustomer) {
      throw new BadRequestException('Customer not found');
    }

    const ownerPhone = this.normalizePhone((ownerCustomer as any).phone);
    if (ownerPhone && ownerPhone === phone) {
      throw new BadRequestException('You cannot add your own phone number as a family member');
    }

    // Ensure an account exists for the family member (guest account with no password).
    const familyCustomer = await this.ensureCustomerAccountByPhone(phone, name);

    // Create/update the family-member row for the owner.
    const ownerRow = await this.upsertFamilyMemberRow({
      customerId,
      name,
      phone,
      relationship: (data as any).relationship,
      dateOfBirth: Object.prototype.hasOwnProperty.call(data, 'dateOfBirth')
        ? ((data as any).dateOfBirth ?? null)
        : undefined,
      anniversaryDate: Object.prototype.hasOwnProperty.call(data, 'anniversaryDate')
        ? ((data as any).anniversaryDate ?? null)
        : undefined,
    });

    // Create/update the reciprocal link so the relationship shows on both accounts.
    // We mirror the same relationship label as requested (e.g., brother <-> brother).
    if (ownerPhone) {
      const reciprocalName = this.displayNameFromCustomer(ownerCustomer);
      await this.upsertFamilyMemberRow({
        customerId: Number((familyCustomer as any).id),
        name: reciprocalName,
        phone: ownerPhone,
        relationship: (data as any).relationship,
      });
    }

    return ownerRow;
  }

  async updateFamilyMember(id: number, data: Partial<FamilyMember>) {
    const existing = await this.familyMemberRepo.findOne({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Family member not found');
    }

    const beforePhone = this.normalizePhone((existing as any).phone);

    await this.familyMemberRepo.update(id, data);
    const updated = await this.familyMemberRepo.findOne({ where: { id } });

    // Best-effort reciprocal sync.
    try {
      const afterPhone = this.normalizePhone((updated as any)?.phone);
      const ownerCustomer = await this.customersRepository.findOne({
        where: { id: (existing as any).customerId as any } as any,
      });
      const ownerPhone = this.normalizePhone((ownerCustomer as any)?.phone);
      const ownerName = ownerCustomer ? this.displayNameFromCustomer(ownerCustomer) : null;

      if (ownerPhone && beforePhone) {
        const beforeFamilyCustomer = await this.customersRepository.findOne({
          where: { phone: beforePhone } as any,
        });

        // If the linked phone changed, deactivate the old reciprocal row.
        if (beforeFamilyCustomer && afterPhone && afterPhone !== beforePhone) {
          const oldReciprocal = await this.familyMemberRepo.findOne({
            where: {
              customerId: Number((beforeFamilyCustomer as any).id),
              phone: ownerPhone,
            } as any,
          });
          if (oldReciprocal) {
            await this.familyMemberRepo.update(oldReciprocal.id, { isActive: false } as any);
          }
        }

        // Ensure the new reciprocal row exists.
        if (ownerName && afterPhone) {
          const updatedName = ((updated as any)?.name || (existing as any)?.name || '').toString().trim();
          const afterFamilyCustomer = await this.ensureCustomerAccountByPhone(afterPhone, updatedName);
          await this.upsertFamilyMemberRow({
            customerId: Number((afterFamilyCustomer as any).id),
            name: ownerName,
            phone: ownerPhone,
            relationship: (updated as any)?.relationship ?? (existing as any)?.relationship,
          });
        }
      }
    } catch (e) {
      // Do not block updates if reciprocal sync fails.
      console.error('Reciprocal family-member sync failed:', e);
    }

    return updated;
  }

  async deleteFamilyMember(id: number) {
    const existing = await this.familyMemberRepo.findOne({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Family member not found');
    }

    // Soft delete
    await this.familyMemberRepo.update(id, { isActive: false } as any);

    // Best-effort reciprocal delete.
    try {
      const ownerCustomer = await this.customersRepository.findOne({
        where: { id: (existing as any).customerId as any } as any,
      });
      const ownerPhone = this.normalizePhone((ownerCustomer as any)?.phone);
      const familyPhone = this.normalizePhone((existing as any).phone);

      if (ownerPhone && familyPhone) {
        const familyCustomer = await this.customersRepository.findOne({
          where: { phone: familyPhone } as any,
        });
        if (familyCustomer) {
          const reciprocal = await this.familyMemberRepo.findOne({
            where: {
              customerId: Number((familyCustomer as any).id),
              phone: ownerPhone,
            } as any,
          });
          if (reciprocal) {
            await this.familyMemberRepo.update(reciprocal.id, { isActive: false } as any);
          }
        }
      }
    } catch (e) {
      console.error('Reciprocal family-member delete failed:', e);
    }

    return { success: true };
  }

  // =====================================================
  // INTERACTIONS
  // =====================================================

  async getCustomerInteractions(customerId: number, filters?: {
    interactionType?: string;
    limit?: number;
  }) {
    const query: any = { where: { customerId } };
    
    if (filters?.interactionType) {
      query.where.interactionType = filters.interactionType;
    }

    query.order = { createdAt: 'DESC' };
    
    if (filters?.limit) {
      query.take = filters.limit;
    }

    return await this.interactionRepo.find(query);
  }

  async trackInteraction(data: Partial<CustomerInteraction>) {
    const interaction = this.interactionRepo.create(data);
    return await this.interactionRepo.save(interaction);
  }

  async getInteractionStats(customerId: number) {
    const query = `
      SELECT 
        interaction_type,
        COUNT(*) as count,
        AVG(duration_seconds) as avg_duration,
        MAX(created_at) as last_interaction
      FROM customer_interactions
      WHERE customer_id = $1
      GROUP BY interaction_type
    `;
    
    return await this.interactionRepo.query(query, [customerId]);
  }

  // =====================================================
  // BEHAVIOR TRACKING
  // =====================================================

  async trackBehavior(data: Partial<CustomerBehavior>) {
    const behavior = this.behaviorRepo.create(data);
    return await this.behaviorRepo.save(behavior);
  }

  async getCustomerBehaviors(customerId: number, filters?: {
    behaviorType?: string;
    productId?: number;
    limit?: number;
  }) {
    const query: any = { where: { customerId } };
    
    if (filters?.behaviorType) {
      query.where.behaviorType = filters.behaviorType;
    }

    if (filters?.productId) {
      query.where.productId = filters.productId;
    }

    query.order = { createdAt: 'DESC' };
    
    if (filters?.limit) {
      query.take = filters.limit;
    }

    return await this.behaviorRepo.find(query);
  }

  async getBehaviorStats(customerId: number) {
    const query = `
      SELECT 
        behavior_type,
        COUNT(*) as count,
        COUNT(DISTINCT product_id) as unique_products,
        MAX(created_at) as last_behavior
      FROM customer_behavior
      WHERE customer_id = $1
      GROUP BY behavior_type
    `;
    
    return await this.behaviorRepo.query(query, [customerId]);
  }

  async getMostViewedProducts(customerId: number, limit: number = 10) {
    const query = `
      SELECT 
        product_id,
        COUNT(*) as view_count,
        MAX(created_at) as last_viewed
      FROM customer_behavior
      WHERE customer_id = $1 AND behavior_type = 'product_view'
        AND product_id IS NOT NULL
      GROUP BY product_id
      ORDER BY view_count DESC
      LIMIT $2
    `;
    
    return await this.behaviorRepo.query(query, [customerId, limit]);
  }

  // =====================================================
  // DROP-OFF TRACKING
  // =====================================================

  async trackDropoff(data: Partial<CustomerDropoff>) {
    const dropoff = this.dropoffRepo.create(data);
    return await this.dropoffRepo.save(dropoff);
  }

  async getCustomerDropoffs(customerId: number) {
    return await this.dropoffRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });
  }

  async markDropoffRecovered(dropoffId: number) {
    return await this.dropoffRepo.update(dropoffId, {
      recovered: true,
      recoveredAt: new Date()
    });
  }

  async getDropoffStats() {
    const query = `
      SELECT 
        stage,
        COUNT(*) as total_dropoffs,
        COUNT(*) FILTER (WHERE recovered = true) as recovered,
        AVG(cart_value) as avg_cart_value
      FROM customer_dropoff_tracking
      GROUP BY stage
      ORDER BY total_dropoffs DESC
    `;
    
    return await this.dropoffRepo.query(query);
  }

  // =====================================================
  // BIRTHDAY & ANNIVERSARY REMINDERS
  // =====================================================

  async getUpcomingBirthdays(daysAhead: number = 7) {
    const query = `
      SELECT * FROM upcoming_birthdays_anniversaries
      WHERE event_type = 'birthday' AND days_until_event <= $1
      ORDER BY days_until_event ASC
    `;
    
    return await this.familyMemberRepo.query(query, [daysAhead]);
  }

  async getUpcomingAnniversaries(daysAhead: number = 7) {
    const query = `
      SELECT * FROM upcoming_birthdays_anniversaries
      WHERE event_type = 'anniversary' AND days_until_event <= $1
      ORDER BY days_until_event ASC
    `;
    
    return await this.familyMemberRepo.query(query, [daysAhead]);
  }

  async getTodayEvents() {
    const query = `
      SELECT * FROM upcoming_birthdays_anniversaries
      WHERE days_until_event = 0
      ORDER BY event_type, name
    `;
    
    return await this.familyMemberRepo.query(query);
  }

  // =====================================================
  // AI CALL RECOMMENDATIONS
  // =====================================================

  async getAICallRecommendations(limit: number = 50) {
    const query = `
      SELECT * FROM ai_call_recommendations
      ORDER BY call_priority_score DESC, lifetime_value DESC
      LIMIT $1
    `;
    
    return await this.familyMemberRepo.query(query, [limit]);
  }

  async getTopPriorityCustomers(limit: number = 10) {
    const query = `
      SELECT * FROM ai_call_recommendations
      WHERE call_priority_score >= 8
      ORDER BY call_priority_score DESC, lifetime_value DESC
      LIMIT $1
    `;
    
    return await this.familyMemberRepo.query(query, [limit]);
  }

  async getCustomerRecommendation(customerId: number) {
    const query = `
      SELECT * FROM ai_call_recommendations
      WHERE customer_id = $1
    `;
    
    const result = await this.familyMemberRepo.query(query, [customerId]);
    return result[0] || null;
  }

  // =====================================================
  // LIFECYCLE & SEGMENTATION
  // =====================================================

  async getCustomersByLifecycle(stage: string) {
    const query = `
      SELECT * FROM customer_360_view
      WHERE lifecycle_stage = $1
      ORDER BY lifetime_value DESC
    `;
    
    return await this.familyMemberRepo.query(query, [stage]);
  }

  async getCustomersByType(type: string) {
    const query = `
      SELECT * FROM customer_360_view
      WHERE customer_type = $1
      ORDER BY lifetime_value DESC
    `;
    
    return await this.familyMemberRepo.query(query, [type]);
  }

  async getCustomersByTemperature(temperature: string) {
    const query = `
      SELECT * FROM customer_360_view
      WHERE customer_temperature = $1
      ORDER BY days_since_last_order ASC, lifetime_value DESC
    `;
    
    return await this.familyMemberRepo.query(query, [temperature]);
  }

  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  async getDashboardStats() {
    const query = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE customer_type = 'vip') as vip_customers,
        COUNT(*) FILTER (WHERE customer_type = 'repeat') as repeat_customers,
        COUNT(*) FILTER (WHERE customer_type = 'new') as new_customers,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'loyal') as loyal_customers,
        COUNT(*) FILTER (WHERE customer_temperature = 'hot') as hot_customers,
        COUNT(*) FILTER (WHERE customer_temperature = 'warm') as warm_customers,
        COUNT(*) FILTER (WHERE customer_temperature = 'cold') as cold_customers,
        SUM(lifetime_value) as total_lifetime_value,
        AVG(lifetime_value) as avg_lifetime_value
      FROM customer_360_view
    `;
    
    const result = await this.familyMemberRepo.query(query);
    return result[0] || {};
  }
}
