import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyMember } from './entities/family-member.entity';
import { CustomerInteraction } from './entities/customer-interaction.entity';
import { CustomerBehavior } from './entities/customer-behavior.entity';
import { CustomerDropoff } from './entities/customer-dropoff.entity';

@Injectable()
export class CdmService {
  constructor(
    @InjectRepository(FamilyMember)
    private familyMemberRepo: Repository<FamilyMember>,
    @InjectRepository(CustomerInteraction)
    private interactionRepo: Repository<CustomerInteraction>,
    @InjectRepository(CustomerBehavior)
    private behaviorRepo: Repository<CustomerBehavior>,
    @InjectRepository(CustomerDropoff)
    private dropoffRepo: Repository<CustomerDropoff>,
  ) {}

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
    return await this.familyMemberRepo.find({
      where: { customerId, isActive: true },
      order: { relationship: 'ASC', createdAt: 'DESC' }
    });
  }

  async addFamilyMember(data: Partial<FamilyMember>) {
    const member = this.familyMemberRepo.create(data);
    return await this.familyMemberRepo.save(member);
  }

  async updateFamilyMember(id: number, data: Partial<FamilyMember>) {
    await this.familyMemberRepo.update(id, data);
    return await this.familyMemberRepo.findOne({ where: { id } });
  }

  async deleteFamilyMember(id: number) {
    // Soft delete
    return await this.familyMemberRepo.update(id, { isActive: false });
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
