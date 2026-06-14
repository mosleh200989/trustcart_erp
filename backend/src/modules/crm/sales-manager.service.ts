import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { User } from '../users/user.entity';
import { CallTask } from './entities/call-task.entity';
import { getDhakaDateString } from '../../common/utils/dhaka-date';

@Injectable()
export class SalesManagerService {
  private assignmentColumnShapePromise?: Promise<{ assignedBy: boolean; assignedAt: boolean }>;

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(SalesTeam)
    private salesTeamRepository: Repository<SalesTeam>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
  ) {}

  /**
   * Get all team leaders for visibility only. Team leaders no longer receive
   * lead assignments in the Data Analyst workflow.
   */
  private async getRoleId(slug: string, namePattern: string): Promise<number | null> {
    const role = await this.usersRepository.manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('roles', 'r')
      .where("r.slug = :slug OR LOWER(r.name) LIKE :pattern", {
        slug,
        pattern: namePattern,
      })
      .getRawOne();

    return role?.id ? Number(role.id) : null;
  }

  private async getTeamLeaderRoleId(): Promise<number | null> {
    return this.getRoleId('sales-team-leader', '%team leader%');
  }

  private async getAgentRoleId(): Promise<number | null> {
    return this.getRoleId('sales-executive', '%sales executive%');
  }

  private async getTeamLeaders(): Promise<User[]> {
    const tlRoleId = await this.getTeamLeaderRoleId();

    if (!tlRoleId) return [];

    return await this.usersRepository.find({
      where: { roleId: tlRoleId, status: 'active' as any, isDeleted: false } as any,
    });
  }

  private async getAgents(): Promise<User[]> {
    const agentRoleId = await this.getAgentRoleId();

    if (!agentRoleId) return [];

    return await this.usersRepository.find({
      where: { roleId: agentRoleId, status: 'active' as any, isDeleted: false } as any,
      order: { name: 'ASC', lastName: 'ASC' } as any,
    });
  }

  private async getAssignmentColumnShape(): Promise<{ assignedBy: boolean; assignedAt: boolean }> {
    if (!this.assignmentColumnShapePromise) {
      this.assignmentColumnShapePromise = this.customerRepository.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'customers'
           AND column_name IN ('assigned_by', 'assigned_at')`,
      ).then((rows: Array<{ column_name: string }>) => {
        const names = new Set(rows.map((row) => row.column_name));
        return {
          assignedBy: names.has('assigned_by'),
          assignedAt: names.has('assigned_at'),
        };
      }).catch(() => ({ assignedBy: false, assignedAt: false }));
    }

    return this.assignmentColumnShapePromise;
  }

  private setCustomerAssignmentFields(
    assignmentShape: { assignedBy: boolean; assignedAt: boolean },
    dataAnalystId: number | null,
  ) {
    const fields: any = {};
    if (assignmentShape.assignedBy) fields.assigned_by = dataAnalystId;
    if (assignmentShape.assignedAt) fields.assigned_at = dataAnalystId == null ? null : new Date();
    return fields;
  }

  private applyLastCallFilter(qb: any, calledStatus: string): void {
    if (!calledStatus || calledStatus === 'all') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const daysAgo = (days: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - days);
      return date;
    };

    switch (calledStatus) {
      case 'called':
      case 'called_today':
        qb.andWhere('c.last_contact_date >= :lastCallToday AND c.last_contact_date < :lastCallTomorrow', {
          lastCallToday: today,
          lastCallTomorrow: tomorrow,
        });
        break;
      case 'called_yesterday':
        qb.andWhere('c.last_contact_date >= :lastCallYesterday AND c.last_contact_date < :lastCallToday', {
          lastCallYesterday: daysAgo(1),
          lastCallToday: today,
        });
        break;
      case 'called_1week':
        qb.andWhere('c.last_contact_date >= :lastCall1wStart AND c.last_contact_date < :lastCall1wEnd', {
          lastCall1wStart: daysAgo(13),
          lastCall1wEnd: daysAgo(6),
        });
        break;
      case 'called_2weeks':
        qb.andWhere('c.last_contact_date >= :lastCall2wStart AND c.last_contact_date < :lastCall2wEnd', {
          lastCall2wStart: daysAgo(20),
          lastCall2wEnd: daysAgo(13),
        });
        break;
      case 'called_3weeks':
        qb.andWhere('c.last_contact_date >= :lastCall3wStart AND c.last_contact_date < :lastCall3wEnd', {
          lastCall3wStart: daysAgo(27),
          lastCall3wEnd: daysAgo(20),
        });
        break;
      case 'called_1month':
        qb.andWhere('c.last_contact_date < :lastCall1mEnd', { lastCall1mEnd: daysAgo(27) });
        break;
      case 'not_called':
      case 'not_called_today':
        qb.andWhere('(c.last_contact_date IS NULL OR c.last_contact_date < :lastCallToday)', { lastCallToday: today });
        break;
      case 'not_called_week':
        qb.andWhere('(c.last_contact_date IS NULL OR c.last_contact_date < :lastCallWeekAgo)', {
          lastCallWeekAgo: daysAgo(6),
        });
        break;
      case 'never':
        qb.andWhere('c.last_contact_date IS NULL');
        break;
    }
  }

  private async cleanupInvalidTeamLeaderAssignments(): Promise<number> {
    const tlRoleId = await this.getTeamLeaderRoleId();
    if (!tlRoleId) return 0;

    const result = await this.customerRepository.query(
      `UPDATE customers c
       SET assigned_supervisor_id = NULL,
           updated_at = NOW()
       WHERE c.assigned_supervisor_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM users u
           WHERE u.id = c.assigned_supervisor_id
             AND u.role_id = $1
             AND u.status = 'active'
             AND COALESCE(u.is_deleted, false) = false
         )`,
      [tlRoleId],
    );

    return Number(result?.[1] || 0);
  }

  /**
   * Main dashboard data for Sales Manager
   */
  async getDashboard() {
    await this.cleanupInvalidTeamLeaderAssignments();
    const teamLeaders = await this.getTeamLeaders();
    const tlIds = teamLeaders.map(tl => tl.id);

    // Overall KPIs
    const totalCustomers = await this.customerRepository.count();
    const totalLeads = await this.customerRepository.count({ where: { lifecycleStage: 'lead' } });
    const totalConverted = await this.customerRepository.count({ where: { lifecycleStage: 'customer' } });
    const conversionRate = totalCustomers > 0 ? Math.round((totalConverted / totalCustomers) * 100) : 0;

    // Unassigned leads (no agent assigned, excluding rejected)
    const unassignedLeads = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.lifecycle_stage = :stage', { stage: 'lead' })
      .andWhere('(c.assigned_to IS NULL)')
      .andWhere(`NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')`)
      .andWhere(`(c.customer_type IS NULL OR c.customer_type != 'rejected')`)
      .getCount();

    // Escalated leads
    const escalatedCount = await this.customerRepository.count({ where: { is_escalated: true } as any });

    // Team leader performance
    const teamLeaderStats = [];
    for (const tl of teamLeaders) {
      // Customers under this TL
      const agentIds = (await this.usersRepository.find({ where: { teamLeaderId: tl.id, status: 'active' as any, isDeleted: false } as any })).map(u => u.id);
      const allAgentIds = agentIds.length > 0 ? agentIds : [0]; // prevent IN () error

      const totalCustQb = this.customerRepository.createQueryBuilder('c')
        .where('c.assigned_supervisor_id = :tlId', { tlId: tl.id });
      if (agentIds.length > 0) {
        totalCustQb.orWhere('c.assigned_to IN (:...agentIds)', { agentIds });
      }
      const totalCust = await totalCustQb.getCount();

      const leadCount = await this.customerRepository.createQueryBuilder('c')
        .where('c.lifecycle_stage = :stage', { stage: 'lead' })
        .andWhere(qb => {
          const sub = qb.subQuery()
            .select('1')
            .where('c.assigned_supervisor_id = :tlId', { tlId: tl.id });
          if (agentIds.length > 0) {
            sub.orWhere('c.assigned_to IN (:...aids)', { aids: agentIds });
          }
          return `(c.assigned_supervisor_id = ${tl.id}${agentIds.length > 0 ? ` OR c.assigned_to IN (${agentIds.join(',')})` : ''})`;
        })
        .getCount();

      const convertedCount = await this.customerRepository.createQueryBuilder('c')
        .where('c.lifecycle_stage = :stage', { stage: 'customer' })
        .andWhere(`(c.assigned_supervisor_id = :tlId${agentIds.length > 0 ? ` OR c.assigned_to IN (${agentIds.join(',')})` : ''})`, { tlId: tl.id })
        .getCount();

      const tlConversionRate = totalCust > 0 ? Math.round((convertedCount / totalCust) * 100) : 0;

      // Teams under this TL
      const teams = await this.salesTeamRepository.find({ where: { teamLeaderId: tl.id } });

      // Today's call tasks
      const today = getDhakaDateString();
      const taskStats = await this.callTaskRepo.query(
        `SELECT 
           COUNT(*)::int AS total_tasks,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
         FROM crm_call_tasks 
         WHERE task_date = $1 
           AND assigned_agent_id IN (SELECT id FROM users WHERE team_leader_id = $2)`,
        [today, tl.id],
      );

      // Customer tier distribution under this TL
      const tlScope = `(c.assigned_supervisor_id = ${tl.id}${agentIds.length > 0 ? ` OR c.assigned_to IN (${agentIds.join(',')})` : ''})`;
      const tierCounts = await this.customerRepository.query(
        `SELECT
           COUNT(CASE WHEN ct.tier = 'silver' THEN 1 END)::int AS silver,
           COUNT(CASE WHEN ct.tier = 'gold' THEN 1 END)::int AS gold,
           COUNT(CASE WHEN ct.tier = 'platinum' THEN 1 END)::int AS platinum,
           COUNT(CASE WHEN ct.tier = 'vip' THEN 1 END)::int AS vip,
           COUNT(CASE WHEN ct.tier IS NULL THEN 1 END)::int AS no_tier
         FROM customers c
         LEFT JOIN customer_tiers ct ON ct.customer_id = c.id
         WHERE ${tlScope}`,
      );
      const tiers = tierCounts?.[0] || { silver: 0, gold: 0, platinum: 0, vip: 0, no_tier: 0 };

      // Escalated in this TL's scope
      const tlEscalated = await this.customerRepository.createQueryBuilder('c')
        .where('c.is_escalated = true')
        .andWhere(`(c.assigned_supervisor_id = :tlId${agentIds.length > 0 ? ` OR c.assigned_to IN (${agentIds.join(',')})` : ''})`, { tlId: tl.id })
        .getCount();

      teamLeaderStats.push({
        id: tl.id,
        name: `${tl.name} ${tl.lastName || ''}`.trim(),
        email: tl.email,
        phone: tl.phone,
        totalCustomers: totalCust,
        leads: leadCount,
        converted: convertedCount,
        conversionRate: tlConversionRate,
        teamsCount: teams.length,
        agentsCount: agentIds.length,
        tiers: {
          silver: Number(tiers.silver || 0),
          gold: Number(tiers.gold || 0),
          platinum: Number(tiers.platinum || 0),
          vip: Number(tiers.vip || 0),
          noTier: Number(tiers.no_tier || 0),
        },
        escalated: tlEscalated,
        todayTasks: taskStats?.[0] || { total_tasks: 0, completed: 0, failed: 0, pending: 0 },
      });
    }

    // Recent escalations
    const recentEscalations = await this.customerRepository.find({
      where: { is_escalated: true } as any,
      order: { escalated_at: 'DESC' } as any,
      take: 10,
    });

    return {
      overview: {
        totalCustomers,
        totalLeads,
        totalConverted,
        conversionRate,
        unassignedLeads,
        escalatedCount,
        totalTeamLeaders: teamLeaders.length,
      },
      teamLeaderStats,
      recentEscalations: recentEscalations.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone,
        escalated_at: (e as any).escalated_at,
        assigned_supervisor_id: (e as any).assigned_supervisor_id,
      })),
    };
  }

  /**
   * Get leads for assignment page (all leads, with optional agent/TL/date filters)
   * Supports large page sizes (200, 500, 750, 1000, 2000)
   */
  async getUnassignedLeads(query: any) {
    await this.cleanupInvalidTeamLeaderAssignments();
    const assignmentShape = await this.getAssignmentColumnShape();

    const page = parseInt(query.page) || 1;
    const allowedLimits = [20, 200, 500, 750, 1000, 2000];
    const requestedLimit = parseInt(query.limit) || 200;
    const limit = allowedLimits.includes(requestedLimit) ? requestedLimit : 200;
    const offset = (page - 1) * limit;

    const selectedFields = [
        'c.id', 'c.name', 'c.lastName', 'c.email', 'c.phone',
        'c.priority', 'c.customerType', 'c.lifecycleStage',
        'c.assigned_supervisor_id', 'c.assigned_to',
        'c.address', 'c.city', 'c.district', 'c.source', 'c.createdAt', 'c.updatedAt',
        'c.last_contact_date', 'c.total_spent',
      ];
    if (assignmentShape.assignedBy) selectedFields.push('c.assigned_by');
    if (assignmentShape.assignedAt) selectedFields.push('c.assigned_at');

    const qb = this.customerRepository.createQueryBuilder('c')
      .select(selectedFields)
      .addSelect(
        '(SELECT ct.tier FROM customer_tiers ct WHERE ct.customer_id = c.id LIMIT 1)',
        'tier',
      )
      .addSelect(
        `(SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')`,
        'so_count',
      )
      .addSelect(
        `(SELECT COUNT(*)::int FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')`,
        'leg_count',
      )
      .addSelect(
        `(SELECT CONCAT(COALESCE(agent.name, ''), ' ', COALESCE(agent.last_name, '')) FROM users agent WHERE agent.id = c.assigned_to LIMIT 1)`,
        'assigned_agent_name',
      )
      .addSelect(
        `(SELECT agent.team_leader_id FROM users agent WHERE agent.id = c.assigned_to LIMIT 1)`,
        'team_leader_id',
      )
      .addSelect(
        `(SELECT CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, '')) FROM users agent LEFT JOIN users tl ON tl.id = agent.team_leader_id WHERE agent.id = c.assigned_to LIMIT 1)`,
        'team_leader_name',
      )
      .addSelect(
        `(
          SELECT MAX(DATE(COALESCE(
            so_delivered.delivered_at,
            so_delivered.order_date::timestamp,
            so_delivered.created_at AT TIME ZONE 'Asia/Dhaka'
          )))
          FROM sales_orders so_delivered
          WHERE so_delivered.customer_id = c.id
            AND LOWER(so_delivered.status::text) = 'delivered'
        )`,
        'last_delivery_date',
      )
      .addSelect(
        assignmentShape.assignedBy
          ? `(SELECT CONCAT(COALESCE(da.name, ''), ' ', COALESCE(da.last_name, '')) FROM users da WHERE da.id = c.assigned_by LIMIT 1)`
          : `NULL`,
        'data_analyst_name',
      )
      // Only customers who have at least one delivered order
      .andWhere(
        `c.id IN (SELECT so.customer_id FROM sales_orders so WHERE LOWER(so.status::text) = 'delivered')`,
      )
      // Rejected visibility controlled by rejectedStatus query param
      // 'non_rejected' (default) = exclude rejected; 'rejected' = only rejected; 'all' = no filter
      ;  // (rejection filter applied below after query param is read)

    // Assignment status filter
    if (query.assignmentStatus === 'unassigned' || query.unassignedOnly === 'true' || query.unassignedOnly === true) {
      qb.andWhere('c.assigned_to IS NULL');
    } else if (query.assignmentStatus === 'assigned') {
      qb.andWhere('c.assigned_to IS NOT NULL');
    }

    // Rejected status filter
    const rejectedStatus = query.rejectedStatus || 'non_rejected';
    if (rejectedStatus === 'non_rejected') {
      qb.andWhere(`NOT EXISTS (SELECT 1 FROM customer_tiers ct2 WHERE ct2.customer_id = c.id AND ct2.tier = 'rejected')`)
        .andWhere(`(c.customer_type IS NULL OR c.customer_type != 'rejected')`);
    } else if (rejectedStatus === 'rejected') {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM customer_tiers ct2 WHERE ct2.customer_id = c.id AND ct2.tier = 'rejected')`
          + ` OR c.customer_type = 'rejected'`,
      );
    }
    // 'all' => no rejection filter

    if (query.priority) {
      qb.andWhere('c.priority = :priority', { priority: query.priority });
    }
    if (query.search) {
      qb.andWhere(
        '(c.name ILIKE :s OR c.last_name ILIKE :s OR c.email ILIKE :s OR c.phone ILIKE :s OR c.address ILIKE :s OR c.city ILIKE :s OR c.district ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.address && String(query.address).trim()) {
      const address = `%${String(query.address).trim()}%`;
      qb.andWhere(
        '(c.address ILIKE :address OR c.city ILIKE :address OR c.district ILIKE :address)',
        { address },
      );
    }
    if (query.supervisor) {
      qb.andWhere(
        `c.assigned_to IN (SELECT u.id FROM users u WHERE u.team_leader_id = :sup)`,
        { sup: query.supervisor },
      );
    }
    if (query.agent || query.assignedTo) {
      qb.andWhere('c.assigned_to = :agentId', { agentId: Number(query.agent || query.assignedTo) });
    }
    if (query.lifecycleStage) {
      qb.andWhere('c.lifecycle_stage = :ls', { ls: query.lifecycleStage });
    }
    this.applyLastCallFilter(qb, String(query.calledStatus || query.lastCallStatus || ''));

    // Tier filter — join customer_tiers table
    if (query.tier) {
      qb.innerJoin('customer_tiers', 'ct', 'ct.customer_id = c.id')
        .andWhere('ct.tier = :tier', { tier: query.tier });
    }

    // Product name filter — customers who ordered a specific product (Bengali + English)
    if (query.productName && String(query.productName).trim()) {
      const pName = `%${String(query.productName).trim().toLowerCase()}%`;
      qb.andWhere(
        `c.id IN (
          SELECT so.customer_id FROM sales_orders so
          WHERE so.id IN (
            SELECT oi.order_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE p.name_en ILIKE :pName OR p.name_bn ILIKE :pName
            UNION
            SELECT soi.sales_order_id FROM sales_order_items soi JOIN products p2 ON p2.id = soi.product_id WHERE p2.name_en ILIKE :pName OR p2.name_bn ILIKE :pName
          )
        )`,
        { pName },
      );
    }

    const deliveryDateExpr = `DATE(COALESCE(
      so_delivery.delivered_at,
      so_delivery.order_date::timestamp,
      so_delivery.created_at AT TIME ZONE 'Asia/Dhaka'
    ))`;
    const deliveryDateStart = String(query.deliveryDateStart || query.deliveryFrom || query.deliveryDate || '').trim();
    const deliveryDateEnd = String(query.deliveryDateEnd || query.deliveryTo || query.deliveryDate || '').trim();
    if (deliveryDateStart || deliveryDateEnd) {
      const deliveryDateConditions: string[] = [];
      const deliveryDateParams: Record<string, string> = {};
      if (deliveryDateStart) {
        deliveryDateConditions.push(`${deliveryDateExpr} >= CAST(:deliveryDateStart AS date)`);
        deliveryDateParams.deliveryDateStart = deliveryDateStart;
      }
      if (deliveryDateEnd) {
        deliveryDateConditions.push(`${deliveryDateExpr} <= CAST(:deliveryDateEnd AS date)`);
        deliveryDateParams.deliveryDateEnd = deliveryDateEnd;
      }

      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM sales_orders so_delivery
          WHERE so_delivery.customer_id = c.id
            AND LOWER(so_delivery.status::text) = 'delivered'
            AND ${deliveryDateConditions.join(' AND ')}
        )`,
        deliveryDateParams,
      );
    }

    if (assignmentShape.assignedAt && query.assignedFrom && String(query.assignedFrom).trim()) {
      qb.andWhere('DATE(c.assigned_at) >= CAST(:assignedFrom AS date)', { assignedFrom: String(query.assignedFrom).trim() });
    }
    if (assignmentShape.assignedAt && query.assignedToDate && String(query.assignedToDate).trim()) {
      qb.andWhere('DATE(c.assigned_at) <= CAST(:assignedToDate AS date)', { assignedToDate: String(query.assignedToDate).trim() });
    }

    if (query.noteSearch && String(query.noteSearch).trim()) {
      const noteSearch = `%${String(query.noteSearch).trim()}%`;
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1
            FROM crm_call_tasks t
            WHERE (t.customer_id = c.id::text OR t.customer_id = c.phone)
              AND (t.notes ILIKE :noteSearch OR t.call_reason ILIKE :noteSearch OR t.call_outcome ILIKE :noteSearch)
          )
          OR EXISTS (
            SELECT 1
            FROM customer_engagement_history eh
            WHERE (eh.customer_id = c.id::text OR eh.customer_id = c.phone)
              AND eh.engagement_type = 'call'
              AND (
                eh.message_content ILIKE :noteSearch
                OR eh.metadata::text ILIKE :noteSearch
              )
          )
          OR EXISTS (
            SELECT 1
            FROM activities a
            WHERE a.customer_id = c.id
              AND a.type = 'call'
              AND (
                a.notes ILIKE :noteSearch
                OR a.description ILIKE :noteSearch
                OR a.subject ILIKE :noteSearch
                OR a.outcome ILIKE :noteSearch
                OR a.metadata::text ILIKE :noteSearch
              )
          )
        )`,
        { noteSearch },
      );
    }

    // Order segment filter (SO-/LEG- based)
    if (query.orderSegment === 'new') {
      qb.andWhere(`EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')`);
      qb.andWhere(`NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')`);
    } else if (query.orderSegment === 'legacy') {
      qb.andWhere(`EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')`);
      qb.andWhere(`NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')`);
    } else if (query.orderSegment === 'mixed') {
      qb.andWhere(`EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'SO-%')`);
      qb.andWhere(`EXISTS (SELECT 1 FROM sales_orders so WHERE so.customer_id = c.id AND so.sales_order_number LIKE 'LEG-%')`);
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder: 'ASC' | 'DESC' = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const validSortFields: Record<string, string> = {
      createdAt: 'c.createdAt',
      name: 'c.name',
      priority: 'c.priority',
      total_spent: 'c.total_spent',
    };
    qb.orderBy(validSortFields[sortBy] || 'c.createdAt', sortOrder);

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .skip(offset)
      .take(limit)
      .getRawAndEntities();

    const items = entities.map((entity, i) => ({
      ...entity,
      tier: raw[i]?.tier ?? null,
      soCount: Number(raw[i]?.so_count ?? 0),
      legCount: Number(raw[i]?.leg_count ?? 0),
      assignedAgentName: String(raw[i]?.assigned_agent_name || '').trim() || null,
      teamLeaderId: raw[i]?.team_leader_id ? Number(raw[i].team_leader_id) : null,
      teamLeaderName: String(raw[i]?.team_leader_name || '').trim() || null,
      dataAnalystName: String(raw[i]?.data_analyst_name || '').trim() || null,
      lastDeliveryDate: raw[i]?.last_delivery_date ?? null,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Assign lead(s) directly to an agent by a Data Analyst.
   */
  async assignLeadToAgent(customerIds: number[], agentId: number, dataAnalystId: number) {
    if (!customerIds || customerIds.length === 0 || !agentId) {
      return { assigned: 0, agentId };
    }

    const agents = await this.getAgents();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error('Invalid agent ID');
    }
    const assignmentShape = await this.getAssignmentColumnShape();

    const updated = await this.customerRepository
      .createQueryBuilder()
      .update(Customer)
      .set({
        assigned_to: agentId,
        assigned_supervisor_id: agent.teamLeaderId ?? null,
        ...this.setCustomerAssignmentFields(assignmentShape, dataAnalystId),
        leadStatus: 'assigned',
      } as any)
      .where('id IN (:...ids)', { ids: customerIds })
      .execute();

    return { assigned: updated.affected || 0, agentId, teamLeaderId: agent.teamLeaderId ?? null };
  }

  /**
   * Reassign leads from one agent to another.
   */
  async reassignLeadsBetweenAgents(
    customerIds: number[],
    fromAgentId: number,
    toAgentId: number,
    dataAnalystId: number,
  ) {
    const agents = await this.getAgents();
    const targetAgent = agents.find(a => a.id === toAgentId);
    if (!targetAgent) {
      throw new Error('Invalid target agent ID');
    }
    const assignmentShape = await this.getAssignmentColumnShape();

    const updated = await this.customerRepository
      .createQueryBuilder()
      .update(Customer)
      .set({
        assigned_to: toAgentId,
        assigned_supervisor_id: targetAgent.teamLeaderId ?? null,
        ...this.setCustomerAssignmentFields(assignmentShape, dataAnalystId),
        leadStatus: 'assigned',
      } as any)
      .where('id IN (:...ids)', { ids: customerIds })
      .andWhere(fromAgentId ? 'assigned_to = :fromAgentId' : '1=1', { fromAgentId })
      .execute();

    return { reassigned: updated.affected || 0, fromAgentId, toAgentId, teamLeaderId: targetAgent.teamLeaderId ?? null };
  }

  // Unassign leads from their agent and direct assignment owner.
  async unassignLeadsFromAgent(customerIds: number[], dataAnalystId: number) {
    if (!customerIds || customerIds.length === 0) {
      return { unassigned: 0 };
    }
    const assignmentShape = await this.getAssignmentColumnShape();

    const updated = await this.customerRepository
      .createQueryBuilder()
      .update(Customer)
      .set({
        assigned_supervisor_id: null,
        assigned_to: null,
        ...this.setCustomerAssignmentFields(assignmentShape, null),
        leadStatus: 'unassigned',
      } as any)
      .where('id IN (:...ids)', { ids: customerIds })
      .execute();

    return { unassigned: updated.affected || 0 };
  }

  /**
   * Get all team leaders list with summary info
   */
  async getTeamLeadersForManager() {
    await this.cleanupInvalidTeamLeaderAssignments();
    const teamLeaders = await this.getTeamLeaders();
    return teamLeaders.map(tl => ({
      id: tl.id,
      name: `${tl.name} ${tl.lastName || ''}`.trim(),
      email: tl.email,
      phone: tl.phone,
    }));
  }

  async getAgentsForDataAnalyst() {
    const agents = await this.getAgents();
    return agents.map(agent => ({
      id: agent.id,
      name: `${agent.name} ${agent.lastName || ''}`.trim(),
      email: agent.email,
      phone: agent.phone,
      teamLeaderId: agent.teamLeaderId ?? null,
    }));
  }
}
