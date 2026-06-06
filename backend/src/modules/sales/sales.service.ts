import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/user.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { OffersService } from '../offers/offers.service';
import { WhatsAppService } from '../messaging/whatsapp.service';
import { CommissionService } from '../crm/commission.service';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponService } from './coupon.service';
import { LeadManagementService } from '../lead-management/lead-management.service';
import { getDhakaDateString } from '../../common/utils/dhaka-date';
import { OrderGuardSettings } from '../settings/order-guard-settings.entity';
import { MetaCapiService } from './meta-capi.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder)
    private salesRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private orderItemsRepository: Repository<SalesOrderItem>,
    @InjectRepository(OrderItem)
    private orderItemsRepository2: Repository<OrderItem>,
    private loyaltyService: LoyaltyService,
    private offersService: OffersService,
    private whatsAppService: WhatsAppService,
    @Inject(forwardRef(() => CommissionService))
    private commissionService: CommissionService,
    private customersService: CustomersService,
    private inventoryService: InventoryService,
    private couponService: CouponService,
    @InjectRepository(OrderGuardSettings)
    private orderGuardSettingsRepository: Repository<OrderGuardSettings>,
    @Inject(forwardRef(() => LeadManagementService))
    private leadManagementService: LeadManagementService,
    private metaCapiService: MetaCapiService,
  ) {}

  private readonly dhakaTimeZone = 'Asia/Dhaka';
  private readonly automaticAssignmentWorkTypes = ['primary_leads', 'unreachable_followup', 'incomplete_recovery', 'rejected_recovery'];

  private currentDhakaDateString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.dhakaTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return year && month && day ? `${year}-${month}-${day}` : getDhakaDateString();
  }

  private normalizeOfferCode(value: any): string {
    const code = value != null ? String(value).trim() : '';
    return code ? code.toUpperCase() : '';
  }

  private async getUserNameMap(userIds: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (userIds.length === 0) return map;
    const userRepo = this.salesRepository.manager.getRepository(User);
    const users = await userRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'name'],
    });
    for (const u of users) {
      map.set(Number(u.id), u.name || '');
    }
    return map;
  }

  private roundMoney(value: any): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
  }

  private getItemSubtotal(item: any): number {
    const explicitSubtotal = Number(item?.subtotal ?? item?.lineTotal ?? item?.line_total);
    if (Number.isFinite(explicitSubtotal) && explicitSubtotal > 0) {
      return this.roundMoney(explicitSubtotal);
    }

    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? 0);
    return this.roundMoney(quantity * unitPrice);
  }

  private getStoredDeliveryCharge(order: SalesOrder): number | null {
    if ((order as any).deliveryCharge == null) return null;
    const deliveryCharge = Number((order as any).deliveryCharge);
    return Number.isFinite(deliveryCharge) ? this.roundMoney(deliveryCharge) : null;
  }

  private resolveDeliveryCharge(order: SalesOrder, itemsSubtotal: number, discountAmount: number): number {
    const storedDeliveryCharge = this.getStoredDeliveryCharge(order);
    if (storedDeliveryCharge != null) {
      return storedDeliveryCharge;
    }

    return this.roundMoney(Math.max(0, Number(order.totalAmount || 0) - itemsSubtotal + discountAmount));
  }

  private computePayableTotal(order: SalesOrder, items: any[]): number {
    const itemsSubtotal = this.roundMoney(items.reduce((sum: number, item: any) => sum + this.getItemSubtotal(item), 0));
    const discountAmount = this.roundMoney(order.discountAmount || 0);
    const deliveryCharge = this.resolveDeliveryCharge(order, itemsSubtotal, discountAmount);
    return this.roundMoney(Math.max(0, itemsSubtotal + deliveryCharge - discountAmount));
  }

  private readonly webOrderSources = ['website', 'landing_page'];

  private readonly approvedForMainOrdersSql = `
    (LOWER(o.status::text) <> 'processing')
  `;

  private normalizeClientIp(value: any): string {
    const raw = value == null ? '' : String(value).split(',')[0].trim();
    if (!raw) return '';
    return raw.replace(/^::ffff:/, '');
  }

  private inferIncomingOrderSource(createSalesDto: any, createdBy: number, systemUserId: number): string {
    const explicitSource = createSalesDto.order_source ?? createSalesDto.orderSource ?? null;
    if (explicitSource) return String(explicitSource).trim().toLowerCase();

    const trafficSource = String(createSalesDto.traffic_source ?? createSalesDto.trafficSource ?? '').trim().toLowerCase();
    if (trafficSource === 'landing_page' || trafficSource === 'landing_page_intl') return 'landing_page';
    if (createdBy && createdBy !== systemUserId) return 'admin_panel';
    return 'website';
  }

  private async ensureOrderGuardSettingsTable() {
    await this.orderGuardSettingsRepository.query(`
      CREATE TABLE IF NOT EXISTS order_guard_settings (
        id integer PRIMARY KEY DEFAULT 1,
        is_active boolean NOT NULL DEFAULT true,
        window_minutes integer NOT NULL DEFAULT 10,
        block_note_html text NOT NULL DEFAULT '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT order_guard_settings_singleton CHECK (id = 1),
        CONSTRAINT order_guard_settings_window_positive CHECK (window_minutes > 0)
      )
    `);

    await this.orderGuardSettingsRepository.query(`
      INSERT INTO order_guard_settings (id, is_active, window_minutes, block_note_html, created_at, updated_at)
      VALUES (
        1,
        true,
        10,
        '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  private async getOrderGuardSettings(): Promise<OrderGuardSettings> {
    await this.ensureOrderGuardSettingsTable();
    let settings = await this.orderGuardSettingsRepository.findOne({ where: { id: 1 } });
    if (settings) return settings;

    settings = this.orderGuardSettingsRepository.create({
      id: 1,
      isActive: true,
      windowMinutes: 10,
      blockNoteHtml:
        '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
    });
    return this.orderGuardSettingsRepository.save(settings);
  }

  private async enforceOrderGuard(createSalesDto: any, context: { clientIp?: string } | undefined, createdBy: number, systemUserId: number) {
    const orderSource = this.inferIncomingOrderSource(createSalesDto, createdBy, systemUserId);
    if (!this.webOrderSources.includes(orderSource)) return { orderSource, clientIp: this.normalizeClientIp(context?.clientIp) };

    const clientIp = this.normalizeClientIp(context?.clientIp ?? createSalesDto.user_ip ?? createSalesDto.userIp);
    if (!clientIp) return { orderSource, clientIp };

    const settings = await this.getOrderGuardSettings();
    if (!settings.isActive) return { orderSource, clientIp };

    const windowMinutes = Math.max(1, Number(settings.windowMinutes || 1));
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentOrder = await this.salesRepository
      .createQueryBuilder('o')
      .select(['o.id', 'o.createdAt'])
      .where('o.user_ip = :clientIp', { clientIp })
      .andWhere('LOWER(o.order_source::text) IN (:...sources)', { sources: this.webOrderSources })
      .andWhere('o.created_at >= :since', { since })
      .orderBy('o.created_at', 'DESC')
      .getOne();

    if (!recentOrder) return { orderSource, clientIp };

    const retryAt = new Date(recentOrder.createdAt).getTime() + windowMinutes * 60 * 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'ORDER_GUARD_BLOCKED',
        message: 'Duplicate order blocked',
        orderGuard: {
          noteHtml: settings.blockNoteHtml,
          windowMinutes,
          retryAfterSeconds,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async dispatchMetaCapiForStatus(orderId: number, status: string) {
    try {
      await this.metaCapiService.sendForStatusTransition(orderId, status);
    } catch (err: any) {
      console.warn(`Meta CAPI dispatch failed for order #${orderId} status=${status}:`, err?.message || err);
    }
  }

  private normalizeAssignmentStatus(status: string | null | undefined) {
    return String(status || '').trim().toLowerCase();
  }

  private async ensureAutomaticAssignmentSchema(manager = this.salesRepository.manager) {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS automatic_order_assignment_settings (
        id serial PRIMARY KEY,
        team_leader_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        is_enabled boolean NOT NULL DEFAULT false,
        max_active_orders integer NOT NULL DEFAULT 10,
        max_daily_orders integer NOT NULL DEFAULT 100,
        updated_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);
    await manager.query(`
      ALTER TABLE automatic_order_assignment_settings
        ADD COLUMN IF NOT EXISTS max_daily_orders integer NOT NULL DEFAULT 100
    `);
    await manager.query(`
      CREATE TABLE IF NOT EXISTS automatic_order_assignment_logs (
        id serial PRIMARY KEY,
        order_id integer NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        agent_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_leader_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
        reason varchar(100) NOT NULL DEFAULT 'online_agent_auto_assignment',
        created_at timestamp NOT NULL DEFAULT NOW()
      )
    `);
    await manager.query(`
      CREATE TABLE IF NOT EXISTS automatic_order_assignment_agent_preferences (
        id serial PRIMARY KEY,
        team_leader_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agent_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id integer NULL REFERENCES products(id) ON DELETE SET NULL,
        assignment_order_direction varchar(4) NOT NULL DEFAULT 'asc',
        updated_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_auto_assignment_agent_preference UNIQUE (team_leader_id, agent_id)
      )
    `);
    await manager.query(`
      ALTER TABLE automatic_order_assignment_agent_preferences
        ADD COLUMN IF NOT EXISTS assignment_order_direction varchar(4) NOT NULL DEFAULT 'asc'
    `);
    await manager.query(`
      CREATE TABLE IF NOT EXISTS automatic_order_assignment_team_work_types (
        id serial PRIMARY KEY,
        team_leader_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id integer NOT NULL REFERENCES sales_teams(id) ON DELETE CASCADE,
        work_type varchar(50) NOT NULL,
        updated_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_auto_assignment_team_work_type UNIQUE (team_leader_id, team_id, work_type)
      )
    `);
    await manager.query(`
      ALTER TABLE automatic_order_assignment_logs
        ALTER COLUMN order_id DROP NOT NULL
    `);
    await manager.query(`
      ALTER TABLE automatic_order_assignment_logs
        ADD COLUMN IF NOT EXISTS record_type varchar(30) NOT NULL DEFAULT 'sales_order',
        ADD COLUMN IF NOT EXISTS incomplete_order_id integer NULL
    `);
  }

  async runAutomaticAssignmentQueue(options: { orderId?: number; teamLeaderId?: number; limit?: number; reason?: string } = {}) {
    const result = { assignedCount: 0, checkedOrders: 0, eligibleAgents: 0 };

    try {
      return await this.salesRepository.manager.transaction(async (manager) => {
        await this.ensureAutomaticAssignmentSchema(manager);
        const candidateParams: any[] = [];
        const teamLeaderClause = Number.isFinite(Number(options.teamLeaderId)) && Number(options.teamLeaderId) > 0
          ? `AND at.team_leader_id = $${candidateParams.push(Number(options.teamLeaderId))}`
          : '';

        const candidates: Array<{
          agent_id: number;
          team_leader_id: number;
          team_id: number | string | null;
          max_active_orders: number | string;
          max_daily_orders: number | string;
          product_preference_id: number | string | null;
          assignment_order_direction: string | null;
          work_types: string[] | null;
          active_count: number | string;
          assigned_today: number | string;
        }> = await manager.query(
          `WITH agent_team AS (
             SELECT DISTINCT agent_id, team_leader_id, team_id
             FROM (
               SELECT u1.id AS agent_id, u1.team_leader_id, u1.team_id
               FROM users u1
               WHERE u1.team_leader_id IS NOT NULL
               UNION ALL
               SELECT tm.user_id AS agent_id, tm.team_leader_id, u2.team_id
               FROM team_members tm
               INNER JOIN users u2 ON u2.id = tm.user_id
               WHERE tm.is_active = TRUE
             ) memberships
             WHERE team_leader_id IS NOT NULL
           ),
           today_assignment_counts AS (
             SELECT
               agent_id,
               team_leader_id,
               COUNT(DISTINCT CONCAT(
                 COALESCE(record_type, 'sales_order'),
                 ':',
                 COALESCE(order_id, incomplete_order_id)
               ))::int AS assigned_today
             FROM automatic_order_assignment_logs
             WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
               AND COALESCE(order_id, incomplete_order_id) IS NOT NULL
             GROUP BY agent_id, team_leader_id
           )
           SELECT
             u.id AS agent_id,
             at.team_leader_id,
             at.team_id,
             COALESCE(s.max_active_orders, 10) AS max_active_orders,
             COALESCE(s.max_daily_orders, 100) AS max_daily_orders,
             pref.product_id AS product_preference_id,
             COALESCE(pref.assignment_order_direction, 'asc') AS assignment_order_direction,
             COALESCE(
               ARRAY_AGG(DISTINCT twt.work_type) FILTER (WHERE twt.work_type IS NOT NULL),
               CASE
                 WHEN NOT EXISTS (
                   SELECT 1
                   FROM automatic_order_assignment_team_work_types configured
                   WHERE configured.team_leader_id = at.team_leader_id
                 ) THEN ARRAY['primary_leads']::text[]
                 ELSE ARRAY[]::text[]
             END
             ) AS work_types,
             COUNT(DISTINCT active_orders.id)::int AS active_count,
             COALESCE(today_orders.assigned_today, 0)::int AS assigned_today
           FROM agent_team at
           INNER JOIN users u ON u.id = at.agent_id
           INNER JOIN roles r ON r.id = u.role_id
           INNER JOIN automatic_order_assignment_settings s
             ON s.team_leader_id = at.team_leader_id
            AND s.is_enabled = TRUE
           LEFT JOIN automatic_order_assignment_agent_preferences pref
             ON pref.team_leader_id = at.team_leader_id
            AND pref.agent_id = u.id
           LEFT JOIN automatic_order_assignment_team_work_types twt
             ON twt.team_leader_id = at.team_leader_id
            AND twt.team_id = at.team_id
           INNER JOIN user_presence_statuses ps
             ON ps.user_id = u.id
            AND LOWER(ps.state) = 'online'
           LEFT JOIN sales_orders active_orders
             ON active_orders.assigned_to = u.id
            AND LOWER(active_orders.status::text) IN ('processing', 'pending', 'approved', 'hold', 'sent', 'in_review', 'in_transit', 'picked', 'shipped')
           LEFT JOIN today_assignment_counts today_orders
             ON today_orders.agent_id = u.id
            AND today_orders.team_leader_id = at.team_leader_id
           WHERE u.is_deleted = FALSE
             AND u.status = 'active'
             AND r.slug = 'sales-executive'
             ${teamLeaderClause}
           GROUP BY u.id, at.team_leader_id, at.team_id, s.max_active_orders, s.max_daily_orders, pref.product_id, pref.assignment_order_direction, today_orders.assigned_today
           HAVING COUNT(DISTINCT active_orders.id) < COALESCE(s.max_active_orders, 10)
              AND COALESCE(today_orders.assigned_today, 0) < COALESCE(s.max_daily_orders, 100)
           ORDER BY COUNT(DISTINCT active_orders.id) ASC, COALESCE(today_orders.assigned_today, 0) ASC, u.id ASC`,
          candidateParams,
        );

        const agents = candidates.map((candidate) => ({
          agentId: Number(candidate.agent_id),
          teamLeaderId: Number(candidate.team_leader_id),
          teamId: candidate.team_id == null ? null : Number(candidate.team_id),
          maxActiveOrders: Number(candidate.max_active_orders || 10),
          maxDailyOrders: Number(candidate.max_daily_orders || 100),
          productPreferenceId: candidate.product_preference_id == null ? null : Number(candidate.product_preference_id),
          assignmentOrderDirection: String(candidate.assignment_order_direction || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc',
          workTypes: Array.isArray(candidate.work_types)
            ? candidate.work_types.map((item) => String(item)).filter((item) => this.automaticAssignmentWorkTypes.includes(item))
            : [],
          activeCount: Number(candidate.active_count || 0),
          assignedToday: Number(candidate.assigned_today || 0),
        })).filter((candidate) => candidate.workTypes.length > 0);
        result.eligibleAgents = agents.length;
        if (agents.length === 0) return result;

        const eligibleWorkTypes = Array.from(new Set(agents.flatMap((agent) => agent.workTypes)));
        if (eligibleWorkTypes.length === 0) return result;

        const orderParams: any[] = [
          this.webOrderSources,
          Math.max(1, Math.min(500, Number(options.limit || 100))),
          eligibleWorkTypes,
        ];
        let orderIdClause = '';
        if (Number.isFinite(Number(options.orderId)) && Number(options.orderId) > 0) {
          orderParams.push(Number(options.orderId));
          orderIdClause = `AND id = $${orderParams.length}`;
        }

        const orders: Array<{ id: number; record_type: string; work_type: string; created_at: string | Date; product_ids: number[] | null }> = await manager.query(
          `SELECT q.id,
                  q.record_type,
                  q.work_type,
                  q.created_at,
                  COALESCE(product_data.product_ids, ARRAY[]::integer[]) AS product_ids
           FROM (
             SELECT id,
                    'sales_order'::text AS record_type,
                    CASE
                      WHEN LOWER(status::text) = 'admin_cancelled' THEN 'rejected_recovery'
                      WHEN LOWER(status::text) = 'processing'
                       AND LOWER(COALESCE(telephony_outcome, '')) IN ('no_answer', 'unreachable') THEN 'unreachable_followup'
                      ELSE 'primary_leads'
                    END AS work_type,
                    created_at
             FROM sales_orders
             WHERE assigned_to IS NULL
               AND LOWER(COALESCE(order_source, '')) = ANY($1)
               AND (
                 LOWER(status::text) = 'admin_cancelled'
                 OR LOWER(status::text) = 'processing'
               )
               AND (
                 CASE
                   WHEN LOWER(status::text) = 'admin_cancelled' THEN 'rejected_recovery'
                   WHEN LOWER(status::text) = 'processing'
                    AND LOWER(COALESCE(telephony_outcome, '')) IN ('no_answer', 'unreachable') THEN 'unreachable_followup'
                   ELSE 'primary_leads'
                 END
               ) = ANY($3)
               ${orderIdClause}
             UNION ALL
             SELECT id,
                    'incomplete_order'::text AS record_type,
                    'incomplete_recovery'::text AS work_type,
                    created_at
             FROM incomplete_orders
             WHERE assigned_to IS NULL
               AND COALESCE(converted_to_order, FALSE) = FALSE
               AND 'incomplete_recovery' = ANY($3)
               AND ${orderIdClause ? 'FALSE' : 'TRUE'}
             ORDER BY created_at ASC, id ASC
             LIMIT $2
           ) q
           LEFT JOIN LATERAL (
             SELECT ARRAY_AGG(DISTINCT product_id) FILTER (WHERE product_id IS NOT NULL) AS product_ids
             FROM (
               SELECT oi.product_id
               FROM order_items oi
               WHERE oi.order_id = q.id AND q.record_type = 'sales_order'
               UNION ALL
               SELECT soi.product_id
               FROM sales_order_items soi
               WHERE soi.sales_order_id = q.id AND q.record_type = 'sales_order'
             ) products_for_order
           ) product_data ON TRUE
           ORDER BY q.created_at ASC, q.id ASC
           LIMIT $2
           `,
          orderParams,
        );
        result.checkedOrders = orders.length;
        if (orders.length === 0) return result;

        const reason = String(options.reason || 'online_agent_auto_assignment').slice(0, 100);

        const assignedOrderIds = new Set<string>();
        while (assignedOrderIds.size < orders.length) {
          agents.sort((a, b) => {
            const loadDiff = a.activeCount - b.activeCount;
            if (loadDiff !== 0) return loadDiff;
            const todayDiff = a.assignedToday - b.assignedToday;
            if (todayDiff !== 0) return todayDiff;
            return a.agentId - b.agentId;
          });

          const agent = agents.find((item) => {
            if (item.activeCount >= item.maxActiveOrders) return false;
            if (item.assignedToday >= item.maxDailyOrders) return false;
            return orders.some((order) => {
              if (assignedOrderIds.has(`${order.record_type}:${Number(order.id)}`)) return false;
              if (!item.workTypes.includes(order.work_type)) return false;
              if (!item.productPreferenceId) return true;
              if (order.record_type !== 'sales_order') return false;
              const productIds = new Set((order.product_ids || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)));
              return productIds.has(item.productPreferenceId);
            });
          });
          if (!agent) break;

          const matchingOrders = orders
            .filter((order) => {
              if (assignedOrderIds.has(`${order.record_type}:${Number(order.id)}`)) return false;
              if (!agent.workTypes.includes(order.work_type)) return false;
              if (!agent.productPreferenceId) return true;
              if (order.record_type !== 'sales_order') return false;
              const productIds = new Set((order.product_ids || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)));
              return productIds.has(agent.productPreferenceId);
            })
            .sort((a, b) => {
              const aTime = new Date(a.created_at).getTime();
              const bTime = new Date(b.created_at).getTime();
              const timeDiff = agent.assignmentOrderDirection === 'desc' ? bTime - aTime : aTime - bTime;
              if (timeDiff !== 0) return timeDiff;
              return agent.assignmentOrderDirection === 'desc' ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id);
            });
          const order = matchingOrders[0];
          if (!order) break;

          const updatedRows: Array<{ id: number }> = order.record_type === 'incomplete_order'
            ? await manager.query(
                `UPDATE incomplete_orders
                 SET assigned_to = $2,
                     assigned_by = $3,
                     assigned_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1
                   AND assigned_to IS NULL
                   AND COALESCE(converted_to_order, FALSE) = FALSE
                 RETURNING id`,
                [Number(order.id), agent.agentId, agent.teamLeaderId],
              )
            : await manager.query(
                `UPDATE sales_orders
                 SET assigned_to = $2,
                     assigned_by = $3,
                     assigned_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1
                   AND assigned_to IS NULL
                   AND LOWER(COALESCE(order_source, '')) = ANY($4)
                   AND (
                     LOWER(status::text) = 'admin_cancelled'
                     OR LOWER(status::text) = 'processing'
                   )
                 RETURNING id`,
                [Number(order.id), agent.agentId, agent.teamLeaderId, this.webOrderSources],
              );

          if (updatedRows.length === 0) continue;

          await manager.query(
            `INSERT INTO automatic_order_assignment_logs
               (order_id, incomplete_order_id, record_type, agent_id, team_leader_id, assigned_by, reason, created_at)
             VALUES ($1, $2, $3, $4, $5, $5, $6, NOW())`,
            [
              order.record_type === 'sales_order' ? Number(order.id) : null,
              order.record_type === 'incomplete_order' ? Number(order.id) : null,
              order.record_type,
              agent.agentId,
              agent.teamLeaderId,
              `${reason}:${order.work_type}`.slice(0, 100),
            ],
          );

          assignedOrderIds.add(`${order.record_type}:${Number(order.id)}`);
          agent.activeCount += 1;
          agent.assignedToday += 1;
          result.assignedCount += 1;
        }

        return result;
      });
    } catch (err: any) {
      console.warn('Automatic assignment queue skipped:', err?.message || err);
      return result;
    }
  }

  private async tryAutoAssignIncomingOrder(orderId: number) {
    const result = await this.runAutomaticAssignmentQueue({ limit: 100, reason: 'incoming_order_auto_assignment' });
    if (result.checkedOrders > 0 && result.assignedCount === 0) {
      console.warn(`Automatic assignment found no capacity after order #${orderId}: eligibleAgents=${result.eligibleAgents}`);
    }
    return result;
  }

  private async unassignFromPrimaryLeadTeam(orderId: number): Promise<void> {
    try {
      await this.salesRepository.manager.query(
        `UPDATE sales_orders so
         SET assigned_to = NULL,
             assigned_by = NULL,
             assigned_at = NULL,
             updated_at = NOW()
         WHERE so.id = $1
           AND so.assigned_to IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM users u
             INNER JOIN automatic_order_assignment_team_work_types twt
               ON twt.team_id = u.team_id
              AND twt.team_leader_id = u.team_leader_id
              AND twt.work_type = 'primary_leads'
             WHERE u.id = so.assigned_to
           )`,
        [orderId],
      );
    } catch (err: any) {
      console.warn(`Primary lead unassignment skipped for order #${orderId}:`, err?.message || err);
    }
  }

  private async getAutomaticAssignmentAccess(user: any) {
    const userId = Number(user?.id);
    const rows: Array<{ slug: string; role_slug: string }> = await this.salesRepository.manager.query(
      `SELECT DISTINCT p.slug, r.slug AS role_slug
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN roles r ON r.id = rp.role_id
       WHERE r.id = (SELECT role_id FROM users WHERE id = $1)
         AND r.is_active = true
         AND p.slug IN ('view-auto-order-assignment', 'manage-auto-order-assignment', 'view-team-performance')`,
      [userId],
    );
    const permissions = new Set(rows.map((row) => row.slug));
    const roleSlug = String(user?.roleSlug || rows[0]?.role_slug || '').toLowerCase();
    const canManage = permissions.has('manage-auto-order-assignment');
    const canView = canManage || permissions.has('view-auto-order-assignment') || permissions.has('view-team-performance');
    const canViewAll = ['super-admin', 'admin', 'sales-manager'].includes(roleSlug);
    return { userId, roleSlug, canManage, canView, canViewAll, isTeamLeader: roleSlug === 'sales-team-leader' };
  }

  async getAutomaticAssignmentOverview(user: any, params: { teamLeaderId?: number } = {}) {
    const access = await this.getAutomaticAssignmentAccess(user);
    if (!access.canView) throw new BadRequestException('You do not have permission to view automatic assignment');
    const teamLeaderId = access.canViewAll && params.teamLeaderId ? Number(params.teamLeaderId) : access.userId;
    if (!access.canViewAll && !access.isTeamLeader) throw new BadRequestException('Only Team Leaders can view their automatic assignment report');
    await this.ensureAutomaticAssignmentSchema();

    const settingsRows = await this.salesRepository.manager.query(
      `SELECT s.team_leader_id, s.is_enabled, s.max_active_orders, s.max_daily_orders, u.name, u.last_name, u.email
       FROM automatic_order_assignment_settings s
       INNER JOIN users u ON u.id = s.team_leader_id
       WHERE s.team_leader_id = $1`,
      [teamLeaderId],
    );
    const setting = settingsRows[0] || null;

    const agents = await this.salesRepository.manager.query(
      `WITH agent_team AS (
         SELECT DISTINCT agent_id, team_leader_id
         FROM (
           SELECT u1.id AS agent_id, u1.team_leader_id
           FROM users u1
           WHERE u1.team_leader_id IS NOT NULL
           UNION ALL
           SELECT tm.user_id AS agent_id, tm.team_leader_id
           FROM team_members tm
           WHERE tm.is_active = TRUE
         ) memberships
         WHERE team_leader_id IS NOT NULL
       ),
       today_assignment_counts AS (
         SELECT
           agent_id,
           team_leader_id,
           COUNT(DISTINCT CONCAT(
             COALESCE(record_type, 'sales_order'),
             ':',
             COALESCE(order_id, incomplete_order_id)
           ))::int AS assigned_today
         FROM automatic_order_assignment_logs
         WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date
           AND COALESCE(order_id, incomplete_order_id) IS NOT NULL
         GROUP BY agent_id, team_leader_id
       )
       SELECT
         u.id,
         CONCAT_WS(' ', u.name, u.last_name) AS name,
         u.email,
         COALESCE(ps.state, 'offline') AS presence_state,
         pref.product_id AS product_preference_id,
         COALESCE(pref.assignment_order_direction, 'asc') AS assignment_order_direction,
         COALESCE(p.name_en, p.name_bn, p.sku) AS product_preference_name,
         COUNT(DISTINCT o.id)::int AS active_assigned_orders,
         COALESCE(l.assigned_today, 0)::int AS assigned_today
       FROM agent_team at
       INNER JOIN users u ON u.id = at.agent_id
       LEFT JOIN user_presence_statuses ps ON ps.user_id = u.id
       LEFT JOIN automatic_order_assignment_agent_preferences pref
         ON pref.team_leader_id = at.team_leader_id
        AND pref.agent_id = u.id
       LEFT JOIN products p ON p.id = pref.product_id
       LEFT JOIN sales_orders o
         ON o.assigned_to = u.id
        AND LOWER(o.status::text) IN ('processing', 'pending', 'approved', 'hold', 'sent', 'in_review', 'in_transit', 'picked', 'shipped')
       LEFT JOIN today_assignment_counts l
         ON l.agent_id = u.id
        AND l.team_leader_id = at.team_leader_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE at.team_leader_id = $1
         AND u.is_deleted = FALSE
         AND u.status = 'active'
         AND r.slug = 'sales-executive'
       GROUP BY u.id, u.name, u.last_name, u.email, ps.state, pref.product_id, pref.assignment_order_direction, p.name_en, p.name_bn, p.sku, l.assigned_today
       ORDER BY presence_state DESC, active_assigned_orders ASC, name ASC`,
      [teamLeaderId],
    );

    const recentAssignments = await this.salesRepository.manager.query(
      `SELECT l.id, l.order_id, l.incomplete_order_id, l.record_type, l.agent_id, l.team_leader_id, l.reason, l.created_at,
              CONCAT_WS(' ', u.name, u.last_name) AS agent_name
       FROM automatic_order_assignment_logs l
       LEFT JOIN users u ON u.id = l.agent_id
       WHERE l.team_leader_id = $1
       ORDER BY l.created_at DESC
       LIMIT 50`,
      [teamLeaderId],
    );

    const configuredRows: Array<{ count: string }> = await this.salesRepository.manager.query(
      `SELECT COUNT(*)::text AS count
       FROM automatic_order_assignment_team_work_types
       WHERE team_leader_id = $1`,
      [teamLeaderId],
    );
    const hasConfiguredWorkTypes = Number(configuredRows[0]?.count || 0) > 0;
    const teamRows: Array<{ id: number; name: string; code: string | null; work_types: string[] | null }> = await this.salesRepository.manager.query(
      `SELECT st.id,
              st.name,
              st.code,
              ARRAY_AGG(twt.work_type ORDER BY twt.work_type) FILTER (WHERE twt.work_type IS NOT NULL) AS work_types
       FROM sales_teams st
       LEFT JOIN automatic_order_assignment_team_work_types twt
         ON twt.team_id = st.id
        AND twt.team_leader_id = st.team_leader_id
       WHERE st.team_leader_id = $1
       GROUP BY st.id, st.name, st.code
       ORDER BY COALESCE(st.code, ''), st.name`,
      [teamLeaderId],
    );

    const pendingRows: Array<{ count: string }> = await this.salesRepository.manager.query(
      `SELECT COUNT(*)::text AS count
       FROM (
         SELECT id
         FROM sales_orders
         WHERE assigned_to IS NULL
           AND LOWER(COALESCE(order_source, '')) = ANY($1)
           AND (
             LOWER(status::text) = 'admin_cancelled'
             OR LOWER(status::text) = 'processing'
           )
         UNION ALL
         SELECT id
         FROM incomplete_orders
         WHERE assigned_to IS NULL
           AND COALESCE(converted_to_order, FALSE) = FALSE
       ) pending`,
      [this.webOrderSources],
    );

    return {
      teamLeaderId,
      settings: setting ? {
        isEnabled: Boolean(setting.is_enabled),
        maxActiveOrders: Number(setting.max_active_orders || 10),
        maxDailyOrders: Number(setting.max_daily_orders || 100),
        teamLeaderName: `${setting.name || ''} ${setting.last_name || ''}`.trim() || setting.email,
      } : { isEnabled: false, maxActiveOrders: 10, maxDailyOrders: 100, teamLeaderName: null },
      agents: agents.map((agent: any) => ({
        id: Number(agent.id),
        name: agent.name || agent.email,
        email: agent.email,
        presenceState: agent.presence_state,
        activeAssignedOrders: Number(agent.active_assigned_orders || 0),
        assignedToday: Number(agent.assigned_today || 0),
        productPreferenceId: agent.product_preference_id == null ? null : Number(agent.product_preference_id),
        productPreferenceName: agent.product_preference_name || null,
        assignmentOrderDirection: String(agent.assignment_order_direction || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc',
      })),
      teamWorkTypes: teamRows.map((team) => ({
        id: Number(team.id),
        name: team.name,
        code: team.code,
        workTypes: hasConfiguredWorkTypes
          ? (Array.isArray(team.work_types) ? team.work_types.filter((item) => this.automaticAssignmentWorkTypes.includes(String(item))) : [])
          : ['primary_leads'],
      })),
      recentAssignments,
      pendingUnassignedOrders: Number(pendingRows[0]?.count || 0),
    };
  }

  async getAutomaticAssignmentTeamReport(user: any, params: { teamLeaderId?: number; from?: string; to?: string } = {}) {
    const access = await this.getAutomaticAssignmentAccess(user);
    if (!access.canView) throw new BadRequestException('You do not have permission to view team report');
    if (!access.canViewAll && !access.isTeamLeader) throw new BadRequestException('Only Team Leaders can view their team report');
    await this.ensureAutomaticAssignmentSchema();

    const teamLeaderId = access.canViewAll && params.teamLeaderId ? Number(params.teamLeaderId) : access.userId;
    const today = getDhakaDateString();
    const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(String(params.from || '')) ? String(params.from) : today;
    const toDate = /^\d{4}-\d{2}-\d{2}$/.test(String(params.to || '')) ? String(params.to) : today;
    const rangeStart = `${fromDate} 00:00:00`;
    const rangeEnd = `${toDate} 23:59:59`;

    const overview = await this.getAutomaticAssignmentOverview(user, { teamLeaderId });

    const queueRows: Array<{ work_type: string; count: string }> = await this.salesRepository.manager.query(
      `SELECT work_type, COUNT(*)::text AS count
       FROM (
         SELECT CASE
                  WHEN LOWER(status::text) = 'admin_cancelled' THEN 'rejected_recovery'
                  WHEN LOWER(status::text) = 'processing'
                   AND LOWER(COALESCE(telephony_outcome, '')) IN ('no_answer', 'unreachable') THEN 'unreachable_followup'
                  ELSE 'primary_leads'
                END AS work_type
         FROM sales_orders
         WHERE assigned_to IS NULL
           AND LOWER(COALESCE(order_source, '')) = ANY($1)
           AND (LOWER(status::text) = 'processing' OR LOWER(status::text) = 'admin_cancelled')
         UNION ALL
         SELECT 'incomplete_recovery' AS work_type
         FROM incomplete_orders
         WHERE assigned_to IS NULL
           AND COALESCE(converted_to_order, FALSE) = FALSE
       ) queues
       GROUP BY work_type`,
      [this.webOrderSources],
    );

    const teamRows = await this.salesRepository.manager.query(
      `WITH team_agents AS (
         SELECT st.id AS team_id, u.id AS agent_id
         FROM sales_teams st
         LEFT JOIN users u
           ON u.team_id = st.id
          AND u.team_leader_id = st.team_leader_id
          AND u.is_deleted = FALSE
          AND u.status = 'active'
         WHERE st.team_leader_id = $1
       )
       SELECT
         st.id,
         st.name,
         st.code,
         COALESCE(ARRAY_AGG(DISTINCT twt.work_type) FILTER (WHERE twt.work_type IS NOT NULL), ARRAY[]::text[]) AS work_types,
         COUNT(DISTINCT ta.agent_id)::int AS agent_count,
         COUNT(DISTINCT ta.agent_id) FILTER (WHERE LOWER(COALESCE(ps.state, 'offline')) = 'online')::int AS online_agents,
         COUNT(DISTINCT so_active.id)::int AS active_sales_orders,
         COUNT(DISTINCT io_active.id)::int AS active_incomplete_orders,
         COUNT(DISTINCT l.id)::int AS assigned_in_range,
         COUNT(DISTINCT l.id) FILTER (WHERE l.record_type = 'sales_order')::int AS sales_assigned_in_range,
         COUNT(DISTINCT l.id) FILTER (WHERE l.record_type = 'incomplete_order')::int AS incomplete_assigned_in_range,
         COUNT(DISTINCT so_called.id) FILTER (WHERE so_called.telephony_outcome IN ('no_answer', 'unreachable'))::int AS unreachable_outcomes,
         COUNT(DISTINCT so_called.id) FILTER (WHERE so_called.telephony_outcome IN ('connected', 'order_placed'))::int AS positive_outcomes
       FROM sales_teams st
       LEFT JOIN automatic_order_assignment_team_work_types twt
         ON twt.team_id = st.id
        AND twt.team_leader_id = st.team_leader_id
       LEFT JOIN team_agents ta ON ta.team_id = st.id
       LEFT JOIN user_presence_statuses ps ON ps.user_id = ta.agent_id
       LEFT JOIN sales_orders so_active
         ON so_active.assigned_to = ta.agent_id
        AND LOWER(so_active.status::text) IN ('processing', 'pending', 'approved', 'hold', 'sent', 'in_review', 'in_transit', 'picked', 'shipped')
       LEFT JOIN incomplete_orders io_active
         ON io_active.assigned_to = ta.agent_id
        AND COALESCE(io_active.converted_to_order, FALSE) = FALSE
       LEFT JOIN automatic_order_assignment_logs l
         ON l.agent_id = ta.agent_id
        AND l.created_at >= $2::timestamp
        AND l.created_at <= $3::timestamp
       LEFT JOIN sales_orders so_called
         ON so_called.assigned_to = ta.agent_id
        AND so_called.telephony_called_at >= $2::timestamp
        AND so_called.telephony_called_at <= $3::timestamp
       WHERE st.team_leader_id = $1
       GROUP BY st.id, st.name, st.code
       ORDER BY COALESCE(st.code, ''), st.name`,
      [teamLeaderId, rangeStart, rangeEnd],
    );

    const agentRows = await this.salesRepository.manager.query(
      `SELECT
         u.id,
         CONCAT_WS(' ', u.name, u.last_name) AS name,
         u.email,
         st.id AS team_id,
         st.name AS team_name,
         st.code AS team_code,
         COALESCE(ps.state, 'offline') AS presence_state,
         COUNT(DISTINCT so_active.id)::int AS active_sales_orders,
         COUNT(DISTINCT io_active.id)::int AS active_incomplete_orders,
         COUNT(DISTINCT l.id)::int AS assigned_in_range,
         COUNT(DISTINCT so_called.id) FILTER (WHERE so_called.telephony_outcome IN ('connected', 'order_placed'))::int AS positive_outcomes,
         COUNT(DISTINCT so_called.id) FILTER (WHERE so_called.telephony_outcome IN ('no_answer', 'unreachable'))::int AS unreachable_outcomes,
         COUNT(DISTINCT so_called.id) FILTER (WHERE so_called.telephony_called_at IS NOT NULL)::int AS calls_logged
       FROM users u
       LEFT JOIN sales_teams st ON st.id = u.team_id
       LEFT JOIN user_presence_statuses ps ON ps.user_id = u.id
       LEFT JOIN automatic_order_assignment_logs l
         ON l.agent_id = u.id
        AND l.created_at >= $2::timestamp
        AND l.created_at <= $3::timestamp
       LEFT JOIN sales_orders so_active
         ON so_active.assigned_to = u.id
        AND LOWER(so_active.status::text) IN ('processing', 'pending', 'approved', 'hold', 'sent', 'in_review', 'in_transit', 'picked', 'shipped')
       LEFT JOIN incomplete_orders io_active
         ON io_active.assigned_to = u.id
        AND COALESCE(io_active.converted_to_order, FALSE) = FALSE
       LEFT JOIN sales_orders so_called
         ON so_called.assigned_to = u.id
        AND so_called.telephony_called_at >= $2::timestamp
        AND so_called.telephony_called_at <= $3::timestamp
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.team_leader_id = $1
         AND u.is_deleted = FALSE
         AND u.status = 'active'
         AND r.slug = 'sales-executive'
       GROUP BY u.id, u.name, u.last_name, u.email, st.id, st.name, st.code, ps.state
       ORDER BY COALESCE(st.code, ''), st.name, assigned_in_range DESC, name`,
      [teamLeaderId, rangeStart, rangeEnd],
    );

    const queueByType = new Map(queueRows.map((row) => [String(row.work_type), Number(row.count || 0)]));
    const queueSummary = this.automaticAssignmentWorkTypes.map((workType) => ({
      workType,
      count: queueByType.get(workType) || 0,
    }));

    const teams = teamRows.map((team: any) => {
      const configured = (overview.teamWorkTypes || []).find((item: any) => Number(item.id) === Number(team.id));
      return {
        id: Number(team.id),
        name: team.name,
        code: team.code,
        workTypes: configured?.workTypes || (Array.isArray(team.work_types) ? team.work_types : []),
        agentCount: Number(team.agent_count || 0),
        onlineAgents: Number(team.online_agents || 0),
        activeOrders: Number(team.active_sales_orders || 0) + Number(team.active_incomplete_orders || 0),
        activeSalesOrders: Number(team.active_sales_orders || 0),
        activeIncompleteOrders: Number(team.active_incomplete_orders || 0),
        assignedInRange: Number(team.assigned_in_range || 0),
        salesAssignedInRange: Number(team.sales_assigned_in_range || 0),
        incompleteAssignedInRange: Number(team.incomplete_assigned_in_range || 0),
        unreachableOutcomes: Number(team.unreachable_outcomes || 0),
        positiveOutcomes: Number(team.positive_outcomes || 0),
      };
    });

    const agents = agentRows.map((agent: any) => ({
      id: Number(agent.id),
      name: agent.name || agent.email,
      email: agent.email,
      teamId: agent.team_id == null ? null : Number(agent.team_id),
      teamName: agent.team_name || 'Unassigned Team',
      teamCode: agent.team_code || null,
      presenceState: agent.presence_state || 'offline',
      activeOrders: Number(agent.active_sales_orders || 0) + Number(agent.active_incomplete_orders || 0),
      assignedInRange: Number(agent.assigned_in_range || 0),
      callsLogged: Number(agent.calls_logged || 0),
      positiveOutcomes: Number(agent.positive_outcomes || 0),
      unreachableOutcomes: Number(agent.unreachable_outcomes || 0),
    }));

    return {
      teamLeaderId,
      from: fromDate,
      to: toDate,
      settings: overview.settings,
      summary: {
        teams: teams.length,
        agents: agents.length,
        onlineAgents: agents.filter((agent: any) => agent.presenceState === 'online').length,
        activeOrders: teams.reduce((sum: number, team: any) => sum + team.activeOrders, 0),
        assignedInRange: teams.reduce((sum: number, team: any) => sum + team.assignedInRange, 0),
        pendingQueue: queueSummary.reduce((sum: number, row: any) => sum + row.count, 0),
        unreachableOutcomes: teams.reduce((sum: number, team: any) => sum + team.unreachableOutcomes, 0),
      },
      queueSummary,
      teams,
      agents,
      recentAssignments: overview.recentAssignments,
    };
  }

  async getAutomaticAssignmentProducts(user: any) {
    const access = await this.getAutomaticAssignmentAccess(user);
    if (!access.canView) throw new BadRequestException('You do not have permission to view automatic assignment');
    const rows: Array<{ id: number; name: string; sku: string | null }> = await this.salesRepository.manager.query(
      `SELECT id, COALESCE(name_en, name_bn, sku, CONCAT('Product #', id)) AS name, sku
       FROM products
       WHERE COALESCE(status, 'active') = 'active'
       ORDER BY LOWER(COALESCE(name_en, name_bn, sku, CONCAT('Product #', id))) ASC`,
    );
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      sku: row.sku,
    }));
  }

  async getAutomaticAssignmentTeamLeaders(user: any) {
    const access = await this.getAutomaticAssignmentAccess(user);
    if (!access.canView) throw new BadRequestException('You do not have permission to view automatic assignment');

    if (!access.canViewAll) {
      const rows: Array<{ id: number; name: string; last_name: string | null; email: string }> = await this.salesRepository.manager.query(
        `SELECT id, name, last_name, email
         FROM users
         WHERE id = $1
           AND is_deleted = false
           AND status = 'active'`,
        [access.userId],
      );
      return rows.map((row) => ({
        id: Number(row.id),
        name: `${row.name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
      }));
    }

    const rows: Array<{ id: number; name: string; last_name: string | null; email: string }> = await this.salesRepository.manager.query(
      `SELECT DISTINCT u.id, u.name, u.last_name, u.email
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN team_members tm ON tm.team_leader_id = u.id AND tm.is_active = TRUE
       LEFT JOIN users direct_agent ON direct_agent.team_leader_id = u.id AND direct_agent.is_deleted = FALSE
       WHERE u.is_deleted = FALSE
         AND u.status = 'active'
         AND (
           r.slug = 'sales-team-leader'
           OR tm.id IS NOT NULL
           OR direct_agent.id IS NOT NULL
         )
       ORDER BY u.name ASC, u.last_name ASC`,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: `${row.name || ''} ${row.last_name || ''}`.trim() || row.email,
      email: row.email,
    }));
  }

  async updateAutomaticAssignmentSettings(user: any, body: {
    teamLeaderId?: number;
    isEnabled?: boolean;
    maxActiveOrders?: number;
    maxDailyOrders?: number;
    agentPreferences?: Array<{ agentId?: number; productId?: number | null; assignmentOrderDirection?: string }>;
    teamWorkTypes?: Array<{ teamId?: number; workTypes?: string[] }>;
  }) {
    const access = await this.getAutomaticAssignmentAccess(user);
    if (!access.canManage) throw new BadRequestException('You do not have permission to manage automatic assignment');
    if (!access.canViewAll && !access.isTeamLeader) throw new BadRequestException('Only Team Leaders can manage automatic assignment');
    await this.ensureAutomaticAssignmentSchema();
    const teamLeaderId = access.canViewAll && body.teamLeaderId ? Number(body.teamLeaderId) : access.userId;
    const maxActiveOrders = Math.max(1, Math.min(500, Number(body.maxActiveOrders || 10)));
    const maxDailyOrders = Math.max(1, Math.min(5000, Number(body.maxDailyOrders || 100)));
    const isEnabled = Boolean(body.isEnabled);

    await this.salesRepository.manager.query(
      `INSERT INTO automatic_order_assignment_settings
         (team_leader_id, is_enabled, max_active_orders, max_daily_orders, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (team_leader_id)
       DO UPDATE SET is_enabled = EXCLUDED.is_enabled,
                     max_active_orders = EXCLUDED.max_active_orders,
                     max_daily_orders = EXCLUDED.max_daily_orders,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()`,
      [teamLeaderId, isEnabled, maxActiveOrders, maxDailyOrders, access.userId],
    );

    if (Array.isArray(body.agentPreferences)) {
      for (const preference of body.agentPreferences) {
        const agentId = Number(preference.agentId);
        if (!Number.isFinite(agentId) || agentId <= 0) continue;
        const productId = preference.productId == null || preference.productId === 0 ? null : Number(preference.productId);
        const assignmentOrderDirection = String(preference.assignmentOrderDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
        await this.salesRepository.manager.query(
          `INSERT INTO automatic_order_assignment_agent_preferences
             (team_leader_id, agent_id, product_id, assignment_order_direction, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           ON CONFLICT (team_leader_id, agent_id)
           DO UPDATE SET product_id = EXCLUDED.product_id,
                         assignment_order_direction = EXCLUDED.assignment_order_direction,
                         updated_by = EXCLUDED.updated_by,
                         updated_at = NOW()`,
          [teamLeaderId, agentId, Number.isFinite(productId as any) ? productId : null, assignmentOrderDirection, access.userId],
        );
      }
    }

    if (Array.isArray(body.teamWorkTypes)) {
      await this.salesRepository.manager.query(
        `DELETE FROM automatic_order_assignment_team_work_types
         WHERE team_leader_id = $1`,
        [teamLeaderId],
      );
      for (const teamConfig of body.teamWorkTypes) {
        const teamId = Number(teamConfig.teamId);
        if (!Number.isFinite(teamId) || teamId <= 0) continue;
        const workTypes = Array.from(new Set((teamConfig.workTypes || []).map((item) => String(item).trim()).filter((item) => this.automaticAssignmentWorkTypes.includes(item))));
        for (const workType of workTypes) {
          await this.salesRepository.manager.query(
            `INSERT INTO automatic_order_assignment_team_work_types
               (team_leader_id, team_id, work_type, updated_by, created_at, updated_at)
             SELECT $1, st.id, $3, $4, NOW(), NOW()
             FROM sales_teams st
             WHERE st.id = $2
               AND st.team_leader_id = $1
             ON CONFLICT (team_leader_id, team_id, work_type)
             DO UPDATE SET updated_by = EXCLUDED.updated_by,
                           updated_at = NOW()`,
            [teamLeaderId, teamId, workType, access.userId],
          );
        }
      }
    }

    const assignmentRun = isEnabled
      ? await this.runAutomaticAssignmentQueue({ teamLeaderId, limit: 500, reason: 'settings_queue_drain' })
      : { assignedCount: 0, checkedOrders: 0, eligibleAgents: 0 };
    const overview = await this.getAutomaticAssignmentOverview(user, { teamLeaderId });
    return { ...overview, assignmentRun };
  }

  async runAutomaticAssignmentNow(user: any, body: { teamLeaderId?: number } = {}) {
    const access = await this.getAutomaticAssignmentAccess(user);
    if (!access.canManage) throw new BadRequestException('You do not have permission to run automatic assignment');
    if (!access.canViewAll && !access.isTeamLeader) throw new BadRequestException('Only Team Leaders can run automatic assignment');
    const teamLeaderId = access.canViewAll && body.teamLeaderId ? Number(body.teamLeaderId) : access.userId;
    const assignmentRun = await this.runAutomaticAssignmentQueue({ teamLeaderId, limit: 500, reason: 'manual_queue_drain' });
    const overview = await this.getAutomaticAssignmentOverview(user, { teamLeaderId });
    return { ...overview, assignmentRun };
  }

  private async getAssignedOrdersAccess(user: any) {
    const roleSlug = String(user?.roleSlug || '').toLowerCase();
    const userId = Number(user?.id);
    const permissions = await this.getAssignedOrderPermissionSet(userId);
    const has = (slug: string) => permissions.has(slug);
    const hasManage = has('manage-assigned-orders') || has('manage-order-assignment');
    const canViewAll = has('view-all-assigned-orders') || ((has('view-assigned-orders') || has('view-order-assignment')) && ['super-admin', 'admin', 'sales-manager'].includes(roleSlug));
    const canViewTeam = has('view-team-assigned-orders') || hasManage || (has('view-assigned-orders') && roleSlug === 'sales-team-leader');
    const canViewOwn = has('view-own-assigned-orders') || has('view-assigned-orders') || canViewTeam || canViewAll;

    return {
      userId,
      roleSlug,
      permissions,
      hasManage,
      canViewAll,
      canViewTeam,
      canViewOwn,
      isAdmin: roleSlug === 'super-admin' || roleSlug === 'admin' || canViewAll,
      isTeamLeader: roleSlug === 'sales-team-leader',
      isSalesExecutive: roleSlug === 'sales-executive',
    };
  }

  private async getAssignedOrderPermissionSet(userId: number) {
    const rows: Array<{ slug: string }> = await this.salesRepository.manager.query(
      `SELECT DISTINCT p.slug
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       INNER JOIN roles r ON r.id = rp.role_id
       WHERE r.is_active = true
         AND p.slug IN (
           'view-assigned-orders',
           'view-own-assigned-orders',
           'view-team-assigned-orders',
           'view-all-assigned-orders',
           'manage-assigned-orders',
           'view-order-assignment',
           'manage-order-assignment'
         )
         AND (
           r.id IN (SELECT role_id FROM users WHERE id = $1)
           OR r.id IN (SELECT role_id FROM user_roles WHERE user_id = $1)
         )`,
      [userId],
    );
    return new Set(rows.map((row) => String(row.slug)));
  }

  private async assertAgentAssignableToUser(agentId: number, user: any) {
    const access = await this.getAssignedOrdersAccess(user);
    const rows: Array<{ id: number; team_leader_id: number | null; role_slug: string | null }> =
      await this.salesRepository.manager.query(
        `SELECT u.id, u.team_leader_id, r.slug AS role_slug
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1
           AND u.is_deleted = false
           AND u.status = 'active'
         LIMIT 1`,
        [agentId],
      );

    const agent = rows[0];
    if (!agent || agent.role_slug !== 'sales-executive') {
      throw new BadRequestException('Selected agent is not an active Sales Executive');
    }
    if (access.hasManage && access.canViewAll) return;
    if (access.hasManage && access.canViewTeam && Number(agent.team_leader_id) === access.userId) return;
    throw new BadRequestException('You can only assign orders to your own agents');
  }

  private toAdminListDto(order: SalesOrder) {
    const customerName = (order as any).customerName ?? null;
    const customerEmail = (order as any).customerEmail ?? null;
    const customerPhone = (order as any).customerPhone ?? null;
    const items = (order as any)._items || [];
    const itemsSubtotal = this.roundMoney(items.reduce((sum: number, item: any) => sum + this.getItemSubtotal(item), 0));
    const discountAmount = this.roundMoney(order.discountAmount || 0);
    const deliveryCharge = this.resolveDeliveryCharge(order, itemsSubtotal, discountAmount);
    const computedTotalAmount = this.roundMoney(Math.max(0, itemsSubtotal + deliveryCharge - discountAmount));

    return {
      id: order.id,
      // Keep both keys for compatibility (some pages used order_number earlier)
      sales_order_number: order.salesOrderNumber,
      order_number: order.salesOrderNumber,

      customer_id: order.customerId,
      customer_name: customerName ?? (order.customerId ? `Customer #${order.customerId}` : 'Guest'),
      customer_email: customerEmail,
      customer_phone: customerPhone,

      totalAmount: computedTotalAmount,
      total_amount: computedTotalAmount,
      computedTotalAmount,
      computed_total_amount: computedTotalAmount,
      storedTotalAmount: parseFloat(order.totalAmount?.toString() || '0'),
      stored_total_amount: parseFloat(order.totalAmount?.toString() || '0'),
      deliveryCharge,
      delivery_charge: deliveryCharge,
      itemsSubtotal,
      items_subtotal: itemsSubtotal,
      status: order.status,

      order_date: order.orderDate || order.createdAt,
      created_at: order.createdAt,

      shipping_address: order.shippingAddress,
      courier_notes: order.courierNotes,
      rider_instructions: order.riderInstructions,
      internal_notes: order.internalNotes,
      late_delivery_note: order.lateDeliveryNote,
      cancelled_order_note: order.cancelledOrderNote,
      cancel_reason: order.cancelReason,
      approved_by: order.approvedBy,
      approved_at: order.approvedAt,
      cancelled_by: order.cancelledBy,
      cancelled_at: order.cancelledAt,

      user_ip: order.userIp,
      geo_location: order.geoLocation,
      browser_info: order.browserInfo,
      device_type: order.deviceType,
      operating_system: order.operatingSystem,
      traffic_source: order.trafficSource,
      referrer_url: order.referrerUrl,
      utm_source: order.utmSource,
      utm_medium: order.utmMedium,
      utm_campaign: order.utmCampaign,

      courier_company: order.courierCompany,
      courier_order_id: (order as any).courierOrderId ?? null,
      tracking_id: order.trackingId,
      shipped_at: order.shippedAt,
      delivered_at: order.deliveredAt,
      thank_you_offer_accepted: (order as any).thankYouOfferAccepted ?? null,

      is_packed: order.isPacked ?? false,
      invoice_printed: (order as any).invoicePrinted ?? false,
      sticker_printed: (order as any).stickerPrinted ?? false,

      notes: order.notes,
      created_by: order.createdBy ?? null,
      created_by_name: order.createdBy ? ((order as any).createdByName || null) : null,
      assigned_to: order.assignedTo ?? null,
      assigned_to_name: order.assignedTo ? ((order as any).assignedToName || null) : null,
      assigned_by: order.assignedBy ?? null,
      assigned_by_name: order.assignedBy ? ((order as any).assignedByName || null) : null,
      assigned_at: order.assignedAt ?? null,
      telephony_called_at: order.telephonyCalledAt ?? null,
      telephony_call_status: order.telephonyCallStatus ?? null,
      telephony_outcome: order.telephonyOutcome ?? null,
      telephony_suggestion: order.telephonySuggestion ?? null,
      telephony_notes: order.telephonyNotes ?? null,
      order_source: order.orderSource || null,
      order_source_display: this.computeOrderSourceDisplay(order),
      items: items.map((i: any) => ({
        productName: i.productName || i.product_name || 'Unknown',
        productNameBn: i.productNameBn || null,
        variantName: i.variantName || null,
        quantity: Number(i.quantity) || 0,
        customProductName: i.customProductName || null,
        itemId: i.itemId || null,
      })),
    };
  }

  /**
   * Fetch items for a batch of order IDs from BOTH tables (sales_order_items + order_items),
   * with a fallback to the products table for missing product names.
   */
  private async batchFetchOrderItems(orderIds: number[]): Promise<Map<number, { productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number; unitPrice?: number; subtotal?: number; customProductName?: string | null; itemId?: number; source?: string }[]>> {
    const map = new Map<number, { productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number; unitPrice?: number; subtotal?: number; customProductName?: string | null; itemId?: number; source?: string }[]>();
    if (orderIds.length === 0) return map;

    // Query both item tables — prefer order_items (admin/migrated) when they exist,
    // fall back to sales_order_items (checkout/landing-page) for orders not yet migrated.
    const rows: { order_id: number; item_id: number; product_name: string | null; custom_product_name: string | null; product_id: number | null; quantity: number; unit_price: number | null; subtotal: number | null; source: string; variant_name: string | null }[] =
      await this.salesRepository.manager.query(
        `SELECT oi.id AS item_id, oi.order_id, oi.product_name, oi.custom_product_name, oi.product_id, oi.quantity, oi.unit_price, oi.subtotal, oi.variant_name, 'order_items' AS source
         FROM order_items oi
         WHERE oi.order_id = ANY($1)
         UNION ALL
         SELECT soi.id AS item_id, soi.sales_order_id AS order_id, soi.product_name, soi.custom_product_name, soi.product_id, soi.quantity, soi.unit_price, soi.line_total AS subtotal, NULL AS variant_name, 'sales_order_items' AS source
         FROM sales_order_items soi
         WHERE soi.sales_order_id = ANY($1)
           AND soi.sales_order_id NOT IN (SELECT DISTINCT oi2.order_id FROM order_items oi2 WHERE oi2.order_id = ANY($1))`,
        [orderIds],
      );

    // Collect product IDs that have no name so we can look them up
    const missingNameProductIds = new Set<number>();
    for (const r of rows) {
      if (!r.product_name && !r.custom_product_name && r.product_id) {
        missingNameProductIds.add(r.product_id);
      }
    }

    // Lookup product names from products table
    let productNameMap = new Map<number, string>();
    let productNameBnMap = new Map<number, string>();
    if (missingNameProductIds.size > 0) {
      const productRows: { id: number; name_en: string; name_bn: string | null }[] = await this.salesRepository.manager.query(
        `SELECT id, name_en, name_bn FROM products WHERE id = ANY($1)`,
        [[...missingNameProductIds]],
      );
      for (const p of productRows) {
        productNameMap.set(p.id, p.name_en);
        if (p.name_bn) productNameBnMap.set(p.id, p.name_bn);
      }
    }

    // Also fetch name_bn for ALL product IDs (not just missing names)
    const allProductIds = new Set<number>();
    for (const r of rows) {
      if (r.product_id) allProductIds.add(r.product_id);
    }
    // Fetch Bengali names for all products in these items
    if (allProductIds.size > 0) {
      const bnRows: { id: number; name_bn: string | null }[] = await this.salesRepository.manager.query(
        `SELECT id, name_bn FROM products WHERE id = ANY($1)`,
        [[...allProductIds]],
      );
      for (const p of bnRows) {
        if (p.name_bn) productNameBnMap.set(p.id, p.name_bn);
      }
    }

    for (const r of rows) {
      const originalName = r.product_name || (r.product_id ? productNameMap.get(r.product_id) : null) || 'Unknown Product';
      const customName = r.custom_product_name || null;
      // Display name: prefer custom over original
      const displayName = customName || originalName;
      // If there's a custom name override, don't send Bengali name — the custom name IS the display name
      const nameBn = customName ? null : (r.product_id ? productNameBnMap.get(r.product_id) || null : null);
      const arr = map.get(r.order_id) || [];
      arr.push({
        productName: displayName,
        productNameBn: nameBn,
        variantName: r.variant_name || null,
        quantity: Number(r.quantity) || 0,
        unitPrice: Number(r.unit_price) || 0,
        subtotal: this.getItemSubtotal(r),
        customProductName: customName,
        itemId: r.item_id,
        source: r.source,
      });
      map.set(r.order_id, arr);
    }

    return map;
  }

  private computeOrderSourceDisplay(order: SalesOrder): string {
    const source = order.orderSource || '';
    if (source === 'admin_panel' || source === 'agent_dashboard') {
      return (order as any).createdByName || 'Admin';
    }
    if (source === 'landing_page') return 'Landing Page';
    if (source === 'website') return 'Website';
    // Fallback: infer from legacy data
    if (order.trafficSource === 'landing_page' || order.trafficSource === 'landing_page_intl') return 'Landing Page';
    if (order.createdBy && order.createdBy > 1) return (order as any).createdByName || 'Admin';
    return 'Website';
  }

  async getSourceFilterOptions(): Promise<{ value: string; label: string }[]> {
    const options: { value: string; label: string }[] = [
      { value: 'landing_page', label: 'Landing Page' },
      { value: 'website', label: 'Website' },
    ];

    // Get distinct active agents/admins who created orders
    const agents: { id: number; name: string; last_name: string | null }[] =
      await this.salesRepository.query(
        `SELECT DISTINCT u.id, u.name, u.last_name
         FROM sales_orders o
         INNER JOIN users u ON u.id = o.created_by
         WHERE o.order_source IN ('admin_panel', 'agent_dashboard')
           AND o.created_by IS NOT NULL
           AND u.status = 'active'
           AND u.is_deleted = false
         ORDER BY u.name ASC`,
      );

    for (const agent of agents) {
      const fullName = agent.last_name
        ? `${agent.name} ${agent.last_name}`.trim()
        : agent.name;
      options.push({ value: `agent:${agent.id}`, label: fullName });
    }

    return options;
  }

  async getLandingPageFilterOptions(): Promise<{ value: string; label: string; id: number | null; slug: string; title: string }[]> {
    const rows: Array<{ id: number | null; slug: string; title: string }> = await this.salesRepository.query(
      `
      WITH page_options AS (
        SELECT
          id,
          NULLIF(TRIM(slug), '') AS slug,
          NULLIF(TRIM(title), '') AS title
        FROM landing_pages
        WHERE NULLIF(TRIM(slug), '') IS NOT NULL

        UNION ALL

        SELECT
          NULL::integer AS id,
          NULLIF(TRIM(o.utm_source), '') AS slug,
          COALESCE(NULLIF(TRIM(o.utm_campaign), ''), NULLIF(TRIM(o.utm_source), '')) AS title
        FROM sales_orders o
        WHERE o.order_source = 'landing_page'
          AND NULLIF(TRIM(o.utm_source), '') IS NOT NULL
      )
      SELECT
        MIN(id) AS id,
        slug,
        COALESCE(
          MAX(title) FILTER (WHERE title IS NOT NULL),
          slug
        ) AS title
      FROM page_options
      WHERE slug IS NOT NULL
      GROUP BY slug
      ORDER BY LOWER(COALESCE(MAX(title) FILTER (WHERE title IS NOT NULL), slug)) ASC
      `,
    );

    return rows.map((row) => {
      const slug = String(row.slug || '').trim();
      const title = String(row.title || slug).trim();
      return {
        id: row.id != null ? Number(row.id) : null,
        slug,
        title,
        value: slug,
        label: title && title !== slug ? `${title} (${slug})` : slug,
      };
    });
  }

  async findAll() {
    const qb = this.salesRepository.createQueryBuilder('o');
    this.selectAdminOrderColumns(qb);

    const orders = await qb
      .orderBy('o.created_at', 'DESC')
      .getMany();

    // Batch-fetch user names
    const userIds = [...new Set(orders.flatMap(o => [o.createdBy, o.assignedTo, o.assignedBy]).filter((id): id is number => id != null))];
    const userMap = await this.getUserNameMap(userIds);

    // Batch-fetch order items from both tables
    const orderIds = orders.map(o => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);

    return orders.map((order) => {
      (order as any).createdByName = order.createdBy ? (userMap.get(order.createdBy) ?? null) : null;
      (order as any).assignedToName = order.assignedTo ? (userMap.get(order.assignedTo) ?? null) : null;
      (order as any).assignedByName = order.assignedBy ? (userMap.get(order.assignedBy) ?? null) : null;
      (order as any)._items = itemsByOrderId.get(order.id) || [];
      return this.toAdminListDto(order);
    });
  }

  async findAllPaginated(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    todayOnly?: boolean;
    productName?: string;
    sourceGroup?: string;
    source?: string;
    landingPage?: string;
    assignment?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(500, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.salesRepository.createQueryBuilder('o');
    this.selectAdminOrderColumns(qb);

    // Global text search
    if (params.q && params.q.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      const normalizedPhone = `%${params.q.trim().replace(/^\+88/, '').toLowerCase()}%`;
      qb.andWhere(
        '(CAST(o.id AS TEXT) ILIKE :q ' +
        'OR o.sales_order_number ILIKE :q ' +
        'OR o.customer_name ILIKE :q ' +
        'OR o.customer_phone ILIKE :q ' +
        "OR REPLACE(o.customer_phone, '+88', '') ILIKE :normalizedPhone " +
        'OR o.courier_company ILIKE :q ' +
        'OR CAST(o.courier_order_id AS TEXT) ILIKE :q ' +
        'OR o.shipping_address ILIKE :q)',
        { q, normalizedPhone },
      );
    }

    // Status filter (cast to text because status is a PostgreSQL enum)
    if (params.status && params.status.trim()) {
      qb.andWhere('LOWER(o.status::text) = LOWER(:status)', { status: params.status.trim() });
    }

    // Today only
    if (params.todayOnly) {
      qb.andWhere('DATE(o.order_date) = CURRENT_DATE');
    } else {
      // Date range filters
      if (params.startDate) {
        qb.andWhere('DATE(o.order_date) >= :startDate', { startDate: params.startDate });
      }
      if (params.endDate) {
        qb.andWhere('DATE(o.order_date) <= :endDate', { endDate: params.endDate });
      }
    }

    // Product name filter — subquery in order_items / sales_order_items + products table
    if (params.productName && params.productName.trim()) {
      const pName = `%${params.productName.trim().toLowerCase()}%`;
      qb.andWhere(
        `(o.id IN (
          SELECT oi.order_id
          FROM order_items oi
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE (
            p.id IS NOT NULL AND (p.name_en ILIKE :pName OR p.name_bn ILIKE :pName OR p.sku ILIKE :pName)
          ) OR (
            p.id IS NULL AND oi.product_name ILIKE :pName
          )
          UNION
          SELECT soi.sales_order_id
          FROM sales_order_items soi
          LEFT JOIN products p2 ON p2.id = soi.product_id
          WHERE (
            p2.id IS NOT NULL AND (p2.name_en ILIKE :pName OR p2.name_bn ILIKE :pName OR p2.sku ILIKE :pName)
          ) OR (
            p2.id IS NULL AND soi.product_name ILIKE :pName
          )
        ))`,
        { pName },
      );
    }

    // Source filter
    if (params.sourceGroup && params.sourceGroup.trim()) {
      const sourceGroup = params.sourceGroup.trim();
      if (sourceGroup === 'agent_wise') {
        qb.andWhere("o.order_source IN ('admin_panel', 'agent_dashboard')");
      } else if (sourceGroup === 'landing_page') {
        qb.andWhere('o.order_source IN (:...webLandingSources)', { webLandingSources: this.webOrderSources });
      }
    }

    if (params.source && params.source.trim()) {
      const src = params.source.trim();
      if (src.startsWith('agent:')) {
        const agentId = parseInt(src.replace('agent:', ''), 10);
        if (!isNaN(agentId)) {
          qb.andWhere("o.order_source IN ('admin_panel', 'agent_dashboard')", {});
          qb.andWhere('o.created_by = :agentId', { agentId });
        }
      } else if (src === 'landing_page' || src === 'website') {
        qb.andWhere('o.order_source = :orderSource', { orderSource: src });
      }
    }

    // Landing-page slug filter (e.g. herbolin)
    if (params.landingPage && params.landingPage.trim()) {
      const slug = params.landingPage.trim().toLowerCase();
      qb.andWhere("o.order_source = 'landing_page'");
      qb.andWhere(
        '(LOWER(o.referrer_url) LIKE :lpSlug OR LOWER(o.utm_source) LIKE :lpSlug OR LOWER(o.utm_campaign) LIKE :lpSlug)',
        { lpSlug: `%${slug}%` },
      );
    }

    if (params.assignment === 'assigned') {
      qb.andWhere('o.assigned_to IS NOT NULL');
    } else if (params.assignment === 'unassigned') {
      qb.andWhere('o.assigned_to IS NULL');
    }

    qb.orderBy('o.order_date', 'DESC')
      .addOrderBy('o.created_at', 'DESC');

    // Get total count before applying pagination
    const total = await qb.getCount();

    qb.skip(skip).take(limit);

    const orders = await qb.getMany();

    // Batch-fetch user names
    const userIds = [...new Set(orders.flatMap(o => [o.createdBy, o.assignedTo, o.assignedBy]).filter((id): id is number => id != null))];
    const userMap = await this.getUserNameMap(userIds);

    orders.forEach((order) => {
      (order as any).createdByName = order.createdBy ? (userMap.get(order.createdBy) ?? null) : null;
      (order as any).assignedToName = order.assignedTo ? (userMap.get(order.assignedTo) ?? null) : null;
      (order as any).assignedByName = order.assignedBy ? (userMap.get(order.assignedBy) ?? null) : null;
    });

    // Batch-fetch order items from both tables for current page
    const orderIds = orders.map(o => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);

    // ──── Check rejected customer phones ────
    const phoneSet = new Set<string>();
    for (const o of orders) {
      const ph = (o.customerPhone || '').replace(/^\+88/, '').trim();
      if (ph) phoneSet.add(ph);
    }
    const rejectedPhones = new Set<string>();
    if (phoneSet.size > 0) {
      const rows: { phone: string }[] = await this.salesRepository.query(
        `SELECT DISTINCT REPLACE(c.phone, '+88', '') AS phone
         FROM customers c
         INNER JOIN customer_tiers ct ON ct.customer_id = c.id
         WHERE ct.tier = 'rejected' AND REPLACE(c.phone, '+88', '') = ANY($1)`,
        [Array.from(phoneSet)],
      );
      for (const r of rows) rejectedPhones.add(r.phone);
    }

    // ──── Batch-fetch customer lifetime order counts by phone ────
    const phoneTotalMap = new Map<string, number>();
    if (phoneSet.size > 0) {
      const countRows: { phone: string; cnt: string }[] = await this.salesRepository.query(
        `SELECT REPLACE(customer_phone, '+88', '') AS phone, COUNT(*)::text AS cnt
         FROM sales_orders
         WHERE REPLACE(customer_phone, '+88', '') = ANY($1)
         GROUP BY REPLACE(customer_phone, '+88', '')`,
        [Array.from(phoneSet)],
      );
      for (const r of countRows) phoneTotalMap.set(r.phone, parseInt(r.cnt, 10) || 0);
    }

    // ──── Batch-fetch active unused coupon codes per phone ────
    const couponCodesByPhone = new Map<string, string[]>();
    if (phoneSet.size > 0) {
      const couponRows: { phone: string; code: string }[] = await this.salesRepository.query(
        `SELECT REPLACE(cc.customer_phone, '+88', '') AS phone, camp.code
         FROM campaign_customers cc
         INNER JOIN coupon_campaigns camp ON camp.id = cc.campaign_id
         WHERE cc.is_active = true
           AND camp.is_active = true
           AND camp.code IS NOT NULL
           AND cc.times_used < camp.per_customer_limit
           AND (camp.valid_until IS NULL OR camp.valid_until > NOW())
           AND (camp.valid_from IS NULL OR camp.valid_from <= NOW())
           AND REPLACE(cc.customer_phone, '+88', '') = ANY($1)`,
        [Array.from(phoneSet)],
      );
      for (const r of couponRows) {
        if (!couponCodesByPhone.has(r.phone)) couponCodesByPhone.set(r.phone, []);
        couponCodesByPhone.get(r.phone)!.push(r.code);
      }
    }

    // ──── Batch-fetch customer tags by customer_id ────
    const customerIdSet = new Set<number>();
    for (const o of orders) {
      const cid = o.customerId != null ? Number(o.customerId) : NaN;
      if (Number.isFinite(cid) && cid > 0) customerIdSet.add(cid);
    }
    const tagsByCustomerId = new Map<number, { name: string; color: string | null }[]>();
    if (customerIdSet.size > 0) {
      const tagRows: { customer_id: number; name: string; color: string | null }[] = await this.salesRepository.query(
        `SELECT cta.customer_id, ct.name, ct.color
         FROM customer_tag_assignments cta
         INNER JOIN customer_tags ct ON ct.id = cta.tag_id
         WHERE cta.customer_id = ANY($1)
         ORDER BY ct.name`,
        [Array.from(customerIdSet)],
      );
      for (const r of tagRows) {
        const cid = Number(r.customer_id);
        if (!tagsByCustomerId.has(cid)) tagsByCustomerId.set(cid, []);
        tagsByCustomerId.get(cid)!.push({ name: r.name, color: r.color });
      }
    }

    return {
      data: orders.map((order) => {
        (order as any)._items = itemsByOrderId.get(order.id) || [];
        const dto = this.toAdminListDto(order);
        const norm = (order.customerPhone || '').replace(/^\+88/, '').trim();
        (dto as any).isRejectedCustomer = rejectedPhones.has(norm);
        (dto as any).customerTotalOrders = phoneTotalMap.get(norm) || 0;
        (dto as any).activeCouponCodes = couponCodesByPhone.get(norm) || [];
        const cid = order.customerId != null ? Number(order.customerId) : NaN;
        (dto as any).customerTags = Number.isFinite(cid) ? (tagsByCustomerId.get(cid) || []) : [];
        return dto;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAssignedOrdersPaginated(params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    assignment?: string;
    todayOnly?: boolean;
    teamLeaderId?: number;
    agentId?: number;
    product?: string;
    landingPage?: string;
  }, user: any) {
    const access = await this.getAssignedOrdersAccess(user);
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(500, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;
    const qb = this.salesRepository.createQueryBuilder('o');
    this.selectAssignedOrderColumns(qb);

    qb.where('o.order_source IN (:...webSources)', { webSources: this.webOrderSources });
    qb.andWhere(`NOT ${this.approvedForMainOrdersSql}`);

    if (access.canViewAll) {
      // Full queue visibility; optional filters below can narrow the result.
    } else if (access.canViewTeam) {
      if (access.isTeamLeader) {
        qb.andWhere(
          `(o.assigned_to IS NULL OR o.assigned_to IN (
            SELECT u.id FROM users u
            WHERE u.team_leader_id = :currentTeamLeaderId
              AND u.is_deleted = false
          ))`,
          { currentTeamLeaderId: access.userId },
        );
      } else {
        qb.andWhere('o.assigned_to = :fallbackTeamScopedUserId', { fallbackTeamScopedUserId: access.userId });
      }
    } else if (access.canViewOwn || access.isSalesExecutive) {
      qb.andWhere('o.assigned_to = :currentAgentId', { currentAgentId: access.userId });
    } else {
      qb.andWhere('1 = 0');
    }

    if (params.q && params.q.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      const normalizedPhone = `%${params.q.trim().replace(/^\+88/, '').toLowerCase()}%`;
      qb.andWhere(
        '(CAST(o.id AS TEXT) ILIKE :q ' +
        'OR o.sales_order_number ILIKE :q ' +
        'OR o.customer_name ILIKE :q ' +
        'OR o.customer_phone ILIKE :q ' +
        "OR REPLACE(o.customer_phone, '+88', '') ILIKE :normalizedPhone " +
        'OR o.shipping_address ILIKE :q)',
        { q, normalizedPhone },
      );
    }

    if (params.product && params.product.trim()) {
      const product = `%${params.product.trim().toLowerCase()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM sales_order_items soi
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE soi.sales_order_id = o.id
            AND (
              LOWER(COALESCE(soi.product_name, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(p.name_en, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(p.name_bn, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(p.sku, '')) LIKE :assignedProduct
            )
        )
        OR EXISTS (
          SELECT 1
          FROM order_items oi
          LEFT JOIN products p2 ON p2.id = oi.product_id
          WHERE oi.order_id = o.id
            AND (
              LOWER(COALESCE(oi.product_name, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(oi.custom_product_name, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(p2.name_en, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(p2.name_bn, '')) LIKE :assignedProduct
              OR LOWER(COALESCE(p2.sku, '')) LIKE :assignedProduct
            )
        )`,
        { assignedProduct: product },
      );
    }

    if (params.landingPage && params.landingPage.trim()) {
      const landingPage = `%${params.landingPage.trim().toLowerCase()}%`;
      qb.andWhere("o.order_source = 'landing_page'");
      qb.andWhere(
        `(
          LOWER(COALESCE(o.utm_source, '')) LIKE :assignedLandingPage
          OR LOWER(COALESCE(o.utm_campaign, '')) LIKE :assignedLandingPage
          OR LOWER(COALESCE(o.referrer_url, '')) LIKE :assignedLandingPage
          OR EXISTS (
            SELECT 1
            FROM landing_pages lp
            WHERE lp.slug = o.utm_source
              AND LOWER(COALESCE(lp.title, '')) LIKE :assignedLandingPage
          )
        )`,
        { assignedLandingPage: landingPage },
      );
    }

    if (params.assignment === 'assigned') {
      qb.andWhere('o.assigned_to IS NOT NULL');
    } else if (params.assignment === 'unassigned') {
      qb.andWhere('o.assigned_to IS NULL');
    }

    if (params.todayOnly) {
      qb.andWhere('DATE(o.order_date) = CURRENT_DATE');
    } else {
      if (params.startDate) {
        qb.andWhere('DATE(o.order_date) >= :startDate', { startDate: params.startDate });
      }
      if (params.endDate) {
        qb.andWhere('DATE(o.order_date) <= :endDate', { endDate: params.endDate });
      }
    }
    if (params.assignment === 'assigned') {
      qb.andWhere('o.assigned_to IS NOT NULL');
    } else if (params.assignment === 'unassigned') {
      qb.andWhere('o.assigned_to IS NULL');
    }
    if (access.canViewAll && Number.isFinite(Number(params.teamLeaderId)) && Number(params.teamLeaderId) > 0) {
      qb.andWhere(
        `o.assigned_to IN (
          SELECT u.id FROM users u
          WHERE u.team_leader_id = :filterTeamLeaderId
            AND u.is_deleted = false
        )`,
        { filterTeamLeaderId: Number(params.teamLeaderId) },
      );
    }
    if (Number.isFinite(Number(params.agentId)) && Number(params.agentId) > 0) {
      const agentId = Number(params.agentId);
      if (access.canViewAll) {
        qb.andWhere('o.assigned_to = :filterAgentId', { filterAgentId: agentId });
      } else if (access.canViewOwn || access.isSalesExecutive) {
        qb.andWhere('o.assigned_to = :filterAgentId', { filterAgentId: access.userId });
      } else if (access.canViewTeam && access.isTeamLeader) {
        qb.andWhere(
          `o.assigned_to = :filterAgentId
           AND EXISTS (
             SELECT 1 FROM users u
             WHERE u.id = :filterAgentId
               AND u.team_leader_id = :currentTeamLeaderId
               AND u.is_deleted = false
           )`,
          { filterAgentId: agentId, currentTeamLeaderId: access.userId },
        );
      }
    }

    qb.orderBy('o.order_date', 'DESC').addOrderBy('o.created_at', 'DESC');
    const total = await qb.getCount();
    const orders = await qb.skip(skip).take(limit).getMany();

    const userIds = [...new Set(orders.flatMap(o => [o.createdBy, o.assignedTo, o.assignedBy]).filter((id): id is number => id != null))];
    const userMap = await this.getUserNameMap(userIds);
    const itemsByOrderId = await this.batchFetchOrderItems(orders.map(o => o.id));
    const phoneSet = new Set<string>();
    for (const order of orders) {
      const phone = (order.customerPhone || '').replace(/^\+88/, '').trim();
      if (phone) phoneSet.add(phone);
    }

    const phoneTotalMap = new Map<string, number>();
    if (phoneSet.size > 0) {
      const countRows: { phone: string; cnt: string }[] = await this.salesRepository.query(
        `SELECT REPLACE(customer_phone, '+88', '') AS phone, COUNT(*)::text AS cnt
         FROM sales_orders
         WHERE REPLACE(customer_phone, '+88', '') = ANY($1)
         GROUP BY REPLACE(customer_phone, '+88', '')`,
        [Array.from(phoneSet)],
      );
      for (const row of countRows) {
        phoneTotalMap.set(row.phone, parseInt(row.cnt, 10) || 0);
      }
    }

    const data = orders.map((order) => {
      (order as any).createdByName = order.createdBy ? (userMap.get(order.createdBy) ?? null) : null;
      (order as any).assignedToName = order.assignedTo ? (userMap.get(order.assignedTo) ?? null) : null;
      (order as any).assignedByName = order.assignedBy ? (userMap.get(order.assignedBy) ?? null) : null;
      (order as any)._items = itemsByOrderId.get(order.id) || [];
      const dto = this.toAdminListDto(order);
      const normalizedPhone = (order.customerPhone || '').replace(/^\+88/, '').trim();
      (dto as any).customerTotalOrders = phoneTotalMap.get(normalizedPhone) || 0;
      return dto;
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private selectAssignedOrderColumns(qb: any) {
    return qb.select([
      ...this.adminOrderColumnSelections(),
    ]);
  }

  private selectAdminOrderColumns(qb: any) {
    return qb.select(this.adminOrderColumnSelections());
  }

  private adminOrderColumnSelections() {
    return [
      'o.id',
      'o.salesOrderNumber',
      'o.customerId',
      'o.customerName',
      'o.customerEmail',
      'o.customerPhone',
      'o.orderDate',
      'o.status',
      'o.totalAmount',
      'o.discountAmount',
      'o.deliveryCharge',
      'o.shippingAddress',
      'o.district',
      'o.courierNotes',
      'o.riderInstructions',
      'o.internalNotes',
      'o.cancelReason',
      'o.approvedBy',
      'o.approvedAt',
      'o.cancelledBy',
      'o.cancelledAt',
      'o.assignedTo',
      'o.assignedBy',
      'o.assignedAt',
      'o.telephonyCalledAt',
      'o.telephonyCallStatus',
      'o.telephonyOutcome',
      'o.telephonySuggestion',
      'o.telephonyNotes',
      'o.orderSource',
      'o.trafficSource',
      'o.referrerUrl',
      'o.utmSource',
      'o.utmMedium',
      'o.utmCampaign',
      'o.courierCompany',
      'o.courierOrderId',
      'o.trackingId',
      'o.shippedAt',
      'o.deliveredAt',
      'o.thankYouOfferAccepted',
      'o.isPacked',
      'o.invoicePrinted',
      'o.stickerPrinted',
      'o.notes',
      'o.createdBy',
      'o.createdAt',
    ];
  }

  async getAssignmentAgents(user: any, params?: { teamLeaderId?: number }) {
    const access = await this.getAssignedOrdersAccess(user);
    if (!access.canViewAll && !access.canViewTeam && (access.canViewOwn || access.isSalesExecutive)) {
      const rows: Array<{ id: number; name: string; last_name: string | null; email: string; team_leader_id: number | null }> =
        await this.salesRepository.manager.query(
          `SELECT id, name, last_name, email, team_leader_id
           FROM users
           WHERE id = $1
             AND is_deleted = false
             AND status = 'active'`,
          [access.userId],
        );

      return rows.map((agent) => ({
        id: Number(agent.id),
        name: `${agent.name || ''} ${agent.last_name || ''}`.trim() || agent.email,
        email: agent.email,
        teamLeaderId: agent.team_leader_id,
        inMyTeam: true,
      }));
    }
    if (!access.canViewAll && !access.canViewTeam) return [];

    const queryParams: any[] = [];
    const whereParts = [
      `u.is_deleted = false`,
      `u.status = 'active'`,
      `r.slug = 'sales-executive'`,
    ];

    if (access.canViewTeam && access.isTeamLeader && !access.canViewAll) {
      queryParams.push(access.userId);
      whereParts.push(`u.team_leader_id = $${queryParams.length}`);
    } else if (access.canViewAll && Number.isFinite(Number(params?.teamLeaderId)) && Number(params?.teamLeaderId) > 0) {
      queryParams.push(Number(params?.teamLeaderId));
      whereParts.push(`u.team_leader_id = $${queryParams.length}`);
    }

    const rows: Array<{ id: number; name: string; last_name: string | null; email: string; team_leader_id: number | null }> =
      await this.salesRepository.manager.query(
        `SELECT u.id, u.name, u.last_name, u.email, u.team_leader_id
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE ${whereParts.join(' AND ')}
         ORDER BY u.name ASC, u.last_name ASC`,
        queryParams,
      );

    return rows.map((agent) => ({
      id: Number(agent.id),
      name: `${agent.name || ''} ${agent.last_name || ''}`.trim() || agent.email,
      email: agent.email,
      teamLeaderId: agent.team_leader_id,
      inMyTeam: Number(agent.team_leader_id) === access.userId,
    }));
  }

  async getAssignmentTeamLeaders(user: any) {
    const access = await this.getAssignedOrdersAccess(user);
    if (!access.canViewAll && !access.canViewTeam) return [];
    if (access.canViewTeam && access.isTeamLeader && !access.canViewAll) {
      const rows: Array<{ id: number; name: string; last_name: string | null; email: string }> =
        await this.salesRepository.manager.query(
          `SELECT id, name, last_name, email
           FROM users
           WHERE id = $1
             AND is_deleted = false
             AND status = 'active'`,
          [access.userId],
        );
      return rows.map((row) => ({
        id: Number(row.id),
        name: `${row.name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
      }));
    }

    const rows: Array<{ id: number; name: string; last_name: string | null; email: string }> =
      await this.salesRepository.manager.query(
        `SELECT u.id, u.name, u.last_name, u.email
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.is_deleted = false
           AND u.status = 'active'
           AND r.slug = 'sales-team-leader'
         ORDER BY u.name ASC, u.last_name ASC`,
      );

    return rows.map((row) => ({
      id: Number(row.id),
      name: `${row.name || ''} ${row.last_name || ''}`.trim() || row.email,
      email: row.email,
    }));
  }

  async assignWebOrder(orderId: number, body: { agentId?: number; expectedAssignedTo?: number | null; allowReassign?: boolean }, user: any) {
    const agentId = Number(body?.agentId);
    if (!Number.isFinite(agentId) || agentId <= 0) {
      throw new BadRequestException('Agent is required');
    }

    await this.assertAgentAssignableToUser(agentId, user);

    const saved = await this.salesRepository.manager.transaction(async (manager) => {
      const orderQb = manager.createQueryBuilder(SalesOrder, 'o').where('o.id = :orderId', { orderId }).setLock('pessimistic_write');
      this.selectAssignedOrderColumns(orderQb);
      const order = await orderQb.getOne();
      if (!order) throw new NotFoundException('Order not found');
      if (!this.webOrderSources.includes(order.orderSource)) {
        throw new BadRequestException('Only website and landing page orders can be assigned here');
      }
      if (this.normalizeOrderStatus(order.status) !== 'processing') {
        throw new ConflictException('Only processing orders can be assigned here');
      }

      const expected =
        body?.expectedAssignedTo === undefined || body?.expectedAssignedTo === null
          ? null
          : Number(body.expectedAssignedTo);
      const current = order.assignedTo ?? null;
      if (current !== expected) {
        throw new ConflictException('This order assignment changed. Refresh the list before assigning again.');
      }
      if (current && current !== agentId && !body?.allowReassign) {
        throw new ConflictException('This order is already assigned. Use update assignment to reassign it.');
      }

      order.assignedTo = agentId;
      order.assignedBy = Number(user?.id);
      order.assignedAt = new Date();
      return manager.save(order);
    });

    return this.decorateAssignedOrder(saved);
  }

  async unassignWebOrder(orderId: number, body: { expectedAssignedTo?: number | null }, user: any) {
    const access = await this.getAssignedOrdersAccess(user);
    const saved = await this.salesRepository.manager.transaction(async (manager) => {
      const orderQb = manager.createQueryBuilder(SalesOrder, 'o').where('o.id = :orderId', { orderId }).setLock('pessimistic_write');
      this.selectAssignedOrderColumns(orderQb);
      const order = await orderQb.getOne();
      if (!order) throw new NotFoundException('Order not found');
      if (!this.webOrderSources.includes(order.orderSource)) {
        throw new BadRequestException('Only website and landing page orders can be unassigned here');
      }
      if (access.canViewAll && access.hasManage) {
        // Managers with full manage access can unassign any queue order.
      } else if (access.canViewTeam && access.hasManage && access.isTeamLeader && order.assignedTo) {
        const allowedRows: Array<{ id: number }> = await manager.query(
          `SELECT id FROM users
           WHERE id = $1
             AND team_leader_id = $2
             AND is_deleted = false
           LIMIT 1`,
          [order.assignedTo, access.userId],
        );
        if (allowedRows.length === 0) {
          throw new BadRequestException('You can only unassign orders from your own agents');
        }
      } else {
        throw new BadRequestException('You do not have permission to unassign this order');
      }

      const expected =
        body?.expectedAssignedTo === undefined || body?.expectedAssignedTo === null
          ? null
          : Number(body.expectedAssignedTo);
      if ((order.assignedTo ?? null) !== expected) {
        throw new ConflictException('This order assignment changed. Refresh the list before unassigning.');
      }

      order.assignedTo = null;
      order.assignedBy = null;
      order.assignedAt = null;
      return manager.save(order);
    });

    return this.decorateAssignedOrder(saved);
  }

  async assignOrdersForTelephony(orderIds: number[], agentId: number, user: any) {
    const ids = [...new Set((orderIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    if (ids.length === 0) throw new BadRequestException('At least one order is required');
    if (!Number.isFinite(agentId) || agentId <= 0) throw new BadRequestException('Agent is required');

    await this.assertAgentAssignableToUser(agentId, user);

    const access = await this.getAssignedOrdersAccess(user);
    if (!access.hasManage) throw new BadRequestException('You do not have permission to assign orders');

    const updated = await this.salesRepository.manager.transaction(async (manager) => {
      const orders = await manager
        .createQueryBuilder(SalesOrder, 'o')
        .where('o.id IN (:...ids)', { ids })
        .setLock('pessimistic_write')
        .getMany();

      const now = new Date();
      for (const order of orders) {
        order.assignedTo = agentId;
        order.assignedBy = Number(user?.id);
        order.assignedAt = now;
      }
      return manager.save(orders);
    });

    return { success: true, assignedCount: updated.length };
  }

  async unassignOrdersForTelephony(orderIds: number[], user: any) {
    const ids = [...new Set((orderIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    if (ids.length === 0) throw new BadRequestException('At least one order is required');

    const access = await this.getAssignedOrdersAccess(user);
    if (!access.hasManage) throw new BadRequestException('You do not have permission to unassign orders');

    const updated = await this.salesRepository.manager.transaction(async (manager) => {
      const orders = await manager
        .createQueryBuilder(SalesOrder, 'o')
        .where('o.id IN (:...ids)', { ids })
        .setLock('pessimistic_write')
        .getMany();

      if (!access.canViewAll && access.isTeamLeader) {
        const assignedIds = [...new Set(orders.map((order) => order.assignedTo).filter((id): id is number => id != null))];
        if (assignedIds.length > 0) {
          const allowedRows: Array<{ id: number }> = await manager.query(
            `SELECT id FROM users
             WHERE id = ANY($1)
               AND team_leader_id = $2
               AND is_deleted = false`,
            [assignedIds, access.userId],
          );
          const allowed = new Set(allowedRows.map((row) => Number(row.id)));
          if (assignedIds.some((id) => !allowed.has(id))) {
            throw new BadRequestException('You can only unassign orders from your own agents');
          }
        }
      }

      for (const order of orders) {
        order.assignedTo = null;
        order.assignedBy = null;
        order.assignedAt = null;
      }
      return manager.save(orders);
    });

    return { success: true, unassignedCount: updated.length };
  }

  private async decorateAssignedOrder(order: SalesOrder) {
    const userIds = [order.createdBy, order.assignedTo, order.assignedBy].filter((id): id is number => id != null);
    const userMap = await this.getUserNameMap([...new Set(userIds)]);
    (order as any).createdByName = order.createdBy ? (userMap.get(order.createdBy) ?? null) : null;
    (order as any).assignedToName = order.assignedTo ? (userMap.get(order.assignedTo) ?? null) : null;
    (order as any).assignedByName = order.assignedBy ? (userMap.get(order.assignedBy) ?? null) : null;
    const items = await this.batchFetchOrderItems([order.id]);
    (order as any)._items = items.get(order.id) || [];
    return this.toAdminListDto(order);
  }

  async getAgentOrderStats(userId: number): Promise<{ totalOrders: number; todayOrders: number; thisMonthOrders: number }> {
    const totalOrders = await this.salesRepository.count({
      where: { createdBy: userId, orderSource: In(['admin_panel', 'agent_dashboard']) },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await this.salesRepository
      .createQueryBuilder('o')
      .where('o.created_by = :userId', { userId })
      .andWhere('o.order_source IN (:...sources)', { sources: ['admin_panel', 'agent_dashboard'] })
      .andWhere('o.created_at >= :todayStart', { todayStart })
      .getCount();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthOrders = await this.salesRepository
      .createQueryBuilder('o')
      .where('o.created_by = :userId', { userId })
      .andWhere('o.order_source IN (:...sources)', { sources: ['admin_panel', 'agent_dashboard'] })
      .andWhere('o.created_at >= :monthStart', { monthStart })
      .getCount();

    return { totalOrders, todayOrders, thisMonthOrders };
  }

  async findSentCourierOrders(params?: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    courierCompany?: string;
    shippedFrom?: string;
    shippedTo?: string;
  }) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(500, Math.max(1, params?.limit || 50));
    const skip = (page - 1) * limit;

    const qb = this.salesRepository.createQueryBuilder('o');
    qb.where('o.shipped_at IS NOT NULL');
    // Only show orders with status = 'sent'
    qb.andWhere('o.status = :sentStatus', { sentStatus: 'sent' });

    if (params?.q?.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      const normalizedPhone = `%${params.q.trim().replace(/^\+88/, '').toLowerCase()}%`;
      qb.andWhere(
        '(CAST(o.id AS TEXT) ILIKE :q ' +
        'OR o.customer_name ILIKE :q ' +
        'OR o.customer_phone ILIKE :q ' +
        "OR REPLACE(o.customer_phone, '+88', '') ILIKE :normalizedPhone " +
        'OR o.courier_company ILIKE :q ' +
        'OR CAST(o.courier_order_id AS TEXT) ILIKE :q)',
        { q, normalizedPhone },
      );
    }

    if (params?.courierCompany?.trim()) {
      qb.andWhere('LOWER(o.courier_company) = LOWER(:courierCompany)', { courierCompany: params.courierCompany.trim() });
    }

    if (params?.shippedFrom) {
      qb.andWhere('DATE(o.shipped_at) >= :shippedFrom', { shippedFrom: params.shippedFrom });
    }
    if (params?.shippedTo) {
      qb.andWhere('DATE(o.shipped_at) <= :shippedTo', { shippedTo: params.shippedTo });
    }

    qb.orderBy('o.shipped_at', 'DESC');

    const total = await qb.getCount();
    qb.skip(skip).take(limit);

    const orders = await qb.getMany();

    // Batch-fetch creator names
    const creatorIds = [...new Set(orders.map((o) => o.createdBy).filter((id): id is number => id != null))];
    const creatorMap = await this.getUserNameMap(creatorIds);
    orders.forEach((order) => {
      (order as any).createdByName = order.createdBy ? (creatorMap.get(order.createdBy) ?? null) : null;
    });

    // Batch-fetch items
    const orderIds = orders.map((o) => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);
    for (const order of orders) {
      (order as any)._items = itemsByOrderId.get(order.id) || [];
    }

    return {
      data: orders.map((order) => this.toAdminListDto(order)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async logOrderStatusActivity(orderId: number, oldStatus: any, newStatus: any, actorName: string, actorId?: number, ipAddress?: string, source?: string, extraNewValue?: any) {
    const oldValue = oldStatus == null ? null : String(oldStatus);
    const newValue = newStatus == null ? null : String(newStatus);
    if ((oldValue || '') === (newValue || '')) return;

    await this.salesRepository.manager.query(
      `INSERT INTO order_activity_logs
        (order_id, action_type, action_description, old_value, new_value, performed_by, performed_by_name, ip_address, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, NOW())`,
      [
        orderId,
        'status_changed',
        `Order status changed from "${oldValue || 'null'}" to "${newValue || 'null'}" by ${actorName}${source ? ` via ${source}` : ''}`,
        JSON.stringify({ status: oldValue }),
        JSON.stringify({ status: newValue, ...(extraNewValue || {}) }),
        actorId || null,
        actorName,
        ipAddress || '',
      ],
    );
  }

  async markCourierReturns(courierOrderIds: string[], returnDate: string, userId?: number, userName = 'Admin', ipAddress?: string) {
    const results: { courierOrderId: string; orderId: number | null; success: boolean; message: string }[] = [];

    for (const cid of courierOrderIds) {
      const trimmed = cid.trim();
      if (!trimmed) continue;

      const order = await this.salesRepository.findOne({
        where: { courierOrderId: trimmed },
      });

      if (!order) {
        results.push({ courierOrderId: trimmed, orderId: null, success: false, message: 'Order not found' });
        continue;
      }

      const oldStatus = order.status;
      order.status = 'returned' as any;
      (order as any).deliveredAt = new Date(returnDate);
      await this.salesRepository.save(order);

      try {
        await this.logOrderStatusActivity(order.id, oldStatus, 'returned', userName, userId, ipAddress, 'courier return bulk update', { courierOrderId: trimmed, returnDate });
      } catch (_) { /* never block return marking on logging */ }

      results.push({ courierOrderId: trimmed, orderId: order.id, success: true, message: 'Marked as returned' });
    }

    return results;
  }

  async findLateDeliveries(params?: { thresholdDays?: number }) {
    const thresholdDays =
      params?.thresholdDays != null && Number.isFinite(params.thresholdDays)
        ? Math.max(0, Math.floor(params.thresholdDays))
        : 1;

    const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    const qb = this.salesRepository.createQueryBuilder('o');
    qb.where('o.shipped_at IS NOT NULL')
      .andWhere('o.delivered_at IS NULL')
      .andWhere('o.shipped_at <= :cutoff', { cutoff })
      .andWhere('o.status IN (:...lateStatuses)', { lateStatuses: ['pending', 'in_review'] })
      .orderBy('o.shipped_at', 'ASC');

    const orders = await qb.getMany();

    // Batch-fetch items for all orders
    const orderIds = orders.map((o) => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);
    for (const order of orders) {
      (order as any)._items = itemsByOrderId.get(order.id) || [];
    }

    // Batch-fetch creator names for order source display
    const creatorIds = [...new Set(orders.map(o => o.createdBy).filter((id): id is number => id != null))];
    const creatorMap = await this.getUserNameMap(creatorIds);
    for (const order of orders) {
      (order as any).createdByName = order.createdBy ? (creatorMap.get(order.createdBy) ?? null) : null;
    }

    return orders.map((order) => this.toAdminListDto(order));
  }

  async findCancelledOrders() {
    const qb = this.salesRepository.createQueryBuilder('o');
    this.selectAdminOrderColumns(qb);

    qb.where('LOWER(o.status::text) IN (:...cancelledStatuses)', {
      cancelledStatuses: ['cancelled', 'returned'],
    })
      .orderBy('COALESCE(o.cancelled_at, o.updated_at, o.created_at)', 'DESC');

    const orders = await qb.getMany();

    const orderIds = orders.map((o) => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);
    for (const order of orders) {
      (order as any)._items = itemsByOrderId.get(order.id) || [];
    }

    const creatorIds = [...new Set(orders.map(o => o.createdBy).filter((id): id is number => id != null))];
    const creatorMap = await this.getUserNameMap(creatorIds);
    for (const order of orders) {
      (order as any).createdByName = order.createdBy ? (creatorMap.get(order.createdBy) ?? null) : null;
    }

    return orders.map((order) => this.toAdminListDto(order));
  }

  async findRejectedOrders() {
    const qb = this.salesRepository.createQueryBuilder('o');
    this.selectAdminOrderColumns(qb);

    qb.where('LOWER(o.status::text) = :rejectedStatus', {
      rejectedStatus: 'admin_cancelled',
    })
      .orderBy('COALESCE(o.cancelled_at, o.updated_at, o.created_at)', 'DESC');

    const orders = await qb.getMany();

    const orderIds = orders.map((o) => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);
    for (const order of orders) {
      (order as any)._items = itemsByOrderId.get(order.id) || [];
    }

    const creatorIds = [...new Set(orders.map(o => o.createdBy).filter((id): id is number => id != null))];
    const creatorMap = await this.getUserNameMap(creatorIds);
    for (const order of orders) {
      (order as any).createdByName = order.createdBy ? (creatorMap.get(order.createdBy) ?? null) : null;
    }

    return orders.map((order) => this.toAdminListDto(order));
  }

  async findForCustomer(customerId: number) {
    const orders = await this.salesRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => ({
      id: order.id,
      salesOrderNumber: order.salesOrderNumber,
      customerId: order.customerId,
      totalAmount: parseFloat(order.totalAmount?.toString() || '0'),
      status: order.status,
      orderDate: order.orderDate || order.createdAt,
      createdAt: order.createdAt,
      notes: order.notes,
    }));
  }

  // Customer portal should still show orders that were placed as a guest before registration.
  // We match by customer_id when possible, and also by customer_email / customer_phone.
  async findForCustomerPortal(params: { id?: any; email?: string | null; phone?: string | null }) {
    const rawId = params?.id;
    const idText = rawId != null ? String(rawId).trim() : '';
    const email = typeof params?.email === 'string' ? params.email.trim() : '';
    const phone = typeof params?.phone === 'string' ? params.phone.trim() : '';

    const qb = this.salesRepository.createQueryBuilder('o');
    qb.where('1=0');

    if (idText) {
      qb.orWhere('o.customer_id::text = :cid', { cid: idText });
    }
    if (email) {
      qb.orWhere('o.customer_email = :email', { email });
    }
    if (phone) {
      qb.orWhere('o.customer_phone = :phone', { phone });
    }

    const orders = await qb.orderBy('o.created_at', 'DESC').getMany();

    return orders.map((order) => ({
      id: order.id,
      salesOrderNumber: order.salesOrderNumber,
      customerId: (order as any).customerId,
      totalAmount: parseFloat(order.totalAmount?.toString() || '0'),
      status: order.status,
      orderDate: order.orderDate || order.createdAt,
      createdAt: order.createdAt,
      notes: order.notes,
    }));
  }

  /**
   * Find an order by tracking ID, order number, or consignment ID.
   * Tries each lookup strategy in order.
   */
  async findByTrackingId(identifier: string): Promise<SalesOrder | null> {
    if (!identifier) return null;

    // 1. Try by tracking_id column
    const byTracking = await this.salesRepository.findOne({ where: { trackingId: identifier } });
    if (byTracking) return byTracking;

    // 2. Try by sales_order_number (customers often know their order number)
    const byOrderNumber = await this.salesRepository.findOne({ where: { salesOrderNumber: identifier } });
    if (byOrderNumber) return byOrderNumber;

    // 3. Try by courier_order_id (Steadfast consignment_id)
    const byConsignment = await this.salesRepository.findOne({ where: { courierOrderId: identifier } });
    if (byConsignment) return byConsignment;

    // 4. Try numeric ID as last resort
    const numId = Number(identifier);
    if (Number.isFinite(numId) && numId > 0) {
      const byId = await this.salesRepository.findOne({ where: { id: numId } });
      if (byId) return byId;
    }

    return null;
  }

  async findOne(id: string) {
    const qb = this.salesRepository.createQueryBuilder('o');
    this.selectAdminOrderColumns(qb);
    const order = await qb.where('o.id = :id', { id: Number(id) }).getOne();
    if (!order) return null;

    // Calculate subtotal from order items. Prefer admin-managed items when present;
    // otherwise fall back to checkout-created sales order items.
    const adminItems = await this.orderItemsRepository2.find({
      where: { orderId: order.id },
    });
    const items = adminItems.length > 0 ? adminItems : await this.orderItemsRepository.find({
      where: { salesOrderId: order.id },
    });
    const subtotal = items.reduce((sum, item) => sum + this.getItemSubtotal(item), 0);
    
    const totalAmount = Number(order.totalAmount || 0);
    const discountAmount = Number(order.discountAmount || 0);
    const deliveryCharge = this.resolveDeliveryCharge(order, subtotal, discountAmount);

    return {
      ...order,
      subtotal,
      deliveryCharge,
    };
  }

  async create(createSalesDto: any, context?: { clientIp?: string }) {
    // Map incoming payload (including web checkout orders) to existing sales_orders schema
    const sales = new SalesOrder();

    // created_by is NOT NULL and is a FK to users.
    // For customer checkout (no admin user context), default to a system user id.
    const systemUserId = Number(process.env.SYSTEM_USER_ID || 1);
    const providedCreatedBy =
      createSalesDto.created_by != null
        ? Number(createSalesDto.created_by)
        : createSalesDto.createdBy != null
          ? Number(createSalesDto.createdBy)
          : null;
    sales.createdBy = Number.isFinite(providedCreatedBy as any) ? (providedCreatedBy as number) : systemUserId;
    const guardedSource = await this.enforceOrderGuard(createSalesDto, context, sales.createdBy, systemUserId);

    // Customer identifier (nullable, foreign key to customers.id in DB)
    if (createSalesDto.customer_id != null) {
      sales.customerId = Number(createSalesDto.customer_id);
    } else if (createSalesDto.customerId != null) {
      sales.customerId = Number(createSalesDto.customerId);
    } else {
      sales.customerId = null as any;
    }

    // Customer contact info (critical for showing guest orders after registration)
    const customerName =
      createSalesDto.customer_name ??
      createSalesDto.customerName ??
      null;
    sales.customerName = customerName ? String(customerName).trim() : null;

    const customerEmail =
      createSalesDto.customer_email ??
      createSalesDto.customerEmail ??
      null;
    sales.customerEmail = customerEmail ? String(customerEmail).trim() : null;

    const customerPhone =
      createSalesDto.customer_phone ??
      createSalesDto.customerPhone ??
      null;
    sales.customerPhone = customerPhone ? String(customerPhone).trim() : null;

    // Allow admin UI to explicitly set order number/date (otherwise BeforeInsert generates)
    const orderNumber =
      createSalesDto.sales_order_number ??
      createSalesDto.salesOrderNumber ??
      createSalesDto.order_number ??
      createSalesDto.orderNumber ??
      null;
    if (orderNumber) {
      sales.salesOrderNumber = String(orderNumber).trim();
    }

    const orderDate =
      createSalesDto.order_date ??
      createSalesDto.orderDate ??
      null;
    if (orderDate) {
      const d = new Date(orderDate);
      if (!Number.isNaN(d.getTime())) {
        sales.orderDate = d;
      }
    }

    // ---- Offer code / discount support (optional) ----
    const offerCode = this.normalizeOfferCode(
      createSalesDto.offer_code ?? createSalesDto.offerCode ?? createSalesDto.promo_code ?? createSalesDto.promoCode,
    );

    const deliveryCharge =
      createSalesDto.delivery_charge != null
        ? Number(createSalesDto.delivery_charge)
        : createSalesDto.deliveryCharge != null
          ? Number(createSalesDto.deliveryCharge)
          : 0;

    const rawCartItems: any[] = Array.isArray(createSalesDto.items) ? createSalesDto.items : [];
    const cartForOffers = rawCartItems.map((item) => ({
      id: Number(item.id ?? item.product_id ?? item.productId ?? 0),
      product_id: Number(item.product_id ?? item.productId ?? item.id ?? 0),
      quantity: Number(item.quantity || 1),
      price: Number(item.unit_price ?? item.unitPrice ?? item.price ?? 0),
    }));

    const computedSubtotal = cartForOffers.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.price || 0), 0);

    // Total amount: prefer explicit totals, then fall back to computed (subtotal + delivery - discount)
    let totalAmount: number | null = null;
    if (createSalesDto.totalAmount != null) totalAmount = Number(createSalesDto.totalAmount);
    else if (createSalesDto.total_amount != null) totalAmount = Number(createSalesDto.total_amount);
    else if (createSalesDto.total != null) totalAmount = Number(createSalesDto.total);
    else if (createSalesDto.grand_total != null) totalAmount = Number(createSalesDto.grand_total);

    let discountAmount = 0;
    let appliedOfferId: number | null = null;
    let appliedOfferCode: string | null = null;
    let freeProducts: Array<{ productId: number; quantity: number }> = [];

    if (offerCode) {
      try {
        const evaluation = await this.offersService.evaluateOfferCode({
          code: offerCode,
          cart: cartForOffers,
          customerId: sales.customerId != null ? Number(sales.customerId) : undefined,
          customerData: { customerId: sales.customerId },
        });

        discountAmount = Number(evaluation.discountAmount || 0);
        appliedOfferId = Number((evaluation as any)?.offer?.id);
        appliedOfferCode = offerCode;
        freeProducts = Array.isArray((evaluation as any).freeProducts) ? (evaluation as any).freeProducts : [];
      } catch {
        // Offer code didn't match the offers system — will try coupon system below
      }
    }

    // ---- Coupon code validation (if no offer discount was applied) ----
    let couponCode: string | null = null;
    let couponDiscount = 0;
    const inputCode = offerCode || this.normalizeOfferCode(
      createSalesDto.coupon_code ?? createSalesDto.couponCode,
    );

    if (inputCode && discountAmount === 0) {
      try {
        const couponResult = await this.couponService.validateCoupon({
          code: inputCode,
          customerId: sales.customerId,
          customerPhone: sales.customerPhone,
          cartTotal: computedSubtotal,
        });
        if (couponResult.valid) {
          couponCode = couponResult.code;
          couponDiscount = couponResult.discountAmount;
          discountAmount = couponResult.discountAmount;
        }
      } catch {
        // Coupon not valid — continue without discount
      }
    }

    // If explicit total not provided, compute.
    if (totalAmount == null) {
      totalAmount = computedSubtotal + (Number.isFinite(deliveryCharge) ? deliveryCharge : 0) - (Number.isFinite(discountAmount) ? discountAmount : 0);
    }

    sales.totalAmount = Number.isFinite(totalAmount as any) ? Number(totalAmount) : 0;
    sales.discountAmount = Number.isFinite(discountAmount as any) ? Number(discountAmount) : 0;
    sales.deliveryCharge = Number.isFinite(deliveryCharge) ? deliveryCharge : 0;
    sales.offerId = appliedOfferId;
    sales.offerCode = appliedOfferCode;
    sales.couponCode = couponCode;
    sales.couponDiscount = couponDiscount;

    // Status: use provided or default to 'processing'
    sales.status = createSalesDto.status || 'processing';

    // Payment fields
    const paymentMethod =
      createSalesDto.payment_method ?? createSalesDto.paymentMethod ?? 'cash';
    sales.paymentMethod = String(paymentMethod);

    const paymentStatus =
      createSalesDto.payment_status ?? createSalesDto.paymentStatus ?? 'unpaid';
    sales.paymentStatus = String(paymentStatus);

    // Store shipping address and notes
    const shippingAddress =
      createSalesDto.shipping_address ??
      createSalesDto.shippingAddress ??
      null;
    if (shippingAddress != null && String(shippingAddress).trim() !== '') {
      sales.shippingAddress = String(shippingAddress);
    }

    const district =
      createSalesDto.district ??
      createSalesDto.customer_district ??
      createSalesDto.customerDistrict ??
      null;
    if (district != null && String(district).trim() !== '') {
      sales.district = String(district).trim();
    }

    const courierNotes =
      createSalesDto.courier_notes ??
      createSalesDto.courierNotes ??
      null;
    if (courierNotes != null && String(courierNotes).trim() !== '') {
      sales.courierNotes = String(courierNotes);
    }

    const riderInstructions =
      createSalesDto.rider_instructions ??
      createSalesDto.riderInstructions ??
      null;
    if (riderInstructions != null && String(riderInstructions).trim() !== '') {
      sales.riderInstructions = String(riderInstructions);
    }

    const internalNotes =
      createSalesDto.internal_notes ??
      createSalesDto.internalNotes ??
      null;
    if (internalNotes != null && String(internalNotes).trim() !== '') {
      sales.internalNotes = String(internalNotes);
    }

    const notesInput = createSalesDto.notes ?? createSalesDto.order_notes ?? createSalesDto.orderNotes ?? null;

    let notesText = '';
    if (shippingAddress) {
      notesText += `Shipping Address: ${shippingAddress}`;
    }
    if (notesInput) {
      if (notesText) notesText += '\n\n';
      notesText += `Order Notes: ${notesInput}`;
    }
    sales.notes = notesText || null;

    // Tracking fields (sent from checkout)
    if (guardedSource.clientIp) sales.userIp = guardedSource.clientIp;
    else if (createSalesDto.user_ip != null) sales.userIp = String(createSalesDto.user_ip);
    else if (createSalesDto.userIp != null) sales.userIp = String(createSalesDto.userIp);

    if (createSalesDto.geo_location != null) sales.geoLocation = createSalesDto.geo_location;
    if (createSalesDto.geoLocation != null) sales.geoLocation = createSalesDto.geoLocation;

    if (createSalesDto.browser_info != null) sales.browserInfo = String(createSalesDto.browser_info);
    if (createSalesDto.browserInfo != null) sales.browserInfo = String(createSalesDto.browserInfo);

    if (createSalesDto.device_type != null) sales.deviceType = String(createSalesDto.device_type);
    if (createSalesDto.deviceType != null) sales.deviceType = String(createSalesDto.deviceType);

    if (createSalesDto.operating_system != null) sales.operatingSystem = String(createSalesDto.operating_system);
    if (createSalesDto.operatingSystem != null) sales.operatingSystem = String(createSalesDto.operatingSystem);

    if (createSalesDto.traffic_source != null) sales.trafficSource = String(createSalesDto.traffic_source);
    if (createSalesDto.trafficSource != null) sales.trafficSource = String(createSalesDto.trafficSource);

    // Order Source: determine where the order originated
    const explicitSource = createSalesDto.order_source ?? createSalesDto.orderSource ?? null;
    if (explicitSource) {
      sales.orderSource = String(explicitSource);
    } else {
      // Derive from traffic_source or created_by
      const ts = sales.trafficSource || '';
      if (ts === 'landing_page' || ts === 'landing_page_intl') {
        sales.orderSource = 'landing_page';
      } else if (sales.createdBy && sales.createdBy !== systemUserId) {
        sales.orderSource = 'admin_panel';
      } else {
        sales.orderSource = 'website';
      }
    }

    if (createSalesDto.referrer_url != null) sales.referrerUrl = String(createSalesDto.referrer_url);
    if (createSalesDto.referrerUrl != null) sales.referrerUrl = String(createSalesDto.referrerUrl);

    if (createSalesDto.utm_source != null) sales.utmSource = String(createSalesDto.utm_source);
    if (createSalesDto.utmSource != null) sales.utmSource = String(createSalesDto.utmSource);

    if (createSalesDto.utm_medium != null) sales.utmMedium = String(createSalesDto.utm_medium);
    if (createSalesDto.utmMedium != null) sales.utmMedium = String(createSalesDto.utmMedium);

    if (createSalesDto.utm_campaign != null) sales.utmCampaign = String(createSalesDto.utm_campaign);
    if (createSalesDto.utmCampaign != null) sales.utmCampaign = String(createSalesDto.utmCampaign);

    const metaAttribution = createSalesDto.meta_attribution ?? createSalesDto.metaAttribution ?? {};
    const readMetaValue = (...keys: string[]) => {
      for (const key of keys) {
        const value = createSalesDto[key] ?? metaAttribution?.[key];
        if (value != null && String(value).trim() !== '') return String(value).trim();
      }
      return null;
    };

    sales.metaFbp = readMetaValue('meta_fbp', 'metaFbp', 'fbp', '_fbp');
    sales.metaFbc = readMetaValue('meta_fbc', 'metaFbc', 'fbc', '_fbc');
    sales.metaFbclid = readMetaValue('meta_fbclid', 'metaFbclid', 'fbclid');
    sales.metaEventSourceUrl = readMetaValue('meta_event_source_url', 'metaEventSourceUrl', 'event_source_url', 'eventSourceUrl');
    sales.metaLandingUrl = readMetaValue('meta_landing_url', 'metaLandingUrl', 'landing_url', 'landingUrl', 'current_url', 'currentUrl');
    sales.metaAttribution = Object.keys(metaAttribution || {}).length > 0 ? metaAttribution : null;

    // Save the order first
    const savedOrder = await this.salesRepository.save(sales);

    // Save order items if provided (and append free products when applicable)
    if (Array.isArray(createSalesDto.items) && createSalesDto.items.length > 0) {
      const mergedItems = [...createSalesDto.items];
      if (freeProducts.length) {
        for (const fp of freeProducts) {
          mergedItems.push({
            product_id: fp.productId,
            quantity: fp.quantity,
            unit_price: 0,
            price: 0,
          });
        }
      }

      const orderItems = mergedItems.map((item: any) => {
        const orderItem = new SalesOrderItem();
        orderItem.salesOrderId = savedOrder.id;
        const rawProductId = Number(item.product_id || item.productId);
        orderItem.productId = Number.isFinite(rawProductId) && rawProductId > 0 ? rawProductId : null;
        orderItem.productName = item.product_name || item.productName || null;
        orderItem.productImage = item.product_image || item.productImage || null;
        orderItem.quantity = Number(item.quantity || 1);
        orderItem.unitPrice = Number(item.unit_price || item.unitPrice || item.price || 0);
        orderItem.lineTotal = orderItem.quantity * orderItem.unitPrice;
        return orderItem;
      });

      try {
        await this.orderItemsRepository.save(orderItems);
      } catch (itemErr) {
        // If product_name column doesn't exist yet, retry without it
        console.error('Failed to save order items, retrying without product_name:', itemErr);
        try {
          const fallbackItems = orderItems.map((oi) => {
            const fallback = new SalesOrderItem();
            fallback.salesOrderId = oi.salesOrderId;
            fallback.productId = oi.productId;
            fallback.quantity = oi.quantity;
            fallback.unitPrice = oi.unitPrice;
            fallback.lineTotal = oi.lineTotal;
            return fallback;
          });
          await this.orderItemsRepository
            .createQueryBuilder()
            .insert()
            .into(SalesOrderItem, ['salesOrderId', 'productId', 'quantity', 'unitPrice', 'lineTotal'])
            .values(fallbackItems.map((fi) => ({
              salesOrderId: fi.salesOrderId,
              productId: fi.productId,
              quantity: fi.quantity,
              unitPrice: fi.unitPrice,
              lineTotal: fi.lineTotal,
            })))
            .execute();
        } catch (fallbackErr) {
          console.error('Fallback item save also failed:', fallbackErr);
          // Still return the order — items can be re-added from admin
        }
      }
    }

    // Record offer usage (best-effort)
    if (savedOrder.offerId && savedOrder.customerId && savedOrder.discountAmount > 0) {
      try {
        await this.offersService.recordUsage(savedOrder.offerId, savedOrder.customerId, savedOrder.id, savedOrder.discountAmount);
      } catch {
        // never block order creation
      }
    }

    // Redeem coupon if one was applied (best-effort)
    if (savedOrder.couponCode) {
      try {
        await this.couponService.redeemCoupon(savedOrder.couponCode, savedOrder.id, savedOrder.customerId, savedOrder.customerPhone);
      } catch {
        // never block order creation
      }
    }

    // NOTE: Trigger-based coupons are granted on delivery, not on order placement.
    // See the becameDelivered block in update() where generateCouponsForOrder is called.

    // Reserve stock for order items (best-effort — don't block checkout if stock data is incomplete)
    if (cartForOffers.length > 0) {
      try {
        await this.inventoryService.reserveStock({
          salesOrderId: savedOrder.id,
          items: cartForOffers
            .filter(item => item.product_id > 0 && item.quantity > 0)
            .map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        });
      } catch (stockErr) {
        // Log but don't fail the order — stock may not be tracked for all products yet
        console.warn(`Stock reservation failed for order #${savedOrder.id}:`, (stockErr as any)?.message || stockErr);
      }
    }

    await this.tryAutoAssignIncomingOrder(savedOrder.id);

    return savedOrder;
  }

  async update(id: string, updateSalesDto: any) {
    let shouldDispatchApproved = false;
    let becameDelivered = false;

    if (updateSalesDto?.status) {
      const currentQb = this.salesRepository.createQueryBuilder('o');
      this.selectAdminOrderColumns(currentQb);
      const current = await currentQb.where('o.id = :id', { id: Number(id) }).getOne();
      if (current) {
        const from = this.normalizeOrderStatus(current.status);
        const to = this.normalizeOrderStatus(updateSalesDto.status);
        if (!this.isStatusTransitionAllowed(from, to)) {
          throw new Error(`Invalid status transition: ${from} -> ${to}`);
        }

        becameDelivered = from !== 'delivered' && to === 'delivered';
        shouldDispatchApproved = from !== 'approved' && to === 'approved';

        if (to === 'approved' && !current.approvedAt) {
          updateSalesDto.approvedAt = new Date();
        }
      }
    }

    await this.salesRepository.update(id, updateSalesDto);
    if (shouldDispatchApproved) {
      await this.unassignFromPrimaryLeadTeam(Number(id));
    }
    const updated = await this.findOne(id);

    if (updated && shouldDispatchApproved) {
      await this.dispatchMetaCapiForStatus(updated.id, 'approved');
    }

    if (becameDelivered && updated) {
      // Ensure customer record exists for lead assignment
      try {
        const customerId = await this.customersService.ensureCustomerForDeliveredOrder({
          customerId: updated.customerId,
          customerPhone: updated.customerPhone,
          customerName: updated.customerName,
          customerEmail: updated.customerEmail,
          orderSource: (updated as any).orderSource,
        });
        if (customerId && !updated.customerId) {
          await this.salesRepository.update(updated.id, { customerId });
          updated.customerId = customerId;
        }
      } catch {
        // never block order updates
      }

      try {
        await this.loyaltyService.autoCompleteReferralForDeliveredOrder({
          orderId: updated.id,
          customerId: updated.customerId,
        });
      } catch {
        // never block order updates
      }

      try {
        await this.whatsAppService.sendReferralNudgeOnDeliveredOrder({
          orderId: updated.id,
          customerId: updated.customerId,
        });
      } catch {
        // never block order updates
      }

      // Process commission for the delivering agent
      try {
        if (updated.customerId) {
          await this.commissionService.processOrderForCommission(
            updated.id,
            updated.customerId,
            parseFloat(String(updated.totalAmount || 0)),
          );
        }
      } catch {
        // never block order updates
      }

      // Grant trigger-based coupons only after the order is delivered
      try {
        const deliveredItems = await this.orderItemsRepository.find({ where: { salesOrderId: updated.id } });
        const deliveredProductIds = deliveredItems
          .map(item => item.productId)
          .filter((pid): pid is number => pid != null && pid > 0);
        if (deliveredProductIds.length > 0) {
          await this.couponService.generateCouponsForOrder({
            orderId: updated.id,
            customerId: updated.customerId,
            customerPhone: updated.customerPhone,
            productIds: deliveredProductIds,
          });
        }
      } catch (err) {
        console.warn(`Coupon generation on delivery failed for order #${updated.id}:`, (err as any)?.message || err);
      }

      // Auto-assign customer tier based on delivered order count
      if (updated.customerId) {
        try {
          await this.leadManagementService.autoAssignTierForCustomer(updated.customerId);
        } catch (err) {
          console.warn(`Auto-tier assignment failed for customer #${updated.customerId}:`, (err as any)?.message || err);
        }
      }

      await this.dispatchMetaCapiForStatus(updated.id, 'delivered');
    }

    return updated;
  }

  async cancelForCustomer(orderId: number, customerId: number, cancelReason?: string) {
    const order = await this.salesRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (order.customerId == null || Number(order.customerId) !== Number(customerId)) {
      throw new Error('Forbidden: order ownership mismatch');
    }

    const status = this.normalizeOrderStatus(order.status);
    if (['cancelled', 'admin_cancelled', 'delivered', 'completed'].includes(status)) {
      throw new Error(`Cannot cancel order in status: ${status}`);
    }
    // Cannot cancel if already picked/in_transit/delivered
    if (['picked', 'in_transit'].includes(status)) {
      throw new Error('Cannot cancel order - already shipped');
    }

    if (cancelReason != null && String(cancelReason).trim().length > 255) {
      throw new Error('Cancel reason is too long');
    }

    const oldStatus = order.status;
    order.status = 'cancelled';
    order.cancelReason = cancelReason ? String(cancelReason).trim() : order.cancelReason;
    order.cancelledBy = Number(customerId);
    order.cancelledAt = new Date();
    const savedOrder = await this.salesRepository.save(order);

    try {
      await this.logOrderStatusActivity(order.id, oldStatus, 'cancelled', `Customer #${customerId}`, Number(customerId), undefined, 'customer cancellation', {
        cancelReason: order.cancelReason || null,
      });
    } catch (_) { /* never block customer cancellation on logging */ }

    // Release stock reservations
    try {
      await this.inventoryService.releaseReservation(orderId);
    } catch (err) {
      console.warn(`Failed to release stock reservation for order #${orderId}:`, (err as any)?.message || err);
    }

    return savedOrder;
  }

  private normalizeOrderStatus(status: unknown): string {
    return String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
  }

  private isStatusTransitionAllowed(from: string, to: string): boolean {
    // Allow all transitions for admin manual updates
    return true;
  }

  async remove(id: string) {
    return this.salesRepository.delete(id);
  }

  async getOrderItems(orderId: string) {
    const items = await this.orderItemsRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('products', 'product', 'product.id = item.product_id')
      .select([
        'item.id as id',
        'item.sales_order_id as "salesOrderId"',
        'item.product_id as "productId"',
        'COALESCE(product.name_en, item.product_name) as "productName"',
        'item.custom_product_name as "customProductName"',
        'COALESCE(item.custom_product_name, product.name_en, item.product_name) as "displayName"',
        'product.name_bn as "productNameBn"',
        'COALESCE(product.image_url, item.product_image) as "productImage"',
        'product.sku as "productSku"',
        'item.quantity as quantity',
        'item.unit_price as "unitPrice"',
        'item.line_total as "lineTotal"',
      ])
      .where('item.sales_order_id = :orderId', { orderId: Number(orderId) })
      .orderBy('item.id', 'ASC')
      .getRawMany();

    return items;
  }

  async acceptThankYouOffer(orderId: number, productId: number, offerPrice: number) {
    const order = await this.salesRepository.findOne({ where: { id: Number(orderId) } });
    if (!order) {
      throw new Error('Order not found');
    }

    if ((order as any).thankYouOfferAccepted) {
      throw new Error('Offer already accepted for this order');
    }

    if (!Number.isFinite(Number(productId)) || Number(productId) <= 0) {
      throw new Error('Invalid offer product');
    }
    if (!Number.isFinite(Number(offerPrice)) || Number(offerPrice) <= 0) {
      throw new Error('Invalid offer price');
    }

    const item = new SalesOrderItem();
    item.salesOrderId = order.id;
    item.productId = Number(productId);
    item.quantity = 1;
    item.unitPrice = Number(offerPrice);
    item.lineTotal = item.quantity * item.unitPrice;
    await this.orderItemsRepository.save(item);

    const currentTotal = parseFloat((order.totalAmount as any)?.toString?.() || String(order.totalAmount || 0));
    order.totalAmount = Number(currentTotal) + Number(item.lineTotal);
    (order as any).thankYouOfferAccepted = true;
    await this.salesRepository.save(order);

    return order;
  }

  /**
   * Sync customer info (name, email, phone) across all orders belonging to a customer.
   */
  async syncCustomerInfo(
    customerId: number,
    data: { customerName?: string; customerEmail?: string; customerPhone?: string },
  ) {
    const updateFields: Partial<SalesOrder> = {};
    if (data.customerName !== undefined) updateFields.customerName = data.customerName;
    if (data.customerEmail !== undefined) updateFields.customerEmail = data.customerEmail;
    if (data.customerPhone !== undefined) updateFields.customerPhone = data.customerPhone;

    if (Object.keys(updateFields).length === 0) return { affected: 0 };

    const result = await this.salesRepository.update(
      { customerId },
      updateFields,
    );
    return { affected: result.affected ?? 0 };
  }

  /**
   * Daily report: product-wise sales breakdown for a given date.
   */
  async getDailyReport(date: string) {
    // date is YYYY-MM-DD
    const reportDate = date || this.currentDhakaDateString();

    // 1) Product-wise breakdown for agent/admin orders only.
    // Combine both item tables because agent/admin orders may be stored in either.
    const productRows = await this.salesRepository.manager.query(
      `SELECT
         product_id,
         product_name,
         COUNT(DISTINCT order_id) AS total_orders,
         COALESCE(SUM(quantity), 0) AS total_qty,
         COALESCE(SUM(total_revenue), 0) AS total_revenue,
         COALESCE(SUM(gross_amount), 0) AS gross_amount,
         COUNT(DISTINCT CASE WHEN courier_company = 'steadfast' THEN order_id END) AS steadfast_orders,
         COUNT(DISTINCT CASE WHEN courier_company = 'pathao' THEN order_id END) AS pathao_orders,
         COUNT(DISTINCT CASE WHEN courier_company = 'redx' THEN order_id END) AS redx_orders,
         COUNT(DISTINCT CASE WHEN courier_company IS NULL OR courier_company = '' THEN order_id END) AS no_courier_orders,
         COUNT(DISTINCT CASE WHEN status = 'delivered' THEN order_id END) AS delivered_orders,
         COUNT(DISTINCT CASE WHEN status IN ('cancelled', 'returned') THEN order_id END) AS cancelled_orders,
         COUNT(DISTINCT CASE WHEN status = 'pending' THEN order_id END) AS pending_orders,
         COUNT(DISTINCT CASE WHEN status = 'approved' THEN order_id END) AS approved_orders,
         COUNT(DISTINCT CASE WHEN status = 'shipped' THEN order_id END) AS shipped_orders
       FROM (
         SELECT
           o.id AS order_id,
           LOWER(o.status::text) AS status,
           LOWER(COALESCE(o.courier_company, '')) AS courier_company,
           soi.product_id,
           COALESCE(NULLIF(p.name_en, ''), NULLIF(p.name_bn, ''), NULLIF(soi.product_name, ''), 'Unknown Product') AS product_name,
           soi.quantity,
           COALESCE(soi.line_total, 0) AS total_revenue,
           COALESCE(soi.unit_price * soi.quantity, 0) AS gross_amount
         FROM sales_order_items soi
         INNER JOIN sales_orders o ON o.id = soi.sales_order_id
         LEFT JOIN products p ON p.id = soi.product_id
         WHERE DATE(o.order_date) = $1
           AND o.order_source IN ('admin_panel', 'agent_dashboard')
           AND NOT EXISTS (
             SELECT 1 FROM order_items oi_existing WHERE oi_existing.order_id = o.id
           )
         UNION ALL
         SELECT
           o.id AS order_id,
           LOWER(o.status::text) AS status,
           LOWER(COALESCE(o.courier_company, '')) AS courier_company,
           oi.product_id,
           COALESCE(NULLIF(p.name_en, ''), NULLIF(p.name_bn, ''), NULLIF(oi.product_name, ''), NULLIF(oi.custom_product_name, ''), 'Unknown Product') AS product_name,
           oi.quantity,
           COALESCE(oi.subtotal, oi.unit_price * oi.quantity, 0) AS total_revenue,
           COALESCE(oi.unit_price * oi.quantity, 0) AS gross_amount
         FROM order_items oi
         INNER JOIN sales_orders o ON o.id = oi.order_id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE DATE(o.order_date) = $1
           AND o.order_source IN ('admin_panel', 'agent_dashboard')
       ) normalized
       GROUP BY product_id, product_name
       ORDER BY total_orders DESC`,
      [reportDate],
    );

    const approvedEverCondition = `(
          o.approved_at IS NOT NULL
          OR LOWER(o.status::text) IN ('approved', 'sent', 'picked', 'in_transit', 'partial_delivered', 'shipped', 'delivered', 'completed')
        )`;
    const dailySummarySelect = [
        'COUNT(o.id) AS total_orders',
        'COALESCE(SUM(o.total_amount), 0) AS total_revenue',
        'COALESCE(SUM(o.discount_amount), 0) AS total_discount',
        'COALESCE(AVG(o.total_amount), 0) AS avg_order_value',
        `COUNT(CASE WHEN LOWER(o.status::text) = 'pending' THEN 1 END) AS pending_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'processing' THEN 1 END) AS processing_orders`,
        `COUNT(CASE WHEN ${approvedEverCondition} THEN 1 END) AS approved_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'sent' THEN 1 END) AS sent_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'hold' THEN 1 END) AS hold_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'in_review' THEN 1 END) AS in_review_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'picked' THEN 1 END) AS picked_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'in_transit' THEN 1 END) AS in_transit_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'partial_delivered' THEN 1 END) AS partial_delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'shipped' THEN 1 END) AS shipped_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'completed' THEN 1 END) AS completed_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'returned' THEN 1 END) AS returned_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'admin_cancelled' THEN 1 END) AS rejected_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'admin_cancelled', 'returned') THEN 1 END) AS cancelled_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'steadfast' THEN 1 END) AS steadfast_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'pathao' THEN 1 END) AS pathao_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'redx' THEN 1 END) AS redx_orders`,
        `COUNT(CASE WHEN o.courier_company IS NULL OR o.courier_company = '' THEN 1 END) AS no_courier_orders`,
        'COUNT(DISTINCT o.customer_id) AS unique_customers',
    ];

    // 2) Overall summary for website and landing page orders only
    const summaryRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select(dailySummarySelect)
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.order_source IN ('website', 'landing_page')")
      .getRawOne();

    const agentSummaryRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select(dailySummarySelect)
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.order_source IN ('admin_panel', 'agent_dashboard')")
      .getRawOne();

    // 3) Hourly distribution for the chart (use created_at which is timestamp; order_date is date-only)
    const hourlyRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select([
        `EXTRACT(HOUR FROM o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS hour`,
        'COUNT(o.id) AS orders',
        'COALESCE(SUM(o.total_amount), 0) AS revenue',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // 4) Order source breakdown (use traffic_source which exists in DB)
    const sourceRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select([
        `COALESCE(o.traffic_source, 'unknown') AS source`,
        'COUNT(o.id) AS orders',
        'COALESCE(SUM(o.total_amount), 0) AS revenue',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .groupBy('source')
      .orderBy('orders', 'DESC')
      .getRawMany();

    // 5) Status distribution for orders with courier
    const courierStatusRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select([
        `COALESCE(o.status, 'unknown') AS status`,
        'COUNT(o.id) AS orders',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.courier_company IS NOT NULL AND o.courier_company != ''")
      .groupBy('status')
      .orderBy('orders', 'DESC')
      .getRawMany();

    // 6) Landing Page product-wise breakdown
    const landingPageProducts = await this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'soi.product_id AS product_id',
        `COALESCE(NULLIF(p.name_en, ''), NULLIF(p.name_bn, ''), NULLIF(soi.product_name, ''), 'Unknown Product') AS product_name`,
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
        'SUM(soi.line_total) AS total_revenue',
      ])
      .leftJoin('products', 'p', 'p.id = soi.product_id')
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.order_source = 'landing_page'")
      .groupBy('soi.product_id')
      .addGroupBy(`COALESCE(NULLIF(p.name_en, ''), NULLIF(p.name_bn, ''), NULLIF(soi.product_name, ''), 'Unknown Product')`)
      .orderBy('total_orders', 'DESC')
      .getRawMany();

    // 7) Website product-wise breakdown
    const websiteProducts = await this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'soi.product_id AS product_id',
        `COALESCE(NULLIF(p.name_en, ''), NULLIF(p.name_bn, ''), NULLIF(soi.product_name, ''), 'Unknown Product') AS product_name`,
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
        'SUM(soi.line_total) AS total_revenue',
      ])
      .leftJoin('products', 'p', 'p.id = soi.product_id')
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.order_source = 'website'")
      .groupBy('soi.product_id')
      .addGroupBy(`COALESCE(NULLIF(p.name_en, ''), NULLIF(p.name_bn, ''), NULLIF(soi.product_name, ''), 'Unknown Product')`)
      .orderBy('total_orders', 'DESC')
      .getRawMany();

    // 8) Agent + product breakdown for combined chart.
    // Combine both item tables because agent/admin orders are commonly stored in order_items.
    const agentProductRows = await this.salesRepository.manager.query(
      `SELECT
         normalized.agent_id,
         normalized.agent_name,
         normalized.product_id,
         normalized.product_name,
         COUNT(DISTINCT normalized.order_id) AS total_orders,
         COALESCE(SUM(normalized.quantity), 0) AS total_qty,
         COALESCE(SUM(normalized.total_revenue), 0) AS total_revenue
       FROM (
         SELECT
           i.order_id,
           i.agent_id,
           COALESCE(u.is_deleted, false) AS agent_is_deleted,
           COALESCE(
             NULLIF(
               CASE
                 WHEN regexp_replace(TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, ''))), '[[:space:]?]+', '', 'g') = '' THEN ''
                 ELSE TRIM(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.last_name, '')))
               END,
               ''
             ),
             'Agent #' || i.agent_id::text
           ) AS agent_name,
           i.product_id,
           COALESCE(
             NULLIF(
               CASE
                 WHEN regexp_replace(TRIM(COALESCE(i.product_name, '')), '[[:space:]?]+', '', 'g') = '' THEN ''
                 ELSE TRIM(i.product_name)
               END,
               ''
             ),
             NULLIF(p.name_en, ''),
             NULLIF(p.name_bn, ''),
             CASE WHEN i.product_id IS NOT NULL THEN 'Product #' || i.product_id::text END,
             'Unknown Product'
           ) AS product_name,
           i.quantity,
           i.total_revenue
         FROM (
           SELECT
             o.id AS order_id,
             o.created_by AS agent_id,
             soi.product_id AS product_id,
             soi.product_name AS product_name,
             soi.quantity AS quantity,
             COALESCE(soi.line_total, soi.unit_price * soi.quantity, 0) AS total_revenue
           FROM sales_order_items soi
           INNER JOIN sales_orders o ON o.id = soi.sales_order_id
           WHERE DATE(o.order_date) = $1
             AND o.created_by IS NOT NULL
             AND o.order_source IN ('admin_panel', 'agent_dashboard')
             AND NOT EXISTS (
               SELECT 1 FROM order_items oi_existing WHERE oi_existing.order_id = o.id
             )
           UNION ALL
           SELECT
             o.id AS order_id,
             o.created_by AS agent_id,
             oi.product_id AS product_id,
             COALESCE(oi.custom_product_name, oi.product_name) AS product_name,
             oi.quantity AS quantity,
             COALESCE(oi.subtotal, oi.unit_price * oi.quantity, 0) AS total_revenue
           FROM order_items oi
           INNER JOIN sales_orders o ON o.id = oi.order_id
           WHERE DATE(o.order_date) = $1
             AND o.created_by IS NOT NULL
             AND o.order_source IN ('admin_panel', 'agent_dashboard')
         ) i
         LEFT JOIN users u ON u.id = i.agent_id
         LEFT JOIN products p ON p.id = i.product_id
       ) normalized
       WHERE normalized.agent_is_deleted = false
         AND normalized.agent_name !~* '^deleted\\+'
       GROUP BY normalized.agent_id, normalized.agent_name, normalized.product_id, normalized.product_name
       ORDER BY total_qty DESC`,
      [reportDate],
    );

    const toNum = (v: any) => parseFloat(v) || 0;

    const mapSummary = (raw: any) => ({
      totalOrders: toNum(raw?.total_orders),
      totalRevenue: toNum(raw?.total_revenue),
      totalDiscount: toNum(raw?.total_discount),
      avgOrderValue: toNum(raw?.avg_order_value),
      pendingOrders: toNum(raw?.pending_orders),
      processingOrders: toNum(raw?.processing_orders),
      approvedOrders: toNum(raw?.approved_orders),
      sentOrders: toNum(raw?.sent_orders),
      holdOrders: toNum(raw?.hold_orders),
      inReviewOrders: toNum(raw?.in_review_orders),
      pickedOrders: toNum(raw?.picked_orders),
      inTransitOrders: toNum(raw?.in_transit_orders),
      partialDeliveredOrders: toNum(raw?.partial_delivered_orders),
      shippedOrders: toNum(raw?.shipped_orders),
      deliveredOrders: toNum(raw?.delivered_orders),
      completedOrders: toNum(raw?.completed_orders),
      returnedOrders: toNum(raw?.returned_orders),
      rejectedOrders: toNum(raw?.rejected_orders),
      cancelledOrders: toNum(raw?.cancelled_orders),
      steadfastOrders: toNum(raw?.steadfast_orders),
      pathaoOrders: toNum(raw?.pathao_orders),
      redxOrders: toNum(raw?.redx_orders),
      noCourierOrders: toNum(raw?.no_courier_orders),
      uniqueCustomers: toNum(raw?.unique_customers),
    });

    return {
      date: reportDate,
      summary: mapSummary(summaryRaw),
      agentSummary: mapSummary(agentSummaryRaw),
      products: productRows.map((r: any) => ({
        productId: toNum(r.product_id),
        productName: r.product_name || 'Unknown Product',
        totalOrders: toNum(r.total_orders),
        totalQty: toNum(r.total_qty),
        totalRevenue: toNum(r.total_revenue),
        grossAmount: toNum(r.gross_amount),
        steadfastOrders: toNum(r.steadfast_orders),
        pathaoOrders: toNum(r.pathao_orders),
        redxOrders: toNum(r.redx_orders),
        noCourierOrders: toNum(r.no_courier_orders),
        deliveredOrders: toNum(r.delivered_orders),
        cancelledOrders: toNum(r.cancelled_orders),
        pendingOrders: toNum(r.pending_orders),
        approvedOrders: toNum(r.approved_orders),
        shippedOrders: toNum(r.shipped_orders),
      })),
      hourly: Array.from({ length: 24 }, (_, i) => {
        const found = hourlyRaw.find((r: any) => toNum(r.hour) === i);
        return { hour: i, label: `${i.toString().padStart(2, '0')}:00`, orders: toNum(found?.orders), revenue: toNum(found?.revenue) };
      }),
      orderSources: sourceRaw.map((r: any) => ({
        source: r.source || 'unknown',
        orders: toNum(r.orders),
        revenue: toNum(r.revenue),
      })),
      courierStatuses: courierStatusRaw.map((r: any) => ({
        status: r.status || 'unknown',
        orders: toNum(r.orders),
      })),
      landingPageProducts: landingPageProducts.map((r: any) => ({
        productId: toNum(r.product_id),
        productName: r.product_name || 'Unknown Product',
        totalOrders: toNum(r.total_orders),
        totalQty: toNum(r.total_qty),
        totalRevenue: toNum(r.total_revenue),
      })),
      websiteProducts: websiteProducts.map((r: any) => ({
        productId: toNum(r.product_id),
        productName: r.product_name || 'Unknown Product',
        totalOrders: toNum(r.total_orders),
        totalQty: toNum(r.total_qty),
        totalRevenue: toNum(r.total_revenue),
      })),
      agentProductBreakdown: agentProductRows.map((r: any) => ({
        agentId: r.agent_id == null ? null : toNum(r.agent_id),
        agentName: r.agent_name || 'Unassigned',
        productId: toNum(r.product_id),
        productName: r.product_name || 'Unknown Product',
        totalOrders: toNum(r.total_orders),
        totalQty: toNum(r.total_qty),
        totalRevenue: toNum(r.total_revenue),
      })),
    };
  }

  /**
   * Agent-wise sales report with date range filters and per-agent breakdowns.
   */
  async getAgentWiseReport(params: {
    startDate?: string;
    endDate?: string;
    agentId?: number;
  }) {
    const today = this.currentDhakaDateString();
    const startDate = params.startDate || today;
    const endDate = params.endDate || today;

    const toNum = (v: any) => parseFloat(v) || 0;

    // ──── 1) Per-agent summary ────
    const agentQb = this.salesRepository
      .createQueryBuilder('o')
      .innerJoin('users', 'u', 'u.id = o.created_by')
      .select([
        'o.created_by AS agent_id',
        `u.name AS agent_name`,
        `u.last_name AS agent_last_name`,
        'COUNT(o.id) AS total_orders',
        'COALESCE(SUM(o.total_amount), 0) AS total_revenue',
        'COALESCE(AVG(o.total_amount), 0) AS avg_order_value',
        'COALESCE(SUM(o.discount_amount), 0) AS total_discount',
        'COUNT(DISTINCT o.customer_id) AS unique_customers',

        `COUNT(CASE WHEN LOWER(o.status::text) = 'pending' THEN 1 END) AS pending_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'approved' THEN 1 END) AS approved_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'shipped' THEN 1 END) AS shipped_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'admin_cancelled' THEN 1 END) AS rejected_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_orders`,
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.order_source IN (:...agentSources)', { agentSources: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });

    if (params.agentId) {
      agentQb.andWhere('o.created_by = :agentId', { agentId: params.agentId });
    }

    agentQb
      .groupBy('o.created_by')
      .addGroupBy('u.name')
      .addGroupBy('u.last_name')
      .orderBy('total_orders', 'DESC');

    const agentRows = await agentQb.getRawMany();

    // ──── 2) Cross-sell per agent: product qty added later to website/landing-page orders ────
    // Any item in order_items for a website/landing_page order is a cross-sell (added after initial checkout)
    const crossSellQb = this.orderItemsRepository2
      .createQueryBuilder('oi')
      .innerJoin('sales_orders', 'o', 'o.id = oi.order_id')
      .select([
        'oi.added_by AS agent_id',
        'COALESCE(SUM(oi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT oi.order_id) AS cross_sell_orders',
      ])
      .where('oi.added_by IS NOT NULL')
      .andWhere("o.order_source IN ('website', 'landing_page')")
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });

    if (params.agentId) {
      crossSellQb.andWhere('oi.added_by = :agentId', { agentId: params.agentId });
    }

    crossSellQb.groupBy('oi.added_by');

    const crossSellRows = await crossSellQb.getRawMany();
    const crossSellMap = new Map<number, { qty: number; orders: number }>();
    for (const r of crossSellRows) {
      crossSellMap.set(toNum(r.agent_id), {
        qty: toNum(r.cross_sell_qty),
        orders: toNum(r.cross_sell_orders),
      });
    }

    // ──── 3) Daily trend (for chart) ────
    const dailyQb = this.salesRepository
      .createQueryBuilder('o')
      .select([
        'DATE(o.order_date) AS date',
        'o.created_by AS agent_id',
        'COUNT(o.id) AS orders',
        'COALESCE(SUM(o.total_amount), 0) AS revenue',

      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.order_source IN (:...agentSources2)', { agentSources2: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });

    if (params.agentId) {
      dailyQb.andWhere('o.created_by = :agentId', { agentId: params.agentId });
    }

    dailyQb
      .groupBy('date')
      .addGroupBy('o.created_by')
      .orderBy('date', 'ASC');

    const dailyRows = await dailyQb.getRawMany();

    // ──── 3b) Daily product qty for upsell trend (from both item tables) ────
    const dailyProdQtySoiRows: any[] = await this.salesRepository.manager.query(
      `SELECT DATE(o.order_date) AS date, COALESCE(SUM(soi.quantity), 0) AS prod_qty
       FROM sales_order_items soi
       INNER JOIN sales_orders o ON o.id = soi.sales_order_id
       WHERE o.created_by IS NOT NULL
         AND o.order_source IN ('admin_panel', 'agent_dashboard')
         AND DATE(o.order_date) >= $1 AND DATE(o.order_date) <= $2
         ${params.agentId ? 'AND o.created_by = $3' : ''}
       GROUP BY DATE(o.order_date)`,
      params.agentId ? [startDate, endDate, params.agentId] : [startDate, endDate],
    );
    const dailyProdQtyOiRows: any[] = await this.salesRepository.manager.query(
      `SELECT DATE(o.order_date) AS date, COALESCE(SUM(oi.quantity), 0) AS prod_qty
       FROM order_items oi
       INNER JOIN sales_orders o ON o.id = oi.order_id
       WHERE o.created_by IS NOT NULL
         AND o.order_source IN ('admin_panel', 'agent_dashboard')
         AND DATE(o.order_date) >= $1 AND DATE(o.order_date) <= $2
         ${params.agentId ? 'AND o.created_by = $3' : ''}
       GROUP BY DATE(o.order_date)`,
      params.agentId ? [startDate, endDate, params.agentId] : [startDate, endDate],
    );
    const dailyProdQtyMap = new Map<string, number>();
    for (const r of dailyProdQtySoiRows) {
      const d = String(r.date).slice(0, 10);
      dailyProdQtyMap.set(d, (dailyProdQtyMap.get(d) || 0) + toNum(r.prod_qty));
    }
    for (const r of dailyProdQtyOiRows) {
      const d = String(r.date).slice(0, 10);
      dailyProdQtyMap.set(d, (dailyProdQtyMap.get(d) || 0) + toNum(r.prod_qty));
    }

    // ──── 4) Hourly distribution for selected agent(s) (use created_at which is timestamp) ────
    const hourlyQb = this.salesRepository
      .createQueryBuilder('o')
      .select([
        `EXTRACT(HOUR FROM o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS hour`,
        'COUNT(o.id) AS orders',
        'COALESCE(SUM(o.total_amount), 0) AS revenue',
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.order_source IN (:...agentSources3)', { agentSources3: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });

    if (params.agentId) {
      hourlyQb.andWhere('o.created_by = :agentId', { agentId: params.agentId });
    }

    hourlyQb.groupBy('hour').orderBy('hour', 'ASC');
    const hourlyRows = await hourlyQb.getRawMany();

    // ──── 5) Product breakdown for agent(s) ────
    const productQb = this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'soi.product_id AS product_id',
        'soi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
        'SUM(soi.line_total) AS total_revenue',
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.order_source IN (:...agentSources4)', { agentSources4: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });

    if (params.agentId) {
      productQb.andWhere('o.created_by = :agentId', { agentId: params.agentId });
    }

    productQb
      .groupBy('soi.product_id')
      .addGroupBy('soi.product_name')
      .orderBy('total_orders', 'DESC');

    const productRows = await productQb.getRawMany();

    // ──── 5b) Total product quantity per agent (from both item tables) ────
    const prodQtySoiQb = this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'o.created_by AS agent_id',
        'COALESCE(SUM(soi.quantity), 0) AS total_product_qty',
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.order_source IN (:...pqs1)', { pqs1: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });
    if (params.agentId) {
      prodQtySoiQb.andWhere('o.created_by = :agentId', { agentId: params.agentId });
    }
    prodQtySoiQb.groupBy('o.created_by');
    const prodQtySoiRows = await prodQtySoiQb.getRawMany();

    const prodQtyOiQb = this.orderItemsRepository2
      .createQueryBuilder('oi')
      .innerJoin('sales_orders', 'o', 'o.id = oi.order_id')
      .select([
        'o.created_by AS agent_id',
        'COALESCE(SUM(oi.quantity), 0) AS total_product_qty',
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.order_source IN (:...pqs2)', { pqs2: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate });
    if (params.agentId) {
      prodQtyOiQb.andWhere('o.created_by = :agentId', { agentId: params.agentId });
    }
    prodQtyOiQb.groupBy('o.created_by');
    const prodQtyOiRows = await prodQtyOiQb.getRawMany();

    const prodQtyMap = new Map<number, number>();
    for (const r of prodQtySoiRows) {
      const id = toNum(r.agent_id);
      prodQtyMap.set(id, (prodQtyMap.get(id) || 0) + toNum(r.total_product_qty));
    }
    for (const r of prodQtyOiRows) {
      const id = toNum(r.agent_id);
      prodQtyMap.set(id, (prodQtyMap.get(id) || 0) + toNum(r.total_product_qty));
    }

    // ──── 6) Call-based conversion rate per agent ────
    // Conversion = (customers called who placed an order / total customers called) * 100
    const convRateRows: any[] = await this.salesRepository.manager.query(
      `SELECT
         a.user_id AS agent_id,
         COUNT(DISTINCT a.customer_id) AS total_called,
         COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN a.customer_id END) AS converted
       FROM activities a
       LEFT JOIN sales_orders o
         ON o.customer_id = a.customer_id
         AND o.created_by = a.user_id
         AND o.order_source IN ('admin_panel', 'agent_dashboard')
         AND DATE(o.order_date) >= $1
         AND DATE(o.order_date) <= $2
       WHERE a.type = 'call'
         AND a.customer_id IS NOT NULL
         AND DATE(a.created_at) >= $1
         AND DATE(a.created_at) <= $2
         ${params.agentId ? 'AND a.user_id = $3' : ''}
       GROUP BY a.user_id`,
      params.agentId ? [startDate, endDate, params.agentId] : [startDate, endDate],
    );
    const convRateMap = new Map<number, number>();
    for (const r of convRateRows) {
      const called = toNum(r.total_called);
      const converted = toNum(r.converted);
      convRateMap.set(toNum(r.agent_id), called > 0 ? Math.round((converted / called) * 100) : 0);
    }

    // ──── 7) Overall totals ────
    const agentRowMap = new Map<number, any>();
    const agentIds = new Set<number>();

    for (const row of agentRows) {
      const agentId = toNum(row.agent_id);
      if (agentId > 0) {
        agentRowMap.set(agentId, row);
        agentIds.add(agentId);
      }
    }
    for (const agentId of crossSellMap.keys()) {
      if (agentId > 0) agentIds.add(agentId);
    }
    for (const agentId of prodQtyMap.keys()) {
      if (agentId > 0) agentIds.add(agentId);
    }
    for (const agentId of convRateMap.keys()) {
      if (agentId > 0) agentIds.add(agentId);
    }

    const agentNameRows: any[] = agentIds.size
      ? await this.salesRepository.manager.query(
          `SELECT id, name, last_name, email
           FROM users
           WHERE id = ANY($1::int[])`,
          [Array.from(agentIds)],
        )
      : [];
    const agentNameMap = new Map<number, any>();
    for (const row of agentNameRows) {
      agentNameMap.set(toNum(row.id), row);
    }

    const agents = Array.from(agentIds).map((agentId) => {
      const r = agentRowMap.get(agentId) || {};
      const userRow = agentNameMap.get(agentId) || {};
      const cs = crossSellMap.get(agentId) || { qty: 0, orders: 0 };
      const totalOrders = toNum(r.total_orders);
      const productsQty = prodQtyMap.get(agentId) || 0;
      const upsellQty = Math.max(0, productsQty - totalOrders);
      const agentName = [
        r.agent_name ?? userRow.name,
        r.agent_last_name ?? userRow.last_name,
      ].filter(Boolean).join(' ').trim() || userRow.email || `Agent #${agentId}`;

      return {
        agentId,
        agentName,
        totalOrders,
        totalRevenue: toNum(r.total_revenue),
        avgOrderValue: toNum(r.avg_order_value),
        totalDiscount: toNum(r.total_discount),
        uniqueCustomers: toNum(r.unique_customers),
        upsellQty,
        productsQty,
        crossSellQty: cs.qty,
        crossSellOrders: cs.orders,
        pendingOrders: toNum(r.pending_orders),
        approvedOrders: toNum(r.approved_orders),
        shippedOrders: toNum(r.shipped_orders),
        deliveredOrders: toNum(r.delivered_orders),
        rejectedOrders: toNum(r.rejected_orders),
        cancelledOrders: toNum(r.cancelled_orders),
        conversionRate: convRateMap.get(agentId) || 0,
        cancelRate: toNum(r.total_orders) > 0
          ? Math.round((toNum(r.cancelled_orders) / toNum(r.total_orders)) * 100)
          : 0,
      };
    }).sort((a, b) =>
      b.totalOrders - a.totalOrders
      || b.upsellQty - a.upsellQty
      || b.crossSellQty - a.crossSellQty
      || a.agentName.localeCompare(b.agentName)
    );

    const totalSummary = {
      totalOrders: agents.reduce((s, a) => s + a.totalOrders, 0),
      totalRevenue: agents.reduce((s, a) => s + a.totalRevenue, 0),
      totalDiscount: agents.reduce((s, a) => s + a.totalDiscount, 0),
      totalUpsellQty: agents.reduce((s, a) => s + a.upsellQty, 0),
      totalProductsQty: agents.reduce((s, a) => s + a.productsQty, 0),
      totalCrossSellQty: agents.reduce((s, a) => s + a.crossSellQty, 0),
      totalCrossSellOrders: agents.reduce((s, a) => s + a.crossSellOrders, 0),
      totalUniqueCustomers: agents.reduce((s, a) => s + a.uniqueCustomers, 0),
      activeAgents: agents.length,
    };

    // Build daily trend keyed by date for chart
    const dateMap = new Map<string, any>();
    for (const r of dailyRows) {
      const d = String(r.date).slice(0, 10);
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, orders: 0, revenue: 0, upsells: 0 });
      }
      const entry = dateMap.get(d)!;
      entry.orders += toNum(r.orders);
      entry.revenue += toNum(r.revenue);
      // Upsell = productsQty - orders for this date
      const dailyProdQty = dailyProdQtyMap.get(d) || 0;
      entry.upsells = Math.max(0, dailyProdQty - entry.orders);

    }
    const dailyTrend = [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    return {
      startDate,
      endDate,
      summary: totalSummary,
      agents,
      dailyTrend,
      hourly: Array.from({ length: 24 }, (_, i) => {
        const found = hourlyRows.find((r: any) => toNum(r.hour) === i);
        return { hour: i, label: `${i.toString().padStart(2, '0')}:00`, orders: toNum(found?.orders), revenue: toNum(found?.revenue) };
      }),
      products: productRows.map((r: any) => ({
        productId: toNum(r.product_id),
        productName: r.product_name || 'Unknown Product',
        totalOrders: toNum(r.total_orders),
        totalQty: toNum(r.total_qty),
        totalRevenue: toNum(r.total_revenue),
      })),
    };
  }

  /**
   * Individual Monthly Order Report
   * Returns per-agent, per-day order counts for a given month/year,
   * along with total, delivered, partial delivered, cancelled, and cancelled ratio.
   */
  async getAgentMonthlyReport(params: { month: number; year: number }) {
    const { month, year } = params;
    const toNum = (v: any) => parseFloat(v) || 0;

    // Calculate date range for the given month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1) Per-agent, per-day order counts
    const dailyQb = this.salesRepository
      .createQueryBuilder('o')
      .innerJoin('users', 'u', 'u.id = o.created_by')
      .select([
        'o.created_by AS agent_id',
        'u.name AS agent_name',
        'u.last_name AS agent_last_name',
        'EXTRACT(DAY FROM o.order_date) AS day',
        'COUNT(o.id) AS order_count',
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.courier_order_id IS NOT NULL')
      .andWhere('o.order_source IN (:...agentSources5)', { agentSources5: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate })
      .groupBy('o.created_by')
      .addGroupBy('u.name')
      .addGroupBy('u.last_name')
      .addGroupBy('EXTRACT(DAY FROM o.order_date)')
      .orderBy('u.name', 'ASC');

    const dailyRows = await dailyQb.getRawMany();

    // 2) Per-agent summary (total, delivered, cancelled)
    const summaryQb = this.salesRepository
      .createQueryBuilder('o')
      .innerJoin('users', 'u', 'u.id = o.created_by')
      .select([
        'o.created_by AS agent_id',
        'u.name AS agent_name',
        'u.last_name AS agent_last_name',
        'COUNT(o.id) AS total_orders',
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'partial_delivered' THEN 1 END) AS partial_delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'admin_cancelled', 'returned') THEN 1 END) AS cancelled_orders`,
      ])
      .where('o.created_by IS NOT NULL')
      .andWhere('o.courier_order_id IS NOT NULL')
      .andWhere('o.order_source IN (:...agentSources6)', { agentSources6: ['admin_panel', 'agent_dashboard'] })
      .andWhere('DATE(o.order_date) >= :startDate', { startDate })
      .andWhere('DATE(o.order_date) <= :endDate', { endDate })
      .groupBy('o.created_by')
      .addGroupBy('u.name')
      .addGroupBy('u.last_name')
      .orderBy('u.name', 'ASC');

    const summaryRows = await summaryQb.getRawMany();

    // Build agent map
    const agentMap = new Map<number, {
      agentId: number;
      agentName: string;
      dailyOrders: Record<number, number>; // day -> count
      total: number;
      delivered: number;
      partialDelivered: number;
      cancelled: number;
    }>();

    // Populate from summary
    for (const r of summaryRows) {
      const id = toNum(r.agent_id);
      agentMap.set(id, {
        agentId: id,
        agentName: [r.agent_name, r.agent_last_name].filter(Boolean).join(' ') || `Agent #${id}`,
        dailyOrders: {},
        total: toNum(r.total_orders),
        delivered: toNum(r.delivered_orders),
        partialDelivered: toNum(r.partial_delivered_orders),
        cancelled: toNum(r.cancelled_orders),
      });
    }

    // Populate daily orders
    for (const r of dailyRows) {
      const id = toNum(r.agent_id);
      const day = toNum(r.day);
      const agent = agentMap.get(id);
      if (agent) {
        agent.dailyOrders[day] = toNum(r.order_count);
      }
    }

    // Convert map to sorted array
    const agents = Array.from(agentMap.values())
      .sort((a, b) => b.total - a.total); // sort by total orders desc

    // Grand totals
    const grandTotal = agents.reduce((s, a) => s + a.total, 0);
    const grandDelivered = agents.reduce((s, a) => s + a.delivered, 0);
    const grandPartialDelivered = agents.reduce((s, a) => s + a.partialDelivered, 0);
    const grandCancelled = agents.reduce((s, a) => s + a.cancelled, 0);

    return {
      month,
      year,
      daysInMonth: lastDay,
      agents,
      grandTotal,
      grandDelivered,
      grandPartialDelivered,
      grandCancelled,
      grandCancelledRatio: grandTotal > 0
        ? parseFloat(((grandCancelled / grandTotal) * 100).toFixed(2))
        : 0,
    };
  }

  async getWebsiteMonthlyReport(params: { month: number; year: number }) {
    const { month, year } = params;
    const toNum = (v: any) => parseFloat(v) || 0;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Daily counts per source
    const dailyRaw: Array<{ order_source: string; day: number; order_count: string }> =
      await this.salesRepository.query(
        `SELECT
           order_source,
           EXTRACT(DAY FROM order_date)::int AS day,
           COUNT(id) AS order_count
         FROM sales_orders
         WHERE order_source IN ('website', 'landing_page')
           AND DATE(order_date) BETWEEN $1 AND $2
         GROUP BY order_source, EXTRACT(DAY FROM order_date)
         ORDER BY day`,
        [startDate, endDate],
      );

    // Summary (total / delivered / partial delivered / rejected / cancelled with returned) per source
    const summaryRaw: Array<{
      order_source: string;
      total_orders: string;
      delivered_orders: string;
      partial_delivered_orders: string;
      rejected_orders: string;
      cancelled_orders: string;
    }> = await this.salesRepository.query(
      `SELECT
         order_source,
         COUNT(id) AS total_orders,
         COUNT(CASE WHEN LOWER(status::text) = 'delivered' THEN 1 END) AS delivered_orders,
         COUNT(CASE WHEN LOWER(status::text) = 'partial_delivered' THEN 1 END) AS partial_delivered_orders,
         COUNT(CASE WHEN LOWER(status::text) = 'admin_cancelled' THEN 1 END) AS rejected_orders,
         COUNT(CASE WHEN LOWER(status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_orders
       FROM sales_orders
       WHERE order_source IN ('website', 'landing_page')
         AND DATE(order_date) BETWEEN $1 AND $2
       GROUP BY order_source`,
      [startDate, endDate],
    );

    // Daily and summary counts per individual landing page.
    const landingPageDailyRaw: Array<{
      slug: string;
      title: string;
      day: number;
      order_count: string;
    }> = await this.salesRepository.query(
      `SELECT
         COALESCE(NULLIF(o.utm_source, ''), 'unknown') AS slug,
         COALESCE(lp.title, NULLIF(o.utm_campaign, ''), NULLIF(o.utm_source, ''), 'Unknown Landing Page') AS title,
         EXTRACT(DAY FROM o.order_date)::int AS day,
         COUNT(o.id) AS order_count
       FROM sales_orders o
       LEFT JOIN landing_pages lp ON lp.slug = o.utm_source
       WHERE o.order_source = 'landing_page'
         AND DATE(o.order_date) BETWEEN $1 AND $2
       GROUP BY
         COALESCE(NULLIF(o.utm_source, ''), 'unknown'),
         COALESCE(lp.title, NULLIF(o.utm_campaign, ''), NULLIF(o.utm_source, ''), 'Unknown Landing Page'),
         EXTRACT(DAY FROM o.order_date)
       ORDER BY title ASC, day ASC`,
      [startDate, endDate],
    );

    const landingPageSummaryRaw: Array<{
      slug: string;
      title: string;
      total_orders: string;
      delivered_orders: string;
      partial_delivered_orders: string;
      rejected_orders: string;
      cancelled_orders: string;
    }> = await this.salesRepository.query(
      `SELECT
         COALESCE(NULLIF(o.utm_source, ''), 'unknown') AS slug,
         COALESCE(lp.title, NULLIF(o.utm_campaign, ''), NULLIF(o.utm_source, ''), 'Unknown Landing Page') AS title,
         COUNT(o.id) AS total_orders,
         COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders,
         COUNT(CASE WHEN LOWER(o.status::text) = 'partial_delivered' THEN 1 END) AS partial_delivered_orders,
         COUNT(CASE WHEN LOWER(o.status::text) = 'admin_cancelled' THEN 1 END) AS rejected_orders,
         COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_orders
       FROM sales_orders o
       LEFT JOIN landing_pages lp ON lp.slug = o.utm_source
       WHERE o.order_source = 'landing_page'
         AND DATE(o.order_date) BETWEEN $1 AND $2
       GROUP BY
         COALESCE(NULLIF(o.utm_source, ''), 'unknown'),
         COALESCE(lp.title, NULLIF(o.utm_campaign, ''), NULLIF(o.utm_source, ''), 'Unknown Landing Page')
       ORDER BY total_orders DESC, title ASC`,
      [startDate, endDate],
    );

    // Index daily rows
    const websiteDaily: Record<number, number> = {};
    const landingPageDaily: Record<number, number> = {};
    for (const r of dailyRaw) {
      const day = toNum(r.day);
      const count = toNum(r.order_count);
      if (r.order_source === 'website') websiteDaily[day] = count;
      else if (r.order_source === 'landing_page') landingPageDaily[day] = count;
    }

    // Build summary objects
    let websiteSummary = { total: 0, delivered: 0, partialDelivered: 0, rejected: 0, cancelled: 0 };
    let landingPageSummary = { total: 0, delivered: 0, partialDelivered: 0, rejected: 0, cancelled: 0 };
    for (const r of summaryRaw) {
      const s = {
        total: toNum(r.total_orders),
        delivered: toNum(r.delivered_orders),
        partialDelivered: toNum(r.partial_delivered_orders),
        rejected: toNum(r.rejected_orders),
        cancelled: toNum(r.cancelled_orders),
      };
      if (r.order_source === 'website') websiteSummary = s;
      else if (r.order_source === 'landing_page') landingPageSummary = s;
    }

    const landingPageDailyMap = new Map<string, Record<number, number>>();
    for (const r of landingPageDailyRaw) {
      const slug = r.slug || 'unknown';
      const daily = landingPageDailyMap.get(slug) || {};
      daily[toNum(r.day)] = toNum(r.order_count);
      landingPageDailyMap.set(slug, daily);
    }

    // One chart point per day
    const dailyChart = Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      return {
        day,
        website: websiteDaily[day] || 0,
        landingPage: landingPageDaily[day] || 0,
      };
    });

    return {
      month,
      year,
      daysInMonth: lastDay,
      dailyChart,
      website: websiteSummary,
      landingPage: landingPageSummary,
      landingPages: landingPageSummaryRaw.map((r) => ({
        slug: r.slug || 'unknown',
        title: r.title || r.slug || 'Unknown Landing Page',
        dailyOrders: landingPageDailyMap.get(r.slug || 'unknown') || {},
        total: toNum(r.total_orders),
        delivered: toNum(r.delivered_orders),
        partialDelivered: toNum(r.partial_delivered_orders),
        rejected: toNum(r.rejected_orders),
        cancelled: toNum(r.cancelled_orders),
      })),
    };
  }

  /**
   * Comprehensive landing page analytics report.
   * Supports date range, optional slug filter, groupBy: hour | day.
   */
  async getLandingPageReport(params: {
    startDate?: string;
    endDate?: string;
    slug?: string;
    groupBy?: 'hour' | 'day';
  }) {
    const toNum = (v: any) => parseFloat(v) || 0;
    const today = this.currentDhakaDateString();
    const startDate = params.startDate || today;
    const endDate = params.endDate || today;
    // Build base query conditions
    const buildBase = () => {
      const qb = this.salesRepository
        .createQueryBuilder('o')
        .where("o.order_source = 'landing_page'")
        .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') >= :startDate`, { startDate })
        .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') <= :endDate`, { endDate });
      if (params.slug) {
        qb.andWhere('o.utm_source = :slug', { slug: params.slug });
      }
      return qb;
    };

    const buildCrossSellBase = () => {
      const qb = this.orderItemsRepository2
        .createQueryBuilder('oi')
        .innerJoin('sales_orders', 'o', 'o.id = oi.order_id')
        .where("o.order_source = 'landing_page'")
        .andWhere('oi.is_cross_sell = true')
        .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') >= :startDate`, { startDate })
        .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') <= :endDate`, { endDate });
      if (params.slug) {
        qb.andWhere('o.utm_source = :slug', { slug: params.slug });
      }
      return qb;
    };

    const buildCheckoutCrossSellBase = () => {
      const qb = this.orderItemsRepository
        .createQueryBuilder('soi')
        .innerJoin('soi.salesOrder', 'o')
        .innerJoin('landing_pages', 'lp', 'lp.slug = o.utm_source')
        .where("o.order_source = 'landing_page'")
        .andWhere('lp.cross_sell_product IS NOT NULL')
        .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') >= :startDate`, { startDate })
        .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') <= :endDate`, { endDate })
        .andWhere(`(
          ((lp.cross_sell_product->>'product_id') ~ '^[0-9]+$' AND soi.product_id = (lp.cross_sell_product->>'product_id')::int)
          OR LOWER(COALESCE(soi.product_name, '')) = LOWER(COALESCE(lp.cross_sell_product->>'name', ''))
        )`);
      if (params.slug) {
        qb.andWhere('o.utm_source = :slug', { slug: params.slug });
      }
      return qb;
    };

    // 1) Overall summary
    const summaryRaw = await buildBase()
      .select([
        'COUNT(o.id) AS total_orders',
        `COUNT(CASE WHEN o.thank_you_offer_accepted = true THEN 1 END) AS upsell_accepted`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'pending' THEN 1 END) AS pending_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'approved' THEN 1 END) AS approved_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'shipped' THEN 1 END) AS shipped_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_returned_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'admin_cancelled' THEN 1 END) AS rejected_orders`,
      ])
      .getRawOne();

    const crossSellSummaryRaw = await buildCrossSellBase()
      .select([
        'COALESCE(SUM(oi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT oi.order_id) AS cross_sell_orders',
      ])
      .getRawOne();

    const checkoutCrossSellSummaryRaw = await buildCheckoutCrossSellBase()
      .select([
        'COALESCE(SUM(soi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT o.id) AS cross_sell_orders',
      ])
      .getRawOne();

    // 2) Hourly breakdown (useful for single-day view)
    const hourlyRaw = await buildBase()
      .select([
        `EXTRACT(HOUR FROM o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS hour`,
        'COUNT(o.id) AS orders',
        `COUNT(CASE WHEN o.thank_you_offer_accepted = true THEN 1 END) AS upsell_accepted`,
      ])
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    const hourlyCrossSellRaw = await buildCrossSellBase()
      .select([
        `EXTRACT(HOUR FROM o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS hour`,
        'COALESCE(SUM(oi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT oi.order_id) AS cross_sell_orders',
      ])
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    const hourlyCheckoutCrossSellRaw = await buildCheckoutCrossSellBase()
      .select([
        `EXTRACT(HOUR FROM o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS hour`,
        'COALESCE(SUM(soi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT o.id) AS cross_sell_orders',
      ])
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany();

    // 3) Daily breakdown
    const dailyRaw = await buildBase()
      .select([
        `DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS date`,
        'COUNT(o.id) AS orders',
        `COUNT(CASE WHEN o.thank_you_offer_accepted = true THEN 1 END) AS upsell_accepted`,
      ])
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyCrossSellRaw = await buildCrossSellBase()
      .select([
        `DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS date`,
        'COALESCE(SUM(oi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT oi.order_id) AS cross_sell_orders',
      ])
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyCheckoutCrossSellRaw = await buildCheckoutCrossSellBase()
      .select([
        `DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') AS date`,
        'COALESCE(SUM(soi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT o.id) AS cross_sell_orders',
      ])
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 4) Per-landing-page breakdown (by utm_source = slug)
    const landingPageSlugExpr = `COALESCE(o.utm_source, 'unknown')`;
    const landingPageTitleExpr = `COALESCE(o.utm_campaign, 'unknown')`;

    const perPageRaw = await buildBase()
      .select([
        `${landingPageSlugExpr} AS slug`,
        `${landingPageTitleExpr} AS title`,
        'COUNT(o.id) AS orders',
        `COUNT(CASE WHEN o.thank_you_offer_accepted = true THEN 1 END) AS upsell_accepted`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'returned') THEN 1 END) AS cancelled_returned_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'admin_cancelled' THEN 1 END) AS rejected_orders`,
      ])
      .groupBy(landingPageSlugExpr)
      .addGroupBy(landingPageTitleExpr)
      .orderBy('orders', 'DESC')
      .getRawMany();

    const perPageCrossSellRaw = await buildCrossSellBase()
      .select([
        `${landingPageSlugExpr} AS slug`,
        'COALESCE(SUM(oi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT oi.order_id) AS cross_sell_orders',
      ])
      .groupBy(landingPageSlugExpr)
      .getRawMany();

    const perPageCheckoutCrossSellRaw = await buildCheckoutCrossSellBase()
      .select([
        `${landingPageSlugExpr} AS slug`,
        'COALESCE(SUM(soi.quantity), 0) AS cross_sell_qty',
        'COUNT(DISTINCT o.id) AS cross_sell_orders',
      ])
      .groupBy(landingPageSlugExpr)
      .getRawMany();

    // 5) Status breakdown
    const statusRaw = await buildBase()
      .select([
        `COALESCE(o.status, 'unknown') AS status`,
        'COUNT(o.id) AS orders',
      ])
      .groupBy('status')
      .orderBy('orders', 'DESC')
      .getRawMany();

    // 6) Product-wise breakdown from checkout order items
    const productRaw = await this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'soi.product_id AS product_id',
        'soi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
      ])
      .where("o.order_source = 'landing_page'")
      .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') >= :startDate`, { startDate })
      .andWhere(`DATE(o.created_at AT TIME ZONE '${this.dhakaTimeZone}') <= :endDate`, { endDate })
      .andWhere(params.slug ? 'o.utm_source = :slug' : '1=1', params.slug ? { slug: params.slug } : {})
      .groupBy('soi.product_id')
      .addGroupBy('soi.product_name')
      .orderBy('total_orders', 'DESC')
      .getRawMany();

    // 7) Cross-sell product breakdown from managed order items
    const crossSellProductRaw = await buildCrossSellBase()
      .select([
        'oi.product_id AS product_id',
        'oi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(oi.quantity) AS total_qty',
      ])
      .groupBy('oi.product_id')
      .addGroupBy('oi.product_name')
      .orderBy('total_qty', 'DESC')
      .getRawMany();

    const checkoutCrossSellProductRaw = await buildCheckoutCrossSellBase()
      .select([
        'soi.product_id AS product_id',
        'soi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
      ])
      .groupBy('soi.product_id')
      .addGroupBy('soi.product_name')
      .orderBy('total_qty', 'DESC')
      .getRawMany();

    const totalOrders = toNum(summaryRaw?.total_orders);
    const upsellAccepted = toNum(summaryRaw?.upsell_accepted);
    const crossSellQty = toNum(crossSellSummaryRaw?.cross_sell_qty) + toNum(checkoutCrossSellSummaryRaw?.cross_sell_qty);
    const crossSellOrders = toNum(crossSellSummaryRaw?.cross_sell_orders) + toNum(checkoutCrossSellSummaryRaw?.cross_sell_orders);
    const mergeCrossSellRows = (rows: any[], keyFn: (r: any) => string | number) => {
      const map = new Map<string | number, { cross_sell_qty: number; cross_sell_orders: number }>();
      for (const r of rows) {
        const key = keyFn(r);
        const current = map.get(key) || { cross_sell_qty: 0, cross_sell_orders: 0 };
        current.cross_sell_qty += toNum(r.cross_sell_qty);
        current.cross_sell_orders += toNum(r.cross_sell_orders);
        map.set(key, current);
      }
      return map;
    };
    const dateKey = (value: any) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const crossSellByHour = mergeCrossSellRows([...hourlyCrossSellRaw, ...hourlyCheckoutCrossSellRaw], (r) => toNum(r.hour));
    const crossSellByDate = mergeCrossSellRows([...dailyCrossSellRaw, ...dailyCheckoutCrossSellRaw], (r) => dateKey(r.date));
    const crossSellBySlug = mergeCrossSellRows([...perPageCrossSellRaw, ...perPageCheckoutCrossSellRaw], (r) => String(r.slug));
    const crossSellProductMap = new Map<string, { productId: number; productName: string; totalOrders: number; totalQty: number }>();
    for (const r of [...crossSellProductRaw, ...checkoutCrossSellProductRaw]) {
      const productId = toNum(r.product_id);
      const productName = r.product_name || 'Unknown';
      const key = `${productId}:${productName}`;
      const current = crossSellProductMap.get(key) || { productId, productName, totalOrders: 0, totalQty: 0 };
      current.totalOrders += toNum(r.total_orders);
      current.totalQty += toNum(r.total_qty);
      crossSellProductMap.set(key, current);
    }

    return {
      startDate,
      endDate,
      slug: params.slug || null,
      summary: {
        totalOrders,
        upsellAccepted,
        upsellRate: totalOrders > 0 ? Math.round((upsellAccepted / totalOrders) * 100) : 0,
        crossSellQty,
        crossSellOrders,
        pendingOrders: toNum(summaryRaw?.pending_orders),
        approvedOrders: toNum(summaryRaw?.approved_orders),
        shippedOrders: toNum(summaryRaw?.shipped_orders),
        deliveredOrders: toNum(summaryRaw?.delivered_orders),
        cancelledOrders: toNum(summaryRaw?.cancelled_orders),
        cancelledReturnedOrders: toNum(summaryRaw?.cancelled_returned_orders),
        rejectedOrders: toNum(summaryRaw?.rejected_orders),
      },
      hourly: Array.from({ length: 24 }, (_, i) => {
        const found = hourlyRaw.find((r: any) => toNum(r.hour) === i);
        const crossSell = crossSellByHour.get(i);
        return {
          hour: i,
          label: `${i.toString().padStart(2, '0')}:00`,
          orders: toNum(found?.orders),
          upsellAccepted: toNum(found?.upsell_accepted),
          crossSellQty: toNum(crossSell?.cross_sell_qty),
          crossSellOrders: toNum(crossSell?.cross_sell_orders),
        };
      }),
      daily: dailyRaw.map((r: any) => {
        const date = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
        const crossSell = crossSellByDate.get(date);
        return {
          date,
          orders: toNum(r.orders),
          upsellAccepted: toNum(r.upsell_accepted),
          crossSellQty: toNum(crossSell?.cross_sell_qty),
          crossSellOrders: toNum(crossSell?.cross_sell_orders),
        };
      }),
      perPage: perPageRaw.map((r: any) => {
        const ord = toNum(r.orders);
        const ups = toNum(r.upsell_accepted);
        const crossSell = crossSellBySlug.get(String(r.slug));
        return {
          slug: r.slug,
          title: r.title,
          orders: ord,
          upsellAccepted: ups,
          upsellRate: ord > 0 ? Math.round((ups / ord) * 100) : 0,
          crossSellQty: toNum(crossSell?.cross_sell_qty),
          crossSellOrders: toNum(crossSell?.cross_sell_orders),
          deliveredOrders: toNum(r.delivered_orders),
          cancelledOrders: toNum(r.cancelled_orders),
          cancelledReturnedOrders: toNum(r.cancelled_returned_orders),
          rejectedOrders: toNum(r.rejected_orders),
        };
      }),
      statusBreakdown: statusRaw.map((r: any) => ({
        status: r.status,
        orders: toNum(r.orders),
      })),
      products: productRaw.map((r: any) => ({
        productId: toNum(r.product_id),
        productName: r.product_name || 'Unknown',
        totalOrders: toNum(r.total_orders),
        totalQty: toNum(r.total_qty),
      })),
      crossSellProducts: Array.from(crossSellProductMap.values())
        .sort((a, b) => b.totalQty - a.totalQty),
    };
  }

  async getCrossSellAnalysisReport(params: {
    productId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const toNum = (value: any) => Number(value || 0);
    const productId = Number(params.productId);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new BadRequestException('A valid productId is required');
    }

    const productRows = await this.salesRepository.manager.query(
      `SELECT id, slug, sku, product_code, name_en, name_bn, image_url
       FROM products
       WHERE id = $1
       LIMIT 1`,
      [productId],
    );
    const selectedProduct = productRows[0];
    if (!selectedProduct) {
      throw new NotFoundException('Selected product not found');
    }

    const values: any[] = [productId];
    const deliveredDateExpr = `DATE(COALESCE(o.delivered_at, o.order_date::timestamp, o.created_at AT TIME ZONE '${this.dhakaTimeZone}'))`;
    const dateConditions: string[] = [];
    if (params.startDate) {
      values.push(params.startDate);
      dateConditions.push(`${deliveredDateExpr} >= $${values.length}`);
    }
    if (params.endDate) {
      values.push(params.endDate);
      dateConditions.push(`${deliveredDateExpr} <= $${values.length}`);
    }
    const dateFilter = dateConditions.length ? `AND ${dateConditions.join(' AND ')}` : '';

    const selectedOrdersCte = `
      WITH selected_orders AS (
        SELECT DISTINCT o.id
        FROM sales_orders o
        WHERE LOWER(o.status::text) = 'delivered'
          ${dateFilter}
          AND (
            EXISTS (
              SELECT 1
              FROM sales_order_items soi
              WHERE soi.sales_order_id = o.id
                AND soi.product_id = $1
            )
            OR EXISTS (
              SELECT 1
              FROM order_items base_oi
              WHERE base_oi.order_id = o.id
                AND base_oi.product_id = $1
                AND COALESCE(base_oi.is_cross_sell, false) = false
            )
          )
      )
    `;

    const summaryRows = await this.salesRepository.manager.query(
      `${selectedOrdersCte}
       SELECT
         (SELECT COUNT(*) FROM selected_orders)::int AS selected_delivered_orders,
         COUNT(DISTINCT oi.order_id)::int AS cross_sell_orders,
         COALESCE(SUM(oi.quantity), 0)::numeric AS cross_sell_qty,
         COALESCE(SUM(oi.subtotal), 0)::numeric AS cross_sell_revenue
       FROM selected_orders so
       LEFT JOIN order_items oi
         ON oi.order_id = so.id
        AND COALESCE(oi.is_cross_sell, false) = true
        AND COALESCE(oi.product_id, 0) <> $1`,
      values,
    );

    const rows = await this.salesRepository.manager.query(
      `${selectedOrdersCte}
       SELECT
         oi.product_id AS product_id,
         COALESCE(NULLIF(p.name_en, ''), NULLIF(oi.product_name, ''), NULLIF(oi.custom_product_name, ''), 'Unknown Product') AS product_name,
         p.slug,
         p.sku,
         p.image_url,
         COUNT(DISTINCT oi.order_id)::int AS total_orders,
         COALESCE(SUM(oi.quantity), 0)::numeric AS total_qty,
         COALESCE(SUM(oi.subtotal), 0)::numeric AS total_revenue
       FROM selected_orders so
       INNER JOIN order_items oi
         ON oi.order_id = so.id
        AND COALESCE(oi.is_cross_sell, false) = true
        AND COALESCE(oi.product_id, 0) <> $1
       LEFT JOIN products p ON p.id = oi.product_id
       GROUP BY
         oi.product_id,
         COALESCE(NULLIF(p.name_en, ''), NULLIF(oi.product_name, ''), NULLIF(oi.custom_product_name, ''), 'Unknown Product'),
         p.slug,
         p.sku,
         p.image_url
       ORDER BY total_qty DESC, total_orders DESC, product_name ASC`,
      values,
    );

    const summary = summaryRows[0] || {};
    const selectedDeliveredOrders = toNum(summary.selected_delivered_orders);

    return {
      productId,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
      selectedProduct: {
        id: toNum(selectedProduct.id),
        name: selectedProduct.name_en || selectedProduct.name_bn || selectedProduct.sku || `Product #${productId}`,
        nameBn: selectedProduct.name_bn || null,
        slug: selectedProduct.slug || null,
        sku: selectedProduct.sku || selectedProduct.product_code || null,
        imageUrl: selectedProduct.image_url || null,
      },
      summary: {
        selectedDeliveredOrders,
        crossSellOrders: toNum(summary.cross_sell_orders),
        crossSellQty: toNum(summary.cross_sell_qty),
        crossSellRevenue: toNum(summary.cross_sell_revenue),
        attachRate: selectedDeliveredOrders > 0
          ? Math.round((toNum(summary.cross_sell_orders) / selectedDeliveredOrders) * 100)
          : 0,
      },
      products: rows.map((row: any) => {
        const totalOrders = toNum(row.total_orders);
        const totalQty = toNum(row.total_qty);
        return {
          productId: row.product_id == null ? null : toNum(row.product_id),
          productName: row.product_name || 'Unknown Product',
          slug: row.slug || null,
          sku: row.sku || null,
          imageUrl: row.image_url || null,
          totalOrders,
          totalQty,
          totalRevenue: toNum(row.total_revenue),
          attachRate: selectedDeliveredOrders > 0
            ? Math.round((totalOrders / selectedDeliveredOrders) * 100)
            : 0,
          avgQtyPerOrder: totalOrders > 0 ? Number((totalQty / totalOrders).toFixed(2)) : 0,
        };
      }),
    };
  }
}
