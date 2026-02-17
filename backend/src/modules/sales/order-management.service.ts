import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderActivityLog } from './entities/order-activity-log.entity';
import { CourierTrackingHistory } from './entities/courier-tracking-history.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { Product } from '../products/product.entity';
import { CustomersService } from '../customers/customers.service';
import axios from 'axios';
import { User } from '../users/user.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { WhatsAppService } from '../messaging/whatsapp.service';

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
    private customersService: CustomersService,
    private loyaltyService: LoyaltyService,
    private whatsAppService: WhatsAppService,

    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private formatUserName(u?: Partial<User> | null): string | null {
    if (!u) return null;
    const name = [u.name, u.lastName].filter(Boolean).join(' ').trim();
    return name.length ? name : null;
  }

  private async enrichActivityLogs(logs: OrderActivityLog[]): Promise<any[]> {
    const performerIds = Array.from(
      new Set(logs.map((l) => (l.performedBy != null ? Number(l.performedBy) : NaN)).filter((n) => Number.isFinite(n))),
    );

    if (performerIds.length === 0) return logs;

    const performers = await this.usersRepository.findBy({ id: In(performerIds) });
    const performerById = new Map<number, User>(performers.map((u) => [Number(u.id), u]));

    const leaderIds = Array.from(
      new Set(
        performers
          .map((u) => (u.teamLeaderId != null ? Number(u.teamLeaderId) : NaN))
          .filter((n) => Number.isFinite(n)),
      ),
    );
    const leaders = leaderIds.length ? await this.usersRepository.findBy({ id: In(leaderIds) }) : [];
    const leaderById = new Map<number, User>(leaders.map((u) => [Number(u.id), u]));

    return logs.map((log) => {
      const performer = log.performedBy != null ? performerById.get(Number(log.performedBy)) : undefined;
      const leader = performer?.teamLeaderId != null ? leaderById.get(Number(performer.teamLeaderId)) : undefined;
      return {
        ...log,
        performedByName: log.performedByName || this.formatUserName(performer) || 'System',
        performedByUser: performer
          ? {
              id: performer.id,
              name: performer.name,
              lastName: performer.lastName,
              email: performer.email,
              phone: performer.phone,
              teamLeaderId: performer.teamLeaderId,
              teamId: performer.teamId,
              roleId: performer.roleId,
            }
          : null,
        teamLeader: leader
          ? {
              id: leader.id,
              name: leader.name,
              lastName: leader.lastName,
              email: leader.email,
              phone: leader.phone,
            }
          : null,
      };
    });
  }

  private readonly steadfastBaseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';

  private getSteadfastHeaders() {
    const apiKey = process.env.STEADFAST_API_KEY || '';
    const secretKey = process.env.STEADFAST_SECRET_KEY || '';
    if (!apiKey || !secretKey) {
      throw new BadRequestException('Steadfast API credentials are not configured. Please set STEADFAST_API_KEY and STEADFAST_SECRET_KEY in backend/.env');
    }
    return {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
    } as const;
  }

  private normalizeBdPhone(raw: any): string {
    const s = raw == null ? '' : String(raw);
    const digits = s.replace(/\D/g, '');
    // Common cases: 01XXXXXXXXX, 8801XXXXXXXXX, +8801XXXXXXXXX
    if (digits.length === 11 && digits.startsWith('01')) return digits;
    if (digits.length === 13 && digits.startsWith('8801')) return digits.slice(2);
    if (digits.length > 11) return digits.slice(digits.length - 11);
    return digits;
  }

  private buildSteadfastInvoice(order: SalesOrder): string {
    const invoice = order.salesOrderNumber ? String(order.salesOrderNumber).trim() : String(order.id);
    // Steadfast allows alpha-numeric including hyphens and underscores.
    return invoice.replace(/\s+/g, '_');
  }

  private extractSteadfastStatus(data: any): string | null {
    const status =
      data?.delivery_status ??
      data?.status ??
      data?.current_status ??
      data?.consignment?.status ??
      data?.consignment_status ??
      null;
    return status == null ? null : String(status);
  }

  private isDeliveredStatus(status: string): boolean {
    const s = String(status).toLowerCase();
    return s === 'delivered' || s.includes('delivered');
  }

  private async tryRefreshSteadfastCourierStatus(order: SalesOrder): Promise<SalesOrder> {
    if (!order?.courierCompany || String(order.courierCompany).toLowerCase() !== 'steadfast') return order;

    const consignmentId = order.courierOrderId ? String(order.courierOrderId).trim() : '';
    const trackingCode = order.trackingId ? String(order.trackingId).trim() : '';
    const invoice = this.buildSteadfastInvoice(order);

    if (!consignmentId && !trackingCode && !invoice) return order;

    try {
      const headers = this.getSteadfastHeaders();

      // Prefer CID (consignment_id) when available.
      const url = consignmentId
        ? `${this.steadfastBaseUrl}/status_by_cid/${encodeURIComponent(consignmentId)}`
        : trackingCode
          ? `${this.steadfastBaseUrl}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`
          : `${this.steadfastBaseUrl}/status_by_invoice/${encodeURIComponent(invoice)}`;

      const res = await axios.get(url, { headers, timeout: 20000 });
      const latestStatus = this.extractSteadfastStatus(res.data);

      if (!latestStatus) return order;
      if (String(order.courierStatus || '').trim() === latestStatus.trim()) return order;

      const prevStatus = order.courierStatus;
      order.courierStatus = latestStatus;

      const becameDelivered = this.isDeliveredStatus(latestStatus) && order.status !== 'delivered';

      if (becameDelivered) {
        order.status = 'delivered';
        order.deliveredAt = new Date();
      }

      const saved = await this.salesOrderRepository.save(order);

      if (becameDelivered) {
        try {
          await this.loyaltyService.autoCompleteReferralForDeliveredOrder({
            orderId: saved.id,
            customerId: saved.customerId,
          });
        } catch {
          // never block courier sync
        }

        try {
          await this.whatsAppService.sendReferralNudgeOnDeliveredOrder({
            orderId: saved.id,
            customerId: saved.customerId,
          });
        } catch {
          // never block courier sync
        }
      }

      await this.courierTrackingRepository.save({
        orderId: saved.id,
        courierCompany: 'Steadfast',
        trackingId: saved.trackingId,
        status: saved.courierStatus,
        remarks: `Steadfast status refreshed${prevStatus ? ` (was: ${prevStatus})` : ''}`,
      });

      await this.logActivity({
        orderId: saved.id,
        actionType: 'courier_status_synced',
        actionDescription: `Steadfast courier status refreshed to: ${saved.courierStatus}`,
        oldValue: { courierStatus: prevStatus },
        newValue: { courierStatus: saved.courierStatus },
        performedBy: undefined,
        performedByName: 'System',
      });

      return saved;
    } catch {
      // Do not block order details if Steadfast API is unreachable or credentials are missing.
      return order;
    }
  }

  async sendToSteadfast(data: {
    orderId: number;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<any> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('Order not found');

    if (order.courierCompany && String(order.courierCompany).toLowerCase() === 'steadfast' && order.trackingId) {
      return {
        success: true,
        message: 'Order already sent to Steadfast',
        courierCompany: order.courierCompany,
        courierOrderId: order.courierOrderId,
        trackingId: order.trackingId,
        courierStatus: order.courierStatus,
      };
    }

    const items = await this.getOrderItems(order.id);
    const invoice = this.buildSteadfastInvoice(order);
    const recipientName = (order.customerName ? String(order.customerName).trim() : '') || 'N/A';
    const recipientPhone = this.normalizeBdPhone(order.customerPhone);
    const recipientAddress = (order.shippingAddress ? String(order.shippingAddress).trim() : '') || (order.notes ? String(order.notes).trim() : '');

    if (!recipientPhone || recipientPhone.length !== 11) {
      throw new BadRequestException('Customer phone must be a valid 11 digit number to send to Steadfast');
    }
    if (!recipientAddress) {
      throw new BadRequestException('Shipping address is required to send to Steadfast');
    }

    const codAmount = Math.max(0, Number(order.totalAmount || 0) - Number(order.discountAmount || 0));
    if (!Number.isFinite(codAmount)) {
      throw new BadRequestException('Invalid COD amount');
    }

    const itemDescription = items
      .slice(0, 20)
      .map((i) => `${i.productName} x${Number(i.quantity || 0)}`)
      .join(', ')
      .slice(0, 250);

    const totalLot = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    const noteParts = [order.courierNotes, order.riderInstructions].filter(Boolean).map((v) => String(v));
    const note = noteParts.join(' | ').slice(0, 250) || undefined;

    const payload: any = {
      invoice,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress.slice(0, 250),
      cod_amount: codAmount,
      delivery_type: 0,
    };
    if (note) payload.note = note;
    if (itemDescription) payload.item_description = itemDescription;
    if (totalLot) payload.total_lot = totalLot;
    if (order.customerEmail) payload.recipient_email = String(order.customerEmail).trim();

    let resData: any;
    try {
      const res = await axios.post(`${this.steadfastBaseUrl}/create_order`, payload, {
        headers: this.getSteadfastHeaders(),
        timeout: 20000,
      });
      resData = res.data;
    } catch (e: any) {
      const extStatus = e?.response?.status;
      const errData = e?.response?.data;
      const errors = errData?.errors || undefined;

      // If Steadfast returns 401/403, the API credentials are invalid — never forward
      // these auth codes to the frontend (the frontend would treat them as JWT failures).
      if (extStatus === 401 || extStatus === 403) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_GATEWAY,
            message: 'Steadfast API authentication failed. Please verify STEADFAST_API_KEY and STEADFAST_SECRET_KEY in backend/.env are correct and not expired.',
            errors,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      const msg = errData?.message || e?.message || 'Failed to connect to Steadfast';
      throw new HttpException(
        { statusCode: HttpStatus.BAD_GATEWAY, message: `Steadfast error: ${msg}`, errors },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const consignment = resData?.consignment;
    const consignmentId = consignment?.consignment_id ?? null;
    const trackingCode = consignment?.tracking_code ?? null;
    const courierStatus = consignment?.status ?? resData?.delivery_status ?? null;

    if (!consignmentId || !trackingCode) {
      throw new BadRequestException(resData?.message || 'Steadfast did not return consignment_id/tracking_code');
    }

    order.status = 'shipped';
    order.shippedAt = new Date();
    order.courierCompany = 'Steadfast';
    order.courierOrderId = String(consignmentId);
    order.trackingId = String(trackingCode);
    order.courierStatus = courierStatus ? String(courierStatus) : 'in_review';

    await this.salesOrderRepository.save(order);

    await this.courierTrackingRepository.save({
      orderId: order.id,
      courierCompany: 'Steadfast',
      trackingId: String(trackingCode),
      status: order.courierStatus,
      remarks: 'Consignment created in Steadfast',
    });

    await this.logActivity({
      orderId: order.id,
      actionType: 'shipped',
      actionDescription: `Order sent to Steadfast. Consignment: ${consignmentId}, Tracking: ${trackingCode}`,
      newValue: {
        courierCompany: 'Steadfast',
        courierOrderId: String(consignmentId),
        trackingId: String(trackingCode),
        courierStatus: order.courierStatus,
      },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return {
      success: true,
      message: resData?.message || 'Sent to Steadfast',
      courierCompany: 'Steadfast',
      courierOrderId: String(consignmentId),
      trackingId: String(trackingCode),
      courierStatus: order.courierStatus,
      raw: resData,
    };
  }

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
      const product = si.productId ? productById.get(Number(si.productId)) : null;

      return {
        id: si.id,
        orderId,
        productId: si.productId ? Number(si.productId) : null,
        productName: product?.name_en || (si as any).productName || (si as any).product_name || 'Landing Page Product',
        productImage: product?.image_url || (si as any).productImage || (si as any).product_image || null,
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

  async unholdOrder(
    orderId: number,
    userId: number,
    userName: string,
    ipAddress?: string
  ): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    if (order.status !== 'hold') {
      throw new Error('Order is not on hold');
    }

    order.status = 'pending';

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'unhold',
      actionDescription: `Order resumed from hold by ${userName}`,
      oldValue: { status: 'hold' },
      newValue: { status: 'pending' },
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

    const becameDelivered = data.status === 'delivered' && order.status !== 'delivered';

    if (becameDelivered) {
      order.status = 'delivered';
      order.deliveredAt = new Date();
    }

    const saved = await this.salesOrderRepository.save(order);

    if (becameDelivered) {
      try {
        await this.loyaltyService.autoCompleteReferralForDeliveredOrder({
          orderId: saved.id,
          customerId: saved.customerId,
        });
      } catch {
        // never block courier updates
      }

      try {
        await this.whatsAppService.sendReferralNudgeOnDeliveredOrder({
          orderId: saved.id,
          customerId: saved.customerId,
        });
      } catch {
        // never block courier updates
      }
    }

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

    const { orderId: _orderId, ...patch } = data as any;
    Object.assign(order, patch);
    return await this.salesOrderRepository.save(order);
  }

  // ==================== CUSTOMER ORDERS ====================

  async getCustomerOrders(customerId: number): Promise<any[]> {
    const orders = await this.salesOrderRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to most recent 50 orders
    });

    return orders.map((order) => ({
      id: order.id,
      salesOrderNumber: order.salesOrderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      totalAmount: parseFloat(order.totalAmount?.toString() || '0'),
      status: order.status,
      orderDate: order.orderDate || order.createdAt,
      createdAt: order.createdAt,
      shippingAddress: order.shippingAddress,
      courierStatus: order.courierStatus,
    }));
  }

  async getOrderDetails(orderId: number): Promise<any> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    // Keep Steadfast courier status in sync on read (best-effort).
    const orderWithCourierSync = await this.tryRefreshSteadfastCourierStatus(order);

    const rawCustomerId = orderWithCourierSync.customerId != null ? Number(orderWithCourierSync.customerId) : NaN;
    const customerId = Number.isFinite(rawCustomerId) && rawCustomerId > 0 ? rawCustomerId : null;
    const customerEmail = orderWithCourierSync.customerEmail ? String(orderWithCourierSync.customerEmail).trim() : '';
    const customerPhone = orderWithCourierSync.customerPhone ? String(orderWithCourierSync.customerPhone).trim() : '';

    let matchedCustomer: any | null = null;
    if (customerId) {
      try {
        matchedCustomer = await this.customersService.findOne(String(customerId));
      } catch { /* not found */ }
    }
    if (!matchedCustomer && customerEmail) matchedCustomer = await this.customersService.findByEmail(customerEmail);
    if (!matchedCustomer && customerPhone) {
      matchedCustomer = await this.customersService.findByPhone(customerPhone);
    }

    const matchedName = matchedCustomer
      ? [matchedCustomer.name, matchedCustomer.lastName].filter(Boolean).join(' ').trim() || null
      : null;

    const customer = {
      customerId,
      customerName: orderWithCourierSync.customerName || matchedName,
      customerEmail: customerEmail || matchedCustomer?.email || null,
      customerPhone: customerPhone || matchedCustomer?.phone || null,
    };

    const customerRecord = matchedCustomer
      ? {
          id: matchedCustomer.id,
          uuid: matchedCustomer.uuid,
          title: matchedCustomer.title,
          name: matchedCustomer.name,
          lastName: matchedCustomer.lastName,
          companyName: matchedCustomer.companyName,
          email: matchedCustomer.email,
          phone: matchedCustomer.phone,
          mobile: matchedCustomer.mobile,
          website: matchedCustomer.website,
          source: matchedCustomer.source,
          rating: matchedCustomer.rating,
          totalSpent: matchedCustomer.total_spent ?? matchedCustomer.totalSpent,
          customerLifetimeValue: matchedCustomer.customer_lifetime_value ?? matchedCustomer.customerLifetimeValue,
          preferredContactMethod: matchedCustomer.preferred_contact_method ?? matchedCustomer.preferredContactMethod,
          notes: matchedCustomer.notes,
          lastContactDate: matchedCustomer.last_contact_date ?? matchedCustomer.lastContactDate,
          nextFollowUp: matchedCustomer.next_follow_up ?? matchedCustomer.nextFollowUp,
          address: matchedCustomer.address,
          district: matchedCustomer.district,
          city: matchedCustomer.city,
          gender: matchedCustomer.gender,
          dateOfBirth: matchedCustomer.dateOfBirth,
          maritalStatus: matchedCustomer.maritalStatus,
          anniversaryDate: matchedCustomer.anniversaryDate,
          profession: matchedCustomer.profession,
          availableTime: matchedCustomer.availableTime,
          customerType: matchedCustomer.customerType,
          lifecycleStage: matchedCustomer.lifecycleStage,
          status: matchedCustomer.status,
          isActive: matchedCustomer.isActive,
          priority: matchedCustomer.priority,
        }
      : null;

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
      orderHistoryQb.orWhere('o.id = :id', { id: orderWithCourierSync.id });
    }

    const orderHistoryRows = await orderHistoryQb
      .orderBy('o.created_at', 'DESC')
      .getMany();

    const items = await this.getOrderItems(orderId);
    const activityLogs = await this.enrichActivityLogs(await this.getActivityLogs(orderId));
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
      ...orderWithCourierSync,
      items,
      activityLogs,
      courierTracking,
      customer,
      customerRecord,
      orderHistory,
    };
  }

  async getCustomerProductHistory(orderId: number): Promise<any> {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const rawCustomerId = order.customerId != null ? Number(order.customerId) : NaN;
    const customerId = Number.isFinite(rawCustomerId) && rawCustomerId > 0 ? rawCustomerId : null;
    const customerEmail = order.customerEmail ? String(order.customerEmail).trim() : '';
    const customerPhone = order.customerPhone ? String(order.customerPhone).trim() : '';

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

    if (orderHistoryQb.expressionMap.wheres.length <= 1) {
      orderHistoryQb.orWhere('o.id = :id', { id: order.id });
    }

    const orders = await orderHistoryQb.orderBy('o.created_at', 'DESC').getMany();

    const itemsByOrderId = new Map<number, any[]>();
    for (const o of orders) {
      // eslint-disable-next-line no-await-in-loop
      itemsByOrderId.set(o.id, await this.getOrderItems(o.id));
    }

    const productIds = new Set<number>();
    for (const orderItems of itemsByOrderId.values()) {
      for (const item of orderItems) {
        const pid = Number(item.productId);
        if (Number.isFinite(pid) && pid > 0) productIds.add(pid);
      }
    }

    const products = productIds.size
      ? await this.productRepository.find({ where: { id: In(Array.from(productIds)) } })
      : [];
    const productById = new Map(products.map((p) => [Number(p.id), p]));

    type Agg = {
      productKey: string;
      productId: number | null;
      productName: string;
      sku?: string | null;
      totalQuantity: number;
      totalValue: number;
      ordersCount: number;
      lastPurchasedAt: Date | null;
    };

    const aggByKey = new Map<string, { data: Agg; orderIds: Set<number> }>();

    for (const o of orders) {
      const orderItems = itemsByOrderId.get(o.id) || [];

      for (const item of orderItems) {
        const pid = Number(item.productId);
        const hasPid = Number.isFinite(pid) && pid > 0;
        const productName = String(item.productName || (hasPid ? `Product #${pid}` : 'Unknown Product'));
        const key = hasPid ? `id:${pid}` : `name:${productName.toLowerCase()}`;
        const qty = Number(item.quantity || 0);
        const value = Number(item.subtotal || 0);

        const p = hasPid ? productById.get(pid) : undefined;
        const lastPurchasedAt = (item.updatedAt || item.createdAt || o.orderDate || o.createdAt) as Date | undefined;

        const existing = aggByKey.get(key);
        if (!existing) {
          const initial: Agg = {
            productKey: key,
            productId: hasPid ? pid : null,
            productName: p?.name_en || productName,
            sku: (p as any)?.sku ?? null,
            totalQuantity: qty,
            totalValue: value,
            ordersCount: 1,
            lastPurchasedAt: lastPurchasedAt || null,
          };
          aggByKey.set(key, { data: initial, orderIds: new Set([o.id]) });
        } else {
          existing.data.totalQuantity += qty;
          existing.data.totalValue += value;
          existing.orderIds.add(o.id);
          existing.data.ordersCount = existing.orderIds.size;
          if (lastPurchasedAt) {
            const prev = existing.data.lastPurchasedAt;
            if (!prev || new Date(lastPurchasedAt).getTime() > new Date(prev).getTime()) {
              existing.data.lastPurchasedAt = lastPurchasedAt;
            }
          }
        }
      }
    }

    const productsHistory = Array.from(aggByKey.values())
      .map((x) => x.data)
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const summary = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + Number((o as any).totalAmount || 0), 0),
      totalQuantity: productsHistory.reduce((sum, p) => sum + Number(p.totalQuantity || 0), 0),
      uniqueProducts: productsHistory.length,
      lastOrderDate: orders[0]?.orderDate || orders[0]?.createdAt || null,
      firstOrderDate: orders.length ? (orders[orders.length - 1]?.orderDate || orders[orders.length - 1]?.createdAt || null) : null,
    };

    return { summary, products: productsHistory };
  }

  // ==================== STEADFAST WEBHOOK HANDLER ====================

  /**
   * Handle webhook callbacks from Steadfast for delivery status updates.
   * Steadfast sends status updates when delivery status changes.
   * 
   * Expected payload structure from Steadfast webhook:
   * {
   *   "consignment_id": 1424107,
   *   "invoice": "SO-12345",
   *   "tracking_code": "15BAEB8A",
   *   "status": "delivered",
   *   "delivery_status": "delivered",
   *   ...
   * }
   */
  async handleSteadfastWebhook(
    body: any,
    headers: Record<string, any>,
  ): Promise<{ success: boolean; message: string }> {
    // Optional: Verify webhook signature if Steadfast provides one
    // const signature = headers['x-steadfast-signature'];
    // if (process.env.STEADFAST_WEBHOOK_SECRET && !this.verifySteadfastSignature(body, signature)) {
    //   return { success: false, message: 'Invalid signature' };
    // }

    const consignmentId = body?.consignment_id ?? body?.consignment?.consignment_id;
    const trackingCode = body?.tracking_code ?? body?.consignment?.tracking_code;
    const invoice = body?.invoice ?? body?.consignment?.invoice;
    const newStatus = this.extractSteadfastStatus(body);

    if (!newStatus) {
      return { success: false, message: 'No status in webhook payload' };
    }

    // Find the order by consignment_id (courierOrderId) or tracking_code (trackingId)
    let order: SalesOrder | null = null;

    if (consignmentId) {
      order = await this.salesOrderRepository.findOne({
        where: { courierOrderId: String(consignmentId), courierCompany: 'Steadfast' },
      });
    }

    if (!order && trackingCode) {
      order = await this.salesOrderRepository.findOne({
        where: { trackingId: String(trackingCode), courierCompany: 'Steadfast' },
      });
    }

    if (!order && invoice) {
      // Try to match by sales order number
      order = await this.salesOrderRepository.findOne({
        where: { salesOrderNumber: invoice, courierCompany: 'Steadfast' },
      });
    }

    if (!order) {
      return { success: false, message: `Order not found for webhook: CID=${consignmentId}, TC=${trackingCode}, INV=${invoice}` };
    }

    // Check if status actually changed
    if (String(order.courierStatus || '').trim() === newStatus.trim()) {
      return { success: true, message: 'Status unchanged' };
    }

    const prevStatus = order.courierStatus;
    order.courierStatus = newStatus;

    const becameDelivered = this.isDeliveredStatus(newStatus) && order.status !== 'delivered';

    if (becameDelivered) {
      order.status = 'delivered';
      order.deliveredAt = new Date();
    }

    const saved = await this.salesOrderRepository.save(order);

    // Post-delivery actions
    if (becameDelivered) {
      try {
        await this.loyaltyService.autoCompleteReferralForDeliveredOrder({
          orderId: saved.id,
          customerId: saved.customerId,
        });
      } catch {
        // never block webhook processing
      }

      try {
        await this.whatsAppService.sendReferralNudgeOnDeliveredOrder({
          orderId: saved.id,
          customerId: saved.customerId,
        });
      } catch {
        // never block webhook processing
      }
    }

    // Log tracking history
    await this.courierTrackingRepository.save({
      orderId: saved.id,
      courierCompany: 'Steadfast',
      trackingId: saved.trackingId,
      status: saved.courierStatus,
      remarks: `Steadfast webhook: ${prevStatus || 'null'} → ${newStatus}`,
    });

    // Activity log
    await this.logActivity({
      orderId: saved.id,
      actionType: 'courier_status_webhook',
      actionDescription: `Steadfast webhook: status updated to ${newStatus}`,
      oldValue: { courierStatus: prevStatus },
      newValue: { courierStatus: newStatus },
      performedBy: undefined,
      performedByName: 'Steadfast Webhook',
    });

    return {
      success: true,
      message: `Order #${saved.id} status updated: ${prevStatus || 'null'} → ${newStatus}`,
    };
  }

  /**
   * Sync status for all orders that are sent to Steadfast but not yet delivered.
   * Useful for batch syncing or recovery.
   */
  async syncAllSteadfastStatuses(): Promise<{
    total: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const orders = await this.salesOrderRepository.find({
      where: {
        courierCompany: 'Steadfast',
        status: In(['shipped', 'processing', 'approved']),
      },
    });

    const results = { total: orders.length, synced: 0, failed: 0, errors: [] as string[] };

    for (const order of orders) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.tryRefreshSteadfastCourierStatus(order);
        results.synced++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Order #${order.id}: ${e.message || 'Unknown error'}`);
      }
    }

    return results;
  }

  // ==================== MARK AS PACKED ====================

  async markAsPacked(orderId: number, userId: number, userName: string, ipAddress: string) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    order.isPacked = true;
    order.packedAt = new Date();
    order.packedBy = userId;
    await this.salesOrderRepository.save(order);

    await this.activityLogRepository.save(
      this.activityLogRepository.create({
        orderId,
        actionType: 'packed',
        actionDescription: `Order marked as packed by ${userName}`,
        oldValue: { isPacked: false },
        newValue: { isPacked: true },
        performedBy: userId,
        performedByName: userName,
        ipAddress,
      }),
    );

    return { success: true, message: 'Order marked as packed', order };
  }

  async unmarkPacked(orderId: number, userId: number, userName: string, ipAddress: string) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    order.isPacked = false;
    order.packedAt = null as any;
    order.packedBy = null as any;
    await this.salesOrderRepository.save(order);

    await this.activityLogRepository.save(
      this.activityLogRepository.create({
        orderId,
        actionType: 'unpacked',
        actionDescription: `Order unmarked as packed by ${userName}`,
        oldValue: { isPacked: true },
        newValue: { isPacked: false },
        performedBy: userId,
        performedByName: userName,
        ipAddress,
      }),
    );

    return { success: true, message: 'Order unmarked as packed', order };
  }

  async bulkMarkAsPacked(orderIds: number[], userId: number, userName: string, ipAddress: string) {
    const results = { total: orderIds.length, success: 0, failed: 0, errors: [] as string[] };

    for (const orderId of orderIds) {
      try {
        await this.markAsPacked(orderId, userId, userName, ipAddress);
        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Order #${orderId}: ${e.message || 'Unknown error'}`);
      }
    }

    return results;
  }

  // ==================== PRINT DATA GENERATION ====================

  private async getOrderForPrint(orderId: number) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    // Use getOrderItems which checks BOTH order_items (admin) and sales_order_items (checkout) tables
    const items = await this.getOrderItems(orderId);

    return { order, items };
  }

  async generateInvoiceData(orderId: number) {
    const { order, items } = await this.getOrderForPrint(orderId);

    return {
      type: 'invoice',
      order: {
        id: order.id,
        salesOrderNumber: order.salesOrderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        orderDate: order.orderDate,
        status: order.status,
        isPacked: order.isPacked,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        courierNotes: order.courierNotes,
        riderInstructions: order.riderInstructions,
        notes: order.notes,
        courierCompany: order.courierCompany,
        courierOrderId: order.courierOrderId,
        trackingId: order.trackingId,
      },
      items: items.map((item: any) => ({
        id: item.id,
        productName: item.productName || item.product_name || 'Product',
        productImage: item.productImage || item.product_image || null,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || item.unit_price || 0),
        lineTotal: Number(item.subtotal || item.lineTotal || item.line_total) || (Number(item.quantity || 0) * Number(item.unitPrice || item.unit_price || 0)),
      })),
    };
  }

  async generateStickerData(orderId: number) {
    const { order, items } = await this.getOrderForPrint(orderId);

    return {
      type: 'sticker',
      order: {
        id: order.id,
        salesOrderNumber: order.salesOrderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        isPacked: order.isPacked,
        totalAmount: order.totalAmount,
        courierCompany: order.courierCompany,
        courierOrderId: order.courierOrderId,
        trackingId: order.trackingId,
      },
      items: items.map((item: any) => ({
        productName: item.productName || item.product_name || 'Product',
        quantity: Number(item.quantity || 0),
      })),
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity), 0),
    };
  }

  async bulkGenerateInvoiceData(orderIds: number[]) {
    const results = [];
    for (const orderId of orderIds) {
      try {
        const data = await this.generateInvoiceData(orderId);
        results.push(data);
      } catch (e: any) {
        results.push({ type: 'invoice', error: true, orderId, message: e.message });
      }
    }
    return results;
  }

  async bulkGenerateStickerData(orderIds: number[]) {
    const results = [];
    for (const orderId of orderIds) {
      try {
        const data = await this.generateStickerData(orderId);
        results.push(data);
      } catch (e: any) {
        results.push({ type: 'sticker', error: true, orderId, message: e.message });
      }
    }
    return results;
  }

  // ==================== PRINTING MODULE ====================

  async findForPrinting(params: {
    page?: number;
    limit?: number;
    q?: string;
    todayOnly?: boolean;
    isPacked?: string;
    invoicePrinted?: string;
    stickerPrinted?: string;
    courierId?: string;
    startDate?: string;
    endDate?: string;
    productName?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.salesOrderRepository.createQueryBuilder('o');

    // Text search (customer name, phone)
    if (params.q && params.q.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(o.customer_name ILIKE :q OR o.customer_phone ILIKE :q)',
        { q },
      );
    }

    // Today only
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

    // Packed filter
    if (params.isPacked === 'true') {
      qb.andWhere('o.is_packed = true');
    } else if (params.isPacked === 'false') {
      qb.andWhere('(o.is_packed = false OR o.is_packed IS NULL)');
    }

    // Invoice printed filter
    if (params.invoicePrinted === 'true') {
      qb.andWhere('o.invoice_printed = true');
    } else if (params.invoicePrinted === 'false') {
      qb.andWhere('(o.invoice_printed = false OR o.invoice_printed IS NULL)');
    }

    // Sticker printed filter
    if (params.stickerPrinted === 'true') {
      qb.andWhere('o.sticker_printed = true');
    } else if (params.stickerPrinted === 'false') {
      qb.andWhere('(o.sticker_printed = false OR o.sticker_printed IS NULL)');
    }

    // Courier ID filter
    if (params.courierId && params.courierId.trim()) {
      qb.andWhere('CAST(o.courier_order_id AS TEXT) ILIKE :courierId', {
        courierId: `%${params.courierId.trim()}%`,
      });
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
    qb.skip(skip).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    // Now fetch items for all these orders
    const orderIds = orders.map((o) => o.id);
    let itemsMap: Record<number, any[]> = {};
    if (orderIds.length > 0) {
      // First try order_items
      const adminItems = await this.orderItemRepository
        .createQueryBuilder('oi')
        .where('oi.order_id IN (:...ids)', { ids: orderIds })
        .getMany();

      // Then try sales_order_items for any orders not in adminItems
      const orderIdsWithAdminItems = new Set(adminItems.map((i) => i.orderId));
      const missingIds = orderIds.filter((id) => !orderIdsWithAdminItems.has(id));

      let checkoutItems: any[] = [];
      if (missingIds.length > 0) {
        checkoutItems = await this.salesOrderItemRepository
          .createQueryBuilder('soi')
          .where('soi.sales_order_id IN (:...ids)', { ids: missingIds })
          .getMany();
      }

      // Build the map
      for (const item of adminItems) {
        if (!itemsMap[item.orderId]) itemsMap[item.orderId] = [];
        itemsMap[item.orderId].push({
          productName: item.productName,
          quantity: Number(item.quantity || 0),
        });
      }
      for (const item of checkoutItems) {
        const orderId = (item as any).salesOrderId;
        if (!itemsMap[orderId]) itemsMap[orderId] = [];
        itemsMap[orderId].push({
          productName: item.productName,
          quantity: Number(item.quantity || 0),
        });
      }
    }

    const data = orders.map((order) => ({
      id: order.id,
      salesOrderNumber: order.salesOrderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      totalAmount: parseFloat(order.totalAmount?.toString() || '0'),
      courierOrderId: order.courierOrderId,
      courierCompany: order.courierCompany,
      trackingId: order.trackingId,
      courierStatus: order.courierStatus,
      orderDate: order.orderDate || order.createdAt,
      isPacked: order.isPacked ?? false,
      invoicePrinted: (order as any).invoicePrinted ?? false,
      stickerPrinted: (order as any).stickerPrinted ?? false,
      status: order.status,
      items: itemsMap[order.id] || [],
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markInvoicePrinted(orderId: number) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    (order as any).invoicePrinted = true;
    (order as any).invoicePrintedAt = new Date();
    await this.salesOrderRepository.save(order);
    return { success: true, message: 'Invoice marked as printed' };
  }

  async markStickerPrinted(orderId: number) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    (order as any).stickerPrinted = true;
    (order as any).stickerPrintedAt = new Date();
    await this.salesOrderRepository.save(order);
    return { success: true, message: 'Sticker marked as printed' };
  }

  async bulkMarkInvoicePrinted(orderIds: number[]) {
    let success = 0;
    let failed = 0;
    for (const id of orderIds) {
      try {
        await this.markInvoicePrinted(id);
        success++;
      } catch {
        failed++;
      }
    }
    return { total: orderIds.length, success, failed };
  }

  async bulkMarkStickerPrinted(orderIds: number[]) {
    let success = 0;
    let failed = 0;
    for (const id of orderIds) {
      try {
        await this.markStickerPrinted(id);
        success++;
      } catch {
        failed++;
      }
    }
    return { total: orderIds.length, success, failed };
  }
}
