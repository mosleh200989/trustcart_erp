import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder)
    private salesRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private orderItemsRepository: Repository<SalesOrderItem>,
  ) {}

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

      notes: order.notes,
    };
  }

  async findAll() {
    const orders = await this.salesRepository.find({
      order: { createdAt: 'DESC' }
    });

    return orders.map((order) => this.toAdminListDto(order));
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
    return this.salesRepository.findOne({ where: { id: Number(id) } });
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

    // Total amount: prefer explicit totals, then fall back to computed from items
    let totalAmount: number | null = null;
    if (createSalesDto.totalAmount != null) totalAmount = Number(createSalesDto.totalAmount);
    else if (createSalesDto.total_amount != null) totalAmount = Number(createSalesDto.total_amount);
    else if (createSalesDto.total != null) totalAmount = Number(createSalesDto.total);
    else if (createSalesDto.grand_total != null) totalAmount = Number(createSalesDto.grand_total);

    // If still null, try to compute from items
    if (totalAmount == null && Array.isArray(createSalesDto.items)) {
      totalAmount = createSalesDto.items.reduce((sum: number, item: any) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.unit_price ?? item.price ?? 0);
        return sum + qty * price;
      }, 0);
    }

    sales.totalAmount = totalAmount ?? 0;

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

    // Save order items if provided
    if (Array.isArray(createSalesDto.items) && createSalesDto.items.length > 0) {
      const orderItems = createSalesDto.items.map((item: any) => {
        const orderItem = new SalesOrderItem();
        orderItem.salesOrderId = savedOrder.id;
        orderItem.productId = Number(item.product_id || item.productId);
        orderItem.quantity = Number(item.quantity || 1);
        orderItem.unitPrice = Number(item.unit_price || item.unitPrice || item.price || 0);
        orderItem.lineTotal = orderItem.quantity * orderItem.unitPrice;
        return orderItem;
      });

      await this.orderItemsRepository.save(orderItems);
    }

    return savedOrder;
  }

  async update(id: string, updateSalesDto: any) {
    if (updateSalesDto?.status) {
      const current = await this.salesRepository.findOne({ where: { id: Number(id) } });
      if (current) {
        const from = this.normalizeOrderStatus(current.status);
        const to = this.normalizeOrderStatus(updateSalesDto.status);
        if (!this.isStatusTransitionAllowed(from, to)) {
          throw new Error(`Invalid status transition: ${from} -> ${to}`);
        }
      }
    }

    await this.salesRepository.update(id, updateSalesDto);
    return this.findOne(id);
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
        'product.name_en as "productName"',
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
}
