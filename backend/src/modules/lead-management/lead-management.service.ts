import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerSession } from './entities/customer-session.entity';
import { IncompleteOrder } from './entities/incomplete-order.entity';
import { TeamAssignment } from './entities/team-assignment.entity';
import { TeamAData } from './entities/team-a-data.entity';
import { TeamBData } from './entities/team-b-data.entity';
import { TeamCData } from './entities/team-c-data.entity';
import { TeamDData } from './entities/team-d-data.entity';
import { TeamEData } from './entities/team-e-data.entity';
import { CustomerTier } from './entities/customer-tier.entity';

@Injectable()
export class LeadManagementService {
  constructor(
    @InjectRepository(CustomerSession)
    private readonly sessionRepo: Repository<CustomerSession>,
    @InjectRepository(IncompleteOrder)
    private readonly incompleteOrderRepo: Repository<IncompleteOrder>,
    @InjectRepository(TeamAssignment)
    private readonly teamAssignmentRepo: Repository<TeamAssignment>,
    @InjectRepository(TeamAData)
    private readonly teamADataRepo: Repository<TeamAData>,
    @InjectRepository(TeamBData)
    private readonly teamBDataRepo: Repository<TeamBData>,
    @InjectRepository(TeamCData)
    private readonly teamCDataRepo: Repository<TeamCData>,
    @InjectRepository(TeamDData)
    private readonly teamDDataRepo: Repository<TeamDData>,
    @InjectRepository(TeamEData)
    private readonly teamEDataRepo: Repository<TeamEData>,
    @InjectRepository(CustomerTier)
    private readonly customerTierRepo: Repository<CustomerTier>,
  ) {}

  // ============================================
  // SESSION TRACKING
  // ============================================

  async trackSession(data: Partial<CustomerSession>) {
    const session = this.sessionRepo.create(data);
    return this.sessionRepo.save(session);
  }

  async updateSession(sessionId: string, data: Partial<CustomerSession>) {
    await this.sessionRepo.update({ sessionId }, data);
    return this.sessionRepo.findOne({ where: { sessionId } });
  }

  async getCustomerSessions(customerId: number) {
    return this.sessionRepo.find({
      where: { customerId },
      order: { sessionStart: 'DESC' },
    });
  }

  async getSessionByCampaign(campaignId: string) {
    return this.sessionRepo.find({
      where: { campaignId },
      order: { sessionStart: 'DESC' },
    });
  }

  // ============================================
  // INCOMPLETE ORDERS
  // ============================================

  async trackIncompleteOrder(data: Partial<IncompleteOrder>) {
    const order = this.incompleteOrderRepo.create(data);
    return this.incompleteOrderRepo.save(order);
  }

  /**
   * Track or update an incomplete order from a landing page.
   * Uses sessionId to upsert — if the same session already has an incomplete order
   * for the same landing page, update it instead of creating a new row.
   */
  async trackLandingPageIncompleteOrder(data: Partial<IncompleteOrder>) {
    // Try to find existing record for this session + landing page
    if (data.sessionId && data.landingPageId) {
      const existing = await this.incompleteOrderRepo.findOne({
        where: {
          sessionId: data.sessionId,
          landingPageId: data.landingPageId,
          convertedToOrder: false,
        },
      });
      if (existing) {
        // Update existing record with latest form data
        Object.assign(existing, data);
        return this.incompleteOrderRepo.save(existing);
      }
    }
    // Create new record
    const order = this.incompleteOrderRepo.create({
      ...data,
      source: data.source || 'landing_page',
      abandonedStage: data.abandonedStage || 'form_started',
    });
    return this.incompleteOrderRepo.save(order);
  }

  /**
   * Mark an incomplete order as converted when the user submits the actual order.
   */
  async markAsConverted(sessionId: string, landingPageId: number, recoveredOrderId: number) {
    const existing = await this.incompleteOrderRepo.findOne({
      where: {
        sessionId,
        landingPageId,
        convertedToOrder: false,
      },
    });
    if (existing) {
      existing.convertedToOrder = true;
      existing.recovered = true;
      existing.recoveredOrderId = recoveredOrderId;
      existing.abandonedStage = 'completed';
      await this.incompleteOrderRepo.save(existing);
    }
  }

