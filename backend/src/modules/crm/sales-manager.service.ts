import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { User } from '../users/user.entity';
import { CallTask } from './entities/call-task.entity';

@Injectable()
export class SalesManagerService {
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
   * Get all team leaders under the Sales Manager's oversight
   */
  private async getTeamLeaders(): Promise<User[]> {
    const tlRole = await this.usersRepository.manager
      .createQueryBuilder()
      .select('r.id', 'id')
      .from('roles', 'r')
      .where("r.slug = :slug OR LOWER(r.name) LIKE :pattern", {
        slug: 'sales-team-leader',
        pattern: '%team leader%',
      })
      .getRawOne();

    if (!tlRole) return [];

    return await this.usersRepository.find({
      where: { roleId: tlRole.id, status: 'active' as any },
    });
  }

  /**
   * Main dashboard data for Sales Manager
   */
  async getDashboard() {
    const teamLeaders = await this.getTeamLeaders();
    const tlIds = teamLeaders.map(tl => tl.id);

    // Overall KPIs
    const totalCustomers = await this.customerRepository.count();
    const totalLeads = await this.customerRepository.count({ where: { lifecycleStage: 'lead' } });
    const totalConverted = await this.customerRepository.count({ where: { lifecycleStage: 'customer' } });
    const conversionRate = totalCustomers > 0 ? Math.round((totalConverted / totalCustomers) * 100) : 0;

    // Unassigned leads (no supervisor assigned)
    const unassignedLeads = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.lifecycle_stage = :stage', { stage: 'lead' })
      .andWhere('(c.assigned_supervisor_id IS NULL)')
      .getCount();

    // Escalated leads
    const escalatedCount = await this.customerRepository.count({ where: { is_escalated: true } as any });

    // Team leader performance
    const teamLeaderStats = [];
    for (const tl of teamLeaders) {
      // Customers under this TL
      const agentIds = (await this.usersRepository.find({ where: { teamLeaderId: tl.id } })).map(u => u.id);
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
      const today = new Date().toISOString().split('T')[0];
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
   * Get leads for assignment page (all leads, with optional supervisor filter)
   * Supports large page sizes (200, 500, 750, 1000, 2000)
   */
  async getUnassignedLeads(query: any) {
    const page = parseInt(query.page) || 1;
    const allowedLimits = [20, 200, 500, 750, 1000, 2000];
    const requestedLimit = parseInt(query.limit) || 200;
    const limit = allowedLimits.includes(requestedLimit) ? requestedLimit : 200;
    const offset = (page - 1) * limit;

    const qb = this.customerRepository.createQueryBuilder('c')
      .select([
        'c.id', 'c.name', 'c.lastName', 'c.email', 'c.phone',
        'c.priority', 'c.customerType', 'c.lifecycleStage',
        'c.assigned_supervisor_id', 'c.assigned_to',
        'c.city', 'c.district', 'c.source', 'c.createdAt', 'c.updatedAt',
        'c.last_contact_date', 'c.total_spent',
      ])
      .addSelect(
        '(SELECT ct.tier FROM customer_tiers ct WHERE ct.customer_id = c.id LIMIT 1)',
        'tier',
      )
      // Only customers who have at least one delivered order
      .andWhere(
        `c.id IN (SELECT so.customer_id FROM sales_orders so WHERE LOWER(so.status::text) = 'delivered')`,
      );

    // Assignment status filter
    if (query.assignmentStatus === 'unassigned' || query.unassignedOnly === 'true' || query.unassignedOnly === true) {
      qb.where('c.assigned_supervisor_id IS NULL');
    } else if (query.assignmentStatus === 'assigned') {
      qb.where('c.assigned_supervisor_id IS NOT NULL');
    }

    if (query.priority) {
      qb.andWhere('c.priority = :priority', { priority: query.priority });
    }
    if (query.search) {
      qb.andWhere(
        '(c.name ILIKE :s OR c.last_name ILIKE :s OR c.email ILIKE :s OR c.phone ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.supervisor) {
      qb.andWhere('c.assigned_supervisor_id = :sup', { sup: query.supervisor });
    }
    if (query.lifecycleStage) {
      qb.andWhere('c.lifecycle_stage = :ls', { ls: query.lifecycleStage });
    }

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
            SELECT oi.order_id FROM order_items oi WHERE LOWER(oi.product_name) LIKE :pName
            UNION
            SELECT soi.sales_order_id FROM sales_order_items soi WHERE LOWER(soi.product_name) LIKE :pName
          )
        )`,
        { pName },
      );
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
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Assign lead(s) to a team leader
   */
  async assignLeadToTeamLeader(customerIds: number[], teamLeaderId: number, managerId: number) {
    // Verify the target is actually a team leader
    const teamLeaders = await this.getTeamLeaders();
    const isValidTL = teamLeaders.some(tl => tl.id === teamLeaderId);
    if (!isValidTL) {
      throw new Error('Invalid team leader ID');
    }

    const updated = await this.customerRepository
      .createQueryBuilder()
      .update(Customer)
      .set({ assigned_supervisor_id: teamLeaderId } as any)
      .where('id IN (:...ids)', { ids: customerIds })
      .execute();

    return { assigned: updated.affected || 0, teamLeaderId };
  }

  /**
   * Reassign leads from one TL to another
   */
  async reassignLeadsBetweenTeamLeaders(
    customerIds: number[],
    fromTeamLeaderId: number,
    toTeamLeaderId: number,
    managerId: number,
  ) {
    const teamLeaders = await this.getTeamLeaders();
    const validTo = teamLeaders.some(tl => tl.id === toTeamLeaderId);
    if (!validTo) {
      throw new Error('Invalid target team leader ID');
    }

    const updated = await this.customerRepository
      .createQueryBuilder()
      .update(Customer)
      .set({ assigned_supervisor_id: toTeamLeaderId } as any)
      .where('id IN (:...ids)', { ids: customerIds })
      .execute();

    return { reassigned: updated.affected || 0, fromTeamLeaderId, toTeamLeaderId };
  }

  // Unassign leads from their team leader (set assigned_supervisor_id AND assigned_to to null)
  async unassignLeadsFromTeamLeader(customerIds: number[], managerId: number) {
    if (!customerIds || customerIds.length === 0) {
      return { unassigned: 0 };
    }

    const updated = await this.customerRepository
      .createQueryBuilder()
      .update(Customer)
      .set({ assigned_supervisor_id: null, assigned_to: null } as any)
      .where('id IN (:...ids)', { ids: customerIds })
      .execute();

    return { unassigned: updated.affected || 0 };
  }

  /**
   * Get all team leaders list with summary info
   */
  async getTeamLeadersForManager() {
    const teamLeaders = await this.getTeamLeaders();
    return teamLeaders.map(tl => ({
      id: tl.id,
      name: `${tl.name} ${tl.lastName || ''}`.trim(),
      email: tl.email,
      phone: tl.phone,
    }));
  }
}
