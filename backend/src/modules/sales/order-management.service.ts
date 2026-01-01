import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderActivityLog } from './entities/order-activity-log.entity';
import { CourierTrackingHistory } from './entities/courier-tracking-history.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { Product } from '../products/product.entity';

@Injectable()
export class OrderManagementService {
  constructor(
    @InjectRepository(SalesOrder)
    private salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(SalesOrderItem)
    private salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(OrderActivityLog)
    private activityLogRepository: Repository<OrderActivityLog>,
    @InjectRepository(CourierTrackingHistory)
    private courierTrackingRepository: Repository<CourierTrackingHistory>,
  ) {}

  // ==================== ORDER ITEMS MANAGEMENT ====================
  
  async getOrderItems(orderId: number): Promise<any[]> {
    const orderItems = await this.orderItemRepository.find({
      where: { orderId },
      order: { id: 'ASC' },
    });

    // Preferred source for admin-managed orders
    if (orderItems.length > 0) return orderItems;

    // Fallback for checkout-created orders (stored in sales_order_items)
    const salesItems = await this.salesOrderItemRepository.find({
      where: { salesOrderId: orderId },
      order: { id: 'ASC' },
    });

    if (salesItems.length === 0) return [];

    const productIds = Array.from(new Set(salesItems.map((i) => Number(i.productId)).filter(Boolean)));
    const products = productIds.length
      ? await this.productRepository.find({ where: { id: In(productIds) } })
      : [];
    const productById = new Map(products.map((p) => [Number(p.id), p]));

    return salesItems.map((si) => {
      const qty = Number(si.quantity || 0);
      const unit = Number(si.unitPrice || 0);
      const subtotal = si.lineTotal != null ? Number(si.lineTotal) : qty * unit;
      const product = productById.get(Number(si.productId));

      return {
        id: si.id,
        orderId,
        productId: Number(si.productId),
        productName: product?.name_en || `Product #${si.productId}`,
        quantity: qty,
        unitPrice: unit,
        subtotal,
        createdAt: si.createdAt,
        updatedAt: si.createdAt,
        updatedBy: null,
      };
    });
  }

  async addOrderItem(data: {
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<OrderItem> {
    const subtotal = data.quantity * data.unitPrice;
    
    const orderItem = this.orderItemRepository.create({
      orderId: data.orderId,
      productId: data.productId,
      productName: data.productName,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      subtotal: subtotal,
      updatedBy: data.userId,
    });

    const savedItem = await this.orderItemRepository.save(orderItem);

    // Log activity
    await this.logActivity({
      orderId: data.orderId,
      actionType: 'product_added',
      actionDescription: `Added product: ${data.productName} (Qty: ${data.quantity})`,
      newValue: { productId: data.productId, quantity: data.quantity, unitPrice: data.unitPrice },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return savedItem;
  }

  async updateOrderItem(
    itemId: number,
    data: {
      quantity?: number;
      unitPrice?: number;
      userId: number;
      userName: string;
      ipAddress?: string;
    }
  ): Promise<OrderItem> {
    const item = await this.orderItemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new Error('Order item not found');

    const oldValue = { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal };

    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.unitPrice !== undefined) item.unitPrice = data.unitPrice;
    
    item.subtotal = item.quantity * item.unitPrice;
    item.updatedBy = data.userId;

    const updatedItem = await this.orderItemRepository.save(item);

    // Log activity
    await this.logActivity({
      orderId: item.orderId,
      actionType: 'product_updated',
      actionDescription: `Updated product: ${item.productName}`,
      oldValue,
      newValue: { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return updatedItem;
  }

  async deleteOrderItem(
    itemId: number,
    userId: number,
    userName: string,
    ipAddress?: string
  ): Promise<void> {
    const item = await this.orderItemRepository.findOne({ where: { id: itemId } });
    if (!item) throw new Error('Order item not found');

    const orderId = item.orderId;
    const productInfo = { productName: item.productName, quantity: item.quantity };

    await this.orderItemRepository.delete(itemId);

    // Log activity
    await this.logActivity({
      orderId,
      actionType: 'product_removed',
      actionDescription: `Removed product: ${productInfo.productName}`,
      oldValue: productInfo,
      performedBy: userId,
      performedByName: userName,
      ipAddress,
    });
  }

  // ==================== ORDER STATUS MANAGEMENT ====================

  async approveOrder(
    orderId: number,
    userId: number,
    userName: string,
    ipAddress?: string
  ): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    order.status = 'approved';
    order.approvedBy = userId;
    order.approvedAt = new Date();

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'approved',
      actionDescription: `Order approved by ${userName}`,
      newValue: { status: 'approved', approvedAt: order.approvedAt },
      performedBy: userId,
      performedByName: userName,
      ipAddress,
    });

    return updatedOrder;
  }

  async holdOrder(
    orderId: number,
    userId: number,
    userName: string,
    ipAddress?: string
  ): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    // Cannot hold if already shipped
    if (order.courierStatus && ['picked', 'in_transit', 'delivered'].includes(order.courierStatus)) {
      throw new Error('Cannot hold order - already shipped');
    }

    const oldStatus = order.status;
    order.status = 'hold';

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'hold',
      actionDescription: `Order put on hold by ${userName}`,
      oldValue: { status: oldStatus },
      newValue: { status: 'hold' },
      performedBy: userId,
      performedByName: userName,
      ipAddress,
    });

    return updatedOrder;
  }