  async getIncompleteOrders(customerId?: number) {
    const where: any = { recovered: false };
    if (customerId) where.customerId = customerId;
    
    return this.incompleteOrderRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getIncompleteOrdersFiltered(filters: {
    q?: string;
    source?: string;
    landingPageSlug?: string;
    abandonedStage?: string;
    recovered?: string;
    convertedToOrder?: string;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    limit?: number;
  }) {
    const qb = this.incompleteOrderRepo.createQueryBuilder('io');

    // Text search across name, phone, email, landing page title
    if (filters.q) {
      const q = `%${filters.q}%`;
      qb.andWhere(
        '(io.name ILIKE :q OR io.phone ILIKE :q OR io.email ILIKE :q OR io.landing_page_title ILIKE :q OR io.landing_page_slug ILIKE :q OR io.address ILIKE :q)',
        { q },
      );
    }

    if (filters.source) {
      qb.andWhere('io.source = :source', { source: filters.source });
    }

    if (filters.landingPageSlug) {
      qb.andWhere('io.landing_page_slug = :slug', { slug: filters.landingPageSlug });
    }

    if (filters.abandonedStage) {
      qb.andWhere('io.abandoned_stage = :stage', { stage: filters.abandonedStage });
    }

    if (filters.recovered === 'true') {
      qb.andWhere('io.recovered = true');
    } else if (filters.recovered === 'false') {
      qb.andWhere('io.recovered = false');
    }

    if (filters.convertedToOrder === 'true') {
      qb.andWhere('io.converted_to_order = true');
    } else if (filters.convertedToOrder === 'false') {
      qb.andWhere('io.converted_to_order = false');
    }

    if (filters.createdFrom) {
      qb.andWhere('io.created_at >= :from', { from: filters.createdFrom });
    }
    if (filters.createdTo) {
      qb.andWhere('io.created_at <= :to', { to: filters.createdTo + ' 23:59:59' });
    }

    qb.orderBy('io.created_at', 'DESC');

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 200) : 20;
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    // Get summary stats
    const statsQb = this.incompleteOrderRepo.createQueryBuilder('io');
    const totalAll = await statsQb.getCount();

    const landingPageCount = await this.incompleteOrderRepo.createQueryBuilder('io')
      .where("io.source = 'landing_page'")
      .getCount();

    const notConvertedCount = await this.incompleteOrderRepo.createQueryBuilder('io')
      .where('io.converted_to_order = false')
      .andWhere('io.recovered = false')
      .getCount();

    // Get distinct landing page slugs for filter dropdown
    const landingPages = await this.incompleteOrderRepo.createQueryBuilder('io')
      .select('DISTINCT io.landing_page_slug', 'slug')
      .addSelect('io.landing_page_title', 'title')
      .where('io.landing_page_slug IS NOT NULL')
      .getRawMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalAll,
        landingPageCount,
        notConvertedCount,
      },
      landingPages: landingPages.filter((lp: any) => lp.slug),
    };
  }

  async markOrderRecovered(id: number, recoveredOrderId: number) {
    await this.incompleteOrderRepo.update(id, {
      recovered: true,
      recoveredOrderId,
    });
    return this.incompleteOrderRepo.findOne({ where: { id } });
  }

  async sendRecoveryEmail(id: number) {
    await this.incompleteOrderRepo.update(id, { recoveryEmailSent: true });
  }

  async toggleContactedDone(id: number) {
    const order = await this.incompleteOrderRepo.findOne({ where: { id } });
    if (!order) throw new Error('Incomplete order not found');
    order.contactedDone = !order.contactedDone;
    return this.incompleteOrderRepo.save(order);
  }

  // ============================================
  // UNASSIGNED LEADS
  // ============================================

  async getUnassignedLeads(limit = 50) {
    // This will use the database view created in migration
    return this.sessionRepo.query(`
      SELECT * FROM unassigned_leads
      ORDER BY lead_score DESC, created_at DESC
      LIMIT $1
    `, [limit]);
  }

  // ============================================
  // TEAM ASSIGNMENTS
  // ============================================

  async assignLeadToTeam(data: {
    customerId: number;
    teamType: string;
    assignedById: number;
    assignedToId: number;
    notes?: string;
  }) {
    const assignment = this.teamAssignmentRepo.create(data);
    await this.teamAssignmentRepo.save(assignment);

    // Update customer lead_status to 'assigned'
    await this.sessionRepo.query(`
      UPDATE customers 
      SET lead_status = 'assigned', 
          assigned_team_member_id = $1,
          assigned_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [data.assignedToId, data.customerId]);

    // Increment team member's assigned count using raw SQL
    await this.sessionRepo.query(`
      UPDATE team_members 
      SET assigned_leads_count = assigned_leads_count + 1
      WHERE user_id = $1
    `, [data.assignedToId]);

    return assignment;
  }

  async getTeamAssignments(teamType?: string, assignedToId?: number, status?: string) {
    const where: any = {};
    if (teamType) where.teamType = teamType;
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;

    return this.teamAssignmentRepo.find({
      where,
      order: { assignedAt: 'DESC' },
    });
  }

  async updateAssignmentStatus(id: number, status: string) {
    const update: any = { status };
    if (status === 'completed') {
      update.completedAt = new Date();
    }
    
    await this.teamAssignmentRepo.update(id, update);
    return this.teamAssignmentRepo.findOne({ where: { id } });
  }

  // ============================================
  // TEAM A DATA (Gender, Profession, Product Interest)
  // ============================================

  async saveTeamAData(data: Partial<TeamAData>) {
    const existing = await this.teamADataRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      await this.teamADataRepo.update(existing.id, data);
      return this.teamADataRepo.findOne({ where: { id: existing.id } });
    }

    const teamData = this.teamADataRepo.create(data);
    return this.teamADataRepo.save(teamData);
  }

  async getTeamAData(customerId: number) {
    return this.teamADataRepo.findOne({ where: { customerId } });
  }

  // ============================================
  // TEAM B DATA (DOB, Marriage Day, Product Interest)
  // ============================================

  async saveTeamBData(data: Partial<TeamBData>) {
    const existing = await this.teamBDataRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      await this.teamBDataRepo.update(existing.id, data);
      return this.teamBDataRepo.findOne({ where: { id: existing.id } });
    }

    const teamData = this.teamBDataRepo.create(data);
    return this.teamBDataRepo.save(teamData);
  }

  async getTeamBData(customerId: number) {
    return this.teamBDataRepo.findOne({ where: { customerId } });
  }

  // ============================================
  // TEAM C DATA (Family Members, Product Interest)
  // ============================================

  async saveTeamCData(data: Partial<TeamCData>) {
    const existing = await this.teamCDataRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      await this.teamCDataRepo.update(existing.id, data);
      return this.teamCDataRepo.findOne({ where: { id: existing.id } });
    }

    const teamData = this.teamCDataRepo.create(data);
    return this.teamCDataRepo.save(teamData);
  }

  async getTeamCData(customerId: number) {
    return this.teamCDataRepo.findOne({ where: { customerId } });
  }

  // ============================================
  // TEAM D DATA (Health Card, Membership, Coupon)
  // ============================================

  async saveTeamDData(data: Partial<TeamDData>) {
    const existing = await this.teamDDataRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      await this.teamDDataRepo.update(existing.id, data);
      return this.teamDDataRepo.findOne({ where: { id: existing.id } });
    }

    const teamData = this.teamDDataRepo.create(data);
    return this.teamDDataRepo.save(teamData);
  }

  async getTeamDData(customerId: number) {
    return this.teamDDataRepo.findOne({ where: { customerId } });
  }

  // ============================================
  // TEAM E DATA (Permanent Membership)
  // ============================================

  async saveTeamEData(data: Partial<TeamEData>) {
    const existing = await this.teamEDataRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      await this.teamEDataRepo.update(existing.id, data);
      return this.teamEDataRepo.findOne({ where: { id: existing.id } });
    }

    const teamData = this.teamEDataRepo.create(data);
    return this.teamEDataRepo.save(teamData);
  }

  async getTeamEData(customerId: number) {
    return this.teamEDataRepo.findOne({ where: { customerId } });
  }

  // ============================================
  // CUSTOMER TIER MANAGEMENT
  // ============================================

  async updateCustomerTier(data: {
    customerId: number;
    tier: string;
    isActive: boolean;
    tierAssignedById?: number;
    notes?: string;
  }) {
    const existing = await this.customerTierRepo.findOne({
      where: { customerId: data.customerId },
    });

    if (existing) {
      await this.customerTierRepo.update(existing.id, {
        ...data,
        tierAssignedAt: new Date(),
      });
      return this.customerTierRepo.findOne({ where: { id: existing.id } });
    }

    const tier = this.customerTierRepo.create({
      ...data,
      autoAssigned: false,
    });
    return this.customerTierRepo.save(tier);
  }

  async getCustomerTier(customerId: number) {
    return this.customerTierRepo.findOne({ where: { customerId } });
  }

  async getCustomersByTier(tier: string) {
    return this.customerTierRepo.find({
      where: { tier, isActive: true },
      order: { totalSpent: 'DESC' },
    });
  }

  async getInactiveCustomers(daysThreshold = 30) {
    return this.customerTierRepo.find({
      where: { isActive: false },
      order: { lastActivityDate: 'ASC' },
    });
  }

  async getAllCustomersWithTiers(filters: { tier?: string; status?: string; assignedTo?: number; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    // First, get total count for stats (before pagination)
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN ct.is_active = true THEN 1 END)::int as total_active,
        COUNT(CASE WHEN ct.is_active = false THEN 1 END)::int as total_inactive,
        COUNT(CASE WHEN ct.tier = 'silver' THEN 1 END)::int as silver,
        COUNT(CASE WHEN ct.tier = 'gold' THEN 1 END)::int as gold,
        COUNT(CASE WHEN ct.tier = 'platinum' THEN 1 END)::int as platinum,
        COUNT(CASE WHEN ct.tier = 'vip' THEN 1 END)::int as vip,
        COUNT(CASE WHEN ct.tier IS NULL THEN 1 END)::int as no_tier
      FROM customers c
      LEFT JOIN customer_tiers ct ON ct.customer_id = c.id
      WHERE c.is_deleted = false
      ${filters.tier && filters.tier !== 'all' ? `AND ct.tier = '${filters.tier}'` : ''}
      ${filters.status === 'active' ? 'AND ct.is_active = true' : ''}
      ${filters.status === 'inactive' ? 'AND ct.is_active = false' : ''}
      ${filters.assignedTo ? `AND c.assigned_to = ${filters.assignedTo}` : ''}
    `;

    const statsResults = await this.sessionRepo.query(statsQuery);
    const statsRow = statsResults[0] || {};

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM customers c
      LEFT JOIN customer_tiers ct ON ct.customer_id = c.id
      WHERE c.is_deleted = false
      ${filters.tier && filters.tier !== 'all' ? `AND ct.tier = '${filters.tier}'` : ''}
      ${filters.status === 'active' ? 'AND ct.is_active = true' : ''}
      ${filters.status === 'inactive' ? 'AND ct.is_active = false' : ''}
      ${filters.assignedTo ? `AND c.assigned_to = ${filters.assignedTo}` : ''}
    `;

    const countResults = await this.sessionRepo.query(countQuery);
    const total = countResults[0]?.total || 0;

    // Get all customers with their tier data in a single query
    const query = `
      SELECT 
        c.id,
        c.name as first_name,
        c.last_name,
        c.email,
        c.phone,
        c.customer_type,
        c.assigned_to,
        c.created_at,
        ct.id as tier_id,
        ct.tier,
        ct.is_active as tier_is_active,
        ct.tier_assigned_at,
        ct.total_purchases,
        ct.total_spent,
        ct.engagement_score,
        ct.days_inactive,
        ct.notes as tier_notes,
        COALESCE(
          (SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id),
          0
        ) as order_count,
        COALESCE(
          (SELECT SUM(so.total_amount) FROM sales_orders so WHERE so.customer_id = c.id),
          0
        ) as lifetime_value,
        u.name as agent_name,
        u.last_name as agent_last_name
      FROM customers c
      LEFT JOIN customer_tiers ct ON ct.customer_id = c.id
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.is_deleted = false
      ${filters.tier && filters.tier !== 'all' ? `AND ct.tier = '${filters.tier}'` : ''}
      ${filters.status === 'active' ? 'AND ct.is_active = true' : ''}
      ${filters.status === 'inactive' ? 'AND ct.is_active = false' : ''}
      ${filters.assignedTo ? `AND c.assigned_to = ${filters.assignedTo}` : ''}
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const results = await this.sessionRepo.query(query);
    
    return {
      customers: results.map((r: any) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
        customer_type: r.customer_type,
        assigned_to: r.assigned_to,
        agent_name: r.agent_name ? `${r.agent_name} ${r.agent_last_name || ''}`.trim() : null,
        created_at: r.created_at,
        order_count: r.order_count,
        lifetime_value: r.lifetime_value,
        tierData: r.tier_id ? {
          id: r.tier_id,
          tier: r.tier,
          isActive: r.tier_is_active,
          tierAssignedAt: r.tier_assigned_at,
          totalPurchases: r.total_purchases,
          totalSpent: r.total_spent,
          engagementScore: r.engagement_score,
          daysInactive: r.days_inactive,
          notes: r.tier_notes,
        } : null,
      })),
      stats: {
        totalActive: statsRow.total_active || 0,
        totalInactive: statsRow.total_inactive || 0,
        silver: statsRow.silver || 0,
        gold: statsRow.gold || 0,
        platinum: statsRow.platinum || 0,
        vip: statsRow.vip || 0,
        noTier: statsRow.no_tier || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // TEAM MEMBER MANAGEMENT
  // ============================================

  async addTeamMember(data: { userId?: number; teamLeaderId?: number; teamType?: string; isActive?: boolean }) {
    // Use raw SQL to avoid entity metadata issues
    const result = await this.sessionRepo.query(`
      INSERT INTO team_members (user_id, team_leader_id, team_type, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [data.userId, data.teamLeaderId, data.teamType, data.isActive ?? true]);
    return result[0];
  }

  async getTeamMembers(teamLeaderId: number, teamType?: string) {
    // Use raw SQL to avoid entity metadata issues
    let query = `SELECT * FROM team_members WHERE team_leader_id = $1`;
    const params: any[] = [teamLeaderId];
    
    if (teamType) {
      query += ` AND team_type = $2`;
      params.push(teamType);
    }
    
    return this.sessionRepo.query(query, params);
  }

  async getTeamMemberStats(userId: number) {
    // Use raw SQL to avoid entity metadata issues
    const result = await this.sessionRepo.query(`
      SELECT * FROM team_members WHERE user_id = $1 LIMIT 1
    `, [userId]);
    return result[0] || null;
  }

  // ============================================
  // TEAM LEADER DASHBOARD
  // ============================================

  async getTeamLeaderDashboard(teamLeaderId: number) {
    return this.sessionRepo.query(`
      SELECT * FROM team_leader_dashboard
      WHERE team_leader_id = $1
    `, [teamLeaderId]);
  }

  // ============================================
  // CUSTOMER COMPLETE PROFILE
  // ============================================

  async getCustomerCompleteProfile(customerId: number) {
    const result = await this.sessionRepo.query(`
      SELECT * FROM customer_complete_profile
      WHERE id = $1
    `, [customerId]);

    return result[0] || null;
  }
}
