import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { CallTask, TaskStatus } from '../crm/entities/call-task.entity';
import { Activity } from '../crm/entities/activity.entity';
import { CustomersService } from '../customers/customers.service';
import { User } from '../users/user.entity';
import { TelephonyCall, TelephonyCallStatus } from './entities/telephony-call.entity';
import { TelephonyGateway } from './telephony.gateway';
import { AgentPresenceStatus, TelephonyPresenceService } from './telephony-presence.service';
import { TelephonyAgentPresenceEvent } from './entities/telephony-agent-presence-event.entity';
import { SalesOrder } from '../sales/sales-order.entity';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class TelephonyService {
  constructor(
    @InjectRepository(TelephonyCall)
    private telephonyCallRepo: Repository<TelephonyCall>,
    @InjectRepository(TelephonyAgentPresenceEvent)
    private presenceEventRepo: Repository<TelephonyAgentPresenceEvent>,
    @InjectRepository(CallTask)
    private callTaskRepo: Repository<CallTask>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Activity)
    private activityRepo: Repository<Activity>,
    @InjectRepository(SalesOrder)
    private salesOrderRepo: Repository<SalesOrder>,
    private readonly customersService: CustomersService,
    private readonly telephonyGateway: TelephonyGateway,
    private readonly presenceService: TelephonyPresenceService,
    private readonly salesService: SalesService,
  ) {}

  private async recordPresenceEventIfChanged(userId: number, status: AgentPresenceStatus, source: string) {
    const prev = this.presenceService.get(userId);
    if (prev?.status === status) return;

    const ev = this.presenceEventRepo.create({
      userId,
      status,
      source: String(source || 'api'),
      occurredAt: new Date(),
    });
    try {
      await this.presenceEventRepo.save(ev);
    } catch {
      // Never block core flows on reporting persistence.
    }
  }

  private extractReportingFields(body: any) {
    const queueName =
      body?.queue_name ?? body?.queueName ?? body?.queue ?? body?.queue_id ?? body?.queueId ?? (body?.queue && body?.queue?.name);
    const trunkName = body?.trunk_name ?? body?.trunkName ?? body?.trunk ?? body?.trunk_id ?? body?.trunkId;

    const waitSecondsRaw = body?.wait_seconds ?? body?.waitSeconds ?? body?.wait_time ?? body?.waitTime;
    const holdSecondsRaw = body?.hold_seconds ?? body?.holdSeconds ?? body?.hold_time ?? body?.holdTime;

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
    };

    const statusRaw = String(body?.status || body?.event || body?.end_reason || body?.disposition || '').toLowerCase();
    const disposition =
      body?.disposition ||
      body?.call_disposition ||
      (statusRaw.includes('abandon') ? 'abandoned' :
        statusRaw.includes('no_answer') ? 'no_answer' :
        statusRaw.includes('busy') ? 'busy' :
        statusRaw.includes('miss') ? 'missed' :
        statusRaw.includes('complete') || statusRaw.includes('ended') ? 'completed' :
        statusRaw.includes('answer') || statusRaw.includes('connect') ? 'answered' :
        statusRaw ? 'failed' : null);

    return {
      queueName: queueName != null ? String(queueName) : null,
      trunkName: trunkName != null ? String(trunkName) : null,
      waitSeconds: toNum(waitSecondsRaw),
      holdSeconds: toNum(holdSecondsRaw),
      disposition: disposition != null ? String(disposition) : null,
    };
  }

  private async tryLogCallAsCrmActivity(call: TelephonyCall, statusRaw?: string) {
    const alreadyLogged = Boolean((call.meta as any)?.crmActivityLogged);
    if (alreadyLogged) return;

    const effectiveAgentUserId =
      call.agentUserId ??
      (call.taskId
        ? (await this.callTaskRepo.findOne({ where: { id: call.taskId } }))?.assigned_agent_id ?? null
        : null);

    if (!effectiveAgentUserId) return;

    const customer = call.customerPhone
      ? await this.customersService.findByPhone(String(call.customerPhone)).catch(() => null)
      : null;
    if (!customer) return;

    const outcome = call.status === TelephonyCallStatus.COMPLETED ? 'completed' : 'failed';
    const descriptionParts = [
      `Telephony call ${outcome}.`,
      call.durationSeconds != null ? `Duration: ${call.durationSeconds}s.` : null,
      call.recordingUrl ? 'Recording attached.' : null,
      statusRaw ? `Provider status: ${statusRaw}.` : null,
    ].filter(Boolean);

    const activity = this.activityRepo.create({
      type: 'call',
      customerId: (customer as any).id,
      userId: effectiveAgentUserId,
      subject: 'Phone call',
      description: descriptionParts.join(' '),
      duration: call.durationSeconds ?? null,
      outcome,
      completedAt: call.endedAt ?? new Date(),
      recordingUrl: call.recordingUrl ?? null,
      metadata: {
        source: 'telephony',
        telephonyCallId: call.id,
        externalCallId: call.externalCallId,
        provider: call.provider,
        direction: call.direction,
        customerPhone: call.customerPhone,
      },
    } as any);

    await this.activityRepo.save(activity as any);

    call.meta = { ...(call.meta || {}), crmActivityLogged: true };
    await this.telephonyCallRepo.save(call);
  }

  async listCalls(params?: {
    status?: string;
    direction?: string;
    agentUserId?: number;
    customerPhone?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const safeLimit = Number.isFinite(params?.limit) ? Math.max(1, Math.min(2000, Number(params?.limit))) : 50;
    const safePage = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const skip = (safePage - 1) * safeLimit;

    const query = this.telephonyCallRepo.createQueryBuilder('c');

    if (params?.status) {
      query.andWhere('c.status = :status', { status: String(params.status) });
    }
    if (params?.direction) {
      query.andWhere('c.direction = :direction', { direction: String(params.direction) });
    }
    if (params?.agentUserId != null && Number.isFinite(params.agentUserId)) {
      query.andWhere('c.agentUserId = :agentUserId', { agentUserId: Number(params.agentUserId) });
    }
    if (params?.customerPhone) {
      query.andWhere('c.customerPhone = :customerPhone', { customerPhone: String(params.customerPhone).trim() });
    }

    if (params?.from) {
      const fromDate = new Date(params.from);
      if (!Number.isNaN(fromDate.getTime())) {
        query.andWhere('c.startedAt >= :from', { from: fromDate });
      }
    }
    if (params?.to) {
      const toDate = new Date(params.to);
      if (!Number.isNaN(toDate.getTime())) {
        query.andWhere('c.startedAt <= :to', { to: toDate });
      }
    }

    query.orderBy('c.startedAt', 'DESC');

    const [items, total] = await query.skip(skip).take(safeLimit).getManyAndCount();
    return { items, total, page: safePage, limit: safeLimit };
  }

  async getCallById(id: number) {
    const call = await this.telephonyCallRepo.findOne({ where: { id } });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async listMyOrderAssignments(userId: number, params?: {
    assignmentType?: string;
    q?: string;
    productName?: string;
    customerType?: string;
    status?: string;
    calledStatus?: string;
    outcome?: string;
    suggestion?: string;
    page?: number;
    limit?: number;
    includeCallLogs?: boolean;
  }) {
    const assignmentType = String(params?.assignmentType || 'order').trim().toLowerCase();
    if (assignmentType === 'incomplete') {
      return this.listMyIncompleteOrderAssignments(userId, params);
    }

    const safeLimit = Number.isFinite(params?.limit) ? Math.max(1, Math.min(2000, Number(params?.limit))) : 50;
    const safePage = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const skip = (safePage - 1) * safeLimit;
    const qb = this.salesOrderRepo.createQueryBuilder('o')
      .select([
        'o.id',
        'o.salesOrderNumber',
        'o.customerId',
        'o.customerName',
        'o.customerPhone',
        'o.shippingAddress',
        'o.status',
        'o.orderSource',
        'o.totalAmount',
        'o.orderDate',
        'o.assignedAt',
        'o.telephonyCalledAt',
        'o.telephonyCallStatus',
        'o.telephonyOutcome',
        'o.telephonySuggestion',
        'o.telephonyNotes',
      ])
      .where('o.assigned_to = :userId', { userId })
      .orderBy('o.assigned_at', 'DESC')
      .addOrderBy('o.created_at', 'DESC');

    if (assignmentType === 'cancelled') {
      qb.andWhere("LOWER(o.status::text) IN ('cancelled', 'returned')");
    } else if (assignmentType === 'rejected') {
      qb.andWhere("LOWER(o.status::text) = 'admin_cancelled'");
    } else {
      qb.andWhere(`
        LOWER(o.status::text) NOT IN (
          'cancelled',
          'returned',
          'admin_cancelled',
          'delivered',
          'completed',
          'partial_delivered'
        )
      `);
    }

    if (params?.q?.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere(`(
        LOWER(COALESCE(o.sales_order_number, '')) LIKE :q
        OR LOWER(COALESCE(o.customer_name, '')) LIKE :q
        OR LOWER(COALESCE(o.customer_phone, '')) LIKE :q
        OR LOWER(COALESCE(o.shipping_address, '')) LIKE :q
      )`, { q });
    }

    if (params?.productName?.trim()) {
      const pName = `%${params.productName.trim().toLowerCase()}%`;
      qb.andWhere(`EXISTS (
        SELECT 1
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
          AND (
            LOWER(COALESCE(oi.product_name, '')) LIKE :pName
            OR LOWER(COALESCE(oi.custom_product_name, '')) LIKE :pName
            OR LOWER(COALESCE(p.name_en, '')) LIKE :pName
            OR LOWER(COALESCE(p.name_bn, '')) LIKE :pName
            OR LOWER(COALESCE(p.sku, '')) LIKE :pName
          )
      )
      OR EXISTS (
        SELECT 1
        FROM sales_order_items soi
        LEFT JOIN products p2 ON p2.id = soi.product_id
        WHERE soi.sales_order_id = o.id
          AND (
            LOWER(COALESCE(soi.product_name, '')) LIKE :pName
            OR LOWER(COALESCE(soi.custom_product_name, '')) LIKE :pName
            OR LOWER(COALESCE(p2.name_en, '')) LIKE :pName
            OR LOWER(COALESCE(p2.name_bn, '')) LIKE :pName
            OR LOWER(COALESCE(p2.sku, '')) LIKE :pName
          )
      )`, { pName });
    }

    if (params?.customerType && params.customerType !== 'all') {
      qb.andWhere(`(
        EXISTS (
          SELECT 1
          FROM customers c
          WHERE c.id = o.customer_id
            AND c.customer_type = :customerType
        )
        OR EXISTS (
          SELECT 1
          FROM customer_tiers ct
          WHERE ct.customer_id = o.customer_id
            AND ct.tier = :customerType
        )
      )`, { customerType: params.customerType });
    }

    if (params?.status && params.status !== 'all') {
      const statusAliases: Record<string, string> = {
        on_hold: 'hold',
        rejected: 'admin_cancelled',
      };
      const status = statusAliases[String(params.status).trim()] || String(params.status).trim();
      qb.andWhere('o.status = :status', { status });
    }

    const calledStatus = String(params?.calledStatus || '').trim();
    if (calledStatus && calledStatus !== 'all') {
      switch (calledStatus) {
        case 'called':
        case 'called_today':
          qb.andWhere("o.telephony_called_at >= CURRENT_DATE AND o.telephony_called_at < CURRENT_DATE + INTERVAL '1 day'");
          break;
        case 'called_1week':
          qb.andWhere("o.telephony_called_at >= CURRENT_DATE - INTERVAL '13 days' AND o.telephony_called_at < CURRENT_DATE - INTERVAL '6 days'");
          break;
        case 'called_2weeks':
          qb.andWhere("o.telephony_called_at >= CURRENT_DATE - INTERVAL '20 days' AND o.telephony_called_at < CURRENT_DATE - INTERVAL '13 days'");
          break;
        case 'called_3weeks':
          qb.andWhere("o.telephony_called_at >= CURRENT_DATE - INTERVAL '27 days' AND o.telephony_called_at < CURRENT_DATE - INTERVAL '20 days'");
          break;
        case 'called_1month':
          qb.andWhere("o.telephony_called_at >= CURRENT_DATE - INTERVAL '59 days' AND o.telephony_called_at < CURRENT_DATE - INTERVAL '27 days'");
          break;
        case 'called_2months':
          qb.andWhere("o.telephony_called_at >= CURRENT_DATE - INTERVAL '89 days' AND o.telephony_called_at < CURRENT_DATE - INTERVAL '59 days'");
          break;
        case 'called_3months_plus':
          qb.andWhere("o.telephony_called_at < CURRENT_DATE - INTERVAL '89 days'");
          break;
        case 'not_called':
        case 'not_called_today':
          qb.andWhere("(o.telephony_called_at IS NULL OR o.telephony_called_at < CURRENT_DATE)");
          break;
        case 'not_called_week':
          qb.andWhere("(o.telephony_called_at IS NULL OR o.telephony_called_at < CURRENT_DATE - INTERVAL '6 days')");
          break;
        case 'never':
          qb.andWhere('o.telephony_called_at IS NULL');
          break;
      }
    }

    if (params?.outcome && params.outcome !== 'all') {
      qb.andWhere('o.telephony_outcome = :outcome', { outcome: params.outcome });
    }

    if (params?.suggestion && params.suggestion !== 'all') {
      qb.andWhere('o.telephony_suggestion = :suggestion', { suggestion: params.suggestion });
    }

    const [orders, total] = await qb.skip(skip).take(safeLimit).getManyAndCount();
    const itemsByOrderId = await this.fetchOrderItems(orders.map((order) => order.id));
    const includeCallLogs = params?.includeCallLogs === true;
    const latestLogsByOrderId = includeCallLogs
      ? await this.fetchLatestAssignmentCallLogs('sales_order', orders.map((order) => order.id))
      : new Map<number, any>();
    const orderCountsByPhone = await this.fetchCustomerTotalOrdersByPhone(orders.map((order) => order.customerPhone));

    return {
      data: orders.map((order) => {
        const status = String(order.status || '').toLowerCase();
        const outcome = String(order.telephonyOutcome || '').toLowerCase();
        const assignmentWorkType =
          status === 'admin_cancelled'
            ? 'rejected_recovery'
            : status === 'processing' && ['no_answer', 'line_busy', 'number_switched_off', 'busy', 'unreachable'].includes(outcome)
              ? 'unreachable_followup'
              : 'primary_leads';

        return {
          id: order.id,
          recordType: 'sales_order',
          assignmentWorkType,
          canHandoffNoAnswer: assignmentWorkType === 'primary_leads' && status === 'processing',
          salesOrderNumber: order.salesOrderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          shippingAddress: order.shippingAddress,
          status: order.status,
          orderSource: order.orderSource,
          customerTotalOrders: orderCountsByPhone.get(this.normalizeCustomerPhone(order.customerPhone)) || 0,
          totalAmount: Number(order.totalAmount || 0),
          orderDate: order.orderDate,
          assignedAt: order.assignedAt,
          calledAt: includeCallLogs ? order.telephonyCalledAt : null,
          callStatus: includeCallLogs ? (order.telephonyCallStatus || (order.telephonyCalledAt ? 'called' : 'not_called')) : null,
          outcome: includeCallLogs ? order.telephonyOutcome : null,
          suggestion: includeCallLogs ? order.telephonySuggestion : null,
          notes: includeCallLogs ? order.telephonyNotes : null,
          lastCallLog: latestLogsByOrderId.get(order.id) || null,
          items: itemsByOrderId.get(order.id) || [],
        };
      }),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private parseIncompleteOrderItems(cartData: any): Array<{ productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number }> {
    const source = Array.isArray(cartData)
      ? cartData
      : Array.isArray(cartData?.items)
        ? cartData.items
        : Array.isArray(cartData?.cart)
          ? cartData.cart
          : [];
    return source.map((item: any) => ({
      productName: item?.productName || item?.product_name || item?.name || item?.title || 'Product',
      productNameBn: item?.productNameBn || item?.name_bn || null,
      variantName: item?.variantName || item?.variant_name || null,
      quantity: Number(item?.quantity || item?.qty || 1) || 1,
    }));
  }

  private async listMyIncompleteOrderAssignments(userId: number, params?: {
    q?: string;
    productName?: string;
    customerType?: string;
    status?: string;
    calledStatus?: string;
    outcome?: string;
    suggestion?: string;
    page?: number;
    limit?: number;
    includeCallLogs?: boolean;
  }) {
    const safeLimit = Number.isFinite(params?.limit) ? Math.max(1, Math.min(2000, Number(params?.limit))) : 50;
    const safePage = Number.isFinite(params?.page) ? Math.max(1, Number(params?.page)) : 1;
    const offset = (safePage - 1) * safeLimit;
    const where: string[] = ['io.assigned_to = $1'];
    const values: any[] = [userId];

    const addValue = (value: any) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (params?.q?.trim()) {
      const token = addValue(`%${params.q.trim().toLowerCase()}%`);
      where.push(`(
        LOWER(COALESCE(io.name, '')) LIKE ${token}
        OR LOWER(COALESCE(io.phone, '')) LIKE ${token}
        OR LOWER(COALESCE(io.email, '')) LIKE ${token}
        OR LOWER(COALESCE(io.address, '')) LIKE ${token}
        OR CAST(io.id AS text) LIKE ${token}
      )`);
    }

    if (params?.productName?.trim()) {
      const token = addValue(`%${params.productName.trim().toLowerCase()}%`);
      where.push(`LOWER(COALESCE(io.cart_data::text, '')) LIKE ${token}`);
    }

    if (params?.status && params.status !== 'all') {
      if (params.status === 'completed') where.push('io.converted_to_order = TRUE');
      else if (params.status === 'processing') where.push('io.converted_to_order = FALSE');
    }

    const calledStatus = String(params?.calledStatus || '').trim();
    if (calledStatus && calledStatus !== 'all') {
      switch (calledStatus) {
        case 'called':
        case 'called_today':
          where.push("io.telephony_called_at >= CURRENT_DATE AND io.telephony_called_at < CURRENT_DATE + INTERVAL '1 day'");
          break;
        case 'called_1week':
          where.push("io.telephony_called_at >= CURRENT_DATE - INTERVAL '13 days' AND io.telephony_called_at < CURRENT_DATE - INTERVAL '6 days'");
          break;
        case 'called_2weeks':
          where.push("io.telephony_called_at >= CURRENT_DATE - INTERVAL '20 days' AND io.telephony_called_at < CURRENT_DATE - INTERVAL '13 days'");
          break;
        case 'called_3weeks':
          where.push("io.telephony_called_at >= CURRENT_DATE - INTERVAL '27 days' AND io.telephony_called_at < CURRENT_DATE - INTERVAL '20 days'");
          break;
        case 'called_1month':
          where.push("io.telephony_called_at >= CURRENT_DATE - INTERVAL '59 days' AND io.telephony_called_at < CURRENT_DATE - INTERVAL '27 days'");
          break;
        case 'called_2months':
          where.push("io.telephony_called_at >= CURRENT_DATE - INTERVAL '89 days' AND io.telephony_called_at < CURRENT_DATE - INTERVAL '59 days'");
          break;
        case 'called_3months_plus':
          where.push("io.telephony_called_at < CURRENT_DATE - INTERVAL '89 days'");
          break;
        case 'not_called':
        case 'not_called_today':
          where.push("(io.telephony_called_at IS NULL OR io.telephony_called_at < CURRENT_DATE)");
          break;
        case 'not_called_week':
          where.push("(io.telephony_called_at IS NULL OR io.telephony_called_at < CURRENT_DATE - INTERVAL '6 days')");
          break;
        case 'never':
          where.push('io.telephony_called_at IS NULL');
          break;
      }
    }

    if (params?.outcome && params.outcome !== 'all') {
      where.push(`io.telephony_outcome = ${addValue(params.outcome)}`);
    }
    if (params?.suggestion && params.suggestion !== 'all') {
      where.push(`io.telephony_suggestion = ${addValue(params.suggestion)}`);
    }

    const whereSql = where.join(' AND ');
    const countRows: Array<{ count: string }> = await this.salesOrderRepo.manager.query(
      `SELECT COUNT(*)::text AS count FROM incomplete_orders io WHERE ${whereSql}`,
      values,
    );
    const rows = await this.salesOrderRepo.manager.query(
      `SELECT io.*
       FROM incomplete_orders io
       WHERE ${whereSql}
       ORDER BY io.assigned_at DESC NULLS LAST, io.created_at DESC
       LIMIT ${addValue(safeLimit)} OFFSET ${addValue(offset)}`,
      values,
    );

    const total = Number(countRows[0]?.count || 0);
    const includeCallLogs = params?.includeCallLogs === true;
    const latestLogsByOrderId = includeCallLogs
      ? await this.fetchLatestAssignmentCallLogs('incomplete_order', rows.map((row: any) => Number(row.id)))
      : new Map<number, any>();
    const orderCountsByPhone = await this.fetchCustomerTotalOrdersByPhone(rows.map((row: any) => row.phone));
    return {
      data: rows.map((row: any) => ({
        id: Number(row.id),
        recordType: 'incomplete_order',
        salesOrderNumber: `INC-${row.id}`,
        customerName: row.name,
        customerPhone: row.phone,
        shippingAddress: row.address,
        status: row.converted_to_order ? 'completed' : 'processing',
        orderSource: row.source || 'incomplete',
        customerTotalOrders: orderCountsByPhone.get(this.normalizeCustomerPhone(row.phone)) || 0,
        totalAmount: Number(row.total_amount || 0),
        orderDate: row.created_at,
        assignedAt: row.assigned_at,
        calledAt: includeCallLogs ? row.telephony_called_at : null,
        callStatus: includeCallLogs ? (row.telephony_call_status || (row.telephony_called_at ? 'called' : 'not_called')) : null,
        outcome: includeCallLogs ? row.telephony_outcome : null,
        suggestion: includeCallLogs ? row.telephony_suggestion : null,
        notes: includeCallLogs ? (row.telephony_notes || row.note) : null,
        lastCallLog: latestLogsByOrderId.get(Number(row.id)) || null,
        items: this.parseIncompleteOrderItems(row.cart_data),
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private async fetchOrderItems(orderIds: number[]): Promise<Map<number, Array<{ productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number }>>> {
    const map = new Map<number, Array<{ productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number }>>();
    if (orderIds.length === 0) return map;

    const rows: Array<{
      order_id: number;
      product_name: string | null;
      custom_product_name: string | null;
      product_id: number | null;
      quantity: number;
      variant_name: string | null;
    }> = await this.salesOrderRepo.manager.query(
      `SELECT oi.order_id, oi.product_name, oi.custom_product_name, oi.product_id, oi.quantity, oi.variant_name
       FROM order_items oi
       WHERE oi.order_id = ANY($1)
       UNION ALL
       SELECT soi.sales_order_id AS order_id, soi.product_name, soi.custom_product_name, soi.product_id, soi.quantity, NULL AS variant_name
       FROM sales_order_items soi
       WHERE soi.sales_order_id = ANY($1)
         AND soi.sales_order_id NOT IN (SELECT DISTINCT oi2.order_id FROM order_items oi2 WHERE oi2.order_id = ANY($1))`,
      [orderIds],
    );

    const productIds = [...new Set(rows.map((row) => Number(row.product_id)).filter((id) => Number.isFinite(id) && id > 0))];
    const productRows: Array<{ id: number; name_en: string | null; name_bn: string | null }> = productIds.length
      ? await this.salesOrderRepo.manager.query(`SELECT id, name_en, name_bn FROM products WHERE id = ANY($1)`, [productIds])
      : [];
    const products = new Map(productRows.map((row) => [Number(row.id), row]));

    for (const row of rows) {
      const product = row.product_id ? products.get(Number(row.product_id)) : undefined;
      const customName = row.custom_product_name || null;
      const productName = customName || row.product_name || product?.name_en || 'Unknown Product';
      const arr = map.get(Number(row.order_id)) || [];
      arr.push({
        productName,
        productNameBn: customName ? null : product?.name_bn || null,
        variantName: row.variant_name || null,
        quantity: Number(row.quantity) || 0,
      });
      map.set(Number(row.order_id), arr);
    }

    return map;
  }

  private async getCallerDisplayName(userId: number): Promise<string> {
    const rows = await this.salesOrderRepo.manager.query(
      `SELECT name, last_name, email FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    const user = rows?.[0];
    const fullName = [user?.name, user?.last_name].filter(Boolean).join(' ').trim();
    return fullName || user?.email || `User #${userId}`;
  }

  private normalizeCustomerPhone(phone?: string | null): string {
    return String(phone || '').replace(/^\+88/, '').replace(/\D/g, '').trim();
  }

  private async fetchCustomerTotalOrdersByPhone(phones: Array<string | null | undefined>) {
    const map = new Map<string, number>();
    const phoneSet = new Set(
      phones
        .map((phone) => this.normalizeCustomerPhone(phone))
        .filter(Boolean),
    );
    if (phoneSet.size === 0) return map;

    const rows: Array<{ phone: string; cnt: string }> = await this.salesOrderRepo.manager.query(
      `SELECT regexp_replace(REPLACE(customer_phone, '+88', ''), '\\D', '', 'g') AS phone, COUNT(*)::text AS cnt
       FROM sales_orders
       WHERE regexp_replace(REPLACE(customer_phone, '+88', ''), '\\D', '', 'g') = ANY($1)
       GROUP BY regexp_replace(REPLACE(customer_phone, '+88', ''), '\\D', '', 'g')`,
      [Array.from(phoneSet)],
    );
    for (const row of rows || []) {
      map.set(row.phone, parseInt(row.cnt, 10) || 0);
    }
    return map;
  }

  private async recordAssignmentCallLog(params: {
    recordType: 'sales_order' | 'incomplete_order';
    assignmentType?: string;
    orderId: number;
    callerUserId: number;
    outcome?: string | null;
    suggestion?: string | null;
    notes?: string | null;
  }) {
    const notes = String(params.notes || '').trim()
      || (params.outcome ? `Call outcome: ${String(params.outcome).replace(/_/g, ' ')}` : '')
      || (params.suggestion ? `Product suggestion: ${params.suggestion}` : '')
      || 'Call logged.';
    const callerName = await this.getCallerDisplayName(params.callerUserId);
    const rows = await this.salesOrderRepo.manager.query(
      `INSERT INTO telephony_assignment_call_logs
        (record_type, assignment_type, order_id, caller_user_id, caller_name, outcome, suggestion, notes, called_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, record_type, assignment_type, order_id, caller_user_id, caller_name, outcome, suggestion, notes, called_at, created_at`,
      [
        params.recordType,
        params.assignmentType || null,
        params.orderId,
        params.callerUserId,
        callerName,
        params.outcome || null,
        params.suggestion || null,
        notes,
      ],
    );
    return rows?.[0] || null;
  }

  private async recordSalesOrderCallActivity(params: {
    orderId: number;
    callerUserId: number;
    callerName: string;
    outcome?: string | null;
    suggestion?: string | null;
    notes?: string | null;
  }) {
    const notes = String(params.notes || '').trim()
      || (params.outcome ? `Call outcome: ${String(params.outcome).replace(/_/g, ' ')}` : '')
      || (params.suggestion ? `Product suggestion: ${params.suggestion}` : '')
      || 'Call logged.';

    await this.salesOrderRepo.manager.query(
      `INSERT INTO order_activity_logs
        (order_id, action_type, action_description, old_value, new_value, performed_by, performed_by_name, created_at)
       VALUES ($1, $2, $3, NULL, $4::jsonb, $5, $6, NOW())`,
      [
        params.orderId,
        'telephony_call_logged',
        `Telephony call logged${params.outcome ? ` (${params.outcome.replace(/_/g, ' ')})` : ''}.`,
        JSON.stringify({
          outcome: params.outcome || null,
          suggestion: params.suggestion || null,
          notes,
        }),
        params.callerUserId,
        params.callerName,
      ],
    );
  }

  private resolveAssignmentCallerName(row: any): string {
    const storedName = String(row?.caller_name || '').trim();
    const userName = [row?.user_name, row?.user_last_name].filter(Boolean).join(' ').trim();
    const email = String(row?.user_email || '').trim();
    const activityName = String(row?.performed_by_name || '').trim();
    return storedName || userName || email || activityName || 'Unknown caller';
  }

  private mapAssignmentCallLog(row: any) {
    if (!row) return null;
    return {
      id: Number(row.id),
      recordType: row.record_type,
      assignmentType: row.assignment_type,
      orderId: Number(row.order_id),
      callerUserId: row.caller_user_id != null ? Number(row.caller_user_id) : null,
      callerName: this.resolveAssignmentCallerName(row),
      outcome: row.outcome,
      suggestion: row.suggestion,
      notes: row.notes,
      calledAt: row.called_at,
      createdAt: row.created_at,
    };
  }

  private async fetchLatestAssignmentCallLogs(recordType: 'sales_order' | 'incomplete_order', orderIds: number[]) {
    const map = new Map<number, any>();
    if (orderIds.length === 0) return map;
    const rows = await this.salesOrderRepo.manager.query(
      `SELECT DISTINCT ON (record_type, order_id)
          l.id,
          l.record_type,
          l.assignment_type,
          l.order_id,
          l.caller_user_id,
          l.caller_name,
          u.name AS user_name,
          u.last_name AS user_last_name,
          u.email AS user_email,
          l.outcome,
          l.suggestion,
          l.notes,
          l.called_at,
          l.created_at
       FROM telephony_assignment_call_logs l
       LEFT JOIN users u ON u.id = l.caller_user_id
       WHERE l.record_type = $1
         AND l.order_id = ANY($2::int[])
       ORDER BY l.record_type, l.order_id, l.called_at DESC, l.id DESC`,
      [recordType, orderIds],
    );
    for (const row of rows || []) {
      map.set(Number(row.order_id), this.mapAssignmentCallLog(row));
    }
    if (recordType === 'sales_order') {
      await this.fillLatestSalesOrderCallActivityFallbacks(map, orderIds);
    }
    return map;
  }

  private async fillLatestSalesOrderCallActivityFallbacks(map: Map<number, any>, orderIds: number[]) {
    const missingOrderIds = orderIds.filter((orderId) => !map.has(Number(orderId)));
    if (missingOrderIds.length === 0) return;

    const rows = await this.salesOrderRepo.manager.query(
      `SELECT DISTINCT ON (order_id)
          id,
          'sales_order' AS record_type,
          NULL AS assignment_type,
          order_id,
          performed_by AS caller_user_id,
          performed_by_name AS caller_name,
          NULL AS outcome,
          NULL AS suggestion,
          COALESCE(new_value->>'notes', action_description) AS notes,
          created_at AS called_at,
          created_at
       FROM order_activity_logs
       WHERE order_id = ANY($1::int[])
         AND action_type = 'telephony_call_logged'
       ORDER BY order_id, created_at DESC, id DESC`,
      [missingOrderIds],
    );

    for (const row of rows || []) {
      if (!map.has(Number(row.order_id))) {
        map.set(Number(row.order_id), this.mapAssignmentCallLog(row));
      }
    }

    const stillMissingOrderIds = orderIds.filter((orderId) => !map.has(Number(orderId)));
    if (stillMissingOrderIds.length === 0) return;

    const telephonyRows = await this.salesOrderRepo.manager.query(
      `SELECT
          id,
          'sales_order' AS record_type,
          NULL AS assignment_type,
          id AS order_id,
          NULL AS caller_user_id,
          NULL AS caller_name,
          telephony_outcome AS outcome,
          telephony_suggestion AS suggestion,
          COALESCE(NULLIF(telephony_notes, ''), CONCAT('Call outcome: ', COALESCE(telephony_outcome, 'called'))) AS notes,
          telephony_called_at AS called_at,
          telephony_called_at AS created_at
       FROM sales_orders
       WHERE id = ANY($1::int[])
         AND telephony_called_at IS NOT NULL
       ORDER BY telephony_called_at DESC, id DESC`,
      [stillMissingOrderIds],
    );

    for (const row of telephonyRows || []) {
      if (!map.has(Number(row.order_id))) {
        map.set(Number(row.order_id), this.mapAssignmentCallLog(row));
      }
    }
  }

  async listOrderAssignmentCallHistory(userId: number, orderId: number, assignmentType?: string) {
    const normalizedType = String(assignmentType || 'order').trim().toLowerCase();
    const recordType: 'sales_order' | 'incomplete_order' = normalizedType === 'incomplete' ? 'incomplete_order' : 'sales_order';

    const ownerRows = recordType === 'incomplete_order'
      ? await this.salesOrderRepo.manager.query(
          `SELECT id FROM incomplete_orders WHERE id = $1 AND assigned_to = $2 LIMIT 1`,
          [orderId, userId],
        )
      : await this.salesOrderRepo.manager.query(
          `SELECT id FROM sales_orders WHERE id = $1 AND assigned_to = $2 LIMIT 1`,
          [orderId, userId],
        );

    if (!ownerRows?.length) throw new NotFoundException('Assigned order not found');

    const rows = await this.salesOrderRepo.manager.query(
      `SELECT
          l.id,
          l.record_type,
          l.assignment_type,
          l.order_id,
          l.caller_user_id,
          l.caller_name,
          u.name AS user_name,
          u.last_name AS user_last_name,
          u.email AS user_email,
          l.outcome,
          l.suggestion,
          l.notes,
          l.called_at,
          l.created_at
       FROM telephony_assignment_call_logs l
       LEFT JOIN users u ON u.id = l.caller_user_id
       WHERE l.record_type = $1
         AND l.order_id = $2
       ORDER BY l.called_at DESC, l.id DESC`,
      [recordType, orderId],
    );

    if (recordType === 'incomplete_order' || rows?.length) {
      if (recordType === 'incomplete_order' && !rows?.length) {
        const incompleteFallbackRows = await this.salesOrderRepo.manager.query(
          `SELECT
              id,
              'incomplete_order' AS record_type,
              'incomplete' AS assignment_type,
              id AS order_id,
              NULL AS caller_user_id,
              NULL AS caller_name,
              telephony_outcome AS outcome,
              telephony_suggestion AS suggestion,
              COALESCE(NULLIF(telephony_notes, ''), CONCAT('Call outcome: ', COALESCE(telephony_outcome, 'called'))) AS notes,
              telephony_called_at AS called_at,
              telephony_called_at AS created_at
           FROM incomplete_orders
           WHERE id = $1
             AND telephony_called_at IS NOT NULL`,
          [orderId],
        );
        return (incompleteFallbackRows || []).map((row: any) => this.mapAssignmentCallLog(row));
      }
      return (rows || []).map((row: any) => this.mapAssignmentCallLog(row));
    }

    const activityRows = await this.salesOrderRepo.manager.query(
      `SELECT
          id,
          'sales_order' AS record_type,
          NULL AS assignment_type,
          order_id,
          performed_by AS caller_user_id,
          performed_by_name AS caller_name,
          NULL AS outcome,
          NULL AS suggestion,
          COALESCE(new_value->>'notes', action_description) AS notes,
          created_at AS called_at,
          created_at
       FROM order_activity_logs
       WHERE order_id = $1
         AND action_type = 'telephony_call_logged'
       ORDER BY created_at DESC, id DESC`,
      [orderId],
    );

    if (activityRows?.length) {
      return (activityRows || []).map((row: any) => this.mapAssignmentCallLog(row));
    }

    const telephonyRows = await this.salesOrderRepo.manager.query(
      `SELECT
          id,
          'sales_order' AS record_type,
          NULL AS assignment_type,
          id AS order_id,
          NULL AS caller_user_id,
          NULL AS caller_name,
          telephony_outcome AS outcome,
          telephony_suggestion AS suggestion,
          COALESCE(NULLIF(telephony_notes, ''), CONCAT('Call outcome: ', COALESCE(telephony_outcome, 'called'))) AS notes,
          telephony_called_at AS called_at,
          telephony_called_at AS created_at
       FROM sales_orders
       WHERE id = $1
         AND telephony_called_at IS NOT NULL`,
      [orderId],
    );

    return (telephonyRows || []).map((row: any) => this.mapAssignmentCallLog(row));
  }

  async updateOrderAssignmentOutcome(userId: number, orderId: number, body: {
    assignmentType?: string;
    outcome?: string;
    suggestion?: string;
    notes?: string;
  }) {
    const normalizedOutcome = String(body.outcome || '').trim().toLowerCase();
    if (String(body.assignmentType || '').toLowerCase() === 'incomplete') {
      const result = await this.salesOrderRepo.manager.query(
        `UPDATE incomplete_orders
         SET telephony_called_at = NOW(),
             telephony_call_status = 'called',
             telephony_outcome = $3,
             telephony_suggestion = $4,
             telephony_notes = $5,
             contacted_done = TRUE,
             updated_at = NOW()
         WHERE id = $1
           AND assigned_to = $2`,
        [orderId, userId, body.outcome || null, body.suggestion || null, body.notes || null],
      );
      if (!result?.[1]) throw new NotFoundException('Assigned incomplete order not found');
      await this.recordAssignmentCallLog({
        recordType: 'incomplete_order',
        assignmentType: 'incomplete',
        orderId,
        callerUserId: userId,
        outcome: body.outcome || null,
        suggestion: body.suggestion || null,
        notes: body.notes || null,
      });
      return { success: true, orderId };
    }

    const shouldMoveToUnreachableQueue = ['no_answer', 'line_busy', 'number_switched_off', 'busy', 'unreachable'].includes(normalizedOutcome);
    let movedToUnreachableQueue = false;
    let result: any;

    if (shouldMoveToUnreachableQueue) {
      result = await this.salesOrderRepo.manager.query(
        `UPDATE sales_orders
         SET telephony_called_at = NOW(),
             telephony_call_status = 'called',
             telephony_outcome = $3,
             telephony_suggestion = $4,
             telephony_notes = $5,
             assigned_to = NULL,
             assigned_by = NULL,
             assigned_at = NULL,
             updated_at = NOW()
         WHERE id = $1
           AND assigned_to = $2
           AND LOWER(status::text) = 'processing'`,
        [orderId, userId, body.outcome || null, body.suggestion || null, body.notes || null],
      );
      movedToUnreachableQueue = Boolean(result?.[1]);
    }

    if (!movedToUnreachableQueue) {
      result = await this.salesOrderRepo.manager.query(
        `UPDATE sales_orders
         SET telephony_called_at = NOW(),
             telephony_call_status = 'called',
             telephony_outcome = $3,
             telephony_suggestion = $4,
             telephony_notes = $5,
             updated_at = NOW()
         WHERE id = $1
           AND assigned_to = $2`,
        [orderId, userId, body.outcome || null, body.suggestion || null, body.notes || null],
      );
    }

    if (!result?.[1]) throw new NotFoundException('Assigned order not found');

    const callLog = await this.recordAssignmentCallLog({
      recordType: 'sales_order',
      assignmentType: body.assignmentType || 'order',
      orderId,
      callerUserId: userId,
      outcome: body.outcome || null,
      suggestion: body.suggestion || null,
      notes: body.notes || null,
    });
    await this.recordSalesOrderCallActivity({
      orderId,
      callerUserId: userId,
      callerName: callLog?.caller_name || await this.getCallerDisplayName(userId),
      outcome: body.outcome || null,
      suggestion: body.suggestion || null,
      notes: body.notes || null,
    });

    if (movedToUnreachableQueue) {
      await this.salesService.runAutomaticAssignmentQueue({
        orderId,
        limit: 50,
        reason: 'unreachable_followup_handoff',
      });
    }

    return { success: true, orderId };
  }

  async handoffUnreachableOrderAssignment(userId: number, orderId: number, body: { outcome?: string; notes?: string } = {}) {
    const normalizedOutcome = String(body.outcome || 'no_answer').trim().toLowerCase();
    const outcome = ['line_busy', 'number_switched_off', 'busy', 'unreachable'].includes(normalizedOutcome)
      ? normalizedOutcome
      : 'no_answer';
    const notes = String(body.notes || '').trim()
      || (outcome === 'number_switched_off' || outcome === 'unreachable'
        ? 'Customer number was unavailable. Passed to unreachable follow-up queue.'
        : outcome === 'line_busy' || outcome === 'busy'
          ? 'Customer line was busy. Passed to unreachable follow-up queue.'
          : 'Customer did not receive the call. Passed to unreachable follow-up queue.');

    const result = await this.salesOrderRepo.manager.query(
      `UPDATE sales_orders so
       SET telephony_called_at = NOW(),
           telephony_call_status = 'called',
           telephony_outcome = $3,
           telephony_notes = $4,
           assigned_to = NULL,
           assigned_by = NULL,
           assigned_at = NULL,
           updated_at = NOW()
       WHERE so.id = $1
         AND so.assigned_to = $2
         AND LOWER(so.status::text) = 'processing'
         AND EXISTS (
           SELECT 1
           FROM users u
           INNER JOIN automatic_order_assignment_team_work_types twt
             ON twt.team_id = u.team_id
            AND twt.team_leader_id = u.team_leader_id
            AND twt.work_type = 'primary_leads'
           WHERE u.id = so.assigned_to
         )`,
      [orderId, userId, outcome, notes],
    );

    if (!result?.[1]) {
      throw new NotFoundException('Processing primary-lead assignment not found');
    }

    const callLog = await this.recordAssignmentCallLog({
      recordType: 'sales_order',
      assignmentType: 'order',
      orderId,
      callerUserId: userId,
      outcome,
      suggestion: null,
      notes,
    });
    await this.recordSalesOrderCallActivity({
      orderId,
      callerUserId: userId,
      callerName: callLog?.caller_name || await this.getCallerDisplayName(userId),
      outcome,
      suggestion: null,
      notes,
    });

    const assignmentRun = await this.salesService.runAutomaticAssignmentQueue({
      orderId,
      limit: 50,
      reason: 'unreachable_followup_handoff',
    });

    return { success: true, orderId, outcome, assignmentRun };
  }

  private setPresence(userId: number, status: AgentPresenceStatus, source: string = 'api') {
    void this.recordPresenceEventIfChanged(userId, status, source);
    const record = this.presenceService.set(userId, status);
    this.telephonyGateway.emitAgentPresence(record);
    return record;
  }

  async setAgentPresence(userId: number, status: AgentPresenceStatus) {
    const safe: AgentPresenceStatus = status === 'online' || status === 'on_call' || status === 'break' || status === 'offline'
      ? status
      : 'online';
    return this.setPresence(Number(userId), safe, 'api');
  }

  async getAgentPresence(userId: number) {
    return this.presenceService.get(Number(userId));
  }

  async listAgentPresence(params?: { teamId?: number }) {
    // Optionally filter by teamId if present (User.teamId exists).
    const all = this.presenceService.list();
    if (params?.teamId == null) return all;
    const users = await this.userRepo.find({ where: { teamId: Number(params.teamId) } as any });
    const allowed = new Set(users.map((u) => u.id));
    return all.filter((p) => allowed.has(p.userId));
  }

  private getProvider(): string {
    return process.env.TELEPHONY_PROVIDER || 'bracknet';
  }

  private getBracknetConfig() {
    return {
      baseUrl: process.env.BRACKNET_API_BASE_URL || '',
      apiKey: process.env.BRACKNET_API_KEY || '',
      webhookSecret: process.env.BRACKNET_WEBHOOK_SECRET || '',
    };
  }

  async initiateCall(params: { taskId: number; agentUserId?: number; agentPhone?: string; customerPhone?: string }) {
    const task = await this.callTaskRepo.findOne({ where: { id: params.taskId } });
    if (!task) throw new NotFoundException('Call task not found');

    const customerPhone = String(params.customerPhone || task.customer_id || '').trim();
    if (!customerPhone) throw new BadRequestException('Task has no customer phone');

    let agentPhone = params.agentPhone?.trim() || '';
    if (!agentPhone && params.agentUserId) {
      const agent = await this.userRepo.findOne({ where: { id: params.agentUserId } });
      agentPhone = agent?.phone?.trim() || '';
    }

    if (!agentPhone) {
      // In many call-center setups, agent uses an extension/SIP user.
      // We allow initiating call without agentPhone, provider may map by agentUserId.
      agentPhone = '';
    }

    const provider = this.getProvider();

    const call = this.telephonyCallRepo.create({
      provider,
      taskId: task.id,
      agentUserId: params.agentUserId ?? null,
      agentPhone: agentPhone || null,
      customerPhone,
      status: TelephonyCallStatus.INITIATED,
      meta: {
        reason: task.call_reason,
        priority: task.priority,
      },
    });

    const saved = await this.telephonyCallRepo.save(call);

    // Agent is now effectively engaged
    if (saved.agentUserId) {
      this.setPresence(saved.agentUserId, 'on_call');
    }

    // Mark task in-progress (telephony initiation is an explicit action)
    if (task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.IN_PROGRESS;
      await this.callTaskRepo.save(task);
    }

    // Provider call (best-effort). If not configured, we return a "mock" response.
    if (provider === 'bracknet') {
      const cfg = this.getBracknetConfig();
      if (!cfg.baseUrl || !cfg.apiKey) {
        return {
          telephonyCallId: saved.id,
          provider,
          mode: 'mock',
          message: 'BRACKNET_API_BASE_URL/BRACKNET_API_KEY not set. Call initiation skipped.',
        };
      }

      // NOTE: Bracknet’s exact API fields may differ. This is an adapter stub.
      // Update endpoint/path/body according to Bracknet documentation.
      const res = await axios.post(
        `${cfg.baseUrl.replace(/\/$/, '')}/calls/initiate`,
        {
          agent: agentPhone || params.agentUserId,
          customerPhone,
          reference: { taskId: task.id, telephonyCallId: saved.id },
        },
        {
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const externalCallId = res?.data?.callId || res?.data?.id || null;
      if (externalCallId) {
        saved.externalCallId = String(externalCallId);
        await this.telephonyCallRepo.save(saved);
      }

      return {
        telephonyCallId: saved.id,
        provider,
        externalCallId: saved.externalCallId,
        mode: 'live',
      };
    }

    return { telephonyCallId: saved.id, provider, mode: 'mock', message: 'Unknown provider adapter' };
  }

  // Bracknet contract-compatible entrypoint (CRM -> Bracknet) using explicit customer number.
  async bracknetStartCall(params: {
    agent_extension?: string;
    agent_id?: string;
    customer_number: string;
    caller_id?: string;
    call_type?: string;
    crm_call_id?: string;
    taskId?: number;
    agentUserId?: number;
  }) {
    const customerPhone = String(params.customer_number || '').trim();
    if (!customerPhone) throw new BadRequestException('Missing customer_number');

    const provider = 'bracknet';
    const call = this.telephonyCallRepo.create({
      provider,
      taskId: params.taskId ?? null,
      agentUserId: params.agentUserId ?? null,
      agentPhone: params.agent_extension ? String(params.agent_extension) : null,
      customerPhone,
      direction: 'outbound',
      status: TelephonyCallStatus.INITIATED,
      meta: {
        contract: 'bracknet-v1',
        agent_extension: params.agent_extension,
        agent_id: params.agent_id,
        caller_id: params.caller_id,
        call_type: params.call_type,
        crm_call_id: params.crm_call_id,
      },
    });

    const saved = await this.telephonyCallRepo.save(call);

    // If linked to a task, mark it in-progress
    if (params.taskId) {
      const task = await this.callTaskRepo.findOne({ where: { id: params.taskId } });
      if (task && task.status === TaskStatus.PENDING) {
        task.status = TaskStatus.IN_PROGRESS;
        await this.callTaskRepo.save(task);
      }
    }

    const cfg = this.getBracknetConfig();
    if (!cfg.baseUrl || !cfg.apiKey) {
      return {
        status: 'success',
        bracknet_call_id: null,
        crm_call_id: params.crm_call_id || String(saved.id),
        message: 'Mock mode: BRACKNET_API_BASE_URL/BRACKNET_API_KEY not set. Call initiation skipped.',
        telephonyCallId: saved.id,
      };
    }

    // Adapter stub: align with Bracknet actual API.
    const res = await axios.post(
      `${cfg.baseUrl.replace(/\/$/, '')}/api/call/start`,
      {
        agent_extension: params.agent_extension,
        agent_id: params.agent_id,
        customer_number: customerPhone,
        caller_id: params.caller_id || 'TrustCart',
        call_type: params.call_type || 'outbound',
        crm_call_id: params.crm_call_id || `CRM-CALL-${saved.id}`,
      },
      {
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );

    const externalCallId = res?.data?.bracknet_call_id || res?.data?.callId || res?.data?.id || null;
    if (externalCallId) {
      saved.externalCallId = String(externalCallId);
      await this.telephonyCallRepo.save(saved);
    }

    return {
      status: 'success',
      bracknet_call_id: saved.externalCallId,
      message: 'Call initiated',
      telephonyCallId: saved.id,
    };
  }

  async bracknetHangup(params: { bracknet_call_id: string }) {
    const bracknetCallId = String(params.bracknet_call_id || '').trim();
    if (!bracknetCallId) throw new BadRequestException('Missing bracknet_call_id');

    const call = await this.telephonyCallRepo.findOne({ where: { externalCallId: bracknetCallId } });
    if (call) {
      call.status = TelephonyCallStatus.COMPLETED;
      if (!call.endedAt) call.endedAt = new Date();
      await this.telephonyCallRepo.save(call);
    }

    const cfg = this.getBracknetConfig();
    if (!cfg.baseUrl || !cfg.apiKey) return { status: 'ended', mode: 'mock' };

    // Adapter stub
    await axios.post(
      `${cfg.baseUrl.replace(/\/$/, '')}/api/call/hangup`,
      { bracknet_call_id: bracknetCallId },
      { headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
    );

    return { status: 'ended', mode: 'live' };
  }

  async bracknetTransfer(params: { bracknet_call_id: string; transfer_extension: string }) {
    const bracknetCallId = String(params.bracknet_call_id || '').trim();
    const transferExtension = String(params.transfer_extension || '').trim();
    if (!bracknetCallId) throw new BadRequestException('Missing bracknet_call_id');
    if (!transferExtension) throw new BadRequestException('Missing transfer_extension');

    const cfg = this.getBracknetConfig();
    if (!cfg.baseUrl || !cfg.apiKey) return { status: 'success', mode: 'mock' };

    // Adapter stub
    await axios.post(
      `${cfg.baseUrl.replace(/\/$/, '')}/api/call/transfer`,
      { bracknet_call_id: bracknetCallId, transfer_extension: transferExtension },
      { headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    return { status: 'success', mode: 'live' };
  }

  private async ensureCallbackTask(params: { customerPhone: string; reason: string; notes: string }) {
    const customerPhone = String(params.customerPhone || '').trim();
    if (!customerPhone) return;

    // Avoid duplicates for the same day
    const existing = await this.callTaskRepo.findOne({
      where: {
        customer_id: customerPhone,
        call_reason: params.reason,
        status: TaskStatus.PENDING,
      },
      order: { id: 'DESC' } as any,
    });
    if (existing) return;

    const task = this.callTaskRepo.create({
      customer_id: customerPhone,
      priority: 'warm' as any,
      call_reason: params.reason,
      status: TaskStatus.PENDING,
      notes: params.notes,
    });
    await this.callTaskRepo.save(task);
  }

  async handleBracknetEvent(event: string, body: any) {
    const eventName = String(event || body?.event || '').toLowerCase();
    const externalCallId = body?.bracknet_call_id || body?.callId || body?.id;

    // incoming_call / missed_call may not have call id
    const fromNumber = body?.from || body?.customer_number || body?.customerPhone;
    const toExtension = body?.to_extension || body?.agent_extension;

    if (!externalCallId && (eventName === 'call_answered' || eventName === 'call_ended' || eventName === 'call_recording_ready')) {
      throw new BadRequestException('Missing bracknet_call_id');
    }

    let call: TelephonyCall | null = null;
    if (externalCallId) {
      call = await this.telephonyCallRepo.findOne({ where: { externalCallId: String(externalCallId) } });
    }

    if (!call && externalCallId) {
      call = this.telephonyCallRepo.create({
        provider: 'bracknet',
        externalCallId: String(externalCallId),
        customerPhone: String(fromNumber || ''),
        agentPhone: toExtension ? String(toExtension) : null,
        direction: eventName === 'incoming_call' || body?.call_type === 'inbound' ? 'inbound' : 'outbound',
        status: TelephonyCallStatus.INITIATED,
        meta: { orphan: true, raw: body },
      });
      call = await this.telephonyCallRepo.save(call);
    }

    if (eventName === 'incoming_call') {
      // Create a minimal inbound call record + optional pending task for callback if needed.
      const inbound = this.telephonyCallRepo.create({
        provider: 'bracknet',
        externalCallId: externalCallId ? String(externalCallId) : null,
        customerPhone: String(fromNumber || ''),
        agentPhone: toExtension ? String(toExtension) : null,
        direction: 'inbound',
        status: TelephonyCallStatus.RINGING,
        meta: { event: 'incoming_call', raw: body },
      });

      const reporting = this.extractReportingFields(body);
      inbound.queueName = reporting.queueName;
      inbound.trunkName = reporting.trunkName;
      inbound.waitSeconds = reporting.waitSeconds;
      inbound.holdSeconds = reporting.holdSeconds;
      inbound.disposition = reporting.disposition;
      inbound.meta = { ...(inbound.meta || {}), reporting };

      const savedInbound = await this.telephonyCallRepo.save(inbound);

      // Screen-pop payload: known vs unknown caller
      const customerPhone = String(fromNumber || '').trim();
      const customer = customerPhone ? await this.customersService.findByPhone(customerPhone).catch(() => null) : null;
      this.telephonyGateway.emitIncomingCall({
        call: savedInbound,
        customer: customer
          ? { id: (customer as any).id, name: (customer as any).name, phone: (customer as any).phone, email: (customer as any).email }
          : null,
      });
      return { status: 'ok' };
    }

    if (eventName === 'call_answered' && call) {
      call.status = TelephonyCallStatus.ANSWERED;
      if (!call.answeredAt) call.answeredAt = new Date();
      const reporting = this.extractReportingFields(body);
      call.queueName = reporting.queueName ?? call.queueName;
      call.trunkName = reporting.trunkName ?? call.trunkName;
      call.holdSeconds = reporting.holdSeconds ?? call.holdSeconds;
      call.disposition = reporting.disposition ?? call.disposition;
      if (call.waitSeconds == null && call.answeredAt && call.startedAt) {
        call.waitSeconds = Math.max(0, Math.floor((call.answeredAt.getTime() - call.startedAt.getTime()) / 1000));
      }
      call.meta = {
        ...(call.meta || {}),
        lastWebhook: body,
        event: 'call_answered',
        reporting: { ...(((call.meta || {}) as any).reporting || {}), ...reporting },
      };
      await this.telephonyCallRepo.save(call);

      if (call.agentUserId) {
        this.setPresence(call.agentUserId, 'on_call', 'call');
      }

      this.telephonyGateway.emitCallUpdated({ call });
      return { status: 'ok' };
    }

    if (eventName === 'call_ended' && call) {
      call.status = TelephonyCallStatus.COMPLETED;
      if (!call.endedAt) call.endedAt = new Date();
      if (body?.duration != null) call.durationSeconds = Number(body.duration);
      if (!call.durationSeconds && call.answeredAt && call.endedAt) {
        call.durationSeconds = Math.max(0, Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000));
      }
      const reporting = this.extractReportingFields(body);
      call.queueName = reporting.queueName ?? call.queueName;
      call.trunkName = reporting.trunkName ?? call.trunkName;
      call.waitSeconds = reporting.waitSeconds ?? call.waitSeconds;
      call.holdSeconds = reporting.holdSeconds ?? call.holdSeconds;
      call.disposition = reporting.disposition ?? call.disposition ?? 'completed';
      call.meta = {
        ...(call.meta || {}),
        lastWebhook: body,
        event: 'call_ended',
        end_reason: body?.end_reason,
        reporting: { ...(((call.meta || {}) as any).reporting || {}), ...reporting },
      };
      await this.telephonyCallRepo.save(call);

      if (call.agentUserId) {
        this.setPresence(call.agentUserId, 'online', 'call');
      }

      this.telephonyGateway.emitCallUpdated({ call });

      if (call.taskId) {
        const task = await this.callTaskRepo.findOne({ where: { id: call.taskId } });
        if (task) {
          task.notes = `${task.notes || ''}\n[Telephony] Call ended. Duration: ${call.durationSeconds ?? 0}s`;
          await this.callTaskRepo.save(task);
        }
      }

      return { status: 'ok' };
    }

    if ((eventName === 'call_recording_ready' || eventName === 'call_recording') && call) {
      call.recordingUrl = body?.recording_url || body?.recordingUrl || call.recordingUrl;
      call.meta = { ...(call.meta || {}), lastWebhook: body, event: 'call_recording_ready' };
      await this.telephonyCallRepo.save(call);

      this.telephonyGateway.emitCallUpdated({ call });
      return { status: 'ok' };
    }

    if (eventName === 'call_missed' || eventName === 'missed_call') {
      const customerPhone = String(fromNumber || '').trim();

      // Persist a missed call record to support call-center reporting.
      try {
        const missed = this.telephonyCallRepo.create({
          provider: 'bracknet',
          externalCallId: externalCallId ? String(externalCallId) : null,
          customerPhone,
          agentPhone: toExtension ? String(toExtension) : null,
          direction: 'inbound',
          status: TelephonyCallStatus.FAILED,
          answeredAt: null,
          endedAt: new Date(),
          durationSeconds: 0,
          disposition: 'missed',
          meta: { event: 'missed_call', raw: body, end_reason: body?.end_reason || 'missed' },
        });
        const reporting = this.extractReportingFields(body);
        missed.queueName = reporting.queueName;
        missed.trunkName = reporting.trunkName;
        missed.waitSeconds = reporting.waitSeconds;
        missed.holdSeconds = reporting.holdSeconds;
        missed.meta = { ...(missed.meta || {}), reporting };
        await this.telephonyCallRepo.save(missed);
      } catch {
        // best-effort
      }

      await this.ensureCallbackTask({
        customerPhone,
        reason: 'missed_call',
        notes: `[Telephony] Missed call to extension ${toExtension || 'N/A'}`,
      });
      return { status: 'ok' };
    }

    // fallback to previous generic mapping
    return this.handleBracknetWebhook(body, {});
  }

  async handleBracknetWebhook(body: any, headers: Record<string, any>) {
    // Optional: verify signature if BRACKNET_WEBHOOK_SECRET is set.
    // Since provider spec is unknown, we do a minimal safe implementation.

    const externalCallId = body?.bracknet_call_id || body?.callId || body?.id;
    if (!externalCallId) {
      throw new BadRequestException('Missing callId');
    }

    const call = await this.telephonyCallRepo.findOne({
      where: { externalCallId: String(externalCallId) },
    });

    if (!call) {
      // Store orphan event for later debugging
      const orphan = this.telephonyCallRepo.create({
        provider: 'bracknet',
        externalCallId: String(externalCallId),
        customerPhone: String(body?.customerPhone || ''),
        status: TelephonyCallStatus.INITIATED,
        meta: { orphan: true, raw: body },
      });
      await this.telephonyCallRepo.save(orphan);
      return { success: true, message: 'Orphan call event stored' };
    }

    const statusRaw = String(body?.status || body?.event || body?.end_reason || '').toLowerCase();
    const map: Record<string, TelephonyCallStatus> = {
      ringing: TelephonyCallStatus.RINGING,
      answered: TelephonyCallStatus.ANSWERED,
      connected: TelephonyCallStatus.ANSWERED,
      completed: TelephonyCallStatus.COMPLETED,
      ended: TelephonyCallStatus.COMPLETED,
      call_ended: TelephonyCallStatus.COMPLETED,
      failed: TelephonyCallStatus.FAILED,
      busy: TelephonyCallStatus.FAILED,
      no_answer: TelephonyCallStatus.FAILED,
    };

    const newStatus = map[statusRaw] || call.status;
    call.status = newStatus;

    if (newStatus === TelephonyCallStatus.ANSWERED && !call.answeredAt) {
      call.answeredAt = new Date();
    }

    if ((newStatus === TelephonyCallStatus.COMPLETED || newStatus === TelephonyCallStatus.FAILED) && !call.endedAt) {
      call.endedAt = new Date();
      if (call.answeredAt) {
        call.durationSeconds = Math.max(0, Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000));
      }
    }

    call.recordingUrl = body?.recording_url || body?.recordingUrl || call.recordingUrl;

    const reporting = this.extractReportingFields(body);
    call.queueName = reporting.queueName ?? call.queueName;
    call.trunkName = reporting.trunkName ?? call.trunkName;
    call.waitSeconds = reporting.waitSeconds ?? call.waitSeconds;
    call.holdSeconds = reporting.holdSeconds ?? call.holdSeconds;
    call.disposition = reporting.disposition ?? call.disposition;
    if (call.waitSeconds == null && call.answeredAt && call.startedAt) {
      call.waitSeconds = Math.max(0, Math.floor((call.answeredAt.getTime() - call.startedAt.getTime()) / 1000));
    }
    call.meta = {
      ...(call.meta || {}),
      lastWebhook: body,
      reporting: { ...(((call.meta || {}) as any).reporting || {}), ...reporting },
    };

    await this.telephonyCallRepo.save(call);

    // Best-effort presence updates based on status transitions
    if (call.agentUserId) {
      if (newStatus === TelephonyCallStatus.ANSWERED) {
        this.setPresence(call.agentUserId, 'on_call', 'call');
      }
      if (newStatus === TelephonyCallStatus.COMPLETED || newStatus === TelephonyCallStatus.FAILED) {
        this.setPresence(call.agentUserId, 'online', 'call');
      }
    }

    this.telephonyGateway.emitCallUpdated({ call });

    // Auto-log call completion into CRM activity timeline (best-effort)
    if (newStatus === TelephonyCallStatus.COMPLETED || newStatus === TelephonyCallStatus.FAILED) {
      try {
        await this.tryLogCallAsCrmActivity(call, statusRaw);
      } catch {
        // never block webhook processing
      }
    }

    // Optional: update CRM call task when call ends
    if (call.taskId) {
      const task = await this.callTaskRepo.findOne({ where: { id: call.taskId } });
      if (task) {
        if (newStatus === TelephonyCallStatus.COMPLETED) {
          // Keep as in_progress until agent marks outcome; but we can set a note.
          task.notes = `${task.notes || ''}\n[Telephony] Call completed. Duration: ${call.durationSeconds ?? 0}s`;
          await this.callTaskRepo.save(task);
        }
        if (newStatus === TelephonyCallStatus.FAILED) {
          task.notes = `${task.notes || ''}\n[Telephony] Call failed (${statusRaw}).`;
          await this.callTaskRepo.save(task);
        }
      }
    }

    return { success: true };
  }

  async getDashboardStats(params?: { rangeDays?: number; agentUserId?: number }) {
    const safeRangeDays = Number.isFinite(params?.rangeDays) ? Math.max(1, Math.min(3650, Number(params?.rangeDays))) : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeRangeDays);

    const base = this.telephonyCallRepo
      .createQueryBuilder('c')
      .where('c.startedAt >= :since', { since });

    if (params?.agentUserId != null) {
      base.andWhere('c.agentUserId = :agentUserId', { agentUserId: Number(params.agentUserId) });
    }

    const [total, byStatusRaw, durationAggRaw, withRecordingRaw, failedByReasonRaw] = await Promise.all([
      base.clone().getCount(),
      base
        .clone()
        .select('c.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.status')
        .getRawMany<{ status: string; count: string }>(),
      base
        .clone()
        .select('COALESCE(AVG(c.durationSeconds), 0)', 'avgDurationSeconds')
        .addSelect('COALESCE(SUM(c.durationSeconds), 0)', 'totalDurationSeconds')
        .getRawOne<{ avgdurationseconds: string; totaldurationseconds: string }>(),
      base
        .clone()
        .andWhere('c.recordingUrl IS NOT NULL')
        .getCount(),
      base
        .clone()
        .andWhere('c.status = :failed', { failed: TelephonyCallStatus.FAILED })
        .select(
          "COALESCE(c.meta->>'end_reason', c.meta->'lastWebhook'->>'end_reason', 'failed')",
          'reason',
        )
        .addSelect('COUNT(*)', 'count')
        .groupBy('reason')
        .getRawMany<{ reason: string; count: string }>(),
    ]);

    return {
      rangeDays: safeRangeDays,
      since,
      total,
      byStatus: (byStatusRaw || []).map((r) => ({
        status: r.status,
        count: Number(r.count || 0),
      })),
      avgDurationSeconds: Number((durationAggRaw as any)?.avgdurationseconds ?? 0),
      totalDurationSeconds: Number((durationAggRaw as any)?.totaldurationseconds ?? 0),
      withRecordingCount: withRecordingRaw,
      failedByReason: (failedByReasonRaw || []).map((r) => ({
        reason: r.reason,
        count: Number(r.count || 0),
      })),
    };
  }
}
