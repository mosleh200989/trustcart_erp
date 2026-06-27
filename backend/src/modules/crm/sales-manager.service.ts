import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { SalesTeam } from './entities/sales-team.entity';
import { User } from '../users/user.entity';
import { CallTask } from './entities/call-task.entity';
import { getDhakaDateString } from '../../common/utils/dhaka-date';
import { TenantService } from '../tenant/tenant.service';
import { TenantContext } from '../tenant/tenant.context';

interface ScheduledLeadAssignmentJob {
  id: number;
  customer_id: number;
  action: 'assign' | 'unassign';
  agent_id: number | null;
  scheduled_by: number | null;
}

@Injectable()
export class SalesManagerService implements OnModuleInit {
  private assignmentColumnShapePromise?: Promise<{ assignedBy: boolean; assignedAt: boolean }>;
  private scheduledLeadAssignmentSchemaReady?: Promise<void>;
  private leadFilterIndexesReady?: Promise<void>;
  private lastInlineScheduledLeadProcessingAt = 0;

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(SalesTeam)
    private salesTeamRepository: Repository<SalesTeam>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    private readonly tenantService: TenantService,
  ) {}

  onModuleInit() {
    console.log('Starting onModuleInit for SalesManagerService');
    console.log(`[SalesManagerService] Cleanup cron initialized. ENABLE_BACKGROUND_JOBS=${process.env.ENABLE_BACKGROUND_JOBS}`);
    console.log('Finished onModuleInit for SalesManagerService');
  }

  @Cron('0 2 * * *') // Daily at 2:00 AM
  async handleCleanupCron() {
    if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
      return;
    }
    console.log('[SalesManagerService] Starting scheduled background cleanup of invalid team leader assignments...');
    const tenants = this.tenantService.getAllTenants();
    for (const tenant of tenants) {
      if (!tenant.isActive) continue;
      await TenantContext.run(tenant.id, async () => {
        try {
          const cleanedCount = await this.cleanupInvalidTeamLeaderAssignments();
          if (cleanedCount > 0) {
            console.log(`[SalesManagerService] Cleanup completed: ${cleanedCount} assignments cleaned up for tenant ${tenant.id}.`);
          }
        } catch (err: any) {
          console.error(`[SalesManagerService] Cleanup failed for tenant ${tenant.id}:`, err?.message || err);
        }
      });
    }
  }

  @Cron('* * * * *')
  async handleScheduledLeadAssignmentsCron() {
    if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') {
      return;
    }
    const tenants = this.tenantService.getAllTenants();
    for (const tenant of tenants) {
      if (!tenant.isActive) continue;
      await TenantContext.run(tenant.id, async () => {
        try {
          await this.processDueScheduledLeadAssignments(100);
        } catch (err: any) {
          console.error(`[SalesManagerService] Scheduled lead assignment processing failed for tenant ${tenant.id}:`, err?.message || err);
        }
      });
    }
  }

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

  private async ensureScheduledLeadAssignmentSchema() {
    if (!this.scheduledLeadAssignmentSchemaReady) {
      this.scheduledLeadAssignmentSchemaReady = this.customerRepository.query(`
        CREATE TABLE IF NOT EXISTS scheduled_lead_assignments (
          id BIGSERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          action VARCHAR(20) NOT NULL CHECK (action IN ('assign', 'unassign')),
          agent_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
          scheduled_at TIMESTAMPTZ NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'cancelled')),
          scheduled_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
          processed_at TIMESTAMPTZ NULL,
          cancelled_at TIMESTAMPTZ NULL,
          error_message TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_scheduled_lead_assignments_customer
          ON scheduled_lead_assignments(customer_id);

        CREATE INDEX IF NOT EXISTS idx_scheduled_lead_assignments_pending_due
          ON scheduled_lead_assignments(status, scheduled_at)
          WHERE status = 'pending';

        CREATE INDEX IF NOT EXISTS idx_scheduled_lead_assignments_filters
          ON scheduled_lead_assignments(status, action, agent_id, scheduled_at);
      `).then(() => undefined);
    }

    return this.scheduledLeadAssignmentSchemaReady;
  }

  private async ensureLeadFilterIndexes() {
    if (!this.leadFilterIndexesReady) {
      const statements = [
        `CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_assigned_supervisor ON customers(assigned_supervisor_id)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_lifecycle_stage ON customers(lifecycle_stage)`,
        `CREATE INDEX IF NOT EXISTS idx_users_team_leader ON users(team_leader_id)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_tiers_customer_tier ON customer_tiers(customer_id, tier)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_customer_tag ON customer_tag_assignments(customer_id, tag_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_status ON sales_orders(customer_id, status)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_lower_status ON sales_orders(customer_id, LOWER(status::text))`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_number ON sales_orders(customer_id, sales_order_number)`,
        `CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_product ON sales_order_items(sales_order_id, product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_telephony_logs_order_record_outcome ON telephony_assignment_call_logs(order_id, record_type, outcome)`,
        `CREATE INDEX IF NOT EXISTS idx_crm_call_tasks_customer_outcome ON crm_call_tasks(customer_id, call_outcome)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_engagement_customer_type ON customer_engagement_history(customer_id, engagement_type)`,
        `CREATE INDEX IF NOT EXISTS idx_activities_customer_type ON activities(customer_id, type)`,
      ];
      this.leadFilterIndexesReady = (async () => {
        for (const statement of statements) {
          try {
            await this.customerRepository.query(statement);
          } catch (error: any) {
            console.warn('[SalesManagerService] Failed to ensure lead filter index:', error?.message || error);
          }
        }
      })();
    }

    return this.leadFilterIndexesReady;
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

  private normalizeCustomerIds(customerIds: number[] = []) {
    return Array.from(
      new Set(
        customerIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
  }

  private parseScheduledAt(value: string | Date) {
    const scheduledAt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error('Invalid scheduled date/time');
    }
    return scheduledAt;
  }

  async scheduleLeadAssignmentAction(input: {
    customerIds: number[];
    action: 'assign' | 'unassign';
    agentId?: number | null;
    scheduledAt: string | Date;
    scheduledBy: number;
  }) {
    await this.ensureScheduledLeadAssignmentSchema();

    const customerIds = this.normalizeCustomerIds(input.customerIds);
    if (customerIds.length === 0) {
      return { scheduled: 0 };
    }

    const action = input.action;
    if (action !== 'assign' && action !== 'unassign') {
      throw new Error('Invalid scheduled action');
    }

    const agentId = input.agentId ? Number(input.agentId) : null;
    if (action === 'assign') {
      if (!agentId) throw new Error('Agent is required for scheduled assignment');
      const agent = (await this.getAgents()).find((item) => item.id === agentId);
      if (!agent) throw new Error('Invalid agent ID');
    }

    const scheduledAt = this.parseScheduledAt(input.scheduledAt);

    await this.customerRepository.manager.transaction(async (manager) => {
      await manager.query(
        `UPDATE scheduled_lead_assignments
         SET status = 'cancelled',
             cancelled_at = NOW(),
             updated_at = NOW(),
             error_message = 'Superseded by a newer scheduled action'
         WHERE customer_id = ANY($1::int[])
           AND status = 'pending'`,
        [customerIds],
      );

      await manager.query(
        `INSERT INTO scheduled_lead_assignments
          (customer_id, action, agent_id, scheduled_at, scheduled_by)
         SELECT UNNEST($1::int[]), $2, $3, $4, $5`,
        [customerIds, action, agentId, scheduledAt, input.scheduledBy],
      );
    });

    return { scheduled: customerIds.length, action, agentId, scheduledAt };
  }

  async processDueScheduledLeadAssignments(limit = 100): Promise<{ checked: number; processed: number; failed: number }> {
    await this.ensureScheduledLeadAssignmentSchema();

    const claimJobs = () => this.customerRepository.query(
        `UPDATE scheduled_lead_assignments sla
         SET status = 'processing',
             updated_at = NOW()
         WHERE sla.id IN (
           SELECT id
           FROM scheduled_lead_assignments
           WHERE status = 'pending'
             AND scheduled_at <= NOW()
           ORDER BY scheduled_at ASC, id ASC
           LIMIT $1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, customer_id, action, agent_id, scheduled_by`,
        [Math.max(1, Math.min(Number(limit) || 100, 500))],
      ) as Promise<ScheduledLeadAssignmentJob[]>;

    let jobs: ScheduledLeadAssignmentJob[];
    try {
      jobs = await claimJobs();
    } catch (error: any) {
      if (String(error?.message || '').includes('scheduled_lead_assignments_status_check')) {
        await this.customerRepository.query(`
          ALTER TABLE scheduled_lead_assignments DROP CONSTRAINT IF EXISTS scheduled_lead_assignments_status_check;
          ALTER TABLE scheduled_lead_assignments ADD CONSTRAINT scheduled_lead_assignments_status_check
            CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'cancelled'));
        `);
        jobs = await claimJobs();
      } else {
        throw error;
      }
    }

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        if (job.action === 'assign') {
          await this.assignLeadToAgent([Number(job.customer_id)], Number(job.agent_id), Number(job.scheduled_by || 0));
        } else {
          await this.unassignLeadsFromAgent([Number(job.customer_id)], Number(job.scheduled_by || 0));
        }

        await this.customerRepository.query(
          `UPDATE scheduled_lead_assignments
           SET status = 'processed',
               processed_at = NOW(),
               updated_at = NOW(),
               error_message = NULL
           WHERE id = $1`,
          [job.id],
        );
        processed += 1;
      } catch (error: any) {
        await this.customerRepository.query(
          `UPDATE scheduled_lead_assignments
           SET status = 'failed',
               processed_at = NOW(),
               updated_at = NOW(),
               error_message = LEFT($2, 1000)
           WHERE id = $1`,
          [job.id, String(error?.message || error || 'Failed to process scheduled assignment')],
        );
        failed += 1;
      }
    }

    return { checked: jobs.length, processed, failed };
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
        qb.andWhere('c.last_contact_date >= :lastCall1mStart AND c.last_contact_date < :lastCall1mEnd', {
          lastCall1mStart: daysAgo(59),
          lastCall1mEnd: daysAgo(27),
        });
        break;
      case 'called_2months':
        qb.andWhere('c.last_contact_date >= :lastCall2mStart AND c.last_contact_date < :lastCall2mEnd', {
          lastCall2mStart: daysAgo(89),
          lastCall2mEnd: daysAgo(59),
        });
        break;
      case 'called_3months_plus':
        qb.andWhere('c.last_contact_date < :lastCall3mEnd', { lastCall3mEnd: daysAgo(89) });
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
   * Supports selectable page sizes used by the assignment table.
   */
  async getUnassignedLeads(query: any) {
    const assignmentShape = await this.getAssignmentColumnShape();
    await this.ensureLeadFilterIndexes();
    if (Date.now() - this.lastInlineScheduledLeadProcessingAt > 30000) {
      this.lastInlineScheduledLeadProcessingAt = Date.now();
      await this.processDueScheduledLeadAssignments(100);
    }

    const page = parseInt(query.page) || 1;
    const requestedLimit = parseInt(query.limit) || 50;
    const limit = Math.max(1, Math.min(requestedLimit, 2000));
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
        '(SELECT ct.tier_assigned_at FROM customer_tiers ct WHERE ct.customer_id = c.id LIMIT 1)',
        'tier_assigned_at',
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
            (
              SELECT MAX(cth.updated_at)
              FROM courier_tracking_history cth
              WHERE cth.order_id = so_delivered.id
                AND LOWER(cth.status) = 'delivered'
            ),
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
      .addSelect(
        `(SELECT sla.id FROM scheduled_lead_assignments sla WHERE sla.customer_id = c.id AND sla.status = 'pending' ORDER BY sla.scheduled_at ASC, sla.id ASC LIMIT 1)`,
        'scheduled_assignment_id',
      )
      .addSelect(
        `(SELECT sla.action FROM scheduled_lead_assignments sla WHERE sla.customer_id = c.id AND sla.status = 'pending' ORDER BY sla.scheduled_at ASC, sla.id ASC LIMIT 1)`,
        'scheduled_assignment_action',
      )
      .addSelect(
        `(SELECT sla.status FROM scheduled_lead_assignments sla WHERE sla.customer_id = c.id AND sla.status = 'pending' ORDER BY sla.scheduled_at ASC, sla.id ASC LIMIT 1)`,
        'scheduled_assignment_status',
      )
      .addSelect(
        `(SELECT sla.scheduled_at FROM scheduled_lead_assignments sla WHERE sla.customer_id = c.id AND sla.status = 'pending' ORDER BY sla.scheduled_at ASC, sla.id ASC LIMIT 1)`,
        'scheduled_assignment_at',
      )
      .addSelect(
        `(SELECT sla.agent_id FROM scheduled_lead_assignments sla WHERE sla.customer_id = c.id AND sla.status = 'pending' ORDER BY sla.scheduled_at ASC, sla.id ASC LIMIT 1)`,
        'scheduled_assignment_agent_id',
      )
      .addSelect(
        `(SELECT CONCAT(COALESCE(agent.name, ''), ' ', COALESCE(agent.last_name, '')) FROM scheduled_lead_assignments sla LEFT JOIN users agent ON agent.id = sla.agent_id WHERE sla.customer_id = c.id AND sla.status = 'pending' ORDER BY sla.scheduled_at ASC, sla.id ASC LIMIT 1)`,
        'scheduled_assignment_agent_name',
      )
      // Only customers who have at least one delivered order
      .andWhere(
        `EXISTS (
          SELECT 1
          FROM sales_orders so_delivered_base
          WHERE so_delivered_base.customer_id = c.id
            AND LOWER(so_delivered_base.status::text) = 'delivered'
        )`,
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
    if (query.orderRejectedReason && String(query.orderRejectedReason).trim()) {
      const orderRejectedReason = `%${String(query.orderRejectedReason).trim()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM sales_orders so_rejected_reason
          WHERE so_rejected_reason.customer_id = c.id
            AND LOWER(so_rejected_reason.status::text) = 'admin_cancelled'
            AND (
              so_rejected_reason.cancel_reason ILIKE :orderRejectedReason
              OR so_rejected_reason.cancelled_order_note ILIKE :orderRejectedReason
            )
        )`,
        { orderRejectedReason },
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

    const tagId = String(query.tagId || query.customerTagId || '').trim();
    if (tagId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM customer_tag_assignments cta
          WHERE cta.customer_id = c.id
            AND cta.tag_id = :tagId
        )`,
        { tagId },
      );
    }

    // Tier filter — join customer_tiers table
    if (query.tier) {
      qb.innerJoin('customer_tiers', 'ct', 'ct.customer_id = c.id')
        .andWhere('ct.tier = :tier', { tier: query.tier });
    }

    const tierUpdatedDateExpr = `DATE(ct_tier_date.tier_assigned_at AT TIME ZONE 'Asia/Dhaka')`;
    const tierUpdatedFrom = String(query.tierUpdatedFrom || query.tierUpdateStart || query.tierUpdatedStart || '').trim();
    const tierUpdatedTo = String(query.tierUpdatedTo || query.tierUpdateEnd || query.tierUpdatedEnd || '').trim();
    if (tierUpdatedFrom || tierUpdatedTo) {
      const tierUpdatedConditions: string[] = [];
      const tierUpdatedParams: Record<string, string> = {};
      if (tierUpdatedFrom) {
        tierUpdatedConditions.push(`${tierUpdatedDateExpr} >= CAST(:tierUpdatedFrom AS date)`);
        tierUpdatedParams.tierUpdatedFrom = tierUpdatedFrom;
      }
      if (tierUpdatedTo) {
        tierUpdatedConditions.push(`${tierUpdatedDateExpr} <= CAST(:tierUpdatedTo AS date)`);
        tierUpdatedParams.tierUpdatedTo = tierUpdatedTo;
      }
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM customer_tiers ct_tier_date
          WHERE ct_tier_date.customer_id = c.id
            AND ${tierUpdatedConditions.join(' AND ')}
        )`,
        tierUpdatedParams,
      );
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
      (
        SELECT MAX(cth.updated_at)
        FROM courier_tracking_history cth
        WHERE cth.order_id = so_delivery.id
          AND LOWER(cth.status) = 'delivered'
      ),
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

    const scheduledStatus = String(query.scheduledAssignmentStatus || '').trim();
    if (scheduledStatus === 'none') {
      qb.andWhere(`NOT EXISTS (SELECT 1 FROM scheduled_lead_assignments sla_filter WHERE sla_filter.customer_id = c.id AND sla_filter.status = 'pending')`);
    } else if (scheduledStatus === 'any') {
      qb.andWhere(`EXISTS (SELECT 1 FROM scheduled_lead_assignments sla_filter WHERE sla_filter.customer_id = c.id)`);
    } else if (scheduledStatus) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM scheduled_lead_assignments sla_filter
          WHERE sla_filter.customer_id = c.id
            AND sla_filter.status = :scheduledStatus
        )`,
        { scheduledStatus },
      );
    }

    const scheduledAction = String(query.scheduledAssignmentAction || '').trim();
    if (scheduledAction === 'assign' || scheduledAction === 'unassign') {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM scheduled_lead_assignments sla_filter_action
          WHERE sla_filter_action.customer_id = c.id
            AND sla_filter_action.action = :scheduledAction
            AND sla_filter_action.status = 'pending'
        )`,
        { scheduledAction },
      );
    }

    if (query.scheduledAgent && String(query.scheduledAgent).trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM scheduled_lead_assignments sla_filter_agent
          WHERE sla_filter_agent.customer_id = c.id
            AND sla_filter_agent.agent_id = :scheduledAgent
            AND sla_filter_agent.status = 'pending'
        )`,
        { scheduledAgent: Number(query.scheduledAgent) },
      );
    }

    if (query.scheduledFrom && String(query.scheduledFrom).trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM scheduled_lead_assignments sla_filter_from
          WHERE sla_filter_from.customer_id = c.id
            AND sla_filter_from.scheduled_at >= CAST(:scheduledFrom AS timestamptz)
            AND sla_filter_from.status = 'pending'
        )`,
        { scheduledFrom: String(query.scheduledFrom).trim() },
      );
    }

    if (query.scheduledTo && String(query.scheduledTo).trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM scheduled_lead_assignments sla_filter_to
          WHERE sla_filter_to.customer_id = c.id
            AND sla_filter_to.scheduled_at <= CAST(:scheduledTo AS timestamptz)
            AND sla_filter_to.status = 'pending'
        )`,
        { scheduledTo: String(query.scheduledTo).trim() },
      );
    }

    const callOutcome = String(query.callOutcome || query.outcome || '').trim();
    if (callOutcome && callOutcome !== 'all') {
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1
            FROM sales_orders so_call
            WHERE so_call.customer_id = c.id
              AND LOWER(COALESCE(so_call.telephony_outcome, '')) = LOWER(:callOutcome)
          )
          OR EXISTS (
            SELECT 1
            FROM telephony_assignment_call_logs tl
            INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
            WHERE tl.record_type = 'sales_order'
              AND so_log.customer_id = c.id
              AND LOWER(COALESCE(tl.outcome, '')) = LOWER(:callOutcome)
          )
          OR EXISTS (
            SELECT 1
            FROM crm_call_tasks t
            WHERE (t.customer_id = c.id::text OR t.customer_id = c.phone)
              AND LOWER(COALESCE(t.call_outcome, '')) = LOWER(:callOutcome)
          )
          OR EXISTS (
            SELECT 1
            FROM customer_engagement_history eh
            WHERE (eh.customer_id = c.id::text OR eh.customer_id = c.phone)
              AND eh.engagement_type = 'call'
              AND LOWER(COALESCE(eh.metadata->>'outcome', eh.metadata->>'call_outcome', '')) = LOWER(:callOutcome)
          )
          OR EXISTS (
            SELECT 1
            FROM activities a
            WHERE a.customer_id = c.id
              AND a.type = 'call'
              AND LOWER(COALESCE(a.outcome, '')) = LOWER(:callOutcome)
          )
        )`,
        { callOutcome },
      );
    }

    const productSuggestion = String(query.productSuggestion || query.suggestion || '').trim();
    if (productSuggestion && productSuggestion !== 'all') {
      const match = (alias: string, searchClause = '') =>
        searchClause ? `AND (${searchClause.replace(/__alias__/g, alias)})` : '';
      const hasProductSuggestionSql = (searchClause = '') => {
        const activitySearchSql = searchClause ? `
          OR EXISTS (
            SELECT 1
            FROM activities a_suggestion
            WHERE a_suggestion.customer_id = c.id
              AND a_suggestion.type = 'call'
              AND (
                ${searchClause.replace(/__alias__/g, 'a_suggestion.notes')}
                OR ${searchClause.replace(/__alias__/g, 'a_suggestion.description')}
                OR ${searchClause.replace(/__alias__/g, 'a_suggestion.metadata::text')}
              )
          )` : '';

        return `(
          EXISTS (
            SELECT 1
            FROM customer_product_suggestions cps_suggestion
            WHERE cps_suggestion.customer_id = c.id
              AND NULLIF(TRIM(cps_suggestion.suggestion), '') IS NOT NULL
              ${match('cps_suggestion.suggestion', searchClause)}
          )
          OR EXISTS (
            SELECT 1
            FROM sales_orders so_suggestion
            WHERE so_suggestion.customer_id = c.id
              AND NULLIF(TRIM(so_suggestion.telephony_suggestion), '') IS NOT NULL
              ${match('so_suggestion.telephony_suggestion', searchClause)}
          )
          OR EXISTS (
            SELECT 1
            FROM telephony_assignment_call_logs tl_suggestion
            INNER JOIN sales_orders so_log_suggestion ON so_log_suggestion.id = tl_suggestion.order_id
            WHERE tl_suggestion.record_type = 'sales_order'
              AND so_log_suggestion.customer_id = c.id
              AND NULLIF(TRIM(tl_suggestion.suggestion), '') IS NOT NULL
              ${match('tl_suggestion.suggestion', searchClause)}
          )
          OR EXISTS (
            SELECT 1
            FROM customer_engagement_history eh_suggestion
            WHERE (eh_suggestion.customer_id = c.id::text OR eh_suggestion.customer_id = c.phone)
              AND eh_suggestion.engagement_type = 'call'
              AND (
                NULLIF(TRIM(eh_suggestion.metadata->>'product_suggestion'), '') IS NOT NULL
                OR NULLIF(TRIM(eh_suggestion.metadata->>'productSuggestion'), '') IS NOT NULL
                OR NULLIF(TRIM(eh_suggestion.metadata->>'suggestion'), '') IS NOT NULL
              )
              ${searchClause ? `AND (
                ${searchClause.replace(/__alias__/g, 'eh_suggestion.message_content')}
                OR ${searchClause.replace(/__alias__/g, "eh_suggestion.metadata->>'product_suggestion'")}
                OR ${searchClause.replace(/__alias__/g, "eh_suggestion.metadata->>'productSuggestion'")}
                OR ${searchClause.replace(/__alias__/g, "eh_suggestion.metadata->>'suggestion'")}
              )` : ''}
          )
          ${activitySearchSql}
        )`;
      };

      if (productSuggestion === '__any__') {
        qb.andWhere(hasProductSuggestionSql());
      } else if (productSuggestion === '__none__') {
        qb.andWhere(`NOT ${hasProductSuggestionSql()}`);
      } else {
        const productSuggestionSearch = `%${productSuggestion}%`;
        const searchClause = `__alias__ ILIKE :productSuggestionSearch`;
        qb.andWhere(
          hasProductSuggestionSql(searchClause),
          { productSuggestionSearch },
        );
      }
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
      tierAssignedAt: raw[i]?.tier_assigned_at ?? null,
      soCount: Number(raw[i]?.so_count ?? 0),
      legCount: Number(raw[i]?.leg_count ?? 0),
      assignedAgentName: String(raw[i]?.assigned_agent_name || '').trim() || null,
      teamLeaderId: raw[i]?.team_leader_id ? Number(raw[i].team_leader_id) : null,
      teamLeaderName: String(raw[i]?.team_leader_name || '').trim() || null,
      dataAnalystName: String(raw[i]?.data_analyst_name || '').trim() || null,
      lastDeliveryDate: raw[i]?.last_delivery_date ?? null,
      scheduledAssignmentId: raw[i]?.scheduled_assignment_id ? Number(raw[i].scheduled_assignment_id) : null,
      scheduledAssignmentAction: raw[i]?.scheduled_assignment_action ?? null,
      scheduledAssignmentStatus: raw[i]?.scheduled_assignment_status ?? null,
      scheduledAssignmentAt: raw[i]?.scheduled_assignment_at ?? null,
      scheduledAssignmentAgentId: raw[i]?.scheduled_assignment_agent_id ? Number(raw[i].scheduled_assignment_agent_id) : null,
      scheduledAssignmentAgentName: String(raw[i]?.scheduled_assignment_agent_name || '').trim() || null,
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

  async getCustomerTagsForLeadFilters() {
    return this.customerRepository.manager.query(
      `SELECT id, name, color
       FROM customer_tags
       ORDER BY LOWER(name) ASC`,
    );
  }
}
