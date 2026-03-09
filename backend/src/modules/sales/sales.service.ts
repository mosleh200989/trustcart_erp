import { Injectable, Inject, forwardRef } from '@nestjs/common';
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
  ) {}

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

  private toAdminListDto(order: SalesOrder) {
    const customerName = (order as any).customerName ?? null;
    const customerEmail = (order as any).customerEmail ?? null;
    const customerPhone = (order as any).customerPhone ?? null;

    return {
      id: order.id,
      // Keep both keys for compatibility (some pages used order_number earlier)
      sales_order_number: order.salesOrderNumber,
      order_number: order.salesOrderNumber,

      customer_id: order.customerId,
      customer_name: customerName ?? (order.customerId ? `Customer #${order.customerId}` : 'Guest'),
      customer_email: customerEmail,
      customer_phone: customerPhone,

      total_amount: parseFloat(order.totalAmount?.toString() || '0'),
      status: order.status,

      order_date: order.orderDate || order.createdAt,
      created_at: order.createdAt,

      shipping_address: order.shippingAddress,
      courier_notes: order.courierNotes,
      rider_instructions: order.riderInstructions,
      internal_notes: order.internalNotes,
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
      order_source: order.orderSource || null,
      order_source_display: this.computeOrderSourceDisplay(order),
      items: ((order as any)._items || []).map((i: any) => ({
        productName: i.productName || i.product_name || 'Unknown',
        productNameBn: i.productNameBn || null,
        quantity: Number(i.quantity) || 0,
      })),
    };
  }

  /**
   * Fetch items for a batch of order IDs from BOTH tables (sales_order_items + order_items),
   * with a fallback to the products table for missing product names.
   */
  private async batchFetchOrderItems(orderIds: number[]): Promise<Map<number, { productName: string; productNameBn?: string | null; quantity: number; customProductName?: string | null; itemId?: number; source?: string }[]>> {
    const map = new Map<number, { productName: string; productNameBn?: string | null; quantity: number; customProductName?: string | null; itemId?: number; source?: string }[]>();
    if (orderIds.length === 0) return map;

    // Query both item tables — prefer order_items (admin/migrated) when they exist,
    // fall back to sales_order_items (checkout/landing-page) for orders not yet migrated.
    const rows: { order_id: number; item_id: number; product_name: string | null; custom_product_name: string | null; product_id: number | null; quantity: number; source: string }[] =
      await this.salesRepository.manager.query(
        `SELECT oi.id AS item_id, oi.order_id, oi.product_name, oi.custom_product_name, oi.product_id, oi.quantity, 'order_items' AS source
         FROM order_items oi
         WHERE oi.order_id = ANY($1)
         UNION ALL
         SELECT soi.id AS item_id, soi.sales_order_id AS order_id, soi.product_name, soi.custom_product_name, soi.product_id, soi.quantity, 'sales_order_items' AS source
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
      const nameBn = r.product_id ? productNameBnMap.get(r.product_id) || null : null;
      const arr = map.get(r.order_id) || [];
      arr.push({ productName: displayName, productNameBn: nameBn, quantity: Number(r.quantity) || 0, customProductName: customName, itemId: r.item_id, source: r.source });
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

    // Get distinct agents/admins who created orders
    const agents: { id: number; name: string; last_name: string | null }[] =
      await this.salesRepository.query(
        `SELECT DISTINCT u.id, u.name, u.last_name
         FROM sales_orders o
         INNER JOIN users u ON u.id = o.created_by
         WHERE o.order_source IN ('admin_panel', 'agent_dashboard')
           AND o.created_by IS NOT NULL
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

  async findAll() {
    const orders = await this.salesRepository.find({
      order: { createdAt: 'DESC' }
    });

    // Batch-fetch creator names
    const creatorIds = [...new Set(orders.map(o => o.createdBy).filter((id): id is number => id != null))];
    const creatorMap = await this.getUserNameMap(creatorIds);

    // Batch-fetch order items from both tables
    const orderIds = orders.map(o => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);

    return orders.map((order) => {
      (order as any).createdByName = order.createdBy ? (creatorMap.get(order.createdBy) ?? null) : null;
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
    source?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(500, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.salesRepository.createQueryBuilder('o');

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

    // Product name filter — subquery in order_items / sales_order_items
    if (params.productName && params.productName.trim()) {
      const pName = `%${params.productName.trim().toLowerCase()}%`;
      qb.andWhere(
        `(o.id IN (
          SELECT oi.order_id FROM order_items oi WHERE oi.product_name ILIKE :pName
          UNION
          SELECT soi.sales_order_id FROM sales_order_items soi WHERE soi.product_name ILIKE :pName
        ))`,
        { pName },
      );
    }

    // Source filter
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

    qb.orderBy('o.created_at', 'DESC');

    // Get total count before applying pagination
    const total = await qb.getCount();

    qb.skip(skip).take(limit);

    const orders = await qb.getMany();

    // Batch-fetch creator names
    const creatorIds = [...new Set(orders.map(o => o.createdBy).filter((id): id is number => id != null))];
    const creatorMap = await this.getUserNameMap(creatorIds);

    orders.forEach((order) => {
      (order as any).createdByName = order.createdBy ? (creatorMap.get(order.createdBy) ?? null) : null;
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

    return {
      data: orders.map((order) => {
        (order as any)._items = itemsByOrderId.get(order.id) || [];
        const dto = this.toAdminListDto(order);
        const norm = (order.customerPhone || '').replace(/^\+88/, '').trim();
        (dto as any).isRejectedCustomer = rejectedPhones.has(norm);
        return dto;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    if (params?.status?.trim()) {
      qb.andWhere('LOWER(o.status::text) = LOWER(:status)', { status: params.status.trim() });
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

  async markCourierReturns(courierOrderIds: string[], returnDate: string) {
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

      order.status = 'returned' as any;
      (order as any).deliveredAt = new Date(returnDate);
      await this.salesRepository.save(order);

      // Log activity
      try {
        await this.salesRepository.query(
          `INSERT INTO sales_order_activity_log (sales_order_id, action, details, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [order.id, 'courier_return', JSON.stringify({ courierOrderId: trimmed, returnDate })],
        );
      } catch (_) { /* ignore if table doesn't exist */ }

      results.push({ courierOrderId: trimmed, orderId: order.id, success: true, message: 'Marked as returned' });
    }

    return results;
  }

  async findLateDeliveries(params?: { thresholdDays?: number }) {
    const thresholdDays =
      params?.thresholdDays != null && Number.isFinite(params.thresholdDays)
        ? Math.max(0, Math.floor(params.thresholdDays))
        : 3;

    const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    const qb = this.salesRepository.createQueryBuilder('o');
    qb.where('o.shipped_at IS NOT NULL')
      .andWhere('o.delivered_at IS NULL')
      .andWhere('o.shipped_at <= :cutoff', { cutoff })
      .andWhere('o.status != :cancelledStatus', { cancelledStatus: 'cancelled' })
      .andWhere('o.status != :adminCancelledStatus', { adminCancelledStatus: 'admin_cancelled' })
      .andWhere('o.status != :deliveredStatus', { deliveredStatus: 'delivered' })
      .orderBy('o.shipped_at', 'ASC');

    const orders = await qb.getMany();

    // Batch-fetch items for all orders
    const orderIds = orders.map((o) => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);
    for (const order of orders) {
      (order as any)._items = itemsByOrderId.get(order.id) || [];
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

  async findOne(id: string) {
    const order = await this.salesRepository.findOne({ where: { id: Number(id) } });
    if (!order) return null;

    // Calculate subtotal from order items
    const items = await this.orderItemsRepository.find({
      where: { salesOrderId: order.id },
    });
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    
    // Calculate delivery charge: totalAmount = subtotal + deliveryCharge - discountAmount
    // Therefore: deliveryCharge = totalAmount - subtotal + discountAmount
    const totalAmount = Number(order.totalAmount || 0);
    const discountAmount = Number(order.discountAmount || 0);
    const deliveryCharge = Math.max(0, totalAmount - subtotal + discountAmount);

    return {
      ...order,
      subtotal,
      deliveryCharge,
    };
  }

  async create(createSalesDto: any) {
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
        // Ignore invalid codes to avoid blocking checkout.
      }
    }

    // If explicit total not provided, compute.
    if (totalAmount == null) {
      totalAmount = computedSubtotal + (Number.isFinite(deliveryCharge) ? deliveryCharge : 0) - (Number.isFinite(discountAmount) ? discountAmount : 0);
    }

    sales.totalAmount = Number.isFinite(totalAmount as any) ? Number(totalAmount) : 0;
    sales.discountAmount = Number.isFinite(discountAmount as any) ? Number(discountAmount) : 0;
    sales.offerId = appliedOfferId;
    sales.offerCode = appliedOfferCode;

    // Status: use provided or default to 'processing'
    sales.status = createSalesDto.status || 'processing';

    // Store shipping address and notes
    const shippingAddress =
      createSalesDto.shipping_address ??
      createSalesDto.shippingAddress ??
      null;
    if (shippingAddress != null && String(shippingAddress).trim() !== '') {
      sales.shippingAddress = String(shippingAddress);
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
    if (createSalesDto.user_ip != null) sales.userIp = String(createSalesDto.user_ip);
    if (createSalesDto.userIp != null) sales.userIp = String(createSalesDto.userIp);

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

    return savedOrder;
  }

  async update(id: string, updateSalesDto: any) {
    let becameDelivered = false;

    if (updateSalesDto?.status) {
      const current = await this.salesRepository.findOne({ where: { id: Number(id) } });
      if (current) {
        const from = this.normalizeOrderStatus(current.status);
        const to = this.normalizeOrderStatus(updateSalesDto.status);
        if (!this.isStatusTransitionAllowed(from, to)) {
          throw new Error(`Invalid status transition: ${from} -> ${to}`);
        }

        becameDelivered = from !== 'delivered' && to === 'delivered';
      }
    }

    await this.salesRepository.update(id, updateSalesDto);
    const updated = await this.findOne(id);

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

    order.status = 'cancelled';
    order.cancelReason = cancelReason ? String(cancelReason).trim() : order.cancelReason;
    order.cancelledBy = Number(customerId);
    order.cancelledAt = new Date();
    return await this.salesRepository.save(order);
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
    const reportDate = date || new Date().toISOString().slice(0, 10);

    // 1) Product-wise breakdown via sales_order_items JOIN sales_orders
    const productRows = await this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'soi.product_id AS product_id',
        'soi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
        'SUM(soi.line_total) AS total_revenue',
        'SUM(soi.unit_price * soi.quantity) AS gross_amount',
        `COUNT(DISTINCT CASE WHEN LOWER(o.courier_company) = 'steadfast' THEN o.id END) AS steadfast_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.courier_company) = 'pathao' THEN o.id END) AS pathao_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.courier_company) = 'redx' THEN o.id END) AS redx_orders`,
        `COUNT(DISTINCT CASE WHEN o.courier_company IS NULL OR o.courier_company = '' THEN o.id END) AS no_courier_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.status::text) = 'delivered' THEN o.id END) AS delivered_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.status::text) IN ('cancelled', 'admin_cancelled') THEN o.id END) AS cancelled_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.status::text) = 'pending' THEN o.id END) AS pending_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.status::text) = 'approved' THEN o.id END) AS approved_orders`,
        `COUNT(DISTINCT CASE WHEN LOWER(o.status::text) = 'shipped' THEN o.id END) AS shipped_orders`,
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .groupBy('soi.product_id')
      .addGroupBy('soi.product_name')
      .orderBy('total_orders', 'DESC')
      .getRawMany();

    // 2) Overall summary for the date
    const summaryRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select([
        'COUNT(o.id) AS total_orders',
        'COALESCE(SUM(o.total_amount), 0) AS total_revenue',
        'COALESCE(SUM(o.discount_amount), 0) AS total_discount',
        'COALESCE(AVG(o.total_amount), 0) AS avg_order_value',
        `COUNT(CASE WHEN LOWER(o.status::text) = 'pending' THEN 1 END) AS pending_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'approved' THEN 1 END) AS approved_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'shipped' THEN 1 END) AS shipped_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'admin_cancelled') THEN 1 END) AS cancelled_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'steadfast' THEN 1 END) AS steadfast_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'pathao' THEN 1 END) AS pathao_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'redx' THEN 1 END) AS redx_orders`,
        `COUNT(CASE WHEN o.courier_company IS NULL OR o.courier_company = '' THEN 1 END) AS no_courier_orders`,
        'COUNT(DISTINCT o.customer_id) AS unique_customers',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .getRawOne();

    // 3) Hourly distribution for the chart (use created_at which is timestamp; order_date is date-only)
    const hourlyRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select([
        'EXTRACT(HOUR FROM o.created_at) AS hour',
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
        'soi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
        'SUM(soi.line_total) AS total_revenue',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.order_source = 'landing_page'")
      .groupBy('soi.product_id')
      .addGroupBy('soi.product_name')
      .orderBy('total_orders', 'DESC')
      .getRawMany();

    // 7) Website product-wise breakdown
    const websiteProducts = await this.orderItemsRepository
      .createQueryBuilder('soi')
      .innerJoin('soi.salesOrder', 'o')
      .select([
        'soi.product_id AS product_id',
        'soi.product_name AS product_name',
        'COUNT(DISTINCT o.id) AS total_orders',
        'SUM(soi.quantity) AS total_qty',
        'SUM(soi.line_total) AS total_revenue',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.order_source = 'website'")
      .groupBy('soi.product_id')
      .addGroupBy('soi.product_name')
      .orderBy('total_orders', 'DESC')
      .getRawMany();

    const toNum = (v: any) => parseFloat(v) || 0;

    return {
      date: reportDate,
      summary: {
        totalOrders: toNum(summaryRaw?.total_orders),
        totalRevenue: toNum(summaryRaw?.total_revenue),
        totalDiscount: toNum(summaryRaw?.total_discount),
        avgOrderValue: toNum(summaryRaw?.avg_order_value),
        pendingOrders: toNum(summaryRaw?.pending_orders),
        processingOrders: toNum(summaryRaw?.processing_orders),
        approvedOrders: toNum(summaryRaw?.approved_orders),
        holdOrders: toNum(summaryRaw?.hold_orders),
        shippedOrders: toNum(summaryRaw?.shipped_orders),
        deliveredOrders: toNum(summaryRaw?.delivered_orders),
        cancelledOrders: toNum(summaryRaw?.cancelled_orders),
        steadfastOrders: toNum(summaryRaw?.steadfast_orders),
        pathaoOrders: toNum(summaryRaw?.pathao_orders),
        redxOrders: toNum(summaryRaw?.redx_orders),
        noCourierOrders: toNum(summaryRaw?.no_courier_orders),
        uniqueCustomers: toNum(summaryRaw?.unique_customers),
      },
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
    const today = new Date().toISOString().slice(0, 10);
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
        `COUNT(CASE WHEN LOWER(o.status::text) = 'admin_cancelled' THEN 1 END) AS admin_cancelled_orders`,
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
        'EXTRACT(HOUR FROM o.created_at) AS hour',
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
    const agents = agentRows.map((r: any) => {
      const cs = crossSellMap.get(toNum(r.agent_id)) || { qty: 0, orders: 0 };
      const totalOrders = toNum(r.total_orders);
      const productsQty = prodQtyMap.get(toNum(r.agent_id)) || 0;
      const upsellQty = Math.max(0, productsQty - totalOrders);
      return {
        agentId: toNum(r.agent_id),
        agentName: [r.agent_name, r.agent_last_name].filter(Boolean).join(' ') || `Agent #${r.agent_id}`,
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
        adminCancelledOrders: toNum(r.admin_cancelled_orders),
        conversionRate: convRateMap.get(toNum(r.agent_id)) || 0,
        cancelRate: toNum(r.total_orders) > 0
          ? Math.round((toNum(r.admin_cancelled_orders) / toNum(r.total_orders)) * 100)
          : 0,
      };
    });

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
   * along with total, delivered, cancelled, and cancelled ratio.
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
        `COUNT(CASE WHEN LOWER(o.status::text) IN ('cancelled', 'admin_cancelled') THEN 1 END) AS cancelled_orders`,
      ])
      .where('o.created_by IS NOT NULL')
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
    const grandCancelled = agents.reduce((s, a) => s + a.cancelled, 0);

    return {
      month,
      year,
      daysInMonth: lastDay,
      agents,
      grandTotal,
      grandDelivered,
      grandCancelled,
      grandCancelledRatio: grandTotal > 0
        ? parseFloat(((grandCancelled / grandTotal) * 100).toFixed(2))
        : 0,
    };
  }
}
