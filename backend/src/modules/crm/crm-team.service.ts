import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { User } from '../users/user.entity';
import { CallTask, TaskPriority, TaskStatus } from './entities/call-task.entity';
import { Activity } from './entities/activity.entity';
import { EngagementHistory } from './entities/engagement-history.entity';
import { DashboardConfig } from './entities/dashboard-config.entity';
import { CustomerTier } from '../lead-management/entities/customer-tier.entity';
import { DEFAULT_SCRIPTS, DEFAULT_TRAINING_ROLE_PLAYS } from './constants/dashboard-defaults';

/** Simple in-memory cache entry */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export enum LeadPriority {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

@Injectable()
export class CrmTeamService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(SalesTeam)
    private salesTeamRepository: Repository<SalesTeam>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    @InjectRepository(Activity)
    private activityRepo: Repository<Activity>,
    @InjectRepository(EngagementHistory)
    private engagementRepository: Repository<EngagementHistory>,
    @InjectRepository(DashboardConfig)
    private dashboardConfigRepo: Repository<DashboardConfig>,
    @InjectRepository(CustomerTier)
    private customerTierRepo: Repository<CustomerTier>,
  ) {}

  /** Dashboard cache: key = teamLeaderId, TTL = 5 minutes */
  private static readonly DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
  private dashboardCache = new Map<number, CacheEntry<any>>();

  private getDateString(date?: string | Date): string {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  }

  private getPurchaseStage(orderCount: number): 'new' | 'repeat_2' | 'repeat_3' | 'regular' | 'permanent' {
    if (orderCount <= 1) return 'new';
    if (orderCount === 2) return 'repeat_2';
    if (orderCount === 3) return 'repeat_3';
    if (orderCount >= 8) return 'permanent';
    return 'regular';
  }

  private getValueStage(totalSpent: number, avgOrderValue: number): 'normal' | 'medium' | 'vip' {
    // Defaults (can be tuned later): VIP = high spend or high AOV, Medium = regular buyer.
    if (totalSpent >= 20000 || avgOrderValue >= 3000) return 'vip';
    if (totalSpent >= 8000 || avgOrderValue >= 1500) return 'medium';
    return 'normal';
  }

  private mapSegmentToTeamCode(segment: {
    purchaseStage: string;
    valueStage: string;
  }): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (segment.valueStage === 'vip' || segment.purchaseStage === 'permanent') return 'E';
    if (segment.purchaseStage === 'new') return 'A';
    if (segment.purchaseStage === 'repeat_2') return 'B';
    if (segment.purchaseStage === 'repeat_3') return 'C';
    return 'D';
  }

  private async getLeaderAgentsByTeamCode(teamLeaderId: number): Promise<Record<string, number[]>> {
    // Uses SalesTeam.code as A–E. TL creates teams and assigns agents in /admin/crm/teams.
    const teams = await this.salesTeamRepository.find({ where: { teamLeaderId } });
    const byCode: Record<string, number[]> = { A: [], B: [], C: [], D: [], E: [], OTHER: [] };

    for (const team of teams) {
      const code = (team.code || 'OTHER').toUpperCase();
      const members = await this.usersRepository.find({ where: { teamId: team.id, status: 'active' as any } });
      const ids = members.map((m) => m.id);
      if (code in byCode) {
        byCode[code].push(...ids);
      } else {
        byCode.OTHER.push(...ids);
      }
    }

    // Fallback: any agent under TL even if not assigned to a SalesTeam
    const fallbackAgents = await this.usersRepository.find({ where: { teamLeaderId, status: 'active' as any } });
    const fallbackIds = fallbackAgents.map((a) => a.id);
    byCode.OTHER = Array.from(new Set([...byCode.OTHER, ...fallbackIds]));

    return byCode;
  }

  private async getLeaderCustomers(teamLeaderId: number): Promise<Customer[]> {
    // Customer coverage for TL = customers directly supervised OR customers assigned to TL agents.
    // Uses phone-based join for sales analytics because sales_orders is int-based in many installs.
    const agentIds = (await this.usersRepository.find({ where: { teamLeaderId } })).map((u) => u.id);
    const qb = this.customerRepository.createQueryBuilder('c');
    qb.where('c.assigned_supervisor_id = :tl', { tl: teamLeaderId });
    if (agentIds.length > 0) {
      qb.orWhere('c.assigned_to IN (:...agentIds)', { agentIds });
    }
    qb.andWhere('c.is_active = true');
    qb.andWhere('c.phone IS NOT NULL');
    return qb.getMany();
  }

  private async computeSegmentsForCustomers(customers: Customer[]) {
    const phones = customers.map((c) => c.phone).filter(Boolean);
    if (phones.length === 0) {
      return [] as Array<{
        customer: Customer;
        orderCount: number;
        totalSpent: number;
        avgOrderValue: number;
        lastOrderDate: string | null;
        purchaseStage: ReturnType<CrmTeamService['getPurchaseStage']>;
        valueStage: ReturnType<CrmTeamService['getValueStage']>;
      }>;
    }

    // Aggregate delivered orders by customer phone.
    const statsRows = await this.customerRepository.query(
      `
      SELECT
        so.customer_phone AS phone,
        COUNT(DISTINCT so.id)::int AS order_count,
        COALESCE(SUM(so.total_amount), 0)::numeric AS total_spent,
        COALESCE(AVG(so.total_amount), 0)::numeric AS avg_order_value,
        MAX(so.order_date)::date AS last_order_date
      FROM sales_orders so
      WHERE so.customer_phone = ANY($1)
        AND LOWER(so.status::text) = 'delivered'
      GROUP BY so.customer_phone
      `,
      [phones],
    );

    const statsByPhone = new Map<string, any>();
    for (const r of statsRows) {
      if (r.phone) statsByPhone.set(String(r.phone), r);
    }

    return customers.map((customer) => {
      const row = statsByPhone.get(String(customer.phone));
      const orderCount = row ? Number(row.order_count || 0) : 0;
      const totalSpent = row ? Number(row.total_spent || 0) : 0;
      const avgOrderValue = row ? Number(row.avg_order_value || 0) : 0;
      const lastOrderDate = row && row.last_order_date ? String(row.last_order_date) : null;
      const purchaseStage = this.getPurchaseStage(orderCount);
      const valueStage = this.getValueStage(totalSpent, avgOrderValue);
      return { customer, orderCount, totalSpent, avgOrderValue, lastOrderDate, purchaseStage, valueStage };
    });
  }

  // ==================== LEAD ASSIGNMENT ====================
  async assignLeadToAgent(customerId: string, agentId: number, teamLeaderId: number): Promise<Customer> {
    const customerIdNum = Number(customerId);
    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Enforce Sales Manager ownership: TL can only assign leads that have been
    // explicitly assigned to them by a Sales Manager (assigned_supervisor_id = TL).
    // Completely unassigned leads (no supervisor) are not accessible to TLs.
    if (Number(customer.assigned_supervisor_id) !== Number(teamLeaderId)) {
      throw new ForbiddenException(
        `Lead #${customerId} has not been assigned to you by the Sales Manager.`,
      );
    }

    // Use raw SQL to set assigned_to without risking assigned_supervisor_id.
    // Also re-confirm assigned_supervisor_id = TL so it can never drift.
    await this.customerRepository.query(
      `UPDATE customers
         SET assigned_to = $2,
             assigned_supervisor_id = $3,
             updated_at = NOW()
       WHERE id = $1`,
      [customerIdNum, agentId, teamLeaderId],
    );

    return (await this.customerRepository.findOne({ where: { id: customerIdNum } })) as Customer;
  }

  async reassignCustomer(customerId: string, newAgentId: number, teamLeaderId: number): Promise<Customer> {
    return await this.assignLeadToAgent(customerId, newAgentId, teamLeaderId);
  }

  async setLeadPriority(customerId: string, priority: LeadPriority): Promise<Customer> {
    const customerIdNum = Number(customerId);
    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Store priority in customer metadata
    customer.priority = priority;
    customer.updatedAt = new Date();

    return await this.customerRepository.save(customer);
  }

  // ==================== CUSTOMER TIER MANAGEMENT ====================
  private static readonly VALID_TIERS = ['new', 'silver', 'gold', 'platinum', 'vip', 'normal', 'repeat', 'rejected'];

  async updateCustomerTier(customerId: string, tier: string, actorUserId: number): Promise<Customer> {
    const customerIdNum = Number(customerId);
    if (!Number.isFinite(customerIdNum)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const normalizedTier = (tier || '').trim().toLowerCase();
    if (!normalizedTier || !CrmTeamService.VALID_TIERS.includes(normalizedTier)) {
      throw new BadRequestException(
        `Invalid tier. Valid tiers: ${CrmTeamService.VALID_TIERS.join(', ')}`,
      );
    }

    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const previousTier = (customer as any).customerType || 'new';
    (customer as any).customerType = normalizedTier;
    customer.updatedAt = new Date();

    // If rejected, unassign the customer from the agent
    if (normalizedTier === 'rejected') {
      (customer as any).assigned_to = null;
      (customer as any).assigned_supervisor_id = null;
    }

    const saved = await this.customerRepository.save(customer);

    // Sync customer_tiers table so rejected-customers page can show it
    try {
      const existingTier = await this.customerTierRepo.findOne({ where: { customerId: customerIdNum } });
      if (existingTier) {
        await this.customerTierRepo.update(existingTier.id, {
          tier: normalizedTier,
          isActive: normalizedTier !== 'rejected',
          tierAssignedAt: new Date(),
          tierAssignedById: actorUserId,
          autoAssigned: false,
          notes: `Tier changed from '${previousTier}' to '${normalizedTier}' via Agent Dashboard`,
        });
      } else {
        const newTierRecord = this.customerTierRepo.create({
          customerId: customerIdNum,
          tier: normalizedTier,
          isActive: normalizedTier !== 'rejected',
          tierAssignedAt: new Date(),
          tierAssignedById: actorUserId,
          autoAssigned: false,
          notes: `Tier set to '${normalizedTier}' via Agent Dashboard`,
        });
        await this.customerTierRepo.save(newTierRecord);
      }
    } catch {
      // never block tier update if customer_tiers sync fails
    }

    // Audit log
    try {
      const activity = this.activityRepo.create({
        type: 'tier_updated',
        customerId: saved.id,
        userId: actorUserId,
        subject: 'Customer tier updated',
        description: `Customer tier changed from '${previousTier}' to '${normalizedTier}' by user ${actorUserId}.`,
        outcome: 'updated',
        completedAt: new Date(),
        metadata: {
          from: previousTier,
          to: normalizedTier,
          actorUserId,
        },
      } as any);
      await this.activityRepo.save(activity as any);
    } catch {
      // never block tier update if logging fails
    }

    return saved;
  }

  // ==================== TEAM MONITORING ====================
  async getTeamLeads(teamLeaderId: number, query: any = {}): Promise<{ data: any[], total: number }> {
    const { 
      page = 1, 
      limit = 20, 
      priority, 
      status,
      assignmentStatus, // 'assigned' | 'unassigned' | 'all'
      assignedTo,       // specific agent ID
      search,           // search by name, email, phone
      dateFrom,         // order_date from (first order date)
      dateTo,           // order_date to (first order date)
      customerType,     // 'vip' | 'platinum' | 'gold' | 'silver' | 'new' | 'repeat'
      purchaseStage,    // 'new' | 'repeat_2' | 'repeat_3' | 'regular' | 'permanent'
      sortBy = 'created_at',
      sortOrder = 'DESC',
      productName,
      filterTeamLeaderId, // admin-only: filter leads by a specific team leader
    } = query;
    
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const qb = this.customerRepository.createQueryBuilder('c');
    
    // Add subquery to get first order date for each customer
    qb.addSelect(
      `(SELECT MIN(so.order_date) FROM sales_orders so WHERE so.customer_id = c.id)`,
      'first_order_date'
    );
    
    // Add subquery to get order count for each customer
    qb.addSelect(
      `(SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id)`,
      'order_count'
    );

    // Add subquery to get the customer's tier
    qb.addSelect(
      `(SELECT ct.tier FROM customer_tiers ct WHERE ct.customer_id = c.id LIMIT 1)`,
      'tier'
    );
    
    qb.where('c.is_deleted = false');
    qb.andWhere('c.is_active = true');

    // Exclude rejected customers
    qb.andWhere(`NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')`);

    // Only customers who have at least one delivered order
    qb.andWhere(
      `EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND LOWER(so.status::text) = 'delivered')`,
    );

    // Scope: Check if user is actually a team leader (has teams assigned)
    const isTeamLeader = await this.salesTeamRepository.count({ where: { teamLeaderId } });
    if (isTeamLeader > 0) {
      // TL scope: ONLY leads assigned to this TL by the Sales Manager (assigned_supervisor_id = TL)
      // OR leads already assigned to one of this TL's agents.
      // Unassigned leads (assigned_supervisor_id IS NULL) are NOT visible to TLs.
      const tlAgents = await this.usersRepository.find({ where: { teamLeaderId }, select: ['id'] });
      const tlAgentIds = tlAgents.map(a => a.id);
      if (tlAgentIds.length > 0) {
        qb.andWhere(
          '(c.assigned_supervisor_id = :tl OR c.assigned_to IN (:...scopeAgentIds))',
          { tl: teamLeaderId, scopeAgentIds: tlAgentIds },
        );
      } else {
        qb.andWhere('c.assigned_supervisor_id = :tl', { tl: teamLeaderId });
      }
    } else if (filterTeamLeaderId) {
      // Admin filtering by a specific team leader
      const filterTlId = Number(filterTeamLeaderId);
      const filterTlAgents = await this.usersRepository.find({ where: { teamLeaderId: filterTlId }, select: ['id'] });
      const filterTlAgentIds = filterTlAgents.map(a => a.id);
      if (filterTlAgentIds.length > 0) {
        qb.andWhere(
          '(c.assigned_supervisor_id = :filterTl OR c.assigned_to IN (:...filterTlAgentIds))',
          { filterTl: filterTlId, filterTlAgentIds },
        );
      } else {
        qb.andWhere('c.assigned_supervisor_id = :filterTl', { filterTl: filterTlId });
      }
    }
    // Non-TL, non-filtered admin: see all leads (no supervisor filter)

    // Assignment status filter
    if (assignmentStatus === 'assigned') {
      qb.andWhere('c.assigned_to IS NOT NULL');
    } else if (assignmentStatus === 'unassigned') {
      qb.andWhere('c.assigned_to IS NULL');
    }
    // 'all' or undefined = no assignment filter

    // Filter by specific agent
    if (assignedTo) {
      qb.andWhere('c.assigned_to = :assignedTo', { assignedTo: Number(assignedTo) });
    }

    if (priority) {
      qb.andWhere('c.priority = :priority', { priority });
    }
    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    // Customer type (tier) filter — use customer_tiers table for consistency
    if (customerType) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM customer_tiers ct_filter WHERE ct_filter.customer_id = c.id AND ct_filter.tier = :customerType)`,
        { customerType }
      );
    }

    // Purchase stage filter based on delivered order count only
    if (purchaseStage) {
      const deliveredCount = `(SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id AND LOWER(so.status::text) = 'delivered')`;
      if (purchaseStage === 'new') {
        qb.andWhere(`${deliveredCount} = 1`);
      } else if (purchaseStage === 'repeat_2') {
        qb.andWhere(`${deliveredCount} = 2`);
      } else if (purchaseStage === 'repeat_3') {
        qb.andWhere(`${deliveredCount} = 3`);
      } else if (purchaseStage === 'regular') {
        qb.andWhere(`${deliveredCount} >= 4 AND ${deliveredCount} < 8`);
      } else if (purchaseStage === 'permanent') {
        qb.andWhere(`${deliveredCount} >= 8`);
      }
    }

    // Product name filter — customers who ordered a specific product
    if (productName && productName.trim()) {
      const pName = `%${productName.trim().toLowerCase()}%`;
      qb.andWhere(
        `c.id IN (
          SELECT so.customer_id FROM sales_orders so
          WHERE so.id IN (
            SELECT oi.order_id FROM order_items oi WHERE oi.product_name ILIKE :pName
            UNION
            SELECT oi2.order_id FROM order_items oi2 JOIN products p ON p.id = oi2.product_id WHERE p.name_en ILIKE :pName OR p.name_bn ILIKE :pName
            UNION
            SELECT soi.sales_order_id FROM sales_order_items soi WHERE soi.product_name ILIKE :pName
            UNION
            SELECT soi2.sales_order_id FROM sales_order_items soi2 JOIN products p2 ON p2.id = soi2.product_id WHERE p2.name_en ILIKE :pName OR p2.name_bn ILIKE :pName
          )
        )`,
        { pName },
      );
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      const normalizedPhone = `%${search.trim().replace(/^\+88/, '').toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(c.name) LIKE :search OR LOWER(c.last_name) LIKE :search OR LOWER(c.email) LIKE :search OR c.phone LIKE :search OR REPLACE(c.phone, \'+88\', \'\') LIKE :normalizedPhone)',
        { search: searchTerm, normalizedPhone }
      );
    }

    // Date range filter - now filters by first order date instead of customer created_at
    if (dateFrom) {
      qb.andWhere(
        `(SELECT MIN(so.order_date) FROM sales_orders so WHERE so.customer_id = c.id) >= :dateFrom`,
        { dateFrom: new Date(dateFrom) }
      );
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere(
        `(SELECT MIN(so.order_date) FROM sales_orders so WHERE so.customer_id = c.id) <= :dateTo`,
        { dateTo: toDate }
      );
    }

    // Sorting
    const validSortColumns = ['created_at', 'name', 'email', 'priority'];
    const sortColumn = validSortColumns.includes(sortBy) ? `c.${sortBy}` : 'c.created_at';
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, order);
    
    qb.skip(skip).take(limitNum);

    const rawResults = await qb.getRawAndEntities();
    const data = rawResults.entities;
    const rawData = rawResults.raw;
    
    // Create a map of customer id to first_order_date and order_count
    const orderDateMap = new Map<number, Date | null>();
    const orderCountMap = new Map<number, number>();
    const tierMap = new Map<number, string | null>();
    rawData.forEach((row: any) => {
      orderDateMap.set(row.c_id, row.first_order_date || null);
      orderCountMap.set(row.c_id, parseInt(row.order_count, 10) || 0);
      tierMap.set(row.c_id, row.tier || null);
    });
    
    // Get total count (need separate query without the select for accurate count)
    const countQb = this.customerRepository.createQueryBuilder('c');
    countQb.where('c.is_deleted = false');
    countQb.andWhere('c.is_active = true');
    // Exclude rejected customers
    countQb.andWhere(`NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')`);
    // Only customers who have at least one delivered order
    countQb.andWhere(
      `EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND LOWER(so.status::text) = 'delivered')`,
    );
    // Apply same conditional TL filter as data query
    if (isTeamLeader > 0) {
      const tlAgentIds = (await this.usersRepository.find({ where: { teamLeaderId }, select: ['id'] })).map(a => a.id);
      if (tlAgentIds.length > 0) {
        countQb.andWhere(
          '(c.assigned_supervisor_id = :tl OR c.assigned_to IN (:...scopeAgentIds))',
          { tl: teamLeaderId, scopeAgentIds: tlAgentIds },
        );
      } else {
        countQb.andWhere('c.assigned_supervisor_id = :tl', { tl: teamLeaderId });
      }
    } else if (filterTeamLeaderId) {
      const filterTlId = Number(filterTeamLeaderId);
      const filterTlAgentIds = (await this.usersRepository.find({ where: { teamLeaderId: filterTlId }, select: ['id'] })).map(a => a.id);
      if (filterTlAgentIds.length > 0) {
        countQb.andWhere(
          '(c.assigned_supervisor_id = :filterTl OR c.assigned_to IN (:...filterTlAgentIds))',
          { filterTl: filterTlId, filterTlAgentIds },
        );
      } else {
        countQb.andWhere('c.assigned_supervisor_id = :filterTl', { filterTl: filterTlId });
      }
    }
    
    if (assignmentStatus === 'assigned') {
      countQb.andWhere('c.assigned_to IS NOT NULL');
    } else if (assignmentStatus === 'unassigned') {
      countQb.andWhere('c.assigned_to IS NULL');
    }
    if (assignedTo) {
      countQb.andWhere('c.assigned_to = :assignedTo', { assignedTo: Number(assignedTo) });
    }
    if (priority) {
      countQb.andWhere('c.priority = :priority', { priority });
    }
    if (status) {
      countQb.andWhere('c.status = :status', { status });
    }
    // Customer type (tier) filter for count — use customer_tiers table
    if (customerType) {
      countQb.andWhere(
        `EXISTS (SELECT 1 FROM customer_tiers ct_filter WHERE ct_filter.customer_id = c.id AND ct_filter.tier = :customerType)`,
        { customerType }
      );
    }
    // Purchase stage filter for count — delivered orders only
    if (purchaseStage) {
      const deliveredCountC = `(SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id AND LOWER(so.status::text) = 'delivered')`;
      if (purchaseStage === 'new') {
        countQb.andWhere(`${deliveredCountC} = 1`);
      } else if (purchaseStage === 'repeat_2') {
        countQb.andWhere(`${deliveredCountC} = 2`);
      } else if (purchaseStage === 'repeat_3') {
        countQb.andWhere(`${deliveredCountC} = 3`);
      } else if (purchaseStage === 'regular') {
        countQb.andWhere(`${deliveredCountC} >= 4 AND ${deliveredCountC} < 8`);
      } else if (purchaseStage === 'permanent') {
        countQb.andWhere(`${deliveredCountC} >= 8`);
      }
    }
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      const normalizedPhone = `%${search.trim().replace(/^\+88/, '').toLowerCase()}%`;
      countQb.andWhere(
        '(LOWER(c.name) LIKE :search OR LOWER(c.last_name) LIKE :search OR LOWER(c.email) LIKE :search OR c.phone LIKE :search OR REPLACE(c.phone, \'+88\', \'\') LIKE :normalizedPhone)',
        { search: searchTerm, normalizedPhone }
      );
    }
    // Product name filter for count
    if (productName && productName.trim()) {
      const pName = `%${productName.trim().toLowerCase()}%`;
      countQb.andWhere(
        `c.id IN (
          SELECT so.customer_id FROM sales_orders so
          WHERE so.id IN (
            SELECT oi.order_id FROM order_items oi WHERE oi.product_name ILIKE :pName
            UNION
            SELECT oi2.order_id FROM order_items oi2 JOIN products p ON p.id = oi2.product_id WHERE p.name_en ILIKE :pName OR p.name_bn ILIKE :pName
            UNION
            SELECT soi.sales_order_id FROM sales_order_items soi WHERE soi.product_name ILIKE :pName
            UNION
            SELECT soi2.sales_order_id FROM sales_order_items soi2 JOIN products p2 ON p2.id = soi2.product_id WHERE p2.name_en ILIKE :pName OR p2.name_bn ILIKE :pName
          )
        )`,
        { pName },
      );
    }
    if (dateFrom) {
      countQb.andWhere(
        `(SELECT MIN(so.order_date) FROM sales_orders so WHERE so.customer_id = c.id) >= :dateFrom`,
        { dateFrom: new Date(dateFrom) }
      );
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      countQb.andWhere(
        `(SELECT MIN(so.order_date) FROM sales_orders so WHERE so.customer_id = c.id) <= :dateTo`,
        { dateTo: toDate }
      );
    }
    const total = await countQb.getCount();

    // Enrich with agent names
    const agentIds = Array.from(new Set(data.map(c => c.assigned_to).filter(id => id != null)));
    let agentMap = new Map<number, string>();
    
    if (agentIds.length > 0) {
      const agents = await this.usersRepository.findByIds(agentIds);
      agents.forEach(agent => {
        const fullName = [agent.name, agent.lastName].filter(Boolean).join(' ').trim() || `Agent #${agent.id}`;
        agentMap.set(agent.id, fullName);
      });
    }

    // Fetch recent orders with product items for each customer
    const customerIds = data.map(c => c.id);
    let customerOrdersMap = new Map<number, any[]>();
    
    if (customerIds.length > 0) {
      try {
        // Fetch recent orders (up to 5 per customer) with their items
        const ordersRaw = await this.customerRepository.query(
          `SELECT so.id, so.sales_order_number, so.customer_id, so.total_amount, so.status, so.order_date, so.created_at
           FROM sales_orders so
           WHERE so.customer_id = ANY($1)
           ORDER BY so.order_date DESC NULLS LAST, so.created_at DESC`,
          [customerIds],
        );

        // Group orders by customer (limit 5 per customer)
        const ordersByCustomer = new Map<number, any[]>();
        for (const o of ordersRaw) {
          const cid = Number(o.customer_id);
          if (!ordersByCustomer.has(cid)) ordersByCustomer.set(cid, []);
          const arr = ordersByCustomer.get(cid)!;
          if (arr.length < 5) arr.push(o);
        }

        // Collect all order IDs to fetch items in batch
        const allOrderIds: number[] = [];
        ordersByCustomer.forEach(orders => orders.forEach(o => allOrderIds.push(o.id)));

        let itemsByOrderId = new Map<number, any[]>();
        if (allOrderIds.length > 0) {
          // Fetch items from order_items table
          const items = await this.customerRepository.query(
            `SELECT oi.order_id, oi.product_name, COALESCE(oi.custom_product_name, oi.product_name) as display_name, oi.quantity, oi.unit_price, oi.source
             FROM order_items oi
             WHERE oi.order_id = ANY($1)
             ORDER BY oi.id`,
            [allOrderIds],
          );
          for (const item of items) {
            const oid = Number(item.order_id);
            if (!itemsByOrderId.has(oid)) itemsByOrderId.set(oid, []);
            itemsByOrderId.get(oid)!.push({
              productName: item.display_name || item.product_name,
              quantity: Number(item.quantity) || 1,
              unitPrice: parseFloat(item.unit_price || '0'),
              source: item.source || null,
            });
          }

          // Also check sales_order_items for orders that have no items in order_items
          const orderIdsWithoutItems = allOrderIds.filter(id => !itemsByOrderId.has(id));
          if (orderIdsWithoutItems.length > 0) {
            const soiItems = await this.customerRepository.query(
              `SELECT soi.sales_order_id as order_id, COALESCE(soi.custom_product_name, soi.product_name, 'Product') as product_name, soi.quantity, soi.unit_price
               FROM sales_order_items soi
               WHERE soi.sales_order_id = ANY($1)
               ORDER BY soi.id`,
              [orderIdsWithoutItems],
            );
            for (const item of soiItems) {
              const oid = Number(item.order_id);
              if (!itemsByOrderId.has(oid)) itemsByOrderId.set(oid, []);
              itemsByOrderId.get(oid)!.push({
                productName: item.product_name,
                quantity: Number(item.quantity) || 1,
                unitPrice: parseFloat(item.unit_price || '0'),
                source: null,
              });
            }
          }
        }

        // Build the orders map with items
        ordersByCustomer.forEach((orders, cid) => {
          customerOrdersMap.set(cid, orders.map(o => ({
            id: o.id,
            salesOrderNumber: o.sales_order_number,
            totalAmount: parseFloat(o.total_amount || '0'),
            status: o.status,
            orderDate: o.order_date || o.created_at,
            items: itemsByOrderId.get(o.id) || [],
          })));
        });
      } catch (err) {
        // If order enrichment fails, continue without it
        console.error('Failed to enrich leads with order items:', err);
      }
    }

    const enrichedData = data.map(c => ({
      ...c,
      assigned_to_name: c.assigned_to ? (agentMap.get(c.assigned_to) || `Agent #${c.assigned_to}`) : null,
      first_order_date: orderDateMap.get(c.id) || null,
      order_count: orderCountMap.get(c.id) || 0,
      tier: tierMap.get(c.id) || null,
      orders: customerOrdersMap.get(c.id) || [],
    }));

    return { data: enrichedData, total };
  }

  // ==================== DATE-WISE CUSTOMER REPORT ====================
  async getDateWiseCustomerReport(
    teamLeaderId: number,
    query: { from?: string; to?: string },
  ): Promise<{
    summary: { totalCustomers: number; totalOrders: number; totalRevenue: number };
    dateWise: Array<{
      date: string;
      newCustomers: number;
      totalOrders: number;
      revenue: number;
      customers: Array<{
        id: number;
        name: string;
        phone: string;
        email: string;
        orderCount: number;
        totalSpent: number;
        assignedTo: string | null;
        priority: string | null;
      }>;
    }>;
  }> {
    // Default to last 7 days if no range specified
    const toDate = query.to ? new Date(query.to) : new Date();
    toDate.setHours(23, 59, 59, 999);
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);

    // Get customers created within the date range that this TL can see
    const customersQb = this.customerRepository.createQueryBuilder('c');
    customersQb.where('c.is_deleted = false');
    customersQb.andWhere('c.is_active = true');
    customersQb.andWhere(
      'c.assigned_supervisor_id = :tl',
      { tl: teamLeaderId },
    );
    customersQb.andWhere('c.created_at >= :fromDate', { fromDate });
    customersQb.andWhere('c.created_at <= :toDate', { toDate });
    customersQb.orderBy('c.created_at', 'DESC');

    const customers = await customersQb.getMany();

    // Get order stats for all these customers in a single query
    const customerIds = customers.map((c) => c.id);
    let orderStatsMap = new Map<number, { orderCount: number; totalSpent: number }>();

    if (customerIds.length > 0) {
      const orderStats = await this.customerRepository.query(
        `
        SELECT
          so.customer_id,
          COUNT(DISTINCT so.id)::int AS order_count,
          COALESCE(SUM(so.total_amount), 0)::numeric AS total_spent
        FROM sales_orders so
        WHERE so.customer_id = ANY($1)
        GROUP BY so.customer_id
        `,
        [customerIds],
      );
      for (const row of orderStats) {
        orderStatsMap.set(Number(row.customer_id), {
          orderCount: Number(row.order_count || 0),
          totalSpent: Number(row.total_spent || 0),
        });
      }
    }

    // Get agent names for enrichment
    const agentIds = Array.from(
      new Set(customers.map((c) => c.assigned_to).filter((id) => id != null)),
    );
    const agentMap = new Map<number, string>();
    if (agentIds.length > 0) {
      const agents = await this.usersRepository.findByIds(agentIds);
      agents.forEach((agent) => {
        const fullName =
          [agent.name, agent.lastName].filter(Boolean).join(' ').trim() ||
          `Agent #${agent.id}`;
        agentMap.set(agent.id, fullName);
      });
    }

    // Group customers by date (created_at date)
    const dateMap = new Map<
      string,
      {
        newCustomers: number;
        totalOrders: number;
        revenue: number;
        customers: any[];
      }
    >();

    let summaryTotalCustomers = 0;
    let summaryTotalOrders = 0;
    let summaryTotalRevenue = 0;

    for (const customer of customers) {
      const dateKey = new Date(customer.createdAt).toISOString().split('T')[0];
      const stats = orderStatsMap.get(customer.id) || { orderCount: 0, totalSpent: 0 };

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { newCustomers: 0, totalOrders: 0, revenue: 0, customers: [] });
      }

      const entry = dateMap.get(dateKey)!;
      entry.newCustomers++;
      entry.totalOrders += stats.orderCount;
      entry.revenue += stats.totalSpent;
      entry.customers.push({
        id: customer.id,
        name: [customer.name, customer.lastName].filter(Boolean).join(' ').trim() || 'N/A',
        phone: customer.phone || '',
        email: customer.email || '',
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        assignedTo: customer.assigned_to
          ? agentMap.get(customer.assigned_to) || `Agent #${customer.assigned_to}`
          : null,
        priority: customer.priority || null,
      });

      summaryTotalCustomers++;
      summaryTotalOrders += stats.orderCount;
      summaryTotalRevenue += stats.totalSpent;
    }

    // Sort dates descending
    const dateWise = Array.from(dateMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => ({ date, ...data }));

    return {
      summary: {
        totalCustomers: summaryTotalCustomers,
        totalOrders: summaryTotalOrders,
        totalRevenue: summaryTotalRevenue,
      },
      dateWise,
    };
  }

  // Bulk assign leads to an agent
  async bulkAssignLeads(
    customerIds: (number | string)[], 
    agentId: number, 
    teamLeaderId: number
  ): Promise<{ success: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let success = 0;
    let failed = 0;

    for (const customerId of customerIds) {
      try {
        await this.assignLeadToAgent(String(customerId), agentId, teamLeaderId);
        results.push({ customerId, status: 'success' });
        success++;
      } catch (error: any) {
        results.push({ customerId, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { success, failed, results };
  }

  // Unassign a single lead from its agent (NOT from the team leader)
  async unassignLead(customerId: string, teamLeaderId: number): Promise<Customer> {
    const customerIdNum = Number(customerId);
    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // Allow unassign if:
    // 1. This TL was directly assigned the lead by the Sales Manager, OR
    // 2. The lead is currently assigned to an agent who belongs to this TL's team
    const supervisorMatch = Number(customer.assigned_supervisor_id) === Number(teamLeaderId);

    let agentMatch = false;
    if (!supervisorMatch && customer.assigned_to) {
      const agent = await this.usersRepository.findOne({
        where: { id: customer.assigned_to },
        select: ['id', 'teamLeaderId'],
      });
      agentMatch = !!agent && Number(agent.teamLeaderId) === Number(teamLeaderId);
    }

    if (!supervisorMatch && !agentMatch) {
      throw new ForbiddenException(
        `You do not have permission to unassign lead #${customerId}.`,
      );
    }

    console.log(`[UNASSIGN] BEFORE — customer #${customerIdNum}: assigned_to=${customer.assigned_to}, assigned_supervisor_id=${customer.assigned_supervisor_id}`);

    // Raw SQL: clear the agent AND guarantee assigned_supervisor_id = this TL.
    // This covers the case where assigned_supervisor_id was never set (the lead
    // was visible only because the agent was under this TL). After clearing
    // assigned_to, the lead MUST remain visible to the TL.
    await this.customerRepository.query(
      `UPDATE customers
         SET assigned_to = NULL,
             assigned_supervisor_id = $2,
             updated_at = NOW()
       WHERE id = $1`,
      [customerIdNum, teamLeaderId],
    );

    const updated = (await this.customerRepository.findOne({ where: { id: customerIdNum } })) as Customer;
    console.log(`[UNASSIGN] AFTER  — customer #${customerIdNum}: assigned_to=${updated.assigned_to}, assigned_supervisor_id=${updated.assigned_supervisor_id}`);

    return updated;
  }

  // Bulk unassign leads from their agents
  async bulkUnassignLeads(
    customerIds: (number | string)[],
    teamLeaderId: number,
  ): Promise<{ success: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let success = 0;
    let failed = 0;

    for (const customerId of customerIds) {
      try {
        await this.unassignLead(String(customerId), teamLeaderId);
        results.push({ customerId, status: 'success' });
        success++;
      } catch (error: any) {
        results.push({ customerId, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { success, failed, results };
  }

  // Search agents by name for autocomplete
  async searchAgents(teamLeaderId: number, searchTerm: string): Promise<User[]> {
    const salesExecRole = await this.usersRepository.manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('roles', 'r')
      .where("r.name = :name OR r.slug = :slug OR LOWER(r.name) LIKE :pattern", {
        name: 'Sales Executive',
        slug: 'sales-executive',
        pattern: '%sales executive%',
      })
      .getRawOne();

    if (!salesExecRole) {
      return [];
    }

    const qb = this.usersRepository.createQueryBuilder('u');
    // Include Sales Executives OR the team leader themselves (for self-assignment)
    qb.where('(u.role_id = :roleId OR u.id = :teamLeaderId)', { roleId: salesExecRole.id, teamLeaderId });
    qb.andWhere('u.is_deleted = false');

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.name) LIKE :term OR LOWER(u.last_name) LIKE :term OR CAST(u.id AS TEXT) LIKE :term)',
        { term }
      );
    }

    qb.select(['u.id', 'u.name', 'u.lastName', 'u.email', 'u.phone', 'u.teamId', 'u.status']);
    qb.limit(20);
    qb.orderBy('u.name', 'ASC');

    return await qb.getMany();
  }

  async convertLeadToCustomer(
    customerId: string, 
    actorUserId: number,
    options?: { customerType?: string }
  ): Promise<Customer> {
    const customerIdNum = Number(customerId);
    if (!Number.isFinite(customerIdNum)) {
      throw new NotFoundException('Customer not found');
    }

    const customer = await this.customerRepository.findOne({ where: { id: customerIdNum } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    if (String((customer as any).lifecycleStage || '').toLowerCase() !== 'lead') {
      // Idempotent: already converted (or was never a lead)
      return customer;
    }

    (customer as any).lifecycleStage = 'customer';
    if (!(customer as any).status) (customer as any).status = 'active';
    (customer as any).isActive = true;
    (customer as any).updatedAt = new Date();
    
    // Update customer type if provided
    if (options?.customerType) {
      (customer as any).customerType = options.customerType;
    }

    const saved = await this.customerRepository.save(customer);

    // Best-effort audit log in activities
    try {
      const activity = this.activityRepo.create({
        type: 'lead_converted',
        customerId: (saved as any).id,
        userId: actorUserId,
        subject: 'Lead converted to customer',
        description: `Lead lifecycle_stage changed to 'customer'${options?.customerType ? ` with type '${options.customerType}'` : ''} by user ${actorUserId}.`,
        outcome: 'converted',
        completedAt: new Date(),
        metadata: {
          from: 'lead',
          to: 'customer',
          customerType: options?.customerType || null,
          actorUserId,
        },
      } as any);

      await this.activityRepo.save(activity as any);
    } catch {
      // never block conversion if logging fails
    }

    return saved;
  }

  async getAgentCustomers(agentId: number, query: any = {}): Promise<{ data: Customer[], total: number }> {
    const { page = 1, limit = 20, search, priority, stage, customerType, productName, calledStatus, outcome, startDate, endDate, followUpDate } = query;
    const skip = (page - 1) * limit;

    // Use query builder for complex filtering
    const qb = this.customerRepository.createQueryBuilder('c')
      .where('c.assigned_to = :agentId', { agentId })
      .andWhere('c.is_deleted = false')
      .andWhere('c.is_active = true');

    // Exclude rejected customers
    qb.andWhere(`NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')`);

    // Search filter (name, email, phone, product_suggestion)
    if (search && search.trim()) {
      const normalizedPhone = `%${search.trim().replace(/^\+88/, '')}%`;
      qb.andWhere(
        `(LOWER(c.name) LIKE LOWER(:search) OR LOWER(c.last_name) LIKE LOWER(:search) OR LOWER(c.email) LIKE LOWER(:search) OR c.phone LIKE :search OR REPLACE(c.phone, '+88', '') LIKE :normalizedPhone OR EXISTS (
          SELECT 1 FROM customer_engagement_history seh
          WHERE seh.customer_id = CAST(c.id AS TEXT)
          AND seh.engagement_type = 'call'
          AND LOWER(seh.metadata->>'product_suggestion') LIKE LOWER(:search)
        ))`,
        { search: `%${search.trim()}%`, normalizedPhone }
      );
    }

    // Priority filter
    if (priority && priority !== 'all') {
      qb.andWhere('c.priority = :priority', { priority });
    }

    // Stage/Lifecycle filter
    if (stage && stage !== 'all') {
      qb.andWhere('c.lifecycle_stage = :stage', { stage });
    }

    // Customer tier/type filter
    if (customerType && customerType !== 'all') {
      qb.andWhere('c.customer_type = :customerType', { customerType });
    }

    // Product-wise filter: customers who ordered the selected product
    if (productName && String(productName).trim()) {
      const pName = `%${String(productName).trim().toLowerCase()}%`;
      qb.andWhere(
        `c.id IN (
          SELECT so.customer_id FROM sales_orders so
          WHERE so.id IN (
            SELECT oi.order_id FROM order_items oi WHERE oi.product_name ILIKE :pName
            UNION
            SELECT oi2.order_id FROM order_items oi2 JOIN products p ON p.id = oi2.product_id WHERE p.name_en ILIKE :pName OR p.name_bn ILIKE :pName
            UNION
            SELECT soi.sales_order_id FROM sales_order_items soi WHERE soi.product_name ILIKE :pName
            UNION
            SELECT soi2.sales_order_id FROM sales_order_items soi2 JOIN products p2 ON p2.id = soi2.product_id WHERE p2.name_en ILIKE :pName OR p2.name_bn ILIKE :pName
          )
        )`,
        { pName },
      );
    }

    // Follow-up date filters
    if (followUpDate) {
      // Filter for a specific follow-up date (today only mode)
      const targetDate = new Date(followUpDate);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      qb.andWhere('c.next_follow_up >= :targetDate AND c.next_follow_up < :nextDay', { targetDate, nextDay });
    } else {
      // Filter by date range
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        qb.andWhere('c.next_follow_up >= :startDate', { startDate: start });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        qb.andWhere('c.next_follow_up <= :endDate', { endDate: end });
      }
    }

    // Called Status filter - based on last_contact_date being today
    if (calledStatus && calledStatus !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (calledStatus === 'called') {
        // Called today: last_contact_date is today
        qb.andWhere('c.last_contact_date >= :today AND c.last_contact_date < :tomorrow', { today, tomorrow });
      } else if (calledStatus === 'not_called') {
        // Not called today: last_contact_date is null or before today
        qb.andWhere('(c.last_contact_date IS NULL OR c.last_contact_date < :today)', { today });
      }
    }

    // Outcome filter - check latest engagement metadata
    if (outcome && outcome !== 'all') {
      // Subquery to find customers with matching outcome in their latest engagement
      qb.andWhere(`EXISTS (
        SELECT 1 FROM customer_engagement_history eh 
        WHERE eh.customer_id = CAST(c.id AS TEXT) 
        AND eh.engagement_type = 'call'
        AND eh.metadata->>'outcome' = :outcome
        AND eh.created_at = (
          SELECT MAX(eh2.created_at) 
          FROM customer_engagement_history eh2 
          WHERE eh2.customer_id = CAST(c.id AS TEXT) 
          AND eh2.engagement_type = 'call'
          AND eh2.metadata->>'outcome' IS NOT NULL
        )
      )`, { outcome });
    }

    // Order by assignment date desc, falling back to created_at.
    // Use a correlated subquery so TypeORM doesn't try to resolve a raw-table alias.
    qb.orderBy(
      `(SELECT MAX(ta2.assigned_at) FROM team_assignments ta2 WHERE ta2.customer_id = c.id AND ta2.assigned_to_id = c.assigned_to)`,
      'DESC',
      'NULLS LAST',
    ).addOrderBy('c.created_at', 'DESC');

    // Get total count before pagination
    const total = await qb.getCount();

    // Apply pagination
    qb.skip(skip).take(limit);

    const data = await qb.getMany();

    // Enrich with last outcome and last notes from engagement history
    if (data.length > 0) {
      const customerIds = data.map(c => String(c.id));
      
      // Get latest engagement for each customer
      const latestEngagements = await this.engagementRepository
        .createQueryBuilder('eh')
        .where('eh.customer_id IN (:...customerIds)', { customerIds })
        .andWhere('eh.engagement_type = :type', { type: 'call' })
        .orderBy('eh.created_at', 'DESC')
        .getMany();

      // Create a map of customer_id -> latest engagement
      const engagementMap = new Map<string, any>();
      for (const eng of latestEngagements) {
        if (!engagementMap.has(eng.customer_id)) {
          engagementMap.set(eng.customer_id, eng);
        }
      }

      // Attach lastOutcome, lastNotes, and lastProductSuggestion to each customer
      for (const customer of data) {
        const eng = engagementMap.get(String(customer.id));
        if (eng) {
          (customer as any).lastOutcome = eng.metadata?.outcome || null;
          (customer as any).lastNotes = eng.message_content || null;
          (customer as any).lastProductSuggestion = eng.metadata?.product_suggestion || null;
        }
      }
    }

    // Enrich with tier from customer_tiers
    if (data.length > 0) {
      const ids = data.map(c => c.id);
      const tierRows = await this.customerTierRepo.query(
        `SELECT customer_id, tier FROM customer_tiers WHERE customer_id = ANY($1) AND is_active = true`,
        [ids],
      );
      const tierMap = new Map<number, string>();
      for (const r of tierRows) {
        tierMap.set(r.customer_id, r.tier);
      }
      for (const customer of data) {
        (customer as any).tier = tierMap.get(customer.id as number) || null;
      }
    }

    return { data, total };
  }

  async getAgentCustomersForRequester(
    requester: { id: number; roleSlug?: string | null },
    agentId: number,
    query: any = {},
  ): Promise<{ data: Customer[]; total: number }> {
    if (!requester?.id || !Number.isFinite(Number(requester.id))) {
      throw new ForbiddenException('Invalid requester');
    }
    if (!agentId || !Number.isFinite(Number(agentId))) {
      throw new NotFoundException('Agent not found');
    }

    // Agent can always view their own assigned customers.
    if (Number(requester.id) === Number(agentId)) {
      return this.getAgentCustomers(agentId, query);
    }

    const roleSlug = String(requester.roleSlug || '').toLowerCase();
    const isAdmin = roleSlug === 'admin' || roleSlug === 'super-admin';
    if (isAdmin) {
      return this.getAgentCustomers(agentId, query);
    }

    // Team leader can view customers of agents under them.
    const agent = await this.usersRepository.findOne({
      where: { id: agentId, isDeleted: false } as any,
      select: ['id', 'teamLeaderId', 'status', 'isDeleted'] as any,
    });

    if (!agent || (agent as any).isDeleted) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.teamLeaderId && Number(agent.teamLeaderId) === Number(requester.id)) {
      return this.getAgentCustomers(agentId, query);
    }

    throw new ForbiddenException('You are not allowed to view this agent\'s customers');
  }

  async getTeamPerformance(teamLeaderId: number, preloadedCustomers?: Customer[]): Promise<any> {
    const customers = preloadedCustomers ?? await this.getLeaderCustomers(teamLeaderId);

    const totalLeads = customers.length;
    const assignedLeads = customers.filter(c => c.assigned_to !== null && c.assigned_to !== undefined).length;
    const unassignedLeads = totalLeads - assignedLeads;
    const convertedLeads = customers.filter(c => c.lifecycleStage === 'customer').length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100 * 100) / 100 : 0;

    // Build per-team rows matching frontend shape
    const salesTeams = await this.salesTeamRepository.find({ where: { teamLeaderId } });
    const teams: any[] = [];
    let totalMembers = 0;

    for (const team of salesTeams) {
      const members = await this.usersRepository.find({
        where: { teamId: team.id, status: 'active' as any },
        select: ['id', 'name', 'lastName', 'email', 'agentTier'],
      });
      const memberCount = members.length;
      totalMembers += memberCount;

      let teamTotalLeads = 0;
      let teamConverted = 0;
      const memberRows: any[] = [];

      for (const m of members) {
        const mCustomers = customers.filter(c => c.assigned_to === m.id);
        const mConverted = mCustomers.filter(c => c.lifecycleStage === 'customer').length;
        teamTotalLeads += mCustomers.length;
        teamConverted += mConverted;
        memberRows.push({
          id: m.id,
          name: `${m.name} ${m.lastName || ''}`.trim(),
          email: m.email,
          agentTier: m.agentTier || 'silver',
          assignedLeads: mCustomers.length,
          convertedLeads: mConverted,
        });
      }

      teams.push({
        teamId: team.id,
        teamName: team.name,
        teamCode: team.code || null,
        memberCount,
        totalLeads: teamTotalLeads,
        convertedLeads: teamConverted,
        conversionRate: teamTotalLeads > 0 ? Math.round((teamConverted / teamTotalLeads) * 100 * 100) / 100 : 0,
        members: memberRows,
      });
    }

    return {
      totalTeams: salesTeams.length,
      totalMembers,
      totalLeads,
      assignedLeads,
      unassignedLeads,
      conversionRate,
      teams,
    };
  }

  async getMissedFollowups(teamLeaderId: number): Promise<any[]> {
    const today = new Date();
    const customers = await this.getLeaderCustomers(teamLeaderId);

    // Filter customers with next_follow_up in the past
    const missedFollowups = customers
      .filter(c => c.next_follow_up && new Date(c.next_follow_up) < today)
      .map(c => {
        const followUpDate = new Date(c.next_follow_up);
        const daysOverdue = Math.floor((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          customer_id: c.id,
          customer_name: c.name || 'N/A',
          email: c.email,
          phone: c.phone,
          last_contact_date: c.last_contact_date
            ? new Date(c.last_contact_date).toLocaleDateString()
            : 'Never',
          next_follow_up: followUpDate.toLocaleDateString(),
          days_overdue: daysOverdue,
          priority: c.priority,
          assigned_to: c.assigned_to,
        };
      })
      .sort((a, b) => b.days_overdue - a.days_overdue);

    return missedFollowups;
  }

  async getEscalatedCustomers(teamLeaderId: number): Promise<Customer[]> {
    // Get customers marked for escalation
    return await this.customerRepository.find({
      where: { is_escalated: true, is_deleted: false, isActive: true },
      order: { escalated_at: 'DESC' }
    });
  }

  // ==================== ANALYTICS ====================
  async getTeamLeaderDashboard(teamLeaderId: number): Promise<any> {
    // Check cache first
    const cached = this.dashboardCache.get(teamLeaderId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const result = await this.buildTeamLeaderDashboard(teamLeaderId);

    // Store in cache
    this.dashboardCache.set(teamLeaderId, {
      data: result,
      expiresAt: Date.now() + CrmTeamService.DASHBOARD_CACHE_TTL_MS,
    });

    return result;
  }

  /** Invalidate dashboard cache for a specific TL (call after config updates, etc.) */
  invalidateDashboardCache(teamLeaderId?: number): void {
    if (teamLeaderId) {
      this.dashboardCache.delete(teamLeaderId);
    } else {
      this.dashboardCache.clear();
    }
  }

  private async buildTeamLeaderDashboard(teamLeaderId: number): Promise<any> {
    const today = this.getDateString();
    const customers = await this.getLeaderCustomers(teamLeaderId);
    const segments = await this.computeSegmentsForCustomers(customers);

    const purchaseStageCounts: Record<string, number> = {
      new: 0,
      repeat_2: 0,
      repeat_3: 0,
      regular: 0,
      permanent: 0,
    };
    const valueStageCounts: Record<string, number> = { normal: 0, medium: 0, vip: 0 };
    let repeatCustomers = 0;
    let vipPermanent = 0;
    let vipPermanentActive30 = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    for (const s of segments) {
      purchaseStageCounts[s.purchaseStage] = (purchaseStageCounts[s.purchaseStage] || 0) + 1;
      valueStageCounts[s.valueStage] = (valueStageCounts[s.valueStage] || 0) + 1;
      if (s.orderCount >= 2) repeatCustomers += 1;
      const isVipOrPermanent = s.valueStage === 'vip' || s.purchaseStage === 'permanent';
      if (isVipOrPermanent) {
        vipPermanent += 1;
        if (s.lastOrderDate && s.lastOrderDate >= thirtyDaysAgoStr) {
          vipPermanentActive30 += 1;
        }
      }
    }

    const tasksToday = await this.callTaskRepo.query(
      `
      SELECT
        assigned_agent_id,
        status,
        COUNT(*)::int AS cnt
      FROM crm_call_tasks
      WHERE task_date = $1
      GROUP BY assigned_agent_id, status
      `,
      [today],
    );

    const tasksPendingPrev = await this.callTaskRepo.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM crm_call_tasks
      WHERE task_date < $1 AND status = 'pending'
      `,
      [today],
    );

    const agentPerformance = await this.callTaskRepo.query(
      `
      SELECT
        ct.assigned_agent_id AS agent_id,
        COALESCE(u.name || ' ' || COALESCE(u.last_name, ''), 'Agent #' || ct.assigned_agent_id::text) AS agent_name,
        COUNT(*) FILTER (WHERE ct.task_date = $1)::int AS total_today,
        COUNT(*) FILTER (WHERE ct.task_date = $1 AND ct.status = 'completed')::int AS completed_today,
        COUNT(*) FILTER (WHERE ct.task_date = $1 AND ct.status = 'failed')::int AS failed_today
      FROM crm_call_tasks ct
      LEFT JOIN users u ON u.id = ct.assigned_agent_id
      WHERE ct.task_date = $1
      GROUP BY ct.assigned_agent_id, u.name, u.last_name
      ORDER BY total_today DESC
      `,
      [today],
    );

    const repeatRate = customers.length > 0 ? Number(((repeatCustomers / customers.length) * 100).toFixed(2)) : 0;
    const vipRetention30 = vipPermanent > 0 ? Number(((vipPermanentActive30 / vipPermanent) * 100).toFixed(2)) : 0;

    // Tier stats — counts from customer_tiers table scoped to TL's customers
    const customerIds = customers.map(c => c.id);
    let tierStats = { new: 0, repeat: 0, silver: 0, gold: 0, platinum: 0, vip: 0, blacklist: 0, rejected: 0, no_tier: customers.length };
    if (customerIds.length > 0) {
      const tierRows = await this.customerTierRepo.query(
        `SELECT
           COALESCE(ct.tier, 'no_tier') AS tier,
           COUNT(*)::int AS count
         FROM unnest($1::int[]) AS cid(id)
         LEFT JOIN customer_tiers ct ON ct.customer_id = cid.id AND ct.is_active = true
         GROUP BY ct.tier
         ORDER BY count DESC`,
        [customerIds],
      );
      tierStats = { new: 0, repeat: 0, silver: 0, gold: 0, platinum: 0, vip: 0, blacklist: 0, rejected: 0, no_tier: 0 };
      for (const row of tierRows) {
        const key = row.tier === null ? 'no_tier' : row.tier;
        if (key in tierStats) {
          (tierStats as any)[key] = Number(row.count);
        } else {
          tierStats.no_tier += Number(row.count);
        }
      }
    }

    // Assigned agents — all users under this TL with their lead stats
    const agentUsers = await this.usersRepository.find({
      where: { teamLeaderId, status: 'active' as any },
      select: ['id', 'name', 'lastName', 'email', 'agentTier', 'phone'],
    });
    const assignedAgents = agentUsers.map(a => {
      const aCustomers = customers.filter(c => c.assigned_to === a.id);
      const aConverted = aCustomers.filter(c => c.lifecycleStage === 'customer').length;
      // Merge today's call stats from agentPerformance
      const callRow = agentPerformance.find((r: any) => r.agent_id === a.id);
      return {
        id: a.id,
        name: `${a.name} ${a.lastName || ''}`.trim(),
        email: a.email,
        phone: a.phone || null,
        agentTier: a.agentTier || 'silver',
        assignedLeads: aCustomers.length,
        convertedLeads: aConverted,
        conversionRate: aCustomers.length > 0 ? Math.round((aConverted / aCustomers.length) * 100 * 100) / 100 : 0,
        callsToday: Number(callRow?.total_today ?? 0),
        callsCompleted: Number(callRow?.completed_today ?? 0),
        callsFailed: Number(callRow?.failed_today ?? 0),
      };
    });

    return {
      overview: {
        totalCustomers: customers.length,
        repeatRate,
        vipRetention30,
        pendingFromPreviousDays: Number(tasksPendingPrev?.[0]?.cnt || 0),
      },
      tierStats,
      segmentation: {
        purchaseStageCounts,
        valueStageCounts,
      },
      assignedAgents,
      agentWiseCalls: agentPerformance,
      tasksTodayByStatus: tasksToday,
      teamPerformance: await this.getTeamPerformance(teamLeaderId, customers),
      recentEscalations: await this.getEscalatedCustomers(teamLeaderId),
      scripts: DEFAULT_SCRIPTS,
      trainingRolePlays: DEFAULT_TRAINING_ROLE_PLAYS,
    };
  }

  async generateDailyAutoCalls(teamLeaderId: number, options?: {
    date?: string;
    perAgentLimit?: number;
    reminderQuota?: number;
    offerQuota?: number;
    followupQuota?: number;
  }) {
    const date = this.getDateString(options?.date);
    const perAgentLimit = options?.perAgentLimit ?? 200;
    const reminderQuota = options?.reminderQuota ?? 120;
    const offerQuota = options?.offerQuota ?? 50;
    const followupQuota = options?.followupQuota ?? 30;

    const customers = await this.getLeaderCustomers(teamLeaderId);
    const segments = await this.computeSegmentsForCustomers(customers);

    const agentsByCode = await this.getLeaderAgentsByTeamCode(teamLeaderId);

    // Precompute existing task counts for date per agent
    const existingCounts = await this.callTaskRepo.query(
      `
      SELECT assigned_agent_id AS agent_id, COUNT(*)::int AS cnt
      FROM crm_call_tasks
      WHERE task_date = $1
      GROUP BY assigned_agent_id
      `,
      [date],
    );
    const existingByAgent = new Map<number, number>();
    for (const r of existingCounts) {
      if (r.agent_id != null) existingByAgent.set(Number(r.agent_id), Number(r.cnt || 0));
    }

    // Build candidate lists per team bucket
    type Candidate = {
      phone: string;
      customerName: string | null;
      purchaseStage: string;
      valueStage: string;
      orderCount: number;
      totalSpent: number;
      lastOrderDate: string | null;
    };

    const byTeam: Record<string, Candidate[]> = { A: [], B: [], C: [], D: [], E: [] };
    for (const s of segments) {
      const code = this.mapSegmentToTeamCode({ purchaseStage: s.purchaseStage, valueStage: s.valueStage });
      byTeam[code].push({
        phone: String(s.customer.phone),
        customerName: s.customer.name || null,
        purchaseStage: s.purchaseStage,
        valueStage: s.valueStage,
        orderCount: s.orderCount,
        totalSpent: s.totalSpent,
        lastOrderDate: s.lastOrderDate,
      });
    }

    // Sort by priority within each bucket
    const sortFn = (a: Candidate, b: Candidate) => {
      // VIP/permanent first, then higher spend, then older last order
      const aScore = (a.valueStage === 'vip' ? 1000000 : 0) + (a.purchaseStage === 'permanent' ? 500000 : 0) + a.totalSpent;
      const bScore = (b.valueStage === 'vip' ? 1000000 : 0) + (b.purchaseStage === 'permanent' ? 500000 : 0) + b.totalSpent;
      if (bScore !== aScore) return bScore - aScore;
      const aDate = a.lastOrderDate || '0000-00-00';
      const bDate = b.lastOrderDate || '0000-00-00';
      return aDate.localeCompare(bDate);
    };
    (['A', 'B', 'C', 'D', 'E'] as const).forEach((k) => byTeam[k].sort(sortFn));

    const createdTasks: any[] = [];

    const inactiveThresholdDays = 30;
    const inactiveDate = new Date(date);
    inactiveDate.setDate(inactiveDate.getDate() - inactiveThresholdDays);
    const inactiveCutoff = inactiveDate.toISOString().split('T')[0];

    const createTasksForAgent = async (agentId: number, teamCode: string) => {
      const already = existingByAgent.get(agentId) ?? 0;
      const remaining = Math.max(0, perAgentLimit - already);
      if (remaining === 0) return;

      const capReminder = Math.min(reminderQuota, remaining);
      const capOffer = Math.min(offerQuota, Math.max(0, remaining - capReminder));
      const capFollow = Math.min(followupQuota, Math.max(0, remaining - capReminder - capOffer));

      const candidates = byTeam[teamCode] || [];

      // Simple bucket picking based on order recency.
      const reminderCandidates = candidates.filter((c) => c.orderCount >= 2);
      const offerCandidates = candidates.filter((c) => c.orderCount >= 3);
      const winbackCandidates = candidates
        .filter((c) => c.orderCount >= 1 && c.lastOrderDate && c.lastOrderDate < inactiveCutoff)
        .sort((a, b) => (a.lastOrderDate || '').localeCompare(b.lastOrderDate || ''));
      const followupCandidates = candidates;

      const pickAndCreate = async (list: Candidate[], limit: number, reason: string, priority: TaskPriority) => {
        let picked = 0;
        while (picked < limit && list.length > 0) {
          const c = list.shift()!;
          // Idempotency: skip if a task already exists today for same customer+reason
          const exists = await this.callTaskRepo.query(
            `
            SELECT 1
            FROM crm_call_tasks
            WHERE task_date = $1 AND customer_id = $2 AND call_reason = $3
            LIMIT 1
            `,
            [date, c.phone, reason],
          );
          if (Array.isArray(exists) && exists.length > 0) continue;

          const notes = `Segment: ${c.purchaseStage}+${c.valueStage}. Orders: ${c.orderCount}. Last order: ${c.lastOrderDate ?? 'N/A'}.`;

          const task = this.callTaskRepo.create({
            customer_id: c.phone,
            assigned_agent_id: agentId,
            task_date: date as any,
            priority,
            call_reason: reason,
            status: TaskStatus.PENDING,
            notes,
          });
          const saved = await this.callTaskRepo.save(task);
          createdTasks.push(saved);
          picked += 1;
        }
      };

      await pickAndCreate(reminderCandidates, capReminder, 'Product Reminder', TaskPriority.WARM);
      await pickAndCreate(offerCandidates, capOffer, 'Offer / Cross-sell', TaskPriority.COLD);
      // Win-back is a special follow-up case: prioritize inactive customers within follow-up quota.
      const winbackCap = Math.min(capFollow, 15);
      await pickAndCreate(winbackCandidates, winbackCap, 'Win-back', TaskPriority.HOT);
      await pickAndCreate(followupCandidates, Math.max(0, capFollow - winbackCap), 'Follow-up / Support', TaskPriority.HOT);
    };

    // Round-robin across agents in each team code
    for (const code of ['A', 'B', 'C', 'D', 'E'] as const) {
      const agentIds = agentsByCode[code] || [];
      for (const agentId of agentIds) {
        // eslint-disable-next-line no-await-in-loop
        await createTasksForAgent(agentId, code);
      }
    }

    return {
      date,
      perAgentLimit,
      quotas: { reminderQuota, offerQuota, followupQuota },
      createdCount: createdTasks.length,
      createdTasks,
    };
  }

  // ==================== TEAM MANAGEMENT ====================

  private readonly DEFAULT_TEAM_CODES = ['A', 'B', 'C', 'D', 'E'] as const;

  private async ensureDefaultTeamsForLeader(teamLeaderId: number): Promise<void> {
    if (!Number.isFinite(teamLeaderId)) return;

    const existing = await this.salesTeamRepository.find({ where: { teamLeaderId } });
    const byCode = new Map<string, SalesTeam>();
    for (const t of existing) {
      const code = String(t.code || '').trim().toUpperCase();
      if (code) byCode.set(code, t);
    }

    const toCreate: Array<{ name: string; code: string }> = [];
    for (const code of this.DEFAULT_TEAM_CODES) {
      if (!byCode.has(code)) {
        toCreate.push({ code, name: `Team ${code}` });
      }
    }

    if (!toCreate.length) return;
    await this.salesTeamRepository.save(
      toCreate.map((t) =>
        this.salesTeamRepository.create({
          name: t.name,
          code: t.code,
          teamLeaderId,
        }),
      ),
    );
  }

  async getTeamsForLeader(teamLeaderId: number): Promise<any[]> {
    await this.ensureDefaultTeamsForLeader(teamLeaderId);
    let teams = await this.salesTeamRepository.find({ where: { teamLeaderId } });

    // If user is not a team leader, return all teams so they can still assign leads
    if (teams.length === 0) {
      teams = await this.salesTeamRepository.find();
    }

    const order = new Map<string, number>(this.DEFAULT_TEAM_CODES.map((c, idx) => [c, idx]));
    teams.sort((a, b) => {
      const ac = String(a.code || '').toUpperCase();
      const bc = String(b.code || '').toUpperCase();
      const ai = order.has(ac) ? (order.get(ac) as number) : 999;
      const bi = order.has(bc) ? (order.get(bc) as number) : 999;
      if (ai !== bi) return ai - bi;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const result: any[] = [];
    for (const team of teams) {
      const members = await this.usersRepository.find({ where: { teamId: team.id } });
      result.push({
        id: team.id,
        name: team.name,
        code: team.code,
        memberCount: members.length,
      });
    }

    return result;
  }

  async createTeam(teamLeaderId: number, data: { name: string; code?: string }): Promise<SalesTeam> {
    const trimmedCode = String(data.code || '').trim();
    const normalizedCode = trimmedCode ? trimmedCode.toUpperCase() : '';
    if (normalizedCode) {
      const existing = await this.salesTeamRepository.findOne({
        where: { teamLeaderId, code: normalizedCode },
      });
      if (existing) {
        throw new BadRequestException(`Team code \"${normalizedCode}\" already exists`);
      }
    }

    const team = this.salesTeamRepository.create({
      name: data.name,
      code: normalizedCode || null,
      teamLeaderId,
    });
    return this.salesTeamRepository.save(team);
  }

  async updateTeam(
    teamLeaderId: number,
    teamId: number,
    data: { name?: string; code?: string | null },
  ): Promise<SalesTeam> {
    if (!Number.isFinite(teamId)) {
      throw new NotFoundException('Team not found');
    }

    const team = await this.salesTeamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You are not the leader of this team');
    }

    if (typeof data.name === 'string') {
      const name = data.name.trim();
      if (!name) throw new NotFoundException('Team name is required');
      team.name = name;
    }

    if (data.code !== undefined) {
      const code = data.code === null ? null : String(data.code).trim();
      team.code = code ? code.toUpperCase() : null;
    }

    return this.salesTeamRepository.save(team);
  }

  async deleteTeam(teamLeaderId: number, teamId: number): Promise<{ success: true }> {
    if (!Number.isFinite(teamId)) {
      throw new NotFoundException('Team not found');
    }

    const team = await this.salesTeamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You are not the leader of this team');
    }

    // Unassign any users from this team first (prevents FK issues and avoids leaving users pointing to a deleted team).
    await this.usersRepository.update({ teamId }, { teamId: null });

    await this.salesTeamRepository.delete({ id: teamId });
    return { success: true };
  }

  async assignAgentToTeam(teamLeaderId: number, teamId: number, agentId: number): Promise<User> {
    const team = await this.salesTeamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You are not the leader of this team');
    }

    const agent = await this.usersRepository.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.teamId = team.id;
    if (!agent.teamLeaderId) {
      agent.teamLeaderId = teamLeaderId;
    }

    return this.usersRepository.save(agent);
  }

  async getTeamLeadersList(): Promise<User[]> {
    // Get all users with Sales Team Leader role
    const tlRole = await this.usersRepository.manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('roles', 'r')
      .where("r.slug = :slug OR LOWER(r.name) LIKE :pattern", {
        slug: 'sales-team-leader',
        pattern: '%team leader%',
      })
      .getRawOne();

    if (!tlRole) {
      return [];
    }

    return await this.usersRepository.find({
      where: { roleId: tlRole.id },
      select: ['id', 'name', 'lastName', 'email'],
    });
  }

  async getAvailableAgentsForTeamLeader(teamLeaderId: number): Promise<User[]> {    // Get users with Sales Executive role that can be assigned to teams
    const salesExecRole = await this.usersRepository.manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('roles', 'r')
      .where("r.name = :name OR r.slug = :slug OR LOWER(r.name) LIKE :pattern", {
        name: 'Sales Executive',
        slug: 'sales-executive',
        pattern: '%sales executive%',
      })
      .getRawOne();

    if (!salesExecRole) {
      return [];
    }

    // Return Sales Executives assigned to this team leader
    const agents = await this.usersRepository.find({
      where: { roleId: salesExecRole.id, teamLeaderId },
      select: ['id', 'name', 'lastName', 'email', 'phone', 'teamId', 'teamLeaderId', 'status'],
    });

    // Also include the team leader themselves (for self-assignment)
    const teamLeader = await this.usersRepository.findOne({
      where: { id: teamLeaderId },
      select: ['id', 'name', 'lastName', 'email', 'phone', 'teamId', 'teamLeaderId', 'status'],
    });
    if (teamLeader && !agents.some(a => a.id === teamLeaderId)) {
      agents.unshift(teamLeader);
    }

    return agents;
  }

  async getLeadAging(teamLeaderId: number): Promise<any> {
    // Calculate real lead aging based on customer creation dates
    const customers = await this.getLeaderCustomers(teamLeaderId);
    const today = new Date();

    const aging = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-25 days': 0,
      '26-30 days': 0,
      '30+ days': 0,
    };

    for (const customer of customers) {
      const createdAt = customer.createdAt ? new Date(customer.createdAt) : today;
      const daysSinceCreation = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceCreation <= 7) {
        aging['0-7 days']++;
      } else if (daysSinceCreation <= 14) {
        aging['8-14 days']++;
      } else if (daysSinceCreation <= 25) {
        aging['15-25 days']++;
      } else if (daysSinceCreation <= 30) {
        aging['26-30 days']++;
      } else {
        aging['30+ days']++;
      }
    }

    return aging;
  }

  // ==================== AGENT REMOVE / TRANSFER ====================

  /**
   * Get all Sales Executives across all team leaders (admin view).
   * Returns agent info enriched with their current TL name.
   */
  async getAllSalesAgents(): Promise<any[]> {
    const salesExecRole = await this.usersRepository.manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('roles', 'r')
      .where("r.slug = :slug OR LOWER(r.name) LIKE :pattern", {
        slug: 'sales-executive',
        pattern: '%sales executive%',
      })
      .getRawOne();

    if (!salesExecRole) return [];

    const agents = await this.usersRepository.find({
      where: { roleId: salesExecRole.id },
      select: ['id', 'name', 'lastName', 'email', 'phone', 'teamId', 'teamLeaderId', 'status'],
      order: { name: 'ASC' },
    });

    // Get TL names in one shot
    const tlIds = [...new Set(agents.map(a => a.teamLeaderId).filter(Boolean))] as number[];
    const tls = tlIds.length
      ? await this.usersRepository.findByIds(tlIds, { select: ['id', 'name', 'lastName'] })
      : [];
    const tlMap = new Map(tls.map(t => [t.id, `${t.name} ${t.lastName || ''}`.trim()]));

    // Get team names
    const teamIds = [...new Set(agents.map(a => a.teamId).filter(Boolean))] as number[];
    const teams = teamIds.length
      ? await this.salesTeamRepository.findByIds(teamIds)
      : [];
    const teamMap = new Map(teams.map(t => [t.id, t.name]));

    return agents.map(a => ({
      id: a.id,
      name: `${a.name} ${a.lastName || ''}`.trim(),
      email: a.email,
      phone: a.phone,
      status: a.status,
      teamLeaderId: a.teamLeaderId ?? null,
      teamLeaderName: a.teamLeaderId ? (tlMap.get(a.teamLeaderId) ?? null) : null,
      teamId: a.teamId ?? null,
      teamName: a.teamId ? (teamMap.get(a.teamId) ?? null) : null,
    }));
  }

  /**
   * Remove an agent from their current team leader.
   * - Clears agent.teamLeaderId and agent.teamId
   * - Unassigns all the agent's customers from the agent (assigned_to = NULL)
   *   but keeps them under the old team leader (assigned_supervisor_id unchanged).
   */
  async removeAgentFromTeamLeader(agentId: number): Promise<{ removed: boolean; customersUpdated: number }> {
    const agent = await this.usersRepository.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const oldTeamLeaderId = agent.teamLeaderId;

    // Unassign all customers from this agent — keep assigned_supervisor_id intact
    const updateResult = await this.customerRepository
      .createQueryBuilder()
      .update()
      .set({ assigned_to: null } as any)
      .where('assigned_to = :agentId', { agentId })
      .execute();

    // Clear agent's TL and team binding
    await this.usersRepository.update(agentId, { teamLeaderId: null, teamId: null } as any);

    return {
      removed: true,
      customersUpdated: updateResult.affected ?? 0,
    };
  }

  /**
   * Transfer an agent from their current team leader to a new team leader.
   * - Unassigns all the agent's customers from the agent
   * - Those customers remain under the OLD team leader (assigned_supervisor_id = oldTeamLeaderId)
   * - Updates agent.teamLeaderId = newTeamLeaderId, agent.teamId = null
   *   (admin must manually place agent into a team under the new TL afterwards if needed)
   */
  async transferAgent(agentId: number, newTeamLeaderId: number): Promise<{ transferred: boolean; customersUpdated: number }> {
    const agent = await this.usersRepository.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const newTL = await this.usersRepository.findOne({ where: { id: newTeamLeaderId } });
    if (!newTL) throw new NotFoundException('Target team leader not found');

    if (agent.teamLeaderId === newTeamLeaderId) {
      throw new Error('Agent is already under this team leader');
    }

    // Unassign all customers from the agent — keep assigned_supervisor_id = old TL
    const updateResult = await this.customerRepository
      .createQueryBuilder()
      .update()
      .set({ assigned_to: null } as any)
      .where('assigned_to = :agentId', { agentId })
      .execute();

    // Move agent to new TL, clear team (team belongs to specific TL)
    await this.usersRepository.update(agentId, { teamLeaderId: newTeamLeaderId, teamId: null } as any);

    return {
      transferred: true,
      customersUpdated: updateResult.affected ?? 0,
    };
  }

  // ==================== TEAM AGENT REPORTS ====================
  /**
   * Get all agents under the team leader with their basic info
   */
  async getTeamAgents(teamLeaderId: number): Promise<any[]> {
    const agents = await this.usersRepository.find({
      where: { teamLeaderId, isDeleted: false } as any,
      select: ['id', 'name', 'lastName', 'email', 'phone', 'status', 'teamId', 'createdAt'],
    });

    // Enrich with team info
    const teamIds = [...new Set(agents.map(a => a.teamId).filter(Boolean))];
    const teams = teamIds.length > 0
      ? await this.salesTeamRepository.find({ where: { id: teamIds as any } })
      : [];
    const teamMap = new Map(teams.map(t => [t.id, t]));

    return agents.map(agent => ({
      id: agent.id,
      name: `${agent.name} ${agent.lastName || ''}`.trim(),
      email: agent.email,
      phone: agent.phone,
      status: agent.status,
      teamId: agent.teamId,
      teamName: agent.teamId ? teamMap.get(agent.teamId)?.name : null,
      teamCode: agent.teamId ? teamMap.get(agent.teamId)?.code : null,
      createdAt: agent.createdAt,
    }));
  }

  /**
   * Get detailed agent history: activities, calls, tasks
   */
  async getAgentHistory(
    teamLeaderId: number,
    agentId: number,
    options?: { from?: string; to?: string; type?: string; page?: number; limit?: number },
  ): Promise<any> {
    // Verify agent is under this team leader
    const agent = await this.usersRepository.findOne({
      where: { id: agentId, isDeleted: false } as any,
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You can only view history for agents in your team');
    }

    const page = Number(options?.page) || 1;
    const limit = Math.min(Number(options?.limit) || 50, 500);
    const skip = (page - 1) * limit;

    // Build date range
    const to = options?.to ? new Date(options.to) : new Date();
    const from = options?.from
      ? new Date(options.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Get activities/engagements from customer_engagement_history (used by agent dashboard)
    let activities: any[] = [];
    let totalActivities = 0;
    try {
      let query = `
        SELECT 
          id, 
          customer_id AS "customerId", 
          engagement_type AS type, 
          channel, 
          status, 
          message_content AS notes, 
          agent_id AS "userId",
          created_at AS "createdAt",
          metadata
        FROM customer_engagement_history
        WHERE agent_id = $1 AND created_at >= $2 AND created_at <= $3
      `;
      const params: any[] = [agentId, from, to];
      
      if (options?.type) {
        query += ` AND engagement_type = $4`;
        params.push(options.type);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, skip);
      
      activities = await this.engagementRepository.query(query, params);
      
      // Get total count
      let countQuery = `
        SELECT COUNT(*)::int AS count
        FROM customer_engagement_history
        WHERE agent_id = $1 AND created_at >= $2 AND created_at <= $3
      `;
      const countParams: any[] = [agentId, from, to];
      if (options?.type) {
        countQuery += ` AND engagement_type = $4`;
        countParams.push(options.type);
      }
      const countResult = await this.engagementRepository.query(countQuery, countParams);
      totalActivities = countResult[0]?.count || 0;
    } catch {
      // Fall back to activities table
      const activityQb = this.activityRepo.createQueryBuilder('a')
        .where('a.userId = :agentId', { agentId })
        .andWhere('a.createdAt >= :from AND a.createdAt <= :to', { from, to });

      if (options?.type) {
        activityQb.andWhere('a.type = :type', { type: options.type });
      }

      activityQb.orderBy('a.createdAt', 'DESC');
      const result = await activityQb.skip(skip).take(limit).getManyAndCount();
      activities = result[0];
      totalActivities = result[1];
    }

    // Get call tasks
    const taskQb = this.callTaskRepo.createQueryBuilder('t')
      .where('t.assigned_agent_id = :agentId', { agentId })
      .andWhere('t.created_at >= :from AND t.created_at <= :to', { from, to })
      .orderBy('t.created_at', 'DESC');

    const [tasks, totalTasks] = await taskQb.skip(skip).take(limit).getManyAndCount();

    return {
      agent: {
        id: agent.id,
        name: `${agent.name} ${agent.lastName || ''}`.trim(),
        email: agent.email,
        phone: agent.phone,
        status: agent.status,
      },
      dateRange: { from, to },
      pagination: { page, limit, totalActivities, totalTasks },
      activities,
      tasks,
    };
  }

  /**
   * Get aggregated agent statistics/report
   */
  async getAgentReport(
    teamLeaderId: number,
    agentId: number,
    options?: { from?: string; to?: string },
  ): Promise<any> {
    // Verify agent is under this team leader
    const agent = await this.usersRepository.findOne({
      where: { id: agentId, isDeleted: false } as any,
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You can only view reports for agents in your team');
    }

    // Build date range
    const to = options?.to ? new Date(options.to) : new Date();
    const from = options?.from
      ? new Date(options.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Get activity stats from customer_engagement_history (used by agent dashboard)
    let activityStats: any[] = [];
    try {
      activityStats = await this.engagementRepository.query(
        `
        SELECT
          engagement_type AS type,
          COUNT(*)::int AS count,
          0::int AS total_duration
        FROM customer_engagement_history
        WHERE agent_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY engagement_type
        ORDER BY count DESC
        `,
        [agentId, from, to],
      );
    } catch {
      // Fall back to activities table if engagement_history doesn't exist
      activityStats = await this.activityRepo.query(
        `
        SELECT
          type,
          COUNT(*)::int AS count,
          COALESCE(SUM(duration), 0)::int AS total_duration
        FROM activities
        WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY type
        ORDER BY count DESC
        `,
        [agentId, from, to],
      );
    }

    // Get call task stats
    const taskStats = await this.callTaskRepo.query(
      `
      SELECT
        status,
        COUNT(*)::int AS count
      FROM crm_call_tasks
      WHERE assigned_agent_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY status
      `,
      [agentId, from, to],
    );

    // Get telephony call stats (try telephony_calls first, then fallback)
    let telephonyStats: any = null;
    try {
      const callStats = await this.activityRepo.query(
        `
        SELECT
          status,
          direction,
          COUNT(*)::int AS count,
          COALESCE(SUM(duration_seconds), 0)::int AS total_duration,
          COALESCE(AVG(duration_seconds), 0)::numeric AS avg_duration
        FROM telephony_calls
        WHERE agent_user_id = $1 AND started_at >= $2 AND started_at <= $3
        GROUP BY status, direction
        ORDER BY count DESC
        `,
        [agentId, from, to],
      );
      
      const callSummary = await this.activityRepo.query(
        `
        SELECT
          COUNT(*)::int AS total_calls,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_calls,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_calls,
          COUNT(*) FILTER (WHERE direction = 'outbound')::int AS outbound_calls,
          COUNT(*) FILTER (WHERE direction = 'inbound')::int AS inbound_calls,
          COALESCE(SUM(duration_seconds), 0)::int AS total_talk_time,
          COALESCE(AVG(duration_seconds), 0)::numeric AS avg_call_duration
        FROM telephony_calls
        WHERE agent_user_id = $1 AND started_at >= $2 AND started_at <= $3
        `,
        [agentId, from, to],
      );

      const hasTelephonyData = callStats.length > 0 && Number(callSummary[0]?.total_calls || 0) > 0;

      if (hasTelephonyData) {
        telephonyStats = {
          byStatusAndDirection: callStats,
          summary: callSummary[0] || {},
        };
      }
    } catch {
      // Table may not exist
    }

    // If telephony_calls had no data, build stats from multiple fallback sources
    if (!telephonyStats) {
      try {
        let totalCalls = 0;
        let completedCalls = 0;
        let failedCalls = 0;

        // Try crm_call_tasks first
        try {
          const callTaskSummary = await this.callTaskRepo.query(
            `
            SELECT
              COUNT(*)::int AS total_calls,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_calls,
              COUNT(*) FILTER (WHERE status = 'failed' OR status = 'skipped')::int AS failed_calls
            FROM crm_call_tasks
            WHERE assigned_agent_id = $1 AND task_date >= $2 AND task_date <= $3
            `,
            [agentId, from, to],
          );
          const cts = callTaskSummary[0] || {};
          totalCalls = Number(cts.total_calls || 0);
          completedCalls = Number(cts.completed_calls || 0);
          failedCalls = Number(cts.failed_calls || 0);
        } catch { /* ignore */ }

        // If crm_call_tasks had no data, count calls from customer_engagement_history
        if (totalCalls === 0) {
          try {
            const engRows = await this.engagementRepository.query(
              `
              SELECT
                COUNT(*)::int AS total_calls,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_calls,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_calls
              FROM customer_engagement_history
              WHERE agent_id = $1 AND engagement_type = 'call' AND created_at >= $2 AND created_at <= $3
              `,
              [agentId, from, to],
            );
            if (engRows.length > 0) {
              totalCalls = Number(engRows[0].total_calls || 0);
              completedCalls = Number(engRows[0].completed_calls || 0);
              failedCalls = Number(engRows[0].failed_calls || 0);
            }
          } catch { /* ignore */ }
        }

        // If still no data, count call activities from activities table
        if (totalCalls === 0) {
          try {
            const actRows = await this.activityRepo.query(
              `
              SELECT
                COUNT(*)::int AS total_calls,
                COUNT(*) FILTER (WHERE outcome = 'completed' OR outcome = 'connected')::int AS completed_calls,
                COUNT(*) FILTER (WHERE outcome = 'failed' OR outcome = 'no_answer')::int AS failed_calls
              FROM activities
              WHERE user_id = $1 AND type = 'call' AND created_at >= $2 AND created_at <= $3
              `,
              [agentId, from, to],
            );
            if (actRows.length > 0) {
              totalCalls = Number(actRows[0].total_calls || 0);
              completedCalls = Number(actRows[0].completed_calls || 0);
              failedCalls = Number(actRows[0].failed_calls || 0);
            }
          } catch { /* ignore */ }
        }

        // Get talk time from activities (type = 'call')
        let talkTime = { total_talk_time: 0, avg_call_duration: 0 };
        try {
          const ttRows = await this.activityRepo.query(
            `
            SELECT
              COALESCE(SUM(duration), 0)::int AS total_talk_time,
              COALESCE(AVG(NULLIF(duration, 0)), 0)::numeric AS avg_call_duration
            FROM activities
            WHERE user_id = $1 AND type = 'call' AND created_at >= $2 AND created_at <= $3
            `,
            [agentId, from, to],
          );
          if (ttRows.length > 0 && Number(ttRows[0].total_talk_time) > 0) {
            talkTime = ttRows[0];
          }
        } catch { /* ignore */ }

        // If activities had no duration, try customer_interactions
        if (Number(talkTime.total_talk_time) === 0) {
          try {
            const ciRows = await this.activityRepo.query(
              `
              SELECT
                COALESCE(SUM(duration_seconds), 0)::int AS total_talk_time,
                COALESCE(AVG(NULLIF(duration_seconds, 0)), 0)::numeric AS avg_call_duration
              FROM customer_interactions
              WHERE agent_id = $1 AND interaction_type = 'call' AND created_at >= $2 AND created_at <= $3
              `,
              [agentId, from, to],
            );
            if (ciRows.length > 0) {
              talkTime = ciRows[0];
            }
          } catch { /* ignore */ }
        }

        telephonyStats = {
          byStatusAndDirection: [],
          summary: {
            total_calls: totalCalls,
            completed_calls: completedCalls,
            failed_calls: failedCalls,
            outbound_calls: 0,
            inbound_calls: 0,
            total_talk_time: Number(talkTime.total_talk_time || 0),
            avg_call_duration: Number(talkTime.avg_call_duration || 0),
          },
        };
      } catch {
        // Fallback also failed
      }
    }

    // Get customer stats (count converted = lifecycle_stage='customer' OR has placed orders)
    const customerStats = await this.customerRepository.query(
      `
      SELECT
        COUNT(*)::int AS total_assigned,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'customer'
          OR id IN (SELECT DISTINCT customer_id FROM sales_orders WHERE customer_id IS NOT NULL)
        )::int AS converted,
        COUNT(*) FILTER (WHERE is_escalated = true)::int AS escalated
      FROM customers
      WHERE assigned_to = $1
      `,
      [agentId],
    );

    // Get daily breakdown for chart from customer_engagement_history
    let dailyBreakdown: any[] = [];
    try {
      dailyBreakdown = await this.engagementRepository.query(
        `
        SELECT
          DATE(created_at) AS date,
          engagement_type AS type,
          COUNT(*)::int AS count
        FROM customer_engagement_history
        WHERE agent_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE(created_at), engagement_type
        ORDER BY date DESC
        `,
        [agentId, from, to],
      );
    } catch {
      // Fall back to activities table
      dailyBreakdown = await this.activityRepo.query(
        `
        SELECT
          DATE(created_at) AS date,
          type,
          COUNT(*)::int AS count
        FROM activities
        WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE(created_at), type
        ORDER BY date DESC
        `,
        [agentId, from, to],
      );
    }

    return {
      agent: {
        id: agent.id,
        name: `${agent.name} ${agent.lastName || ''}`.trim(),
        email: agent.email,
        phone: agent.phone,
        status: agent.status,
      },
      dateRange: { from, to },
      activityStats,
      taskStats,
      telephonyStats,
      customerStats: customerStats[0] || {},
      dailyBreakdown,
    };
  }

  // ==================== AGENT TIERS ====================

  /**
   * Get all agents under a team leader with their tiers and assigned customer count
   */
  async getAgentTiers(teamLeaderId: number): Promise<any[]> {
    const agents = await this.usersRepository.find({
      where: { teamLeaderId, isDeleted: false } as any,
      select: ['id', 'name', 'lastName', 'phone', 'agentTier', 'status'],
    });

    if (agents.length === 0) return [];

    const agentIds = agents.map(a => a.id);
    const customerCounts = await this.customerRepository
      .createQueryBuilder('c')
      .select('c.assigned_to', 'agentId')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.assigned_to IN (:...agentIds)', { agentIds })
      .groupBy('c.assigned_to')
      .getRawMany();

    const countMap = new Map(customerCounts.map((r: any) => [Number(r.agentId), Number(r.count)]));

    return agents.map(agent => ({
      id: agent.id,
      name: `${agent.name} ${agent.lastName || ''}`.trim(),
      phone: agent.phone,
      tier: agent.agentTier || 'silver',
      status: agent.status,
      assignedCustomers: countMap.get(agent.id) || 0,
    }));
  }

  /**
   * Update agent tier and unassign all customers from that agent
   */
  async updateAgentTier(teamLeaderId: number, agentId: number, newTier: string): Promise<any> {
    const validTiers = ['silver', 'gold', 'platinum', 'website_sale'];
    if (!validTiers.includes(newTier)) {
      throw new BadRequestException(`Invalid tier. Must be one of: ${validTiers.join(', ')}`);
    }

    const agent = await this.usersRepository.findOne({
      where: { id: agentId, isDeleted: false } as any,
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.teamLeaderId !== teamLeaderId) {
      throw new ForbiddenException('You can only update tiers for agents in your team');
    }

    const oldTier = agent.agentTier || 'silver';
    if (oldTier === newTier) {
      throw new BadRequestException('Agent is already on this tier');
    }

    // Update tier
    await this.usersRepository.update(agentId, { agentTier: newTier } as any);

    // Unassign all customers from this agent
    const unassignResult = await this.customerRepository
      .createQueryBuilder()
      .update()
      .set({ assigned_to: null } as any)
      .where('assigned_to = :agentId', { agentId })
      .execute();

    const unassignedCount = unassignResult.affected || 0;

    // Log activity
    const activity = this.activityRepo.create({
      type: 'tier_change',
      userId: teamLeaderId,
      description: `Agent tier changed from ${oldTier} to ${newTier}. ${unassignedCount} customer(s) unassigned.`,
      metadata: { agentId, oldTier, newTier, unassignedCount },
    } as any);
    await this.activityRepo.save(activity);

    return {
      message: `Agent tier updated to ${newTier}. ${unassignedCount} customer(s) have been unassigned.`,
      oldTier,
      newTier,
      unassignedCount,
    };
  }

  /**
   * Get aggregated report for all team agents
   */
  async getTeamAgentsReport(
    teamLeaderId: number,
    options?: { from?: string; to?: string },
  ): Promise<any> {
    const agents = await this.usersRepository.find({
      where: { teamLeaderId, isDeleted: false } as any,
      select: ['id', 'name', 'lastName', 'email', 'phone', 'status', 'teamId'],
    });

    if (agents.length === 0) {
      return { agents: [], summary: {}, dateRange: {} };
    }

    const agentIds = agents.map(a => a.id);

    // Build date range
    const to = options?.to ? new Date(options.to) : new Date();
    const from = options?.from
      ? new Date(options.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get activity stats per agent from customer_engagement_history (used by agent dashboard)
    let activityStats: any[] = [];
    try {
      activityStats = await this.engagementRepository.query(
        `
        SELECT
          agent_id,
          engagement_type AS type,
          COUNT(*)::int AS count,
          0::int AS total_duration
        FROM customer_engagement_history
        WHERE agent_id = ANY($1) AND created_at >= $2 AND created_at <= $3
        GROUP BY agent_id, engagement_type
        `,
        [agentIds, from, to],
      );
    } catch {
      // Fall back to activities table if engagement_history doesn't exist
      activityStats = await this.activityRepo.query(
        `
        SELECT
          user_id AS agent_id,
          type,
          COUNT(*)::int AS count,
          COALESCE(SUM(duration), 0)::int AS total_duration
        FROM activities
        WHERE user_id = ANY($1) AND created_at >= $2 AND created_at <= $3
        GROUP BY user_id, type
        `,
        [agentIds, from, to],
      );
    }

    // Get task stats per agent
    const taskStats = await this.callTaskRepo.query(
      `
      SELECT
        assigned_agent_id AS agent_id,
        status,
        COUNT(*)::int AS count
      FROM crm_call_tasks
      WHERE assigned_agent_id = ANY($1) AND created_at >= $2 AND created_at <= $3
      GROUP BY assigned_agent_id, status
      `,
      [agentIds, from, to],
    );

    // Get telephony stats per agent
    // Try telephony_calls first, then fallback to crm_call_tasks + activities for call data
    let telephonyStats: any[] = [];
    try {
      telephonyStats = await this.activityRepo.query(
        `
        SELECT
          agent_user_id AS agent_id,
          COUNT(*)::int AS total_calls,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_calls,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_calls,
          COALESCE(SUM(duration_seconds), 0)::int AS total_talk_time,
          COALESCE(AVG(duration_seconds), 0)::numeric AS avg_call_duration
        FROM telephony_calls
        WHERE agent_user_id = ANY($1) AND started_at >= $2 AND started_at <= $3
        GROUP BY agent_user_id
        `,
        [agentIds, from, to],
      );
    } catch {
      // Table may not exist
    }

    // If telephony_calls returned no data, aggregate from crm_call_tasks + activities
    if (telephonyStats.length === 0) {
      try {
        // Get call counts from crm_call_tasks (completed/in_progress tasks = actual calls made)
        const callCountRows: any[] = await this.callTaskRepo.query(
          `
          SELECT
            assigned_agent_id AS agent_id,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_calls,
            COUNT(*) FILTER (WHERE status = 'failed' OR status = 'skipped')::int AS failed_calls
          FROM crm_call_tasks
          WHERE assigned_agent_id = ANY($1) AND task_date >= $2 AND task_date <= $3
          GROUP BY assigned_agent_id
          `,
          [agentIds, from, to],
        );

        // Get talk time from activities (type = 'call')
        let talkTimeRows: any[] = [];
        try {
          talkTimeRows = await this.activityRepo.query(
            `
            SELECT
              user_id AS agent_id,
              COALESCE(SUM(duration), 0)::int AS total_talk_time,
              COALESCE(AVG(NULLIF(duration, 0)), 0)::numeric AS avg_call_duration
            FROM activities
            WHERE user_id = ANY($1) AND type = 'call' AND created_at >= $2 AND created_at <= $3
            GROUP BY user_id
            `,
            [agentIds, from, to],
          );
        } catch {
          // activities table might not have duration
        }

        // If activities had no duration data, try customer_interactions
        if (talkTimeRows.length === 0) {
          try {
            talkTimeRows = await this.activityRepo.query(
              `
              SELECT
                agent_id,
                COALESCE(SUM(duration_seconds), 0)::int AS total_talk_time,
                COALESCE(AVG(NULLIF(duration_seconds, 0)), 0)::numeric AS avg_call_duration
              FROM customer_interactions
              WHERE agent_id = ANY($1) AND interaction_type = 'call' AND created_at >= $2 AND created_at <= $3
              GROUP BY agent_id
              `,
              [agentIds, from, to],
            );
          } catch {
            // table may not exist
          }
        }

        const talkTimeMap = new Map<number, any>();
        for (const tt of talkTimeRows) {
          talkTimeMap.set(Number(tt.agent_id), tt);
        }

        telephonyStats = callCountRows.map(cc => {
          const tt = talkTimeMap.get(Number(cc.agent_id)) || {};
          return {
            agent_id: cc.agent_id,
            total_calls: cc.total_calls,
            completed_calls: cc.completed_calls,
            failed_calls: cc.failed_calls,
            total_talk_time: Number(tt.total_talk_time || 0),
            avg_call_duration: Number(tt.avg_call_duration || 0),
          };
        });

        // Also add agents who have talk time but no call tasks
        for (const tt of talkTimeRows) {
          const agentId = Number(tt.agent_id);
          if (!callCountRows.some(cc => Number(cc.agent_id) === agentId)) {
            telephonyStats.push({
              agent_id: tt.agent_id,
              total_calls: 0,
              completed_calls: 0,
              failed_calls: 0,
              total_talk_time: Number(tt.total_talk_time || 0),
              avg_call_duration: Number(tt.avg_call_duration || 0),
            });
          }
        }
      } catch {
        // Fallback queries also failed
      }
    }

    // Get customer stats per agent (count converted = lifecycle_stage='customer' OR has placed orders)
    const customerStats = await this.customerRepository.query(
      `
      SELECT
        assigned_to AS agent_id,
        COUNT(*)::int AS total_assigned,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'customer'
          OR id IN (SELECT DISTINCT customer_id FROM sales_orders WHERE customer_id IS NOT NULL)
        )::int AS converted
      FROM customers
      WHERE assigned_to = ANY($1)
      GROUP BY assigned_to
      `,
      [agentIds],
    );

    // Build per-agent result
    const activityByAgent = new Map<number, any[]>();
    for (const row of activityStats) {
      const id = Number(row.agent_id);
      if (!activityByAgent.has(id)) activityByAgent.set(id, []);
      activityByAgent.get(id)!.push(row);
    }

    const taskByAgent = new Map<number, any[]>();
    for (const row of taskStats) {
      const id = Number(row.agent_id);
      if (!taskByAgent.has(id)) taskByAgent.set(id, []);
      taskByAgent.get(id)!.push(row);
    }

    const telephonyByAgent = new Map<number, any>();
    for (const row of telephonyStats) {
      telephonyByAgent.set(Number(row.agent_id), row);
    }

    const customerByAgent = new Map<number, any>();
    for (const row of customerStats) {
      customerByAgent.set(Number(row.agent_id), row);
    }

    const agentReports = agents.map(agent => {
      const actStats = activityByAgent.get(agent.id) || [];
      const tskStats = taskByAgent.get(agent.id) || [];
      const telStats = telephonyByAgent.get(agent.id) || {};
      const custStats = customerByAgent.get(agent.id) || {};

      // Summarize activities
      const totalActivities = actStats.reduce((sum, r) => sum + Number(r.count || 0), 0);
      const callActivities = actStats.filter(r => r.type === 'call').reduce((sum, r) => sum + Number(r.count || 0), 0);

      // Summarize tasks
      const totalTasks = tskStats.reduce((sum, r) => sum + Number(r.count || 0), 0);
      const completedTasks = tskStats.filter(r => r.status === 'completed').reduce((sum, r) => sum + Number(r.count || 0), 0);
      const pendingTasks = tskStats.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.count || 0), 0);

      return {
        id: agent.id,
        name: `${agent.name} ${agent.lastName || ''}`.trim(),
        email: agent.email,
        phone: agent.phone,
        status: agent.status,
        teamId: agent.teamId,
        activities: {
          total: totalActivities,
          calls: callActivities,
          byType: actStats,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          byStatus: tskStats,
        },
        telephony: {
          totalCalls: Number(telStats.total_calls || 0),
          completedCalls: Number(telStats.completed_calls || 0),
          failedCalls: Number(telStats.failed_calls || 0),
          totalTalkTime: Number(telStats.total_talk_time || 0),
          avgCallDuration: Number(telStats.avg_call_duration || 0),
        },
        customers: {
          totalAssigned: Number(custStats.total_assigned || 0),
          converted: Number(custStats.converted || 0),
        },
      };
    });

    // Overall summary
    const summary = {
      totalAgents: agents.length,
      totalActivities: agentReports.reduce((s, a) => s + a.activities.total, 0),
      totalCalls: agentReports.reduce((s, a) => s + a.telephony.totalCalls, 0),
      completedCalls: agentReports.reduce((s, a) => s + a.telephony.completedCalls, 0),
      totalTasks: agentReports.reduce((s, a) => s + a.tasks.total, 0),
      completedTasks: agentReports.reduce((s, a) => s + a.tasks.completed, 0),
      totalCustomersAssigned: agentReports.reduce((s, a) => s + a.customers.totalAssigned, 0),
    };

    return {
      dateRange: { from, to },
      summary,
      agents: agentReports,
    };
  }

  // ==================== DASHBOARD CONFIG METHODS ====================

  /**
   * Get dashboard configuration for a team leader
   */
  async getDashboardConfig(teamLeaderId: number, configKey: string): Promise<any> {
    const config = await this.dashboardConfigRepo.findOne({
      where: { teamLeaderId, configKey },
    });
    return config?.value || null;
  }

  /**
   * Get all dashboard configurations for a team leader
   */
  async getAllDashboardConfigs(teamLeaderId: number): Promise<Record<string, any>> {
    const configs = await this.dashboardConfigRepo.find({
      where: { teamLeaderId },
    });
    
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.configKey] = config.value;
    }
    return result;
  }

  /**
   * Save dashboard configuration for a team leader
   */
  async saveDashboardConfig(teamLeaderId: number, configKey: string, value: any): Promise<DashboardConfig> {
    let config = await this.dashboardConfigRepo.findOne({
      where: { teamLeaderId, configKey },
    });

    if (config) {
      config.value = value;
      config.updatedAt = new Date();
    } else {
      config = this.dashboardConfigRepo.create({
        teamLeaderId,
        configKey,
        value,
      });
    }

    return await this.dashboardConfigRepo.save(config);
  }

  /**
   * Delete dashboard configuration for a team leader
   */
  async deleteDashboardConfig(teamLeaderId: number, configKey: string): Promise<boolean> {
    const result = await this.dashboardConfigRepo.delete({ teamLeaderId, configKey });
    return (result.affected ?? 0) > 0;
  }
}