  async cancelOrder(
    orderId: number,
    cancelReason: string,
    userId: number,
    userName: string,
    ipAddress?: string
  ): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    // Cannot cancel if already shipped
    if (order.courierStatus && ['picked', 'in_transit', 'delivered'].includes(order.courierStatus)) {
      throw new Error('Cannot cancel order - already shipped');
    }

    if (!cancelReason || cancelReason.trim() === '') {
      throw new Error('Cancel reason is required');
    }

    const oldStatus = order.status;
    order.status = 'cancelled';
    order.cancelReason = cancelReason;
    order.cancelledBy = userId;
    order.cancelledAt = new Date();

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'cancelled',
      actionDescription: `Order cancelled by ${userName}. Reason: ${cancelReason}`,
      oldValue: { status: oldStatus },
      newValue: { status: 'cancelled', cancelReason },
      performedBy: userId,
      performedByName: userName,
      ipAddress,
    });

    return updatedOrder;
  }

  // ==================== COURIER MANAGEMENT ====================

  async shipOrder(data: {
    orderId: number;
    courierCompany: string;
    courierOrderId?: string;
    trackingId: string;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('Order not found');

    order.status = 'shipped';
    order.courierCompany = data.courierCompany;
    order.courierOrderId = data.courierOrderId || '';
    order.trackingId = data.trackingId;
    order.courierStatus = 'picked';
    order.shippedAt = new Date();

    const updatedOrder = await this.salesOrderRepository.save(order);

    // Add courier tracking history
    await this.courierTrackingRepository.save({
      orderId: data.orderId,
      courierCompany: data.courierCompany,
      trackingId: data.trackingId,
      status: 'picked',
      remarks: 'Order picked up by courier',
    });

    await this.logActivity({
      orderId: data.orderId,
      actionType: 'shipped',
      actionDescription: `Order shipped via ${data.courierCompany}. Tracking: ${data.trackingId}`,
      newValue: { courierCompany: data.courierCompany, trackingId: data.trackingId },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return updatedOrder;
  }

  async updateCourierStatus(data: {
    orderId: number;
    status: string;
    location?: string;
    remarks?: string;
  }): Promise<void> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('Order not found');

    order.courierStatus = data.status;
    
    if (data.status === 'delivered') {
      order.status = 'delivered';
      order.deliveredAt = new Date();
    }

    await this.salesOrderRepository.save(order);

    // Add to tracking history
    await this.courierTrackingRepository.save({
      orderId: data.orderId,
      courierCompany: order.courierCompany,
      trackingId: order.trackingId,
      status: data.status,
      location: data.location,
      remarks: data.remarks,
    });

    await this.logActivity({
      orderId: data.orderId,
      actionType: 'courier_status_updated',
      actionDescription: `Courier status updated to: ${data.status}`,
      newValue: { courierStatus: data.status, location: data.location },
      performedBy: undefined,
      performedByName: 'System',
    });
  }

  async getCourierTrackingHistory(orderId: number): Promise<CourierTrackingHistory[]> {
    return await this.courierTrackingRepository.find({
      where: { orderId },
      order: { updatedAt: 'DESC' }
    });
  }

  // ==================== NOTES MANAGEMENT ====================

  async updateOrderNotes(data: {
    orderId: number;
    shippingAddress?: string;
    courierNotes?: string;
    riderInstructions?: string;
    internalNotes?: string;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('Order not found');

    const changes: any = {};
    
    if (data.shippingAddress !== undefined) {
      order.shippingAddress = data.shippingAddress;
      changes.shippingAddress = data.shippingAddress;
    }
    if (data.courierNotes !== undefined) {
      order.courierNotes = data.courierNotes;
      changes.courierNotes = data.courierNotes;
    }
    if (data.riderInstructions !== undefined) {
      order.riderInstructions = data.riderInstructions;
      changes.riderInstructions = data.riderInstructions;
    }
    if (data.internalNotes !== undefined) {
      order.internalNotes = data.internalNotes;
      changes.internalNotes = data.internalNotes;
    }

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId: data.orderId,
      actionType: 'notes_updated',
      actionDescription: `Order notes updated by ${data.userName}`,
      newValue: changes,
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return updatedOrder;
  }

  // ==================== ACTIVITY LOG ====================

  async logActivity(data: {
    orderId: number;
    actionType: string;
    actionDescription: string;
    oldValue?: any;
    newValue?: any;
    performedBy?: number;
    performedByName?: string;
    ipAddress?: string;
  }): Promise<OrderActivityLog> {
    const log = this.activityLogRepository.create({
      orderId: data.orderId,
      actionType: data.actionType,
      actionDescription: data.actionDescription,
      oldValue: data.oldValue,
      newValue: data.newValue,
      performedBy: data.performedBy,
      performedByName: data.performedByName || 'System',
      ipAddress: data.ipAddress,
    });

    return await this.activityLogRepository.save(log);
  }

  async getActivityLogs(orderId: number): Promise<OrderActivityLog[]> {
    return await this.activityLogRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' }
    });
  }

  // ==================== ORDER TRACKING ====================

  async updateOrderTracking(data: {
    orderId: number;
    userIp?: string;
    geoLocation?: any;
    browserInfo?: string;
    deviceType?: string;
    operatingSystem?: string;
    trafficSource?: string;
    referrerUrl?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('Order not found');

    Object.assign(order, data);
    return await this.salesOrderRepository.save(order);
  }

  async getOrderDetails(orderId: number): Promise<any> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const customerId = order.customerId != null ? Number(order.customerId) : null;
    const customerEmail = order.customerEmail ? String(order.customerEmail).trim() : '';
    const customerPhone = order.customerPhone ? String(order.customerPhone).trim() : '';

    const customer = {
      customerId,
      customerName: order.customerName || null,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
    };

    const orderHistoryQb = this.salesOrderRepository.createQueryBuilder('o');
    orderHistoryQb.where('1=0');
    if (customerId != null && Number.isFinite(customerId)) {
      orderHistoryQb.orWhere('o.customer_id = :cid', { cid: customerId });
    }
    if (customerEmail) {
      orderHistoryQb.orWhere('o.customer_email = :email', { email: customerEmail });
    }
    if (customerPhone) {
      orderHistoryQb.orWhere('o.customer_phone = :phone', { phone: customerPhone });
    }

    // If we have no reliable identifier, default to current order only
    if (orderHistoryQb.expressionMap.wheres.length <= 1) {
      orderHistoryQb.orWhere('o.id = :id', { id: order.id });
    }

    const orderHistoryRows = await orderHistoryQb
      .orderBy('o.created_at', 'DESC')
      .getMany();

    const items = await this.getOrderItems(orderId);
    const activityLogs = await this.getActivityLogs(orderId);
    const courierTracking = await this.getCourierTrackingHistory(orderId);

    const orderHistory = orderHistoryRows.map((o) => ({
      id: o.id,
      salesOrderNumber: o.salesOrderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount || 0),
      createdAt: o.createdAt,
      orderDate: o.orderDate || o.createdAt,
    }));

    return {
      ...order,
      items,
      activityLogs,
      courierTracking,
      customer,
      orderHistory,
    };
  }
}
