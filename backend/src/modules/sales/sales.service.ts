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

  async findAll() {
    const orders = await this.salesRepository.find({
      order: { createdAt: 'DESC' }
    });
    
    // Transform to match frontend expectations (snake_case)
    return orders.map(order => ({
      id: order.id,
      order_number: order.salesOrderNumber,
      customer_id: order.customerId,
      customer_name: `Customer #${order.customerId || 'Guest'}`,
      total_amount: parseFloat(order.totalAmount?.toString() || '0'),
      status: order.status,
      order_date: order.orderDate || order.createdAt,
      created_at: order.createdAt,
      // Include all new fields
      shipping_address: order.shippingAddress,
      courier_notes: order.courierNotes,
      rider_instructions: order.riderInstructions,
      internal_notes: order.internalNotes,
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
      tracking_id: order.trackingId,
      courier_status: order.courierStatus,
      shipped_at: order.shippedAt,
      delivered_at: order.deliveredAt,
      notes: order.notes,
    }));
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
    let notesText = '';
    if (createSalesDto.shipping_address) {
      notesText += `Shipping Address: ${createSalesDto.shipping_address}`;
    }
    if (createSalesDto.notes) {
      if (notesText) notesText += '\n\n';
      notesText += `Order Notes: ${createSalesDto.notes}`;
    }
    sales.notes = notesText || null;

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
}
