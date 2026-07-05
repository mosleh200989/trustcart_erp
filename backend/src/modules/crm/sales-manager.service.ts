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
  private customerProductSuggestionsSchemaReady?: Promise<void>;
  private leadFilterIndexesReady?: Promise<void>;

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

  private userHasRoleSql(userAlias: string, roleWhereSql: (roleAlias: string) => string) {
    return `(
      EXISTS (
        SELECT 1
        FROM roles primary_role
        WHERE primary_role.id = ${userAlias}.role_id
          AND primary_role.is_active = true
          AND (${roleWhereSql('primary_role')})
      )
      OR EXISTS (
        SELECT 1
        FROM user_roles extra_user_role
        INNER JOIN roles extra_role ON extra_role.id = extra_user_role.role_id
        WHERE extra_user_role.user_id = ${userAlias}.id
          AND extra_role.is_active = true
          AND (${roleWhereSql('extra_role')})
      )
    )`;
  }

  private assignableAgentSql(userAlias: string) {
    return `(
      ${this.userHasRoleSql(
        userAlias,
        (roleAlias) => `LOWER(COALESCE(${roleAlias}.slug, '')) IN ('sales-executive', 'sales-agent', 'agent', 'executive')
          OR LOWER(COALESCE(${roleAlias}.slug, '')) LIKE '%sales-executive%'
          OR LOWER(COALESCE(${roleAlias}.slug, '')) LIKE '%sales-agent%'
          OR LOWER(COALESCE(${roleAlias}.name, '')) IN ('sales executive', 'sales agent', 'agent', 'executive')
          OR LOWER(COALESCE(${roleAlias}.name, '')) LIKE '%sales executive%'
          OR LOWER(COALESCE(${roleAlias}.name, '')) LIKE '%sales agent%'
          OR LOWER(COALESCE(${roleAlias}.name, '')) LIKE '%executive%'`,
      )}
      OR ${userAlias}.team_leader_id IS NOT NULL
    )`;
  }

  private async getTeamLeaders(): Promise<User[]> {
    const tlRoleId = await this.getTeamLeaderRoleId();

    if (!tlRoleId) return [];

    return await this.usersRepository.find({
      where: { roleId: tlRoleId, status: 'active' as any, isDeleted: false } as any,
    });
  }

  private async getAgents(): Promise<User[]> {
    const rows = await this.usersRepository.manager.query(
      `SELECT
          u.id,
          u.name,
          u.last_name AS "lastName",
          u.email,
          u.phone,
          u.role_id AS "roleId",
          u.team_leader_id AS "teamLeaderId",
          u.team_id AS "teamId",
          u.agent_tier AS "agentTier",
          u.status,
          u.is_deleted AS "isDeleted"
       FROM users u
       WHERE COALESCE(u.is_deleted, false) = false
         AND (u.status IS NULL OR LOWER(u.status::text) = 'active')
         AND ${this.assignableAgentSql('u')}
       ORDER BY LOWER(COALESCE(u.name, '')) ASC, LOWER(COALESCE(u.last_name, '')) ASC, u.id ASC`,
    );

    return rows as User[];
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

  private async ensureCustomerProductSuggestionsSchema() {
    if (!this.customerProductSuggestionsSchemaReady) {
      this.customerProductSuggestionsSchemaReady = this.customerRepository.query(`
        CREATE TABLE IF NOT EXISTS customer_product_suggestions (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          product_id INTEGER NULL REFERENCES products(id) ON DELETE SET NULL,
          suggestion TEXT NOT NULL,
          created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_customer_product_suggestions_customer
          ON customer_product_suggestions(customer_id);

        CREATE INDEX IF NOT EXISTS idx_customer_product_suggestions_product
          ON customer_product_suggestions(product_id);

        CREATE INDEX IF NOT EXISTS idx_customer_product_suggestions_updated
          ON customer_product_suggestions(updated_at DESC);
      `).then(() => undefined);
    }

    return this.customerProductSuggestionsSchemaReady;
  }

  private async ensureLeadFilterIndexes() {
    if (!this.leadFilterIndexesReady) {
      const statements = [
        `CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_assigned_supervisor ON customers(assigned_supervisor_id)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_lifecycle_stage ON customers(lifecycle_stage)`,
        `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
        `CREATE INDEX IF NOT EXISTS idx_users_team_leader ON users(team_leader_id)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_tiers_customer_tier ON customer_tiers(customer_id, tier)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_customer_tag ON customer_tag_assignments(customer_id, tag_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_status ON sales_orders(customer_id, status)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_lower_status ON sales_orders(customer_id, LOWER(status::text))`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_number ON sales_orders(customer_id, sales_order_number)`,
        `CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_product ON sales_order_items(sales_order_id, product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_telephony_logs_order_record_outcome ON telephony_assignment_call_logs(order_id, record_type, outcome)`,
        `CREATE INDEX IF NOT EXISTS idx_telephony_logs_record_called_at ON telephony_assignment_call_logs(record_type, called_at, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_telephony_called ON sales_orders(customer_id, telephony_called_at)`,
        `CREATE INDEX IF NOT EXISTS idx_sales_orders_phone_telephony_called ON sales_orders(customer_phone, telephony_called_at)`,
        `CREATE INDEX IF NOT EXISTS idx_incomplete_orders_customer_telephony_called ON incomplete_orders(customer_id, telephony_called_at)`,
        `CREATE INDEX IF NOT EXISTS idx_incomplete_orders_phone_telephony_called ON incomplete_orders(phone, telephony_called_at)`,
        `CREATE INDEX IF NOT EXISTS idx_order_activity_logs_action_order_created ON order_activity_logs(action_type, order_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_crm_call_tasks_customer_outcome ON crm_call_tasks(customer_id, call_outcome)`,
        `CREATE INDEX IF NOT EXISTS idx_crm_call_tasks_customer_dates ON crm_call_tasks(customer_id, completed_at, updated_at, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_engagement_customer_type ON customer_engagement_history(customer_id, engagement_type)`,
        `CREATE INDEX IF NOT EXISTS idx_customer_engagement_customer_created ON customer_engagement_history(customer_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_activities_customer_type ON activities(customer_id, type)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_engagement_customer_type_created ON customer_engagement_history(customer_id, engagement_type, created_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_customer_type_created ON activities(customer_id, type, created_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telephony_logs_record_order_called ON telephony_assignment_call_logs(record_type, order_id, called_at, created_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_activity_logs_order_action_created ON order_activity_logs(order_id, action_type, created_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_last_contact_date ON customers(last_contact_date)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_tiers_tier_customer ON customer_tiers(tier, customer_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_tiers_customer_assigned_at ON customer_tiers(customer_id, tier_assigned_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_orders_customer_order_dates ON sales_orders(customer_id, order_date, created_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_orders_customer_delivered_at ON sales_orders(customer_id, delivered_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_lead_assignments_customer_status_date ON scheduled_lead_assignments(customer_id, status, scheduled_at)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_lead_assignments_customer_status_action ON scheduled_lead_assignments(customer_id, status, action)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_lead_assignments_customer_status_agent ON scheduled_lead_assignments(customer_id, status, agent_id)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courier_tracking_history_order_delivered ON courier_tracking_history(order_id, LOWER(status::text), updated_at DESC)`,
        `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_product_suggestions_suggestion_trgm ON customer_product_suggestions USING gin (suggestion gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_last_name_trgm ON customers USING gin (last_name gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_phone_trgm ON customers USING gin (phone gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_address_trgm ON customers USING gin (address gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_en_trgm ON products USING gin (name_en gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_bn_trgm ON products USING gin (name_bn gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops)`,
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

  private getCustomerLastCallAtSql(customerAlias = 'c') {
    const customerId = `${customerAlias}.id`;
    const customerPhone = `${customerAlias}.phone`;

    return `(
      SELECT MAX(call_at)
      FROM (
        SELECT ${customerAlias}.last_contact_date::timestamp AS call_at
        WHERE ${customerAlias}.last_contact_date IS NOT NULL

        UNION ALL
        SELECT COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
        FROM crm_call_tasks t
        WHERE COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL
          AND (
            t.customer_id = ${customerId}::text
            OR t.customer_id = ${customerPhone}
          )

        UNION ALL
        SELECT eh.created_at::timestamp AS call_at
        FROM customer_engagement_history eh
        WHERE eh.created_at IS NOT NULL
          AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')
          AND (
            eh.customer_id = ${customerId}::text
            OR eh.customer_id = ${customerPhone}
          )

        UNION ALL
        SELECT a.created_at::timestamp AS call_at
        FROM activities a
        WHERE a.created_at IS NOT NULL
          AND a.type = 'call'
          AND a.customer_id = ${customerId}

        UNION ALL
        SELECT COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
        FROM telephony_assignment_call_logs tl
        INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
        WHERE tl.record_type = 'sales_order'
          AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL
          AND (
            so_log.customer_id = ${customerId}
            OR so_log.customer_phone = ${customerPhone}
          )

        UNION ALL
        SELECT COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
        FROM telephony_assignment_call_logs tli
        INNER JOIN incomplete_orders io_log ON io_log.id = tli.order_id
        WHERE tli.record_type = 'incomplete_order'
          AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL
          AND (
            io_log.customer_id = ${customerId}
            OR io_log.phone = ${customerPhone}
          )

        UNION ALL
        SELECT oal.created_at::timestamp AS call_at
        FROM order_activity_logs oal
        INNER JOIN sales_orders so_activity ON so_activity.id = oal.order_id
        WHERE oal.action_type = 'telephony_call_logged'
          AND oal.created_at IS NOT NULL
          AND (
            so_activity.customer_id = ${customerId}
            OR so_activity.customer_phone = ${customerPhone}
          )

        UNION ALL
        SELECT so_telephony.telephony_called_at::timestamp AS call_at
        FROM sales_orders so_telephony
        WHERE so_telephony.telephony_called_at IS NOT NULL
          AND (
            so_telephony.customer_id = ${customerId}
            OR so_telephony.customer_phone = ${customerPhone}
          )

        UNION ALL
        SELECT io_telephony.telephony_called_at::timestamp AS call_at
        FROM incomplete_orders io_telephony
        WHERE io_telephony.telephony_called_at IS NOT NULL
          AND (
            io_telephony.customer_id = ${customerId}
            OR io_telephony.phone = ${customerPhone}
          )
      ) customer_call_sources
    )`;
  }

  private getCustomerLastCallAggregateSql() {
    return `
      SELECT customer_id, MAX(call_at) AS last_call_at
      FROM (
        SELECT c.id AS customer_id, c.last_contact_date::timestamp AS call_at
        FROM customers c
        WHERE c.last_contact_date IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
        FROM crm_call_tasks t
        INNER JOIN customers c ON t.customer_id = c.id::text
        WHERE COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
        FROM crm_call_tasks t
        INNER JOIN customers c ON t.customer_id = c.phone
        WHERE c.phone IS NOT NULL
          AND COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, eh.created_at::timestamp AS call_at
        FROM customer_engagement_history eh
        INNER JOIN customers c ON eh.customer_id = c.id::text
        WHERE eh.created_at IS NOT NULL
          AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')

        UNION ALL
        SELECT c.id AS customer_id, eh.created_at::timestamp AS call_at
        FROM customer_engagement_history eh
        INNER JOIN customers c ON eh.customer_id = c.phone
        WHERE c.phone IS NOT NULL
          AND eh.created_at IS NOT NULL
          AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')

        UNION ALL
        SELECT c.id AS customer_id, a.created_at::timestamp AS call_at
        FROM activities a
        INNER JOIN customers c ON a.customer_id = c.id
        WHERE a.created_at IS NOT NULL
          AND a.type = 'call'

        UNION ALL
        SELECT so_log.customer_id AS customer_id, COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
        FROM telephony_assignment_call_logs tl
        INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
        WHERE tl.record_type = 'sales_order'
          AND so_log.customer_id IS NOT NULL
          AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
        FROM telephony_assignment_call_logs tl
        INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
        INNER JOIN customers c ON c.phone = so_log.customer_phone
        WHERE tl.record_type = 'sales_order'
          AND c.phone IS NOT NULL
          AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL

        UNION ALL
        SELECT io_log.customer_id AS customer_id, COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
        FROM telephony_assignment_call_logs tli
        INNER JOIN incomplete_orders io_log ON io_log.id = tli.order_id
        WHERE tli.record_type = 'incomplete_order'
          AND io_log.customer_id IS NOT NULL
          AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
        FROM telephony_assignment_call_logs tli
        INNER JOIN incomplete_orders io_log ON io_log.id = tli.order_id
        INNER JOIN customers c ON c.phone = io_log.phone
        WHERE tli.record_type = 'incomplete_order'
          AND c.phone IS NOT NULL
          AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL

        UNION ALL
        SELECT so_activity.customer_id AS customer_id, oal.created_at::timestamp AS call_at
        FROM order_activity_logs oal
        INNER JOIN sales_orders so_activity ON so_activity.id = oal.order_id
        WHERE oal.action_type = 'telephony_call_logged'
          AND so_activity.customer_id IS NOT NULL
          AND oal.created_at IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, oal.created_at::timestamp AS call_at
        FROM order_activity_logs oal
        INNER JOIN sales_orders so_activity ON so_activity.id = oal.order_id
        INNER JOIN customers c ON c.phone = so_activity.customer_phone
        WHERE oal.action_type = 'telephony_call_logged'
          AND c.phone IS NOT NULL
          AND oal.created_at IS NOT NULL

        UNION ALL
        SELECT so_telephony.customer_id AS customer_id, so_telephony.telephony_called_at::timestamp AS call_at
        FROM sales_orders so_telephony
        WHERE so_telephony.customer_id IS NOT NULL
          AND so_telephony.telephony_called_at IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, so_telephony.telephony_called_at::timestamp AS call_at
        FROM sales_orders so_telephony
        INNER JOIN customers c ON c.phone = so_telephony.customer_phone
        WHERE c.phone IS NOT NULL
          AND so_telephony.telephony_called_at IS NOT NULL

        UNION ALL
        SELECT io_telephony.customer_id AS customer_id, io_telephony.telephony_called_at::timestamp AS call_at
        FROM incomplete_orders io_telephony
        WHERE io_telephony.customer_id IS NOT NULL
          AND io_telephony.telephony_called_at IS NOT NULL

        UNION ALL
        SELECT c.id AS customer_id, io_telephony.telephony_called_at::timestamp AS call_at
        FROM incomplete_orders io_telephony
        INNER JOIN customers c ON c.phone = io_telephony.phone
        WHERE c.phone IS NOT NULL
          AND io_telephony.telephony_called_at IS NOT NULL
      ) customer_call_sources
      GROUP BY customer_id
    `;
  }

  private async getLatestCallTimesForCustomers(customerIds: number[]) {
    const ids = this.normalizeCustomerIds(customerIds);
    const lastCallByCustomerId = new Map<number, Date | string>();
    if (ids.length === 0) return lastCallByCustomerId;

    const rows = await this.customerRepository.query(
      `
      WITH selected_customers AS (
        SELECT
          c.id,
          NULLIF(TRIM(c.phone), '') AS phone,
          c.last_contact_date
        FROM customers c
        WHERE c.id = ANY($1::int[])
      ),
      call_sources AS (
        SELECT sc.id AS customer_id, sc.last_contact_date::timestamp AS call_at
        FROM selected_customers sc
        WHERE sc.last_contact_date IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN crm_call_tasks t
          ON t.customer_id = sc.id::text
        WHERE COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN crm_call_tasks t
          ON t.customer_id = sc.phone
        WHERE sc.phone IS NOT NULL
          AND COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, eh.created_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN customer_engagement_history eh
          ON eh.customer_id = sc.id::text
        WHERE eh.created_at IS NOT NULL
          AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')

        UNION ALL
        SELECT sc.id AS customer_id, eh.created_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN customer_engagement_history eh
          ON eh.customer_id = sc.phone
        WHERE sc.phone IS NOT NULL
          AND eh.created_at IS NOT NULL
          AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')

        UNION ALL
        SELECT sc.id AS customer_id, a.created_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN activities a
          ON a.customer_id = sc.id
        WHERE a.created_at IS NOT NULL
          AND a.type = 'call'

        UNION ALL
        SELECT sc.id AS customer_id, COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN sales_orders so_log
          ON so_log.customer_id = sc.id
        INNER JOIN telephony_assignment_call_logs tl
          ON tl.order_id = so_log.id
         AND tl.record_type = 'sales_order'
        WHERE COALESCE(tl.called_at, tl.created_at) IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN sales_orders so_log
          ON so_log.customer_phone = sc.phone
        INNER JOIN telephony_assignment_call_logs tl
          ON tl.order_id = so_log.id
         AND tl.record_type = 'sales_order'
        WHERE sc.phone IS NOT NULL
          AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN incomplete_orders io_log
          ON io_log.customer_id = sc.id
        INNER JOIN telephony_assignment_call_logs tli
          ON tli.order_id = io_log.id
         AND tli.record_type = 'incomplete_order'
        WHERE COALESCE(tli.called_at, tli.created_at) IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN incomplete_orders io_log
          ON io_log.phone = sc.phone
        INNER JOIN telephony_assignment_call_logs tli
          ON tli.order_id = io_log.id
         AND tli.record_type = 'incomplete_order'
        WHERE sc.phone IS NOT NULL
          AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, oal.created_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN sales_orders so_activity
          ON so_activity.customer_id = sc.id
        INNER JOIN order_activity_logs oal
          ON oal.order_id = so_activity.id
         AND oal.action_type = 'telephony_call_logged'
        WHERE oal.created_at IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, oal.created_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN sales_orders so_activity
          ON so_activity.customer_phone = sc.phone
        INNER JOIN order_activity_logs oal
          ON oal.order_id = so_activity.id
         AND oal.action_type = 'telephony_call_logged'
        WHERE sc.phone IS NOT NULL
          AND oal.created_at IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, so_telephony.telephony_called_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN sales_orders so_telephony
          ON so_telephony.customer_id = sc.id
        WHERE so_telephony.telephony_called_at IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, so_telephony.telephony_called_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN sales_orders so_telephony
          ON so_telephony.customer_phone = sc.phone
        WHERE sc.phone IS NOT NULL
          AND so_telephony.telephony_called_at IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, io_telephony.telephony_called_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN incomplete_orders io_telephony
          ON io_telephony.customer_id = sc.id
        WHERE io_telephony.telephony_called_at IS NOT NULL

        UNION ALL
        SELECT sc.id AS customer_id, io_telephony.telephony_called_at::timestamp AS call_at
        FROM selected_customers sc
        INNER JOIN incomplete_orders io_telephony
          ON io_telephony.phone = sc.phone
        WHERE sc.phone IS NOT NULL
          AND io_telephony.telephony_called_at IS NOT NULL
      )
      SELECT customer_id, MAX(call_at) AS last_call_at
      FROM call_sources
      GROUP BY customer_id
      `,
      [ids],
    );

    for (const row of rows || []) {
      const customerId = Number(row.customer_id);
      if (Number.isInteger(customerId) && row.last_call_at) {
        lastCallByCustomerId.set(customerId, row.last_call_at);
      }
    }

    return lastCallByCustomerId;
  }

  private getCustomerCallExistsSql(
    customerAlias = 'c',
    datePredicate?: (callAtSql: string) => string,
  ) {
    const customerId = `${customerAlias}.id`;
    const customerPhone = `${customerAlias}.phone`;
    const extra = (callAtSql: string) => (datePredicate ? ` AND ${datePredicate(callAtSql)}` : '');

    return `(
      (
        ${customerAlias}.last_contact_date IS NOT NULL
        ${extra(`${customerAlias}.last_contact_date::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM crm_call_tasks t
        WHERE COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL
          AND (t.customer_id = ${customerId}::text OR t.customer_id = ${customerPhone})
          ${extra(`COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM customer_engagement_history eh
        WHERE eh.created_at IS NOT NULL
          AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')
          AND (eh.customer_id = ${customerId}::text OR eh.customer_id = ${customerPhone})
          ${extra(`eh.created_at::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM activities a
        WHERE a.created_at IS NOT NULL
          AND a.type = 'call'
          AND a.customer_id = ${customerId}
          ${extra(`a.created_at::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM telephony_assignment_call_logs tl
        INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
        WHERE tl.record_type = 'sales_order'
          AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL
          AND (so_log.customer_id = ${customerId} OR so_log.customer_phone = ${customerPhone})
          ${extra(`COALESCE(tl.called_at, tl.created_at)::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM telephony_assignment_call_logs tli
        INNER JOIN incomplete_orders io_log ON io_log.id = tli.order_id
        WHERE tli.record_type = 'incomplete_order'
          AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL
          AND (io_log.customer_id = ${customerId} OR io_log.phone = ${customerPhone})
          ${extra(`COALESCE(tli.called_at, tli.created_at)::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM order_activity_logs oal
        INNER JOIN sales_orders so_activity ON so_activity.id = oal.order_id
        WHERE oal.action_type = 'telephony_call_logged'
          AND oal.created_at IS NOT NULL
          AND (so_activity.customer_id = ${customerId} OR so_activity.customer_phone = ${customerPhone})
          ${extra(`oal.created_at::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM sales_orders so_telephony
        WHERE so_telephony.telephony_called_at IS NOT NULL
          AND (so_telephony.customer_id = ${customerId} OR so_telephony.customer_phone = ${customerPhone})
          ${extra(`so_telephony.telephony_called_at::timestamp`)}
      )
      OR EXISTS (
        SELECT 1
        FROM incomplete_orders io_telephony
        WHERE io_telephony.telephony_called_at IS NOT NULL
          AND (io_telephony.customer_id = ${customerId} OR io_telephony.phone = ${customerPhone})
          ${extra(`io_telephony.telephony_called_at::timestamp`)}
      )
    )`;
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

    const today = getDhakaDateString();
    const tomorrow = (() => {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      return date.toISOString().slice(0, 10);
    })();
    const daysAgo = (days: number) => {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() - days);
      return date.toISOString().slice(0, 10);
    };

    const lastCallAtSql = 'c.last_contact_date';
    const hasLastCallSql = `${lastCallAtSql} IS NOT NULL`;
    const lastCallBeforeSql = (paramName: string) => `(${lastCallAtSql} IS NULL OR ${lastCallAtSql} < CAST(:${paramName} AS timestamp))`;
    const lastCallInRangeSql = (startParam: string, endParam: string) =>
      `${lastCallAtSql} >= CAST(:${startParam} AS timestamp) AND ${lastCallAtSql} < CAST(:${endParam} AS timestamp)`;

    switch (calledStatus) {
      case 'called':
        qb.andWhere(hasLastCallSql);
        break;
      case 'called_today':
        qb.andWhere(lastCallInRangeSql('lastCallToday', 'lastCallTomorrow'), {
          lastCallToday: today,
          lastCallTomorrow: tomorrow,
        });
        break;
      case 'called_yesterday':
        qb.andWhere(lastCallInRangeSql('lastCallYesterday', 'lastCallToday'), {
          lastCallYesterday: daysAgo(1),
          lastCallToday: today,
        });
        break;
      case 'called_1week':
        qb.andWhere(lastCallInRangeSql('lastCall1wStart', 'lastCall1wEnd'), {
          lastCall1wStart: daysAgo(13),
          lastCall1wEnd: daysAgo(6),
        });
        break;
      case 'called_2weeks':
        qb.andWhere(lastCallInRangeSql('lastCall2wStart', 'lastCall2wEnd'), {
          lastCall2wStart: daysAgo(20),
          lastCall2wEnd: daysAgo(13),
        });
        break;
      case 'called_3weeks':
        qb.andWhere(lastCallInRangeSql('lastCall3wStart', 'lastCall3wEnd'), {
          lastCall3wStart: daysAgo(27),
          lastCall3wEnd: daysAgo(20),
        });
        break;
      case 'called_1month':
        qb.andWhere(lastCallInRangeSql('lastCall1mStart', 'lastCall1mEnd'), {
          lastCall1mStart: daysAgo(59),
          lastCall1mEnd: daysAgo(27),
        });
        break;
      case 'called_2months':
        qb.andWhere(lastCallInRangeSql('lastCall2mStart', 'lastCall2mEnd'), {
          lastCall2mStart: daysAgo(89),
          lastCall2mEnd: daysAgo(59),
        });
        break;
      case 'called_3months_plus':
        qb.andWhere(hasLastCallSql)
          .andWhere(`${lastCallAtSql} < CAST(:lastCall3mEnd AS timestamp)`, { lastCall3mEnd: daysAgo(89) });
        break;
      case 'not_called':
      case 'not_called_today':
        qb.andWhere(lastCallBeforeSql('lastCallToday'), { lastCallToday: today });
        break;
      case 'not_called_week':
        qb.andWhere(lastCallBeforeSql('lastCallWeekAgo'), {
          lastCallWeekAgo: daysAgo(6),
        });
        break;
      case 'never':
        qb.andWhere(`${lastCallAtSql} IS NULL`);
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
  async getDashboard(params: { period?: string; startDate?: string; endDate?: string } = {}) {
    await this.ensureCustomerProductSuggestionsSchema();

    const today = getDhakaDateString();
    const isDateString = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
    const addDays = (dateString: string, days: number) => {
      const date = new Date(`${dateString}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const startOfMonth = (dateString: string) => `${dateString.slice(0, 7)}-01`;
    const startOfYear = (dateString: string) => `${dateString.slice(0, 4)}-01-01`;
    const period = ['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(String(params.period || ''))
      ? String(params.period)
      : 'monthly';
    let startDate = isDateString(params.startDate) ? String(params.startDate) : startOfMonth(today);
    let endDate = isDateString(params.endDate) ? String(params.endDate) : today;
    if (period === 'daily') {
      startDate = today;
      endDate = today;
    } else if (period === 'weekly') {
      startDate = addDays(today, -6);
      endDate = today;
    } else if (period === 'monthly' && !isDateString(params.startDate)) {
      startDate = startOfMonth(today);
      endDate = today;
    } else if (period === 'yearly' && !isDateString(params.startDate)) {
      startDate = startOfYear(today);
      endDate = today;
    }
    if (startDate > endDate) {
      [startDate, endDate] = [endDate, startDate];
    }
    const rangeDays = Math.max(1, Math.round((new Date(`${endDate}T00:00:00.000Z`).getTime() - new Date(`${startDate}T00:00:00.000Z`).getTime()) / 86400000) + 1);
    const previousEndDate = addDays(startDate, -1);
    const previousStartDate = addDays(previousEndDate, -(rangeDays - 1));
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

    // Recent escalations: select only stable columns because older databases may not
    // have optional assignment audit columns mapped on the Customer entity.
    const recentEscalations = await this.customerRepository
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c.name AS name',
        'c.email AS email',
        'c.phone AS phone',
        'c.escalated_at AS escalated_at',
        'c.assigned_supervisor_id AS assigned_supervisor_id',
      ])
      .where('c.is_escalated = true')
      .orderBy('c.escalated_at', 'DESC')
      .limit(10)
      .getRawMany();

    const [
      leadsBySourceRows,
      leadStatusFunnelRows,
      agentPerformanceRows,
      leadQualityRows,
      unassignedSourceRows,
      unassignedAgeRows,
      recentActivityRows,
      duplicateLeadRows,
      leadVerificationRows,
      leadScoringRows,
      lossReasonRows,
    ] = await Promise.all([
      this.customerRepository.query(`
        SELECT COALESCE(NULLIF(TRIM(source), ''), 'Unknown') AS label,
               COUNT(*)::int AS count
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
          AND COALESCE(c.lifecycle_stage, 'lead') = 'lead'
          AND NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')
          AND (c.customer_type IS NULL OR c.customer_type != 'rejected')
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 10
      `),
      this.customerRepository.query(`
        SELECT status AS label,
               COUNT(*)::int AS count
        FROM (
          SELECT CASE
            WHEN COALESCE(c.lifecycle_stage, '') = 'customer' THEN 'Converted'
            WHEN LOWER(COALESCE(c.lead_status, '')) IN ('lost', 'not_interested') THEN 'Lost'
            WHEN c.assigned_to IS NULL THEN 'Unassigned'
            WHEN c.last_contact_date IS NOT NULL THEN 'Contacted'
            WHEN c.assigned_to IS NOT NULL THEN 'Assigned'
            ELSE 'New'
          END AS status
          FROM customers c
          WHERE COALESCE(c.is_deleted, false) = false
            AND NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')
            AND (c.customer_type IS NULL OR c.customer_type != 'rejected')
        ) funnel
        GROUP BY status
        ORDER BY CASE status
          WHEN 'New' THEN 1
          WHEN 'Unassigned' THEN 2
          WHEN 'Assigned' THEN 3
          WHEN 'Contacted' THEN 4
          WHEN 'Converted' THEN 5
          WHEN 'Lost' THEN 6
          ELSE 7
        END
      `),
      this.customerRepository.query(`
        SELECT u.id,
               TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
               TRIM(CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, ''))) AS team_leader_name,
               COUNT(DISTINCT c.id)::int AS assigned_leads,
               COUNT(DISTINCT CASE WHEN COALESCE(c.lifecycle_stage, '') = 'customer' THEN c.id END)::int AS converted_leads,
               COUNT(DISTINCT CASE WHEN c.last_contact_date IS NOT NULL THEN c.id END)::int AS contacted_leads,
               COUNT(DISTINCT CASE WHEN t.created_at >= CURRENT_DATE THEN t.id END)::int AS calls_today,
               COUNT(DISTINCT CASE WHEN t.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN t.id END)::int AS calls_month
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN users tl ON tl.id = u.team_leader_id
        LEFT JOIN customers c ON c.assigned_to = u.id AND COALESCE(c.is_deleted, false) = false
        LEFT JOIN crm_call_tasks t ON t.assigned_agent_id = u.id
        WHERE r.slug = 'sales-executive'
          AND u.status = 'active'
          AND COALESCE(u.is_deleted, false) = false
        GROUP BY u.id, u.name, u.last_name, tl.name, tl.last_name
        ORDER BY converted_leads DESC, assigned_leads DESC, calls_month DESC, name ASC
        LIMIT 12
      `),
      this.customerRepository.query(`
        SELECT COALESCE(NULLIF(priority::text, ''), 'unrated') AS label,
               COUNT(*)::int AS count
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
          AND COALESCE(c.lifecycle_stage, 'lead') = 'lead'
          AND NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')
          AND (c.customer_type IS NULL OR c.customer_type != 'rejected')
        GROUP BY 1
        ORDER BY CASE COALESCE(NULLIF(priority::text, ''), 'unrated')
          WHEN 'hot' THEN 1
          WHEN 'warm' THEN 2
          WHEN 'cold' THEN 3
          ELSE 4
        END
      `),
      this.customerRepository.query(`
        SELECT COALESCE(NULLIF(TRIM(source), ''), 'Unknown') AS label,
               COUNT(*)::int AS count
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
          AND COALESCE(c.lifecycle_stage, 'lead') = 'lead'
          AND c.assigned_to IS NULL
          AND NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')
          AND (c.customer_type IS NULL OR c.customer_type != 'rejected')
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 8
      `),
      this.customerRepository.query(`
        SELECT bucket AS label,
               COUNT(*)::int AS count
        FROM (
          SELECT CASE
            WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN '0-7 days'
            WHEN c.created_at >= NOW() - INTERVAL '14 days' THEN '8-14 days'
            WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN '15-30 days'
            ELSE '30+ days'
          END AS bucket
          FROM customers c
          WHERE COALESCE(c.is_deleted, false) = false
            AND COALESCE(c.lifecycle_stage, 'lead') = 'lead'
            AND c.assigned_to IS NULL
            AND NOT EXISTS (SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = c.id AND ct.tier = 'rejected')
            AND (c.customer_type IS NULL OR c.customer_type != 'rejected')
        ) queue
        GROUP BY bucket
        ORDER BY CASE bucket
          WHEN '0-7 days' THEN 1
          WHEN '8-14 days' THEN 2
          WHEN '15-30 days' THEN 3
          ELSE 4
        END
      `),
      this.customerRepository.query(`
        SELECT *
        FROM (
          SELECT 'Call Task' AS type,
                 COALESCE(c.name, CONCAT('Customer #', t.customer_id)) AS customer_name,
                 c.phone AS customer_phone,
                 COALESCE(t.call_outcome, t.status, t.call_reason, 'Task updated') AS detail,
                 TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))) AS actor_name,
                 t.updated_at AS activity_at
          FROM crm_call_tasks t
          LEFT JOIN customers c ON c.id::text = t.customer_id
          LEFT JOIN users u ON u.id = t.assigned_agent_id
          UNION ALL
          SELECT INITCAP(REPLACE(COALESCE(eh.engagement_type, 'engagement'), '_', ' ')) AS type,
                 COALESCE(c.name, CONCAT('Customer #', eh.customer_id)) AS customer_name,
                 c.phone AS customer_phone,
                 COALESCE(eh.status, eh.channel, 'Engagement recorded') AS detail,
                 TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))) AS actor_name,
                 eh.created_at AS activity_at
          FROM customer_engagement_history eh
          LEFT JOIN customers c ON c.id::text = eh.customer_id
          LEFT JOIN users u ON u.id = eh.agent_id
          UNION ALL
          SELECT INITCAP(REPLACE(COALESCE(a.type, 'activity'), '_', ' ')) AS type,
                 COALESCE(c.name, 'Unknown customer') AS customer_name,
                 c.phone AS customer_phone,
                 COALESCE(a.outcome, a.subject, a.description, 'Activity recorded') AS detail,
                 TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))) AS actor_name,
                 a.created_at AS activity_at
          FROM activities a
          LEFT JOIN customers c ON c.id = a.customer_id
          LEFT JOIN users u ON u.id = a.user_id
        ) activity
        WHERE activity_at IS NOT NULL
        ORDER BY activity_at DESC
        LIMIT 12
      `),
      this.customerRepository.query(`
        WITH normalized AS (
          SELECT id, name, phone, email,
                 NULLIF(REGEXP_REPLACE(REPLACE(COALESCE(phone, ''), '+88', ''), '\\D', '', 'g'), '') AS phone_key,
                 NULLIF(LOWER(TRIM(COALESCE(email, ''))), '') AS email_key
          FROM customers
          WHERE COALESCE(is_deleted, false) = false
        ),
        duplicate_groups AS (
          SELECT 'Phone' AS kind,
                 phone_key AS match_key,
                 COUNT(*)::int AS count,
                 JSONB_AGG(JSONB_BUILD_OBJECT('id', id, 'name', name, 'phone', phone, 'email', email) ORDER BY id DESC) AS customers
          FROM normalized
          WHERE phone_key IS NOT NULL
          GROUP BY phone_key
          HAVING COUNT(*) > 1
          UNION ALL
          SELECT 'Email' AS kind,
                 email_key AS match_key,
                 COUNT(*)::int AS count,
                 JSONB_AGG(JSONB_BUILD_OBJECT('id', id, 'name', name, 'phone', phone, 'email', email) ORDER BY id DESC) AS customers
          FROM normalized
          WHERE email_key IS NOT NULL
          GROUP BY email_key
          HAVING COUNT(*) > 1
        )
        SELECT *
        FROM duplicate_groups
        ORDER BY count DESC, kind ASC
        LIMIT 10
      `),
      this.customerRepository.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(CASE WHEN NULLIF(REGEXP_REPLACE(REPLACE(COALESCE(phone, ''), '+88', ''), '\\D', '', 'g'), '') IS NOT NULL THEN 1 END)::int AS phone_present,
               COUNT(CASE WHEN NULLIF(TRIM(COALESCE(email, '')), '') IS NOT NULL THEN 1 END)::int AS email_present,
               COUNT(CASE WHEN NULLIF(TRIM(COALESCE(address, '')), '') IS NOT NULL OR NULLIF(TRIM(COALESCE(district, '')), '') IS NOT NULL THEN 1 END)::int AS address_present,
               COUNT(CASE WHEN NULLIF(TRIM(COALESCE(name, '')), '') IS NOT NULL THEN 1 END)::int AS name_present,
               COUNT(CASE WHEN last_contact_date IS NOT NULL THEN 1 END)::int AS contacted,
               COUNT(CASE WHEN NULLIF(REGEXP_REPLACE(REPLACE(COALESCE(phone, ''), '+88', ''), '\\D', '', 'g'), '') IS NOT NULL
                         AND NULLIF(TRIM(COALESCE(name, '')), '') IS NOT NULL
                         AND (NULLIF(TRIM(COALESCE(address, '')), '') IS NOT NULL OR NULLIF(TRIM(COALESCE(district, '')), '') IS NOT NULL)
                    THEN 1 END)::int AS verified
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
          AND COALESCE(c.lifecycle_stage, 'lead') = 'lead'
      `),
      this.customerRepository.query(`
        WITH scored AS (
          SELECT LEAST(100,
            CASE COALESCE(priority::text, '')
              WHEN 'hot' THEN 40
              WHEN 'warm' THEN 25
              WHEN 'cold' THEN 10
              ELSE 15
            END
            + CASE WHEN NULLIF(REGEXP_REPLACE(REPLACE(COALESCE(phone, ''), '+88', ''), '\\D', '', 'g'), '') IS NOT NULL THEN 15 ELSE 0 END
            + CASE WHEN NULLIF(TRIM(COALESCE(name, '')), '') IS NOT NULL THEN 10 ELSE 0 END
            + CASE WHEN NULLIF(TRIM(COALESCE(address, '')), '') IS NOT NULL OR NULLIF(TRIM(COALESCE(district, '')), '') IS NOT NULL THEN 10 ELSE 0 END
            + CASE WHEN last_contact_date IS NOT NULL THEN 10 ELSE 0 END
            + CASE WHEN COALESCE(total_spent, 0) > 0 THEN 15 ELSE 0 END
          ) AS score
          FROM customers c
          WHERE COALESCE(c.is_deleted, false) = false
            AND COALESCE(c.lifecycle_stage, 'lead') = 'lead'
        )
        SELECT label,
               COUNT(*)::int AS count,
               ROUND(AVG(score), 1)::float AS average_score
        FROM (
          SELECT score,
                 CASE
                   WHEN score >= 80 THEN 'High Intent'
                   WHEN score >= 55 THEN 'Qualified'
                   WHEN score >= 30 THEN 'Needs Nurture'
                   ELSE 'Low Signal'
                 END AS label
          FROM scored
        ) bucketed
        GROUP BY label
        ORDER BY CASE
          WHEN label = 'High Intent' THEN 1
          WHEN label = 'Qualified' THEN 2
          WHEN label = 'Needs Nurture' THEN 3
          ELSE 4
        END
      `),
      this.customerRepository.query(`
        WITH reasons AS (
          SELECT COALESCE(NULLIF(TRIM(lead_status), ''), NULL) AS reason
          FROM customers
          WHERE LOWER(COALESCE(lead_status, '')) IN ('lost', 'not_interested', 'no_answer', 'rejected')
          UNION ALL
          SELECT COALESCE(NULLIF(TRIM(call_outcome), ''), NULL) AS reason
          FROM crm_call_tasks
          WHERE LOWER(COALESCE(call_outcome, '')) IN ('not_interested', 'wrong_number', 'no_answer', 'customer_hung_up', 'line_busy', 'number_switched_off')
          UNION ALL
          SELECT COALESCE(NULLIF(TRIM(lost_reason), ''), NULL) AS reason
          FROM deals
          WHERE NULLIF(TRIM(COALESCE(lost_reason, '')), '') IS NOT NULL
        )
        SELECT INITCAP(REPLACE(reason, '_', ' ')) AS label,
               COUNT(*)::int AS count
        FROM reasons
        WHERE reason IS NOT NULL
        GROUP BY reason
        ORDER BY count DESC, label ASC
        LIMIT 8
      `),
    ]);

    const toNumber = (value: any) => Number(value || 0);
    const mapCountRows = (rows: any[]) => rows.map((row) => ({
      label: row.label || 'Unknown',
      count: toNumber(row.count),
    }));
    const verification = leadVerificationRows?.[0] || {};
    const verificationTotal = toNumber(verification.total);
    const percentChange = (current: number, previous: number) => {
      if (!previous && !current) return 0;
      if (!previous) return 100;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const [
      topDashboardRow,
      salesSummaryRow,
      salesTrendRows,
      trendingProductRows,
      customerSummaryRow,
      tierRows,
      churnRow,
      callOutcomeRows,
      followUpRow,
      crossSellRow,
      upsellRow,
      bestProductRows,
      slowProductRows,
      districtRows,
      cityRows,
      foreignLocationRow,
      leaderAgentRows,
    ] = await Promise.all([
      this.customerRepository.query(`
        WITH all_calls AS (
          SELECT called_at AS call_at, outcome
          FROM telephony_assignment_call_logs
          WHERE called_at IS NOT NULL
          UNION ALL
          SELECT COALESCE(completed_at, updated_at, created_at) AS call_at, call_outcome AS outcome
          FROM crm_call_tasks
          WHERE COALESCE(completed_at, updated_at, created_at) IS NOT NULL
        ),
        normalized_today_calls AS (
          SELECT REGEXP_REPLACE(LOWER(COALESCE(outcome, '')), '[^a-z0-9]+', '_', 'g') AS normalized_outcome
          FROM all_calls
          WHERE DATE(call_at) = $1::date
        ),
        selected_leads AS (
          SELECT COUNT(*)::int AS total
          FROM customers c
          WHERE COALESCE(c.is_deleted, false) = false
            AND DATE(c.created_at) >= $2::date
            AND DATE(c.created_at) <= $3::date
        ),
        confirmed_orders AS (
          SELECT COUNT(DISTINCT o.id)::int AS total
          FROM sales_orders o
          WHERE DATE(o.order_date) >= $2::date
            AND DATE(o.order_date) <= $3::date
            AND LOWER(COALESCE(o.status::text, '')) IN ('approved', 'sent', 'picked', 'in_transit', 'shipped', 'delivered', 'completed', 'partial_delivered')
        )
        SELECT
          (SELECT COUNT(*)::int FROM customers c WHERE COALESCE(c.is_deleted, false) = false) AS total_customers,
          (SELECT COUNT(*)::int FROM customers c WHERE COALESCE(c.is_deleted, false) = false AND DATE(c.created_at) = $1::date) AS todays_new_customers,
          (SELECT COUNT(*)::int FROM normalized_today_calls) AS todays_calls,
          (SELECT COUNT(*)::int FROM normalized_today_calls WHERE normalized_outcome IN ('connected_talked_to_customer', 'connected_spoke_with_customer', 'connected', 'order_confirmed', 'order_placed', 'whatsapp_message_sent', 'connected_on_whatsapp', 'connected_whatsapp')) AS successful_calls,
          (SELECT COUNT(*)::int FROM normalized_today_calls WHERE normalized_outcome IN ('no_answer', 'no_answer_ringing', 'line_busy', 'busy_line_engaged', 'number_switched_off', 'wrong_number', 'customer_hung_up_call_cut', 'customer_hung_up', 'call_cut', 'unreachable', 'customer_unreachable')) AS failed_calls,
          (SELECT COUNT(*)::int FROM sales_orders o WHERE DATE(o.order_date) = $1::date) AS todays_orders,
          COALESCE((SELECT confirmed_orders.total FROM confirmed_orders), 0) AS confirmed_orders,
          COALESCE((SELECT selected_leads.total FROM selected_leads), 0) AS selected_leads,
          (SELECT COUNT(*)::int
           FROM (
             SELECT o.customer_id
             FROM sales_orders o
             WHERE o.customer_id IS NOT NULL
               AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed')
             GROUP BY o.customer_id
             HAVING COUNT(*) >= 3
           ) repeat_customers) AS repeat_customers
      `, [today, startDate, endDate]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        SELECT
          COUNT(*) FILTER (WHERE DATE(order_date) >= $1::date AND DATE(order_date) <= $2::date)::int AS current_orders,
          COALESCE(SUM(total_amount) FILTER (WHERE DATE(order_date) >= $1::date AND DATE(order_date) <= $2::date), 0)::numeric AS current_revenue,
          COUNT(*) FILTER (WHERE DATE(order_date) >= $3::date AND DATE(order_date) <= $4::date)::int AS previous_orders,
          COALESCE(SUM(total_amount) FILTER (WHERE DATE(order_date) >= $3::date AND DATE(order_date) <= $4::date), 0)::numeric AS previous_revenue
        FROM sales_orders
      `, [startDate, endDate, previousStartDate, previousEndDate]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        SELECT DATE(o.order_date)::text AS date,
               COUNT(*)::int AS orders,
               COALESCE(SUM(o.total_amount), 0)::numeric AS revenue
        FROM sales_orders o
        WHERE DATE(o.order_date) >= $1::date
          AND DATE(o.order_date) <= $2::date
        GROUP BY DATE(o.order_date)
        ORDER BY DATE(o.order_date) ASC
      `, [startDate, endDate]),
      this.customerRepository.query(`
        WITH item_rows AS (
          SELECT
            CASE WHEN DATE(o.order_date) >= $1::date AND DATE(o.order_date) <= $2::date THEN 'current' ELSE 'previous' END AS period,
            COALESCE(NULLIF(TRIM(p.name_en), ''), NULLIF(TRIM(soi.product_name), ''), 'Product') AS product_name,
            COALESCE(soi.quantity, 0) AS quantity,
            COALESCE(soi.line_total, soi.unit_price * soi.quantity, 0) AS amount
          FROM sales_order_items soi
          INNER JOIN sales_orders o ON o.id = soi.sales_order_id
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE DATE(o.order_date) >= $3::date
            AND DATE(o.order_date) <= $2::date
            AND NOT EXISTS (SELECT 1 FROM order_items oi_existing WHERE oi_existing.order_id = o.id)
          UNION ALL
          SELECT
            CASE WHEN DATE(o.order_date) >= $1::date AND DATE(o.order_date) <= $2::date THEN 'current' ELSE 'previous' END AS period,
            COALESCE(NULLIF(TRIM(p.name_en), ''), NULLIF(TRIM(oi.product_name), ''), 'Product') AS product_name,
            COALESCE(oi.quantity, 0) AS quantity,
            COALESCE(oi.subtotal, oi.unit_price * oi.quantity, 0) AS amount
          FROM order_items oi
          INNER JOIN sales_orders o ON o.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE DATE(o.order_date) >= $3::date
            AND DATE(o.order_date) <= $2::date
        ),
        grouped AS (
          SELECT product_name,
                 COALESCE(SUM(quantity) FILTER (WHERE period = 'current'), 0)::numeric AS current_qty,
                 COALESCE(SUM(quantity) FILTER (WHERE period = 'previous'), 0)::numeric AS previous_qty,
                 COALESCE(SUM(amount) FILTER (WHERE period = 'current'), 0)::numeric AS current_amount
          FROM item_rows
          GROUP BY product_name
        )
        SELECT product_name AS label,
               current_qty::int AS count,
               current_amount AS amount,
               CASE
                 WHEN previous_qty = 0 AND current_qty = 0 THEN 0
                 WHEN previous_qty = 0 THEN 100
                 ELSE ROUND(((current_qty - previous_qty) / previous_qty) * 100, 1)
               END AS change_percent
        FROM grouped
        WHERE current_qty > 0
        ORDER BY current_qty DESC, current_amount DESC, product_name ASC
        LIMIT 3
      `, [startDate, endDate, previousStartDate]),
      this.customerRepository.query(`
        SELECT
          COUNT(*)::int AS total_customers,
          COUNT(*) FILTER (WHERE DATE(c.created_at) >= $1::date AND DATE(c.created_at) <= $2::date)::int AS new_customers,
          COUNT(*) FILTER (WHERE REGEXP_REPLACE(COALESCE(c.phone, ''), '\\D', '', 'g') NOT LIKE '8801%' AND REGEXP_REPLACE(COALESCE(c.phone, ''), '\\D', '', 'g') NOT LIKE '01%')::int AS foreign_customers,
          COUNT(*) FILTER (WHERE COALESCE(c.customer_type, '') = 'rejected' OR COALESCE(ct.tier, '') = 'rejected')::int AS blacklisted_customers,
          (SELECT COUNT(*)::int
           FROM (
             SELECT o.customer_id
             FROM sales_orders o
             WHERE o.customer_id IS NOT NULL
               AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed')
             GROUP BY o.customer_id
             HAVING COUNT(*) >= 3
           ) repeat_customers) AS repeat_customers
        FROM customers c
        LEFT JOIN customer_tiers ct ON ct.customer_id = c.id
        WHERE COALESCE(c.is_deleted, false) = false
      `, [startDate, endDate]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        SELECT COALESCE(NULLIF(TRIM(ct.tier), ''), 'No Tier') AS label,
               COUNT(*)::int AS count
        FROM customers c
        LEFT JOIN customer_tiers ct ON ct.customer_id = c.id
        WHERE COALESCE(c.is_deleted, false) = false
        GROUP BY 1
        ORDER BY count DESC, label ASC
      `),
      this.customerRepository.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE EXISTS (SELECT 1 FROM sales_orders so_any WHERE so_any.customer_id = c.id)
              AND NOT EXISTS (
                SELECT 1 FROM sales_orders so_recent
                WHERE so_recent.customer_id = c.id
                  AND DATE(so_recent.order_date) >= ($1::date - INTERVAL '30 days')
              )
          )::int AS no_orders_30_days,
          COUNT(*) FILTER (
            WHERE c.last_contact_date IS NULL
               OR DATE(c.last_contact_date) < ($1::date - INTERVAL '30 days')
          )::int AS no_calls_30_days
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
      `, [today]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        WITH all_calls AS (
          SELECT called_at AS call_at, outcome
          FROM telephony_assignment_call_logs
          WHERE called_at IS NOT NULL
          UNION ALL
          SELECT COALESCE(completed_at, updated_at, created_at) AS call_at, call_outcome AS outcome
          FROM crm_call_tasks
          WHERE COALESCE(completed_at, updated_at, created_at) IS NOT NULL
        )
        SELECT COALESCE(NULLIF(TRIM(outcome), ''), 'Unknown') AS label,
               COUNT(*)::int AS count
        FROM all_calls
        WHERE DATE(call_at) >= $1::date
          AND DATE(call_at) <= $2::date
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 12
      `, [startDate, endDate]),
      this.customerRepository.query(`
        SELECT
          COUNT(*) FILTER (WHERE DATE(task_date) >= $1::date AND DATE(task_date) <= $2::date)::int AS total,
          COUNT(*) FILTER (WHERE DATE(task_date) = $3::date)::int AS today,
          COUNT(*) FILTER (WHERE DATE(task_date) = ($3::date + INTERVAL '1 day')::date)::int AS tomorrow,
          COUNT(*) FILTER (WHERE DATE(task_date) < $3::date AND LOWER(COALESCE(status, '')) NOT IN ('completed', 'skipped'))::int AS overdue,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE DATE(task_date) > $3::date AND LOWER(COALESCE(status, '')) IN ('pending', 'in_progress'))::int AS reminders
        FROM crm_call_tasks
      `, [startDate, endDate, today]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        WITH suggested AS (
          SELECT DISTINCT customer_id
          FROM customer_product_suggestions
          WHERE DATE(created_at) >= $1::date
            AND DATE(created_at) <= $2::date
        ),
        successful AS (
          SELECT DISTINCT o.customer_id
          FROM sales_orders o
          INNER JOIN order_items oi ON oi.order_id = o.id
          WHERE o.customer_id IS NOT NULL
            AND COALESCE(oi.is_cross_sell, false) = true
            AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed', 'partial_delivered')
            AND DATE(o.order_date) >= $1::date
            AND DATE(o.order_date) <= $2::date
        )
        SELECT
          COUNT(*) FILTER (WHERE s.customer_id IN (SELECT customer_id FROM successful))::int AS success,
          COUNT(*) FILTER (WHERE s.customer_id NOT IN (SELECT customer_id FROM successful))::int AS failed
        FROM suggested s
      `, [startDate, endDate]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        WITH order_flags AS (
          SELECT o.id,
                 BOOL_OR(COALESCE(oi.is_upsell, false)) OR COALESCE(o.thank_you_offer_accepted, false) AS has_upsell
          FROM sales_orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE DATE(o.order_date) >= $1::date
            AND DATE(o.order_date) <= $2::date
            AND LOWER(COALESCE(o.status::text, '')) NOT IN ('admin_cancelled', 'cancelled', 'returned')
          GROUP BY o.id, o.thank_you_offer_accepted
        )
        SELECT
          COUNT(*) FILTER (WHERE has_upsell)::int AS success,
          COUNT(*) FILTER (WHERE NOT has_upsell)::int AS failed
        FROM order_flags
      `, [startDate, endDate]).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        WITH items AS (
          SELECT COALESCE(NULLIF(TRIM(p.name_en), ''), NULLIF(TRIM(soi.product_name), ''), 'Product') AS product_name,
                 COALESCE(soi.quantity, 0) AS quantity,
                 COALESCE(soi.line_total, soi.unit_price * soi.quantity, 0) AS amount
          FROM sales_order_items soi
          INNER JOIN sales_orders o ON o.id = soi.sales_order_id
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE DATE(o.order_date) >= $1::date
            AND DATE(o.order_date) <= $2::date
            AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed', 'partial_delivered')
            AND NOT EXISTS (SELECT 1 FROM order_items oi_existing WHERE oi_existing.order_id = o.id)
          UNION ALL
          SELECT COALESCE(NULLIF(TRIM(p.name_en), ''), NULLIF(TRIM(oi.product_name), ''), 'Product') AS product_name,
                 COALESCE(oi.quantity, 0) AS quantity,
                 COALESCE(oi.subtotal, oi.unit_price * oi.quantity, 0) AS amount
          FROM order_items oi
          INNER JOIN sales_orders o ON o.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE DATE(o.order_date) >= $1::date
            AND DATE(o.order_date) <= $2::date
            AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed', 'partial_delivered')
        )
        SELECT product_name AS label,
               COALESCE(SUM(quantity), 0)::int AS count,
               COALESCE(SUM(amount), 0)::numeric AS amount
        FROM items
        GROUP BY product_name
        ORDER BY count DESC, amount DESC, product_name ASC
        LIMIT 3
      `, [startDate, endDate]),
      this.customerRepository.query(`
        WITH sold AS (
          SELECT COALESCE(soi.product_id, 0) AS product_id, COALESCE(SUM(soi.quantity), 0) AS qty
          FROM sales_order_items soi
          INNER JOIN sales_orders o ON o.id = soi.sales_order_id
          WHERE DATE(o.order_date) >= $1::date
            AND DATE(o.order_date) <= $2::date
            AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed', 'partial_delivered')
            AND NOT EXISTS (SELECT 1 FROM order_items oi_existing WHERE oi_existing.order_id = o.id)
          GROUP BY soi.product_id
          UNION ALL
          SELECT COALESCE(oi.product_id, 0) AS product_id, COALESCE(SUM(oi.quantity), 0) AS qty
          FROM order_items oi
          INNER JOIN sales_orders o ON o.id = oi.order_id
          WHERE DATE(o.order_date) >= $1::date
            AND DATE(o.order_date) <= $2::date
            AND LOWER(COALESCE(o.status::text, '')) IN ('delivered', 'completed', 'partial_delivered')
          GROUP BY oi.product_id
        ),
        product_totals AS (
          SELECT product_id, SUM(qty) AS qty FROM sold GROUP BY product_id
        )
        SELECT COALESCE(NULLIF(TRIM(p.name_en), ''), CONCAT('Product #', p.id)) AS label,
               COALESCE(pt.qty, 0)::int AS count
        FROM products p
        LEFT JOIN product_totals pt ON pt.product_id = p.id
        WHERE COALESCE(p.status, 'active') = 'active'
        ORDER BY COALESCE(pt.qty, 0) ASC, p.name_en ASC
        LIMIT 3
      `, [startDate, endDate]),
      this.customerRepository.query(`
        SELECT COALESCE(NULLIF(TRIM(district), ''), 'Unknown') AS label,
               COUNT(*)::int AS count
        FROM sales_orders o
        WHERE DATE(o.order_date) >= $1::date
          AND DATE(o.order_date) <= $2::date
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 8
      `, [startDate, endDate]),
      this.customerRepository.query(`
        SELECT COALESCE(NULLIF(TRIM(city), ''), 'Unknown') AS label,
               COUNT(*)::int AS count
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
          AND DATE(c.created_at) >= $1::date
          AND DATE(c.created_at) <= $2::date
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 8
      `, [startDate, endDate]),
      this.customerRepository.query(`
        SELECT COUNT(*)::int AS count
        FROM customers c
        WHERE COALESCE(c.is_deleted, false) = false
          AND REGEXP_REPLACE(COALESCE(c.phone, ''), '\\D', '', 'g') NOT LIKE '8801%'
          AND REGEXP_REPLACE(COALESCE(c.phone, ''), '\\D', '', 'g') NOT LIKE '01%'
      `).then((rows) => rows?.[0] || {}),
      this.customerRepository.query(`
        WITH call_logs AS (
          SELECT caller_user_id AS agent_id,
                 REGEXP_REPLACE(LOWER(COALESCE(outcome, '')), '[^a-z0-9]+', '_', 'g') AS normalized_outcome
          FROM telephony_assignment_call_logs
          WHERE caller_user_id IS NOT NULL
            AND DATE(called_at) >= $1::date
            AND DATE(called_at) <= $2::date
          UNION ALL
          SELECT assigned_agent_id AS agent_id,
                 REGEXP_REPLACE(LOWER(COALESCE(call_outcome, '')), '[^a-z0-9]+', '_', 'g') AS normalized_outcome
          FROM crm_call_tasks
          WHERE assigned_agent_id IS NOT NULL
            AND DATE(COALESCE(completed_at, updated_at, created_at)) >= $1::date
            AND DATE(COALESCE(completed_at, updated_at, created_at)) <= $2::date
        ),
        call_stats AS (
          SELECT agent_id,
                 COUNT(*)::int AS total_dialed,
                 COUNT(*) FILTER (WHERE normalized_outcome IN ('connected_talked_to_customer', 'connected_spoke_with_customer', 'connected', 'order_confirmed', 'order_placed', 'whatsapp_message_sent', 'connected_on_whatsapp', 'connected_whatsapp'))::int AS connected_customers,
                 COUNT(*) FILTER (WHERE normalized_outcome IN ('callback_requested_call_later', 'callback_requested', 'call_later'))::int AS interested_customers
          FROM call_logs
          GROUP BY agent_id
        ),
        confirmed_orders AS (
          SELECT created_by AS agent_id,
                 COUNT(*)::int AS order_confirmed
          FROM sales_orders
          WHERE created_by IS NOT NULL
            AND DATE(order_date) >= $1::date
            AND DATE(order_date) <= $2::date
            AND LOWER(COALESCE(status::text, '')) IN ('approved', 'sent', 'picked', 'in_transit', 'shipped', 'delivered', 'completed', 'partial_delivered')
          GROUP BY created_by
        )
        SELECT
          COALESCE(tl.id, 0)::int AS team_leader_id,
          COALESCE(NULLIF(TRIM(CONCAT(COALESCE(tl.name, ''), ' ', COALESCE(tl.last_name, ''))), ''), 'No Team Leader') AS team_leader_name,
          u.id::int AS agent_id,
          COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))), ''), CONCAT('Agent #', u.id)) AS agent_name,
          COUNT(DISTINCT c.id)::int AS assigned_leads,
          COALESCE(cs.total_dialed, 0)::int AS total_dialed,
          COALESCE(cs.connected_customers, 0)::int AS connected_customers,
          COALESCE(cs.interested_customers, 0)::int AS interested_customers,
          COALESCE(co.order_confirmed, 0)::int AS order_confirmed
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN users tl ON tl.id = u.team_leader_id
        LEFT JOIN customers c ON c.assigned_to = u.id AND COALESCE(c.is_deleted, false) = false
        LEFT JOIN call_stats cs ON cs.agent_id = u.id
        LEFT JOIN confirmed_orders co ON co.agent_id = u.id
        WHERE r.slug = 'sales-executive'
          AND u.status = 'active'
          AND COALESCE(u.is_deleted, false) = false
        GROUP BY tl.id, tl.name, tl.last_name, u.id, u.name, u.last_name, cs.total_dialed, cs.connected_customers, cs.interested_customers, co.order_confirmed
        ORDER BY team_leader_name ASC, order_confirmed DESC, connected_customers DESC, assigned_leads DESC, agent_name ASC
      `, [startDate, endDate]),
    ]);

    const currentRevenue = toNumber(salesSummaryRow.current_revenue);
    const currentOrders = toNumber(salesSummaryRow.current_orders);
    const previousRevenue = toNumber(salesSummaryRow.previous_revenue);
    const previousOrders = toNumber(salesSummaryRow.previous_orders);
    const currentAov = currentOrders ? currentRevenue / currentOrders : 0;
    const previousAov = previousOrders ? previousRevenue / previousOrders : 0;
    const selectedLeads = toNumber(topDashboardRow.selected_leads);
    const confirmedOrders = toNumber(topDashboardRow.confirmed_orders);
    const teamLeaderMap = new Map<number, { id: number; name: string; agents: any[] }>();
    for (const row of leaderAgentRows) {
      const leaderId = toNumber(row.team_leader_id);
      if (!teamLeaderMap.has(leaderId)) {
        teamLeaderMap.set(leaderId, {
          id: leaderId,
          name: row.team_leader_name || 'No Team Leader',
          agents: [],
        });
      }
      const connectedCustomers = toNumber(row.connected_customers);
      const orderConfirmed = toNumber(row.order_confirmed);
      teamLeaderMap.get(leaderId)!.agents.push({
        id: toNumber(row.agent_id),
        name: row.agent_name || `Agent #${row.agent_id}`,
        assignedLeads: toNumber(row.assigned_leads),
        totalDialed: toNumber(row.total_dialed),
        connectedCustomers,
        interestedCustomers: toNumber(row.interested_customers),
        orderConfirmed,
        conversionRate: connectedCustomers ? Number(((orderConfirmed / connectedCustomers) * 100).toFixed(1)) : 0,
      });
    }

    return {
      filters: {
        period,
        startDate,
        endDate,
        today,
        previousStartDate,
        previousEndDate,
      },
      topDashboard: {
        totalCustomers: toNumber(topDashboardRow.total_customers),
        todaysNewCustomers: toNumber(topDashboardRow.todays_new_customers),
        todaysCalls: toNumber(topDashboardRow.todays_calls),
        successfulCalls: toNumber(topDashboardRow.successful_calls),
        failedCalls: toNumber(topDashboardRow.failed_calls),
        todaysOrders: toNumber(topDashboardRow.todays_orders),
        conversionRate: selectedLeads ? Number(((confirmedOrders / selectedLeads) * 100).toFixed(1)) : 0,
        repeatCustomers: toNumber(topDashboardRow.repeat_customers),
      },
      salesTrend: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalOrders: currentOrders,
        averageOrderValue: Number(currentAov.toFixed(2)),
        revenueChangePercent: percentChange(currentRevenue, previousRevenue),
        orderChangePercent: percentChange(currentOrders, previousOrders),
        averageOrderValueChangePercent: percentChange(currentAov, previousAov),
        daily: salesTrendRows.map((row: any) => ({
          date: row.date,
          orders: toNumber(row.orders),
          revenue: Number(toNumber(row.revenue).toFixed(2)),
        })),
        trendingProducts: trendingProductRows.map((row: any) => ({
          label: row.label || 'Product',
          count: toNumber(row.count),
          amount: Number(toNumber(row.amount).toFixed(2)),
          changePercent: Number(row.change_percent || 0),
        })),
      },
      customerInsights: {
        totalCustomers: toNumber(customerSummaryRow.total_customers),
        newCustomers: toNumber(customerSummaryRow.new_customers),
        repeatCustomers: toNumber(customerSummaryRow.repeat_customers),
        foreignCustomers: toNumber(customerSummaryRow.foreign_customers),
        blacklistedCustomers: toNumber(customerSummaryRow.blacklisted_customers),
        tiers: mapCountRows(tierRows),
      },
      churn: {
        noOrders30Days: toNumber(churnRow.no_orders_30_days),
        noCalls30Days: toNumber(churnRow.no_calls_30_days),
      },
      callAnalytics: {
        outcomes: mapCountRows(callOutcomeRows),
        followUpCalls: toNumber(followUpRow.total),
      },
      crossSell: {
        success: toNumber(crossSellRow.success),
        failed: toNumber(crossSellRow.failed),
      },
      upSell: {
        success: toNumber(upsellRow.success),
        failed: toNumber(upsellRow.failed),
      },
      productInsights: {
        bestSelling: bestProductRows.map((row: any) => ({
          label: row.label || 'Product',
          count: toNumber(row.count),
          amount: Number(toNumber(row.amount).toFixed(2)),
        })),
        slowMoving: mapCountRows(slowProductRows),
      },
      locationInsights: {
        districts: mapCountRows(districtRows),
        cities: mapCountRows(cityRows),
        foreignCustomers: toNumber(foreignLocationRow.count),
      },
      followUps: {
        total: toNumber(followUpRow.total),
        today: toNumber(followUpRow.today),
        tomorrow: toNumber(followUpRow.tomorrow),
        overdue: toNumber(followUpRow.overdue),
        completed: toNumber(followUpRow.completed),
        reminders: toNumber(followUpRow.reminders),
      },
      leaderAgentPerformance: Array.from(teamLeaderMap.values()),
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
        escalated_at: e.escalated_at,
        assigned_supervisor_id: e.assigned_supervisor_id,
      })),
      analytics: {
        leadsBySource: mapCountRows(leadsBySourceRows),
        leadStatusFunnel: mapCountRows(leadStatusFunnelRows),
        topTeamLeaders: [...teamLeaderStats]
          .sort((a, b) => (b.converted - a.converted) || (b.leads - a.leads) || (b.totalCustomers - a.totalCustomers))
          .slice(0, 8),
        agentPerformance: agentPerformanceRows.map((row: any) => {
          const assignedLeads = toNumber(row.assigned_leads);
          const convertedLeads = toNumber(row.converted_leads);
          return {
            id: toNumber(row.id),
            name: row.name || `Agent #${row.id}`,
            teamLeaderName: row.team_leader_name || 'Unassigned',
            assignedLeads,
            contactedLeads: toNumber(row.contacted_leads),
            convertedLeads,
            callsToday: toNumber(row.calls_today),
            callsMonth: toNumber(row.calls_month),
            conversionRate: assignedLeads ? Number(((convertedLeads / assignedLeads) * 100).toFixed(1)) : 0,
          };
        }),
        leadQualityDistribution: mapCountRows(leadQualityRows),
        unassignedQueueBreakdown: {
          bySource: mapCountRows(unassignedSourceRows),
          byAge: mapCountRows(unassignedAgeRows),
        },
        recentActivities: recentActivityRows.map((row: any) => ({
          type: row.type || 'Activity',
          customerName: row.customer_name || 'Unknown customer',
          customerPhone: row.customer_phone || null,
          detail: row.detail || '',
          actorName: row.actor_name || '',
          activityAt: row.activity_at || null,
        })),
        duplicateLeads: duplicateLeadRows.map((row: any) => ({
          kind: row.kind || 'Duplicate',
          matchKey: row.match_key || '',
          count: toNumber(row.count),
          customers: Array.isArray(row.customers) ? row.customers : [],
        })),
        leadVerification: {
          total: verificationTotal,
          phonePresent: toNumber(verification.phone_present),
          emailPresent: toNumber(verification.email_present),
          addressPresent: toNumber(verification.address_present),
          namePresent: toNumber(verification.name_present),
          contacted: toNumber(verification.contacted),
          verified: toNumber(verification.verified),
          verificationRate: verificationTotal ? Number(((toNumber(verification.verified) / verificationTotal) * 100).toFixed(1)) : 0,
        },
        leadScoring: leadScoringRows.map((row: any) => ({
          label: row.label || 'Unknown',
          count: toNumber(row.count),
          averageScore: Number(row.average_score || 0),
        })),
        lossReasonAnalysis: mapCountRows(lossReasonRows),
      },
    };
  }

  /**
   * Get leads for assignment page (all leads, with optional agent/TL/date filters)
   * Supports selectable page sizes used by the assignment table.
   */
  async getUnassignedLeads(query: any) {
    const assignmentShape = await this.getAssignmentColumnShape();
    await this.ensureCustomerProductSuggestionsSchema();
    void this.ensureLeadFilterIndexes().catch((error: any) => {
      console.warn('[SalesManagerService] Lead filter index warm-up failed:', error?.message || error);
    });
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

    const lastOrderDateSql = `(
      SELECT MAX(DATE(COALESCE(
        so_last_order.order_date::timestamp,
        so_last_order.created_at AT TIME ZONE 'Asia/Dhaka'
      )))
      FROM sales_orders so_last_order
      WHERE so_last_order.customer_id = c.id
    )`;
    const deliveryTimestampSql = (orderAlias: string) => `COALESCE(
      ${orderAlias}.delivered_at,
      (
        SELECT MAX(cth.updated_at)
        FROM courier_tracking_history cth
        WHERE cth.order_id = ${orderAlias}.id
          AND LOWER(cth.status::text) LIKE '%delivered%'
      ),
      (
        SELECT MAX(oal.created_at)
        FROM order_activity_logs oal
        WHERE oal.order_id = ${orderAlias}.id
          AND oal.action_type IN ('status_changed', 'courier_status_webhook', 'courier_status_synced', 'courier_status_updated')
          AND LOWER(COALESCE(oal.new_value->>'status', '')) = 'delivered'
      )
    )`;

    const qb = this.customerRepository.createQueryBuilder('c')
      .select(selectedFields)
      .addSelect(lastOrderDateSql, 'last_order_date')
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
          SELECT MAX(DATE(${deliveryTimestampSql('so_delivered')}))
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
        `(
          SELECT json_build_object(
            'id', sla.id,
            'action', sla.action,
            'status', sla.status,
            'scheduledAt', sla.scheduled_at,
            'agentId', sla.agent_id,
            'agentName', NULLIF(TRIM(CONCAT(COALESCE(agent.name, ''), ' ', COALESCE(agent.last_name, ''))), '')
          )::text
          FROM scheduled_lead_assignments sla
          LEFT JOIN users agent ON agent.id = sla.agent_id
          WHERE sla.customer_id = c.id
            AND sla.status = 'pending'
          ORDER BY sla.scheduled_at ASC, sla.id ASC
          LIMIT 1
        )`,
        'scheduled_assignment',
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
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tagId)) {
        qb.andWhere(
          `EXISTS (
            SELECT 1
            FROM customer_tag_assignments cta
            WHERE cta.customer_id = c.id
              AND cta.tag_id = :tagId
          )`,
          { tagId },
        );
      } else {
        qb.andWhere('1 = 0');
      }
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
        `EXISTS (
          SELECT 1
          FROM sales_orders so_product
          WHERE so_product.customer_id = c.id
            AND (
              EXISTS (
                SELECT 1
                FROM order_items oi_product
                LEFT JOIN products p_product ON p_product.id = oi_product.product_id
                WHERE oi_product.order_id = so_product.id
                  AND (
                    p_product.name_en ILIKE :pName
                    OR p_product.name_bn ILIKE :pName
                  )
              )
              OR EXISTS (
                SELECT 1
                FROM sales_order_items soi_product
                LEFT JOIN products p2_product ON p2_product.id = soi_product.product_id
                WHERE soi_product.sales_order_id = so_product.id
                  AND (
                    p2_product.name_en ILIKE :pName
                    OR p2_product.name_bn ILIKE :pName
                  )
              )
            )
          )
        )`,
        { pName },
      );
    }

    const lastOrderDateStart = String(query.lastOrderDateStart || query.lastOrderFrom || '').trim();
    const lastOrderDateEnd = String(query.lastOrderDateEnd || query.lastOrderTo || '').trim();
    if (lastOrderDateStart || lastOrderDateEnd) {
      const lastOrderDateConditions: string[] = [`${lastOrderDateSql} IS NOT NULL`];
      const lastOrderDateParams: Record<string, string> = {};
      if (lastOrderDateStart) {
        lastOrderDateConditions.push(`${lastOrderDateSql} >= CAST(:lastOrderDateStart AS date)`);
        lastOrderDateParams.lastOrderDateStart = lastOrderDateStart;
      }
      if (lastOrderDateEnd) {
        lastOrderDateConditions.push(`${lastOrderDateSql} <= CAST(:lastOrderDateEnd AS date)`);
        lastOrderDateParams.lastOrderDateEnd = lastOrderDateEnd;
      }
      qb.andWhere(lastOrderDateConditions.join(' AND '), lastOrderDateParams);
    }

    const deliveryDateExpr = `DATE(${deliveryTimestampSql('so_delivery')})`;
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
      const hasProductSuggestionSql = `
        EXISTS (
          SELECT 1
          FROM customer_product_suggestions cps_suggestion
          WHERE cps_suggestion.customer_id = c.id
            AND NULLIF(TRIM(cps_suggestion.suggestion), '') IS NOT NULL
        )`;
      if (productSuggestion === '__any__') {
        qb.andWhere(hasProductSuggestionSql);
      } else if (productSuggestion === '__none__') {
        qb.andWhere(`NOT ${hasProductSuggestionSql}`);
      } else {
        const productSuggestionSearch = `%${productSuggestion}%`;
        qb.andWhere(
          `EXISTS (
            SELECT 1
            FROM customer_product_suggestions cps_suggestion
            LEFT JOIN products p_suggestion ON p_suggestion.id = cps_suggestion.product_id
            WHERE cps_suggestion.customer_id = c.id
              AND NULLIF(TRIM(cps_suggestion.suggestion), '') IS NOT NULL
              AND (
                cps_suggestion.suggestion ILIKE :productSuggestionSearch
                OR p_suggestion.name_en ILIKE :productSuggestionSearch
                OR p_suggestion.name_bn ILIKE :productSuggestionSearch
                OR p_suggestion.sku ILIKE :productSuggestionSearch
              )
          )`,
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
    qb.addOrderBy('c.id', sortOrder);

    const total = await qb.clone().select('c.id').getCount();
    if (total === 0) {
      return { items: [], total, page, limit, totalPages: 0 };
    }

    const pageIdRows = await qb.clone()
      .select('c.id', 'id')
      .offset(offset)
      .limit(limit)
      .getRawMany();
    const pageIds = this.normalizeCustomerIds(pageIdRows.map((row: any) => row.id ?? row.c_id));
    if (pageIds.length === 0) {
      return { items: [], total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    qb.andWhere('c.id IN (:...pageIds)', { pageIds });
    qb.orderBy(`array_position(ARRAY[${pageIds.join(',')}]::int[], c.id)`, 'ASC');

    const { entities, raw } = await qb.getRawAndEntities();
    const rawByCustomerId = new Map<number, any>();
    raw.forEach((row: any) => {
      const id = Number(row?.c_id ?? row?.id);
      if (Number.isInteger(id) && id > 0) {
        rawByCustomerId.set(id, row);
      }
    });

    const lastCallByCustomerId = await this.getLatestCallTimesForCustomers(
      entities.map((entity) => Number(entity.id)),
    );

    const items = entities.map((entity, i) => {
      const customerId = Number(entity.id);
      const rawRow = rawByCustomerId.get(customerId) ?? raw[i] ?? {};
      const lastCallAt = lastCallByCustomerId.get(customerId) ?? (entity as any).last_contact_date ?? (entity as any).lastContactDate ?? null;
      let scheduledAssignment: any = null;
      if (rawRow?.scheduled_assignment) {
        try {
          scheduledAssignment = typeof rawRow.scheduled_assignment === 'string'
            ? JSON.parse(rawRow.scheduled_assignment)
            : rawRow.scheduled_assignment;
        } catch {
          scheduledAssignment = null;
        }
      }
      return {
        ...entity,
        last_contact_date: lastCallAt,
        lastContactDate: lastCallAt,
        tier: rawRow?.tier ?? null,
        tierAssignedAt: rawRow?.tier_assigned_at ?? null,
        soCount: Number(rawRow?.so_count ?? 0),
        legCount: Number(rawRow?.leg_count ?? 0),
        assignedAgentName: String(rawRow?.assigned_agent_name || '').trim() || null,
        teamLeaderId: rawRow?.team_leader_id ? Number(rawRow.team_leader_id) : null,
        teamLeaderName: String(rawRow?.team_leader_name || '').trim() || null,
        dataAnalystName: String(rawRow?.data_analyst_name || '').trim() || null,
        lastOrderDate: rawRow?.last_order_date ?? null,
        lastDeliveryDate: rawRow?.last_delivery_date ?? null,
        scheduledAssignmentId: scheduledAssignment?.id ? Number(scheduledAssignment.id) : null,
        scheduledAssignmentAction: scheduledAssignment?.action ?? null,
        scheduledAssignmentStatus: scheduledAssignment?.status ?? null,
        scheduledAssignmentAt: scheduledAssignment?.scheduledAt ?? null,
        scheduledAssignmentAgentId: scheduledAssignment?.agentId ? Number(scheduledAssignment.agentId) : null,
        scheduledAssignmentAgentName: String(scheduledAssignment?.agentName || '').trim() || null,
      };
    });

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
