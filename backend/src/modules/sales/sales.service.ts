import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { User } from '../users/user.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { OffersService } from '../offers/offers.service';
import { WhatsAppService } from '../messaging/whatsapp.service';
import { CommissionService } from '../crm/commission.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder)
    private salesRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private orderItemsRepository: Repository<SalesOrderItem>,
    private loyaltyService: LoyaltyService,
    private offersService: OffersService,
    private whatsAppService: WhatsAppService,
    @Inject(forwardRef(() => CommissionService))
    private commissionService: CommissionService,
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
      courier_status: order.courierStatus,
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
        quantity: Number(i.quantity) || 0,
      })),
    };
  }

  /**
   * Fetch items for a batch of order IDs from BOTH tables (sales_order_items + order_items),
   * with a fallback to the products table for missing product names.
   */
  private async batchFetchOrderItems(orderIds: number[]): Promise<Map<number, { productName: string; quantity: number }[]>> {
    const map = new Map<number, { productName: string; quantity: number }[]>();
    if (orderIds.length === 0) return map;

    // Query both item tables in one go, coalesce product_name from products table if missing
    const rows: { order_id: number; product_name: string | null; product_id: number | null; quantity: number }[] =
      await this.salesRepository.manager.query(
        `SELECT sales_order_id AS order_id, soi.product_name, soi.product_id, soi.quantity
         FROM sales_order_items soi
         WHERE soi.sales_order_id = ANY($1)
         UNION ALL
         SELECT oi.order_id, oi.product_name, oi.product_id, oi.quantity
         FROM order_items oi
         WHERE oi.order_id = ANY($1)
           AND oi.order_id NOT IN (SELECT DISTINCT s2.sales_order_id FROM sales_order_items s2 WHERE s2.sales_order_id = ANY($1))`,
        [orderIds],
      );

    // Collect product IDs that have no name so we can look them up
    const missingNameProductIds = new Set<number>();
    for (const r of rows) {
      if (!r.product_name && r.product_id) {
        missingNameProductIds.add(r.product_id);
      }
    }

    // Lookup product names from products table
    let productNameMap = new Map<number, string>();
    if (missingNameProductIds.size > 0) {
      const productRows: { id: number; name_en: string }[] = await this.salesRepository.manager.query(
        `SELECT id, name_en FROM products WHERE id = ANY($1)`,
        [[...missingNameProductIds]],
      );
      for (const p of productRows) {
        productNameMap.set(p.id, p.name_en);
      }
    }

    for (const r of rows) {
      const name = r.product_name || (r.product_id ? productNameMap.get(r.product_id) : null) || 'Unknown Product';
      const arr = map.get(r.order_id) || [];
      arr.push({ productName: name, quantity: Number(r.quantity) || 0 });
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
    courierStatus?: string;
    startDate?: string;
    endDate?: string;
    todayOnly?: boolean;
    productName?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
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

    // Courier status filter
    if (params.courierStatus && params.courierStatus.trim()) {
      qb.andWhere('LOWER(o.courier_status) = LOWER(:courierStatus)', {
        courierStatus: params.courierStatus.trim(),
      });
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

    // Also fetch distinct courier statuses for the filter dropdown
    const courierStatusesRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select('DISTINCT o.courier_status', 'cs')
      .where('o.courier_status IS NOT NULL')
      .andWhere("o.courier_status != ''")
      .getRawMany();
    const courierStatuses = courierStatusesRaw
      .map((r: any) => (r.cs ?? '').toString().trim())
      .filter(Boolean)
      .sort();

    // Batch-fetch order items from both tables for current page
    const orderIds = orders.map(o => o.id);
    const itemsByOrderId = await this.batchFetchOrderItems(orderIds);

    return {
      data: orders.map((order) => {
        (order as any)._items = itemsByOrderId.get(order.id) || [];
        return this.toAdminListDto(order);
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      courierStatuses,
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
      .orderBy('o.shipped_at', 'ASC');

    const orders = await qb.getMany();
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

    // Status: use provided or default to 'pending'
    sales.status = createSalesDto.status || 'pending';

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
    if (['cancelled', 'delivered', 'completed'].includes(status)) {
      throw new Error(`Cannot cancel order in status: ${status}`);
    }
    if (order.courierStatus && ['picked', 'in_transit', 'delivered'].includes(order.courierStatus)) {
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
    if (!from || !to) return true;
    if (from === to) return true;

    const allowed: Record<string, string[]> = {
      pending: ['approved', 'hold', 'processing', 'shipped', 'cancelled'],
      approved: ['processing', 'shipped', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      hold: ['approved', 'processing', 'cancelled'],
      shipped: ['delivered', 'completed'],
      delivered: ['completed'],
      completed: [],
      cancelled: [],
    };

    // If we don't recognize the status, don't block updates.
    if (!Object.prototype.hasOwnProperty.call(allowed, from)) return true;

    return allowed[from].includes(to);
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
        `COUNT(DISTINCT CASE WHEN LOWER(o.status::text) = 'cancelled' THEN o.id END) AS cancelled_orders`,
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
        `COUNT(CASE WHEN LOWER(o.status::text) = 'cancelled' THEN 1 END) AS cancelled_orders`,
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

    // 5) Courier status distribution
    const courierStatusRaw = await this.salesRepository
      .createQueryBuilder('o')
      .select([
        `COALESCE(o.courier_status, 'not_sent') AS courier_status`,
        'COUNT(o.id) AS orders',
      ])
      .where('DATE(o.order_date) = :reportDate', { reportDate })
      .andWhere("o.courier_company IS NOT NULL AND o.courier_company != ''")
      .groupBy('courier_status')
      .orderBy('orders', 'DESC')
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
        approvedOrders: toNum(summaryRaw?.approved_orders),
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
        status: r.courier_status || 'not_sent',
        orders: toNum(r.orders),
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
        `0 AS upsell_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'pending' THEN 1 END) AS pending_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'approved' THEN 1 END) AS approved_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'shipped' THEN 1 END) AS shipped_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'delivered' THEN 1 END) AS delivered_orders`,
        `COUNT(CASE WHEN LOWER(o.status::text) = 'cancelled' THEN 1 END) AS cancelled_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'steadfast' THEN 1 END) AS steadfast_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'pathao' THEN 1 END) AS pathao_orders`,
        `COUNT(CASE WHEN LOWER(o.courier_company) = 'redx' THEN 1 END) AS redx_orders`,
      ])
      .where('o.created_by IS NOT NULL')
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

    // ──── 2) Upsell revenue per agent (skipped: thank_you_offer_accepted column not yet migrated) ────
    const upsellRows: any[] = [];
    const upsellMap = new Map<number, number>();
    for (const r of upsellRows) {
      upsellMap.set(toNum(r.agent_id), toNum(r.upsell_revenue));
    }

    // ──── 3) Daily trend (for chart) ────
    const dailyQb = this.salesRepository
      .createQueryBuilder('o')
      .select([
        'DATE(o.order_date) AS date',
        'o.created_by AS agent_id',
        'COUNT(o.id) AS orders',
        'COALESCE(SUM(o.total_amount), 0) AS revenue',
        '0 AS upsells',
      ])
      .where('o.created_by IS NOT NULL')
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

    // ──── 4) Hourly distribution for selected agent(s) (use created_at which is timestamp) ────
    const hourlyQb = this.salesRepository
      .createQueryBuilder('o')
      .select([
        'EXTRACT(HOUR FROM o.created_at) AS hour',
        'COUNT(o.id) AS orders',
        'COALESCE(SUM(o.total_amount), 0) AS revenue',
      ])
      .where('o.created_by IS NOT NULL')
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

    // ──── 6) Overall totals ────
    const agents = agentRows.map((r: any) => ({
      agentId: toNum(r.agent_id),
      agentName: [r.agent_name, r.agent_last_name].filter(Boolean).join(' ') || `Agent #${r.agent_id}`,
      totalOrders: toNum(r.total_orders),
      totalRevenue: toNum(r.total_revenue),
      avgOrderValue: toNum(r.avg_order_value),
      totalDiscount: toNum(r.total_discount),
      uniqueCustomers: toNum(r.unique_customers),
      upsellOrders: toNum(r.upsell_orders),
      upsellRevenue: upsellMap.get(toNum(r.agent_id)) || 0,
      upsellRate: toNum(r.total_orders) > 0
        ? Math.round((toNum(r.upsell_orders) / toNum(r.total_orders)) * 100)
        : 0,
      pendingOrders: toNum(r.pending_orders),
      approvedOrders: toNum(r.approved_orders),
      shippedOrders: toNum(r.shipped_orders),
      deliveredOrders: toNum(r.delivered_orders),
      cancelledOrders: toNum(r.cancelled_orders),
      steadfastOrders: toNum(r.steadfast_orders),
      pathaoOrders: toNum(r.pathao_orders),
      redxOrders: toNum(r.redx_orders),
      conversionRate: toNum(r.total_orders) > 0
        ? Math.round((toNum(r.delivered_orders) / toNum(r.total_orders)) * 100)
        : 0,
      cancelRate: toNum(r.total_orders) > 0
        ? Math.round((toNum(r.cancelled_orders) / toNum(r.total_orders)) * 100)
        : 0,
    }));

    const totalSummary = {
      totalOrders: agents.reduce((s, a) => s + a.totalOrders, 0),
      totalRevenue: agents.reduce((s, a) => s + a.totalRevenue, 0),
      totalDiscount: agents.reduce((s, a) => s + a.totalDiscount, 0),
      totalUpsellOrders: agents.reduce((s, a) => s + a.upsellOrders, 0),
      totalUpsellRevenue: agents.reduce((s, a) => s + a.upsellRevenue, 0),
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
      entry.upsells += toNum(r.upsells);
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
        `COUNT(CASE WHEN LOWER(o.status::text) = 'cancelled' THEN 1 END) AS cancelled_orders`,
      ])
      .where('o.created_by IS NOT NULL')
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
