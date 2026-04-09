import { Injectable, BadRequestException, ConflictException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrderManagementService {
  private readonly logger = new Logger(OrderManagementService.name);

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
    private inventoryService: InventoryService,
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

      // Only update status if both packed and sticker printed
      const isPacked = order.isPacked === true;
      const stickerPrinted = (order as any).stickerPrinted === true;
      if (!isPacked || !stickerPrinted) {
        this.logger.log(`[Steadfast Refresh] Order #${order.id} not ready (packed=${isPacked}, stickerPrinted=${stickerPrinted}) — status stays '${order.status}'`);
        return order;
      }

      // Use the single status field — no separate courierStatus
      if (String(order.status || '').trim() === latestStatus.trim()) return order;

      const prevStatus = order.status;
      order.status = latestStatus;

      const becameDelivered = this.isDeliveredStatus(latestStatus) && prevStatus !== 'delivered';

      if (becameDelivered) {
        order.deliveredAt = new Date();
      }

      const saved = await this.salesOrderRepository.save(order);

      if (becameDelivered) {
        try {
          const custId = await this.customersService.ensureCustomerForDeliveredOrder({
            customerId: saved.customerId,
            customerPhone: saved.customerPhone,
            customerName: saved.customerName,
            customerEmail: saved.customerEmail,
            orderSource: (saved as any).orderSource,
          });
          if (custId && !saved.customerId) {
            await this.salesOrderRepository.update(saved.id, { customerId: custId });
          }
        } catch {
          // never block courier sync
        }

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
        status: latestStatus,
        remarks: `Steadfast status refreshed${prevStatus ? ` (was: ${prevStatus})` : ''}`,
      });

      await this.logActivity({
        orderId: saved.id,
        actionType: 'courier_status_synced',
        actionDescription: `Steadfast status refreshed to: ${latestStatus}`,
        oldValue: { status: prevStatus },
        newValue: { status: latestStatus },
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
        status: order.status,
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
      .map((i) => `${i.displayName || i.customProductName || i.productName} x${Number(i.quantity || 0)}`)
      .join(', ')
      .slice(0, 250);

    const totalLot = 1;
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

    order.status = 'sent';
    order.shippedAt = new Date();
    order.courierCompany = 'Steadfast';
    order.courierOrderId = String(consignmentId);
    order.trackingId = String(trackingCode);

    await this.salesOrderRepository.save(order);

    await this.courierTrackingRepository.save({
      orderId: order.id,
      courierCompany: 'Steadfast',
      trackingId: String(trackingCode),
      status: 'sent',
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
        status: 'sent',
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
      status: 'sent',
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
    // Return with customProductName so display name can be overridden
    if (orderItems.length > 0) {
      // Fetch products to get Bengali names
      const pids = Array.from(new Set(orderItems.map((i) => Number(i.productId)).filter(Boolean)));
      const prods = pids.length ? await this.productRepository.find({ where: { id: In(pids) } }) : [];
      const prodMap = new Map(prods.map((p) => [Number(p.id), p]));
      return orderItems.map((item) => ({
        ...item,
        // If there's a custom name override, don't send Bengali name — the custom name IS the display name
        productNameBn: item.customProductName ? null : (prodMap.get(Number(item.productId))?.name_bn || null),
        // Display name: prefer customProductName over productName
        displayName: item.customProductName || item.productName,
      }));
    }

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
      const originalName = product?.name_en || (si as any).productName || (si as any).product_name || 'Landing Page Product';
      const customName = (si as any).customProductName || (si as any).custom_product_name || null;

      return {
        id: si.id,
        orderId,
        productId: si.productId ? Number(si.productId) : null,
        productName: originalName,
        productNameBn: customName ? null : (product?.name_bn || null),
        customProductName: customName,
        displayName: customName || originalName,
        variantName: (si as any).variantName || (si as any).variant_name || null,
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
    variantName?: string;
    quantity: number;
    unitPrice: number;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<OrderItem> {
    // ── Migrate sales_order_items → order_items (for website / landing-page orders) ──
    // If the order_items table is still empty for this order but sales_order_items
    // has rows, copy them over first so they are not lost when we insert the new item.
    const existingAdminItems = await this.orderItemRepository.find({ where: { orderId: data.orderId } });
    if (existingAdminItems.length === 0) {
      const salesItems = await this.salesOrderItemRepository.find({ where: { salesOrderId: data.orderId } });
      if (salesItems.length > 0) {
        // Resolve product names for sales_order_items that only store productId
        const productIds = Array.from(new Set(salesItems.map((i) => Number(i.productId)).filter(Boolean)));
        const products = productIds.length
          ? await this.productRepository.find({ where: { id: In(productIds) } })
          : [];
        const productById = new Map(products.map((p) => [Number(p.id), p]));

        let migratedSubtotal = 0;
        for (const si of salesItems) {
          const qty = Number(si.quantity || 0);
          const unit = Number(si.unitPrice || 0);
          const sub = si.lineTotal != null ? Number(si.lineTotal) : qty * unit;
          const product = si.productId ? productById.get(Number(si.productId)) : null;

          const migratedItem = this.orderItemRepository.create({
            orderId: data.orderId,
            productId: si.productId ? Number(si.productId) : 0,
            productName: product?.name_en || (si as any).productName || (si as any).product_name || 'Product',
            customProductName: (si as any).customProductName || (si as any).custom_product_name || null,
            variantName: (si as any).variantName || (si as any).variant_name || undefined,
            quantity: qty,
            unitPrice: unit,
            subtotal: sub,
            updatedBy: data.userId,
          });
          await this.orderItemRepository.save(migratedItem);
          migratedSubtotal += sub;
        }

        // Persist deliveryCharge to DB if it was null or 0, so it's always explicit going forward
        const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
        if (order && (!order.deliveryCharge || Number(order.deliveryCharge) === 0)) {
          const discountAmount = Number(order.discountAmount || 0);
          const derivedDeliveryCharge = Math.max(0, Number(order.totalAmount || 0) - migratedSubtotal + discountAmount);
          order.deliveryCharge = derivedDeliveryCharge as any;
          await this.salesOrderRepository.save(order);
        }

        // Remove migrated rows from sales_order_items so the batchFetchOrderItems
        // query in the listing reads exclusively from `order_items` for this order.
        await this.salesOrderItemRepository.delete({ salesOrderId: data.orderId });
      }
    }

    const subtotal = data.quantity * data.unitPrice;

    // Determine if this is a cross-sell: agent adding product to a website/landing-page order
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    const isCrossSell = order != null && ['website', 'landing_page'].includes(order.orderSource || '');
    // Determine if this is an upsell: agent adding product to an agent-created order
    const isUpsell = order != null && ['admin_panel', 'agent_dashboard'].includes(order.orderSource || '');

    const orderItem = this.orderItemRepository.create({
      orderId: data.orderId,
      productId: data.productId,
      productName: data.productName,
      variantName: data.variantName || undefined,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      subtotal: subtotal,
      updatedBy: data.userId,
      isCrossSell,
      isUpsell,
      addedBy: data.userId,
    });

    const savedItem = await this.orderItemRepository.save(orderItem);

    // ── Recalculate totalAmount = allItemsSubtotal + deliveryCharge - discount ──
    try {
      if (order) {
        const allItems = await this.orderItemRepository.find({ where: { orderId: data.orderId } });
        const newItemsSubtotal = allItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
        const discountAmount = Number(order.discountAmount || 0);
        const dc = Number(order.deliveryCharge || 0);
        order.totalAmount = newItemsSubtotal + dc - discountAmount;
        await this.salesOrderRepository.save(order);
      }
    } catch (e) {
      this.logger.warn(`Failed to update order total after adding item: ${e}`);
    }

    // Log activity
    const variantInfo = data.variantName ? ` [${data.variantName}]` : '';
    await this.logActivity({
      orderId: data.orderId,
      actionType: 'product_added',
      actionDescription: `Added product: ${data.productName}${variantInfo} (Qty: ${data.quantity})`,
      newValue: { productId: data.productId, variantName: data.variantName, quantity: data.quantity, unitPrice: data.unitPrice },
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
      customProductName?: string | null;
      orderId?: number;
      userId: number;
      userName: string;
      ipAddress?: string;
    }
  ): Promise<OrderItem> {
    let item = await this.orderItemRepository.findOne({ where: { id: itemId } });

    // If not found in order_items, the item likely lives in sales_order_items (checkout-created).
    // Auto-migrate ALL items for this order from sales_order_items → order_items, then find it.
    if (!item) {
      // Try to find in sales_order_items
      const salesItem = await this.salesOrderItemRepository.findOne({ where: { id: itemId } });
      if (!salesItem) {
        // Also try with orderId if provided — the itemId might be an index-based lookup
        throw new Error('Order item not found');
      }

      const orderId = salesItem.salesOrderId;

      // Migrate all sales_order_items for this order → order_items
      const existingAdminItems = await this.orderItemRepository.find({ where: { orderId } });
      if (existingAdminItems.length === 0) {
        const salesItems = await this.salesOrderItemRepository.find({ where: { salesOrderId: orderId } });
        if (salesItems.length > 0) {
          const productIds = Array.from(new Set(salesItems.map((i) => Number(i.productId)).filter(Boolean)));
          const products = productIds.length
            ? await this.productRepository.find({ where: { id: In(productIds) } })
            : [];
          const productById = new Map(products.map((p) => [Number(p.id), p]));

          // Map old sales_order_items ids to new order_items ids
          const idMapping = new Map<number, number>();
          let migratedSubtotal = 0;
          for (const si of salesItems) {
            const qty = Number(si.quantity || 0);
            const unit = Number(si.unitPrice || 0);
            const sub = si.lineTotal != null ? Number(si.lineTotal) : qty * unit;
            const product = si.productId ? productById.get(Number(si.productId)) : null;

            const migratedItem = this.orderItemRepository.create({
              orderId,
              productId: si.productId ? Number(si.productId) : 0,
              productName: product?.name_en || (si as any).productName || (si as any).product_name || 'Product',
              customProductName: (si as any).customProductName || (si as any).custom_product_name || null,
              variantName: (si as any).variantName || (si as any).variant_name || undefined,
              quantity: qty,
              unitPrice: unit,
              subtotal: sub,
              updatedBy: data.userId,
            });
            const saved = await this.orderItemRepository.save(migratedItem);
            idMapping.set(si.id, saved.id);
            migratedSubtotal += sub;
          }

          // Persist deliveryCharge if needed
          const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
          if (order && (!order.deliveryCharge || Number(order.deliveryCharge) === 0)) {
            const discountAmount = Number(order.discountAmount || 0);
            const derivedDeliveryCharge = Math.max(0, Number(order.totalAmount || 0) - migratedSubtotal + discountAmount);
            order.deliveryCharge = derivedDeliveryCharge as any;
            await this.salesOrderRepository.save(order);
          }

          // Remove migrated rows
          await this.salesOrderItemRepository.delete({ salesOrderId: orderId });

          // Now find the migrated item by its new ID
          const newItemId = idMapping.get(itemId);
          if (newItemId) {
            item = await this.orderItemRepository.findOne({ where: { id: newItemId } });
          }
        }
      }

      if (!item) throw new Error('Order item not found after migration');
    }

    const oldValue = { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, customProductName: item.customProductName };

    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.unitPrice !== undefined) item.unitPrice = data.unitPrice;
    if (data.customProductName !== undefined) {
      // Allow null/empty to clear the override, trimmed empty string becomes null
      const trimmed = data.customProductName ? data.customProductName.trim() : null;
      item.customProductName = trimmed || null;
    }
    
    item.subtotal = item.quantity * item.unitPrice;
    item.updatedBy = data.userId;

    const updatedItem = await this.orderItemRepository.save(item);

    // Recalculate order total after update
    try {
      const order = await this.salesOrderRepository.findOne({ where: { id: item.orderId } });
      if (order) {
        const allItems = await this.orderItemRepository.find({ where: { orderId: item.orderId } });
        const newItemsSubtotal = allItems.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
        const discountAmount = Number(order.discountAmount || 0);
        const dc = Number(order.deliveryCharge || 0);
        order.totalAmount = newItemsSubtotal + dc - discountAmount;
        await this.salesOrderRepository.save(order);
      }
    } catch (e) {
      this.logger.warn(`Failed to update order total after editing item: ${e}`);
    }

    // Log activity
    await this.logActivity({
      orderId: item.orderId,
      actionType: 'product_updated',
      actionDescription: `Updated product: ${item.customProductName || item.productName}`,
      oldValue,
      newValue: { quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal, customProductName: item.customProductName },
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

  // ==================== DELIVERY CHARGE ====================

  async updateDeliveryCharge(data: {
    orderId: number;
    deliveryCharge: number;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Calculate current subtotal from items
    const items = await this.orderItemRepository.find({ where: { orderId: data.orderId } });
    let subtotal = 0;
    if (items.length > 0) {
      subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    } else {
      const salesItems = await this.salesOrderItemRepository.find({ where: { salesOrderId: data.orderId } });
      subtotal = salesItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    }

    const discountAmount = Number(order.discountAmount || 0);
    const newDeliveryCharge = Number(data.deliveryCharge || 0);
    const oldDeliveryCharge = Math.max(0, Number(order.totalAmount || 0) - subtotal + discountAmount);

    // Recalculate total: subtotal + deliveryCharge - discount
    order.totalAmount = subtotal + newDeliveryCharge - discountAmount;
    order.deliveryCharge = newDeliveryCharge as any;

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId: data.orderId,
      actionType: 'delivery_charge_updated',
      actionDescription: `Delivery charge updated from ৳${oldDeliveryCharge.toFixed(2)} to ৳${newDeliveryCharge.toFixed(2)}`,
      oldValue: { deliveryCharge: oldDeliveryCharge, totalAmount: Number(order.totalAmount) },
      newValue: { deliveryCharge: newDeliveryCharge, totalAmount: updatedOrder.totalAmount },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return updatedOrder;
  }

  // ==================== DISCOUNT ====================

  async updateDiscount(data: {
    orderId: number;
    discountAmount: number;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<SalesOrder> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Calculate current subtotal from items
    const items = await this.orderItemRepository.find({ where: { orderId: data.orderId } });
    let subtotal = 0;
    if (items.length > 0) {
      subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    } else {
      const salesItems = await this.salesOrderItemRepository.find({ where: { salesOrderId: data.orderId } });
      subtotal = salesItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    }

    const oldDiscount = Number(order.discountAmount || 0);
    const newDiscount = Number(data.discountAmount || 0);
    const currentDeliveryCharge = Math.max(0, Number(order.totalAmount || 0) - subtotal + oldDiscount);

    // Update discount and recalculate total
    order.discountAmount = newDiscount as any;
    order.totalAmount = subtotal + currentDeliveryCharge - newDiscount;

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId: data.orderId,
      actionType: 'discount_updated',
      actionDescription: `Discount updated from ৳${oldDiscount.toFixed(2)} to ৳${newDiscount.toFixed(2)}`,
      oldValue: { discountAmount: oldDiscount, totalAmount: Number(order.totalAmount) },
      newValue: { discountAmount: newDiscount, totalAmount: updatedOrder.totalAmount },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return updatedOrder;
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

    // Only orders in "processing" status can be approved
    if (order.status !== 'processing') {
      throw new ConflictException(`Order cannot be approved — only orders with "processing" status can be approved (current status: "${order.status}")`);
    }

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

    // Cannot hold if already picked/in_transit/delivered
    if (['picked', 'in_transit', 'delivered'].includes(order.status)) {
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

    order.status = 'processing';

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'unhold',
      actionDescription: `Order resumed from hold by ${userName}`,
      oldValue: { status: 'hold' },
      newValue: { status: 'processing' },
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

    // Cannot cancel if already picked/in_transit/delivered/cancelled
    if (['picked', 'in_transit', 'delivered', 'cancelled', 'admin_cancelled'].includes(order.status)) {
      throw new Error('Cannot cancel order - already shipped or cancelled');
    }

    if (!cancelReason || cancelReason.trim() === '') {
      throw new Error('Cancel reason is required');
    }

    const oldStatus = order.status;
    order.status = 'admin_cancelled';
    order.cancelReason = cancelReason;
    order.cancelledBy = userId;
    order.cancelledAt = new Date();

    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'admin_cancelled',
      actionDescription: `Order cancelled by ${userName}. Reason: ${cancelReason}`,
      oldValue: { status: oldStatus },
      newValue: { status: 'admin_cancelled', cancelReason },
      performedBy: userId,
      performedByName: userName,
      ipAddress,
    });

    // Release stock reservations
    try {
      await this.inventoryService.releaseReservation(orderId);
    } catch (err) {
      this.logger.warn(`Failed to release stock for cancelled order #${orderId}: ${(err as any)?.message}`);
    }

    return updatedOrder;
  }

  async changeOrderStatus(
    orderId: number,
    newStatus: string,
    userId: number,
    userName: string,
    ipAddress?: string
  ): Promise<SalesOrder> {
    const validStatuses = [
      'processing', 'approved', 'sent', 'pending', 'in_review',
      'in_transit', 'picked', 'hold', 'shipped', 'delivered',
      'partial_delivered', 'completed', 'cancelled', 'admin_cancelled', 'returned',
    ];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid status: ${newStatus}`);
    }

    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const oldStatus = order.status;
    order.status = newStatus;
    const updatedOrder = await this.salesOrderRepository.save(order);

    await this.logActivity({
      orderId,
      actionType: 'status_changed',
      actionDescription: `Order status manually changed from "${oldStatus}" to "${newStatus}" by ${userName}`,
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      performedBy: userId,
      performedByName: userName,
      ipAddress,
    });

    // Handle inventory side-effects of status changes
    try {
      if (['cancelled', 'admin_cancelled'].includes(newStatus) && !['cancelled', 'admin_cancelled'].includes(oldStatus)) {
        // Release stock reservations on cancel
        await this.inventoryService.releaseReservation(orderId);
      }
      if (newStatus === 'returned' && oldStatus !== 'returned') {
        // Restock returned items (default: Grade A restock to warehouse 1)
        const orderItems = await this.salesOrderItemRepository.find({ where: { salesOrderId: orderId } });
        const restockItems = orderItems
          .filter(oi => oi.productId && oi.quantity > 0)
          .map(oi => ({ product_id: oi.productId!, quantity: oi.quantity, condition: 'restock' as const }));
        if (restockItems.length > 0) {
          await this.inventoryService.restockReturn({
            salesOrderId: orderId,
            items: restockItems,
            warehouseId: 1, // Default warehouse
            performedBy: userId,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Inventory side-effect failed for order #${orderId} status→${newStatus}: ${(err as any)?.message}`);
    }

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

    order.status = 'sent';
    order.courierCompany = data.courierCompany;
    order.courierOrderId = data.courierOrderId || '';
    order.trackingId = data.trackingId;
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

    // Dispatch stock: deduct via FEFO, release reservations, record movements
    try {
      const orderItems = await this.salesOrderItemRepository.find({
        where: { salesOrderId: data.orderId },
      });
      const dispatchItems = orderItems
        .filter(oi => oi.productId && oi.quantity > 0)
        .map(oi => ({ product_id: oi.productId!, quantity: oi.quantity }));
      if (dispatchItems.length > 0) {
        await this.inventoryService.dispatchStock({
          salesOrderId: data.orderId,
          items: dispatchItems,
          performedBy: data.userId,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Stock dispatch failed for order #${data.orderId}: ${err?.message}`);
    }

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

    const prevStatus = order.status;
    order.status = data.status;

    const becameDelivered = data.status === 'delivered' && prevStatus !== 'delivered';

    if (becameDelivered) {
      order.deliveredAt = new Date();
    }

    const saved = await this.salesOrderRepository.save(order);

    if (becameDelivered) {
      // Ensure customer record exists for lead assignment
      try {
        const custId = await this.customersService.ensureCustomerForDeliveredOrder({
          customerId: saved.customerId,
          customerPhone: saved.customerPhone,
          customerName: saved.customerName,
          customerEmail: saved.customerEmail,
          orderSource: (saved as any).orderSource,
        });
        if (custId && !saved.customerId) {
          await this.salesOrderRepository.update(saved.id, { customerId: custId });
        }
      } catch {
        // never block courier updates
      }

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
      actionDescription: `Status updated to: ${data.status}`,
      newValue: { status: data.status, location: data.location },
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

  /**
   * Call Steadfast API live to get the current delivery status for a tracking code.
   * Returns null if the API is unavailable or credentials are missing.
   */
  async getLiveSteadfastStatus(trackingCode: string): Promise<string | null> {
    if (!trackingCode) return null;
    try {
      const headers = this.getSteadfastHeaders();
      const url = `${this.steadfastBaseUrl}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`;
      const res = await axios.get(url, { headers, timeout: 15000 });
      return this.extractSteadfastStatus(res.data);
    } catch {
      return null;
    }
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

    // Always compute reliable deliveryCharge for the response.
    // Use the DB column if it has a real value; otherwise derive from totalAmount.
    const allItemsSubtotal = items.reduce((sum: number, i: any) => sum + Number(i.subtotal || 0), 0);
    const oDiscount = Number(orderWithCourierSync.discountAmount || 0);
    let resolvedDeliveryCharge = Number(orderWithCourierSync.deliveryCharge || 0);
    if (resolvedDeliveryCharge === 0 && Number(orderWithCourierSync.totalAmount || 0) > allItemsSubtotal) {
      resolvedDeliveryCharge = Math.max(0, Number(orderWithCourierSync.totalAmount || 0) - allItemsSubtotal + oDiscount);
    }

    const orderHistory = orderHistoryRows.map((o) => ({
      id: o.id,
      salesOrderNumber: o.salesOrderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount || 0),
      createdAt: o.createdAt,
      orderDate: o.orderDate || o.createdAt,
    }));

    // ──── Active unused coupon codes for this customer (by phone) ────
    let activeCouponCodes: string[] = [];
    const normPhone = customerPhone.replace(/^\+88/, '').trim();
    if (normPhone) {
      const couponRows: { code: string }[] = await this.salesOrderRepository.query(
        `SELECT camp.code
         FROM campaign_customers cc
         INNER JOIN coupon_campaigns camp ON camp.id = cc.campaign_id
         WHERE cc.is_active = true
           AND camp.is_active = true
           AND camp.code IS NOT NULL
           AND cc.times_used < camp.per_customer_limit
           AND (camp.valid_until IS NULL OR camp.valid_until > NOW())
           AND (camp.valid_from IS NULL OR camp.valid_from <= NOW())
           AND REPLACE(cc.customer_phone, '+88', '') = $1`,
        [normPhone],
      );
      activeCouponCodes = couponRows.map(r => r.code);
    }

    // ──── Customer tags (by customer_id) ────
    let customerTags: { name: string; color: string | null }[] = [];
    if (customerId) {
      const tagRows: { name: string; color: string | null }[] = await this.salesOrderRepository.query(
        `SELECT ct.name, ct.color
         FROM customer_tag_assignments cta
         INNER JOIN customer_tags ct ON ct.id = cta.tag_id
         WHERE cta.customer_id = $1
         ORDER BY ct.name`,
        [customerId],
      );
      customerTags = tagRows;
    }

    return {
      ...orderWithCourierSync,
      deliveryCharge: resolvedDeliveryCharge,
      items,
      activityLogs,
      courierTracking,
      customer,
      customerRecord,
      orderHistory,
      activeCouponCodes,
      customerTags,
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
   * Handle webhook callbacks from Steadfast courier.
   *
   * Steadfast sends two notification types:
   *   1. `delivery_status` — status changed (pending → delivered / cancelled etc.)
   *   2. `tracking_update`  — intermediate tracking event (arrived at hub, out for delivery, …)
   *
   * The Bearer-token authentication is handled by SteadfastWebhookGuard
   * before this method is called.
   */
  async handleSteadfastWebhook(
    dto: import('./dto/steadfast-webhook.dto').SteadfastWebhookDto,
    headers: Record<string, any>,
  ): Promise<{ status: string; message: string }> {
    const notificationType = dto.notification_type || 'delivery_status';
    const consignmentId = dto.consignment_id;
    const invoice = dto.invoice;
    const trackingCode = dto.tracking_code;

    this.logger.log(
      `[Steadfast Webhook] type=${notificationType} CID=${consignmentId ?? '—'} INV=${invoice ?? '—'}`,
    );

    // ── Resolve the matching order ──
    const order = await this.resolveSteadfastOrder(consignmentId, trackingCode, invoice);

    if (!order) {
      const msg = `Order not found: CID=${consignmentId ?? '—'}, TC=${trackingCode ?? '—'}, INV=${invoice ?? '—'}`;
      this.logger.warn(`[Steadfast Webhook] ${msg}`);
      return { status: 'error', message: msg };
    }

    // ── Route by notification type ──
    if (notificationType === 'tracking_update') {
      return this.handleSteadfastTrackingUpdate(order, dto);
    }

    // Default: delivery_status
    return this.handleSteadfastDeliveryStatus(order, dto);
  }

  /**
   * Handle `delivery_status` webhook — updates order status, COD, delivery charge.
   */
  private async handleSteadfastDeliveryStatus(
    order: SalesOrder,
    dto: import('./dto/steadfast-webhook.dto').SteadfastWebhookDto,
  ): Promise<{ status: string; message: string }> {
    const newStatus = this.extractSteadfastStatus(dto);

    if (!newStatus) {
      this.logger.warn(`[Steadfast Webhook] delivery_status payload has no status field — order #${order.id}`);
      return { status: 'error', message: 'No status in webhook payload' };
    }

    // Only update status if both packed and sticker printed
    const isPacked = order.isPacked === true;
    const stickerPrinted = (order as any).stickerPrinted === true;

    // Always update COD & delivery charge if provided (even when status hasn't changed)
    if (dto.cod_amount != null) order.codAmount = dto.cod_amount;
    if (dto.delivery_charge != null) order.deliveryCharge = dto.delivery_charge;

    if (!isPacked || !stickerPrinted) {
      // Save COD/charge updates but keep status as 'sent'
      await this.salesOrderRepository.save(order);
      this.logger.log(`[Steadfast Webhook] Order #${order.id} not ready (packed=${isPacked}, stickerPrinted=${stickerPrinted}) — status stays '${order.status}', COD/charge updated`);

      // Still record the tracking history for audit
      await this.courierTrackingRepository.save({
        orderId: order.id,
        courierCompany: 'Steadfast',
        trackingId: order.trackingId,
        status: newStatus,
        notificationType: 'delivery_status',
        trackingMessage: dto.tracking_message || null,
        codAmount: dto.cod_amount ?? null,
        deliveryCharge: dto.delivery_charge ?? null,
        consignmentId: dto.consignment_id != null ? String(dto.consignment_id) : null,
        rawPayload: dto,
        remarks: `Steadfast webhook: status=${newStatus} (NOT applied — packed=${isPacked}, stickerPrinted=${stickerPrinted})`,
      });

      return { status: 'success', message: 'Order not ready for status update (packed/sticker not done), financial fields updated' };
    }

    const prevStatus = order.status;
    const statusChanged = String(prevStatus || '').trim() !== newStatus.trim();

    if (!statusChanged) {
      // Save COD/charge updates even if status is the same
      await this.salesOrderRepository.save(order);
      this.logger.log(`[Steadfast Webhook] Status unchanged for order #${order.id} (${newStatus}), COD/charge updated`);
      return { status: 'success', message: 'Status unchanged, financial fields updated' };
    }

    // Set the single unified status directly from Steadfast
    order.status = newStatus;

    const becameDelivered = this.isDeliveredStatus(newStatus) && prevStatus !== 'delivered';
    const becameCancelled = newStatus === 'cancelled' && prevStatus !== 'cancelled';

    if (becameDelivered) {
      order.deliveredAt = new Date();
    }

    if (becameCancelled) {
      order.cancelReason = order.cancelReason || 'Cancelled by courier (Steadfast)';
      order.cancelledAt = new Date();
    }

    const saved = await this.salesOrderRepository.save(order);

    // ── Post-delivery async side-effects ──
    if (becameDelivered) {
      this.executeSteadfastPostDeliveryActions(saved);
    }

    // ── Tracking history record ──
    await this.courierTrackingRepository.save({
      orderId: saved.id,
      courierCompany: 'Steadfast',
      trackingId: saved.trackingId,
      status: newStatus,
      notificationType: 'delivery_status',
      trackingMessage: dto.tracking_message || null,
      codAmount: dto.cod_amount ?? null,
      deliveryCharge: dto.delivery_charge ?? null,
      consignmentId: dto.consignment_id != null ? String(dto.consignment_id) : null,
      rawPayload: dto,
      remarks: `Steadfast webhook: ${prevStatus || 'null'} → ${newStatus}`,
    });

    // ── Activity log ──
    await this.logActivity({
      orderId: saved.id,
      actionType: 'courier_status_webhook',
      actionDescription: `Steadfast delivery_status webhook: ${prevStatus || 'null'} → ${newStatus}${dto.tracking_message ? ` — "${dto.tracking_message}"` : ''}`,
      oldValue: { status: prevStatus },
      newValue: { status: newStatus, codAmount: dto.cod_amount, deliveryCharge: dto.delivery_charge },
      performedBy: undefined,
      performedByName: 'Steadfast Webhook',
    });

    this.logger.log(
      `[Steadfast Webhook] Order #${saved.id} delivery_status: ${prevStatus || 'null'} → ${newStatus}`,
    );

    return {
      status: 'success',
      message: `Order #${saved.id} status updated: ${prevStatus || 'null'} → ${newStatus}`,
    };
  }

  /**
   * Handle `tracking_update` webhook — logs the tracking event without changing order status.
   */
  private async handleSteadfastTrackingUpdate(
    order: SalesOrder,
    dto: import('./dto/steadfast-webhook.dto').SteadfastWebhookDto,
  ): Promise<{ status: string; message: string }> {
    const trackingMessage = dto.tracking_message || 'Tracking update received';

    // ── Tracking history record ──
    await this.courierTrackingRepository.save({
      orderId: order.id,
      courierCompany: 'Steadfast',
      trackingId: order.trackingId,
      status: order.status || 'in_transit',
      notificationType: 'tracking_update',
      trackingMessage,
      consignmentId: dto.consignment_id != null ? String(dto.consignment_id) : null,
      rawPayload: dto,
      remarks: `Tracking update: ${trackingMessage}`,
    });

    // ── Activity log ──
    await this.logActivity({
      orderId: order.id,
      actionType: 'courier_tracking_webhook',
      actionDescription: `Steadfast tracking_update: ${trackingMessage}`,
      oldValue: null,
      newValue: { trackingMessage, updatedAt: dto.updated_at },
      performedBy: undefined,
      performedByName: 'Steadfast Webhook',
    });

    this.logger.log(`[Steadfast Webhook] Order #${order.id} tracking_update: ${trackingMessage}`);

    return {
      status: 'success',
      message: `Tracking update logged for order #${order.id}`,
    };
  }

  /**
   * Resolve SalesOrder from Steadfast identifiers. Tries consignment_id, tracking_code, invoice in order.
   */
  private async resolveSteadfastOrder(
    consignmentId?: number,
    trackingCode?: string,
    invoice?: string,
  ): Promise<SalesOrder | null> {
    if (consignmentId) {
      const order = await this.salesOrderRepository.findOne({
        where: { courierOrderId: String(consignmentId), courierCompany: 'Steadfast' },
      });
      if (order) return order;
    }

    if (trackingCode) {
      const order = await this.salesOrderRepository.findOne({
        where: { trackingId: String(trackingCode), courierCompany: 'Steadfast' },
      });
      if (order) return order;
    }

    if (invoice) {
      const order = await this.salesOrderRepository.findOne({
        where: { salesOrderNumber: invoice, courierCompany: 'Steadfast' },
      });
      if (order) return order;
    }

    return null;
  }

  /**
   * Fire-and-forget post-delivery side-effects.
   * Errors are caught and logged — they must never block the webhook response.
   */
  private executeSteadfastPostDeliveryActions(order: SalesOrder): void {
    // Ensure customer record exists for lead assignment
    this.customersService
      .ensureCustomerForDeliveredOrder({
        customerId: order.customerId,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        orderSource: (order as any).orderSource,
      })
      .then((custId) => {
        if (custId && !order.customerId) {
          return this.salesOrderRepository.update(order.id, { customerId: custId });
        }
      })
      .catch((err) => this.logger.error(`[Steadfast Webhook] Customer ensure failed for order #${order.id}: ${err.message}`));

    // Referral completion
    this.loyaltyService
      .autoCompleteReferralForDeliveredOrder({ orderId: order.id, customerId: order.customerId })
      .catch((err) => this.logger.error(`[Steadfast Webhook] Referral completion failed for order #${order.id}: ${err.message}`));

    // WhatsApp nudge
    this.whatsAppService
      .sendReferralNudgeOnDeliveredOrder({ orderId: order.id, customerId: order.customerId })
      .catch((err) => this.logger.error(`[Steadfast Webhook] WhatsApp nudge failed for order #${order.id}: ${err.message}`));
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
        status: In(['sent', 'shipped']),
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

  // ==================== PATHAO COURIER INTEGRATION ====================

  private readonly pathaoBaseUrl = process.env.PATHAO_BASE_URL || 'https://courier-api-sandbox.pathao.com';
  private pathaoAccessToken: string | null = null;
  private pathaoTokenExpiresAt: number = 0;

  /**
   * Issue or refresh a Pathao access token using client credentials + password grant.
   */
  private async getPathaoAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.pathaoAccessToken && Date.now() < this.pathaoTokenExpiresAt - 60000) {
      return this.pathaoAccessToken;
    }

    const clientId = process.env.PATHAO_CLIENT_ID || '';
    const clientSecret = process.env.PATHAO_CLIENT_SECRET || '';
    const username = process.env.PATHAO_USERNAME || '';
    const password = process.env.PATHAO_PASSWORD || '';

    if (!clientId || !clientSecret || !username || !password) {
      throw new BadRequestException(
        'Pathao API credentials are not configured. Please set PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD in backend/.env',
      );
    }

    try {
      const res = await axios.post(
        `${this.pathaoBaseUrl}/aladdin/api/v1/issue-token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
          grant_type: 'password',
        },
        { timeout: 20000 },
      );

      const { access_token, expires_in } = res.data;
      if (!access_token) throw new Error('No access_token in response');

      this.pathaoAccessToken = access_token;
      // expires_in is in seconds
      this.pathaoTokenExpiresAt = Date.now() + (expires_in || 3600) * 1000;

      return access_token;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to obtain Pathao access token';
      throw new HttpException(
        { statusCode: HttpStatus.BAD_GATEWAY, message: `Pathao auth error: ${msg}` },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async getPathaoHeaders(): Promise<Record<string, string>> {
    const token = await this.getPathaoAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Get Pathao store list for the merchant account.
   */
  async getPathaoStores(): Promise<any> {
    const headers = await this.getPathaoHeaders();
    const res = await axios.get(`${this.pathaoBaseUrl}/aladdin/api/v1/stores`, {
      headers,
      timeout: 20000,
    });
    return res.data?.data?.data || res.data?.data || [];
  }

  /**
   * Get Pathao city list.
   */
  async getPathaoCities(): Promise<any> {
    const headers = await this.getPathaoHeaders();
    const res = await axios.get(`${this.pathaoBaseUrl}/aladdin/api/v1/countries/1/city-list`, {
      headers,
      timeout: 20000,
    });
    return res.data?.data?.data || res.data?.data || [];
  }

  /**
   * Get Pathao zone list by city ID.
   */
  async getPathaoZones(cityId: number): Promise<any> {
    const headers = await this.getPathaoHeaders();
    const res = await axios.get(`${this.pathaoBaseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
      headers,
      timeout: 20000,
    });
    return res.data?.data?.data || res.data?.data || [];
  }

  /**
   * Get Pathao area list by zone ID.
   */
  async getPathaoAreas(zoneId: number): Promise<any> {
    const headers = await this.getPathaoHeaders();
    const res = await axios.get(`${this.pathaoBaseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
      headers,
      timeout: 20000,
    });
    return res.data?.data?.data || res.data?.data || [];
  }

  /**
   * Calculate Pathao delivery price.
   */
  async getPathaoPriceCalculation(data: {
    store_id: number;
    item_type: number;
    delivery_type: number;
    item_weight: number;
    recipient_city: number;
    recipient_zone: number;
  }): Promise<any> {
    const headers = await this.getPathaoHeaders();
    const res = await axios.post(
      `${this.pathaoBaseUrl}/aladdin/api/v1/merchant/price-plan`,
      data,
      { headers, timeout: 20000 },
    );
    return res.data?.data || res.data;
  }

  /**
   * Send an order to Pathao Courier via API.
   */
  /**
   * Resolve store_id: use provided value, or fetch default/first store from Pathao.
   */
  private async resolvePathaoStoreId(storeId?: number): Promise<number> {
    if (storeId && storeId > 0) return storeId;
    const stores = await this.getPathaoStores();
    const defaultStore = stores.find((s: any) => s.is_default_store) || stores[0];
    if (!defaultStore?.store_id) {
      throw new BadRequestException('No Pathao store found. Please create a store in your Pathao merchant account.');
    }
    return defaultStore.store_id;
  }

  /**
   * Extract meaningful tokens from a Bangladeshi address for zone matching.
   * Strips house/road/flat noise labels WITH their values.
   * Keeps section/block VALUES (important for zone matching like "Mirpur 10").
   */
  private extractAddressTokens(address: string): Set<string> {
    let cleaned = address.toLowerCase();
    // Remove house/road/flat labels with their values (noise for zone matching)
    cleaned = cleaned.replace(/\b(house|road|flat|floor|plot|holding|lane|gate)\s*[:# \-]?\s*\S*/gi, '');
    // Remove section/block/sector labels but KEEP their values (e.g., "Section: 10" → "10")
    cleaned = cleaned.replace(/\b(section|block|sector)\s*[:# \-]?\s*/gi, '');
    return new Set(cleaned.split(/[\s,.\-\/\\:;#()|]+/).filter(Boolean));
  }

  /**
   * Smart match a Pathao city from address text.
   */
  private async resolvePathaoCityFromAddress(address: string): Promise<{ city_id: number; city_name: string } | null> {
    const cities = await this.getPathaoCities();
    if (!cities?.length) return null;
    const addrLower = address.toLowerCase();
    for (const c of cities) {
      const name = String(c.city_name || '').toLowerCase();
      if (name && addrLower.includes(name)) {
        return { city_id: c.city_id, city_name: c.city_name };
      }
    }
    return null;
  }

  /**
   * Smart match a Pathao zone from address text within a city.
   * Uses token-set matching: extracts tokens from address (after stripping noise),
   * then finds the zone whose name tokens are ALL present in the address tokens.
   * Among full matches, prefers the zone with the most tokens (most specific).
   */
  private async resolvePathaoZoneFromAddress(cityId: number, address: string): Promise<{ zone_id: number; zone_name: string } | null> {
    const zones = await this.getPathaoZones(cityId);
    if (!zones?.length) return null;

    const addrLower = address.toLowerCase();
    const addrTokens = this.extractAddressTokens(address);

    let bestMatch: any = null;
    let bestScore = 0;

    for (const z of zones) {
      const zoneName = String(z.zone_name || '').toLowerCase().trim();
      if (!zoneName) continue;

      let score = 0;

      // Strategy 1: Exact zone name found as substring in raw address (highest confidence)
      if (addrLower.includes(zoneName)) {
        score = 200 + zoneName.length;
      }

      // Strategy 2: All zone-name tokens found in cleaned address tokens
      if (score === 0) {
        const zoneTokens = zoneName.split(/[\s,.\-\/\\:;#()|]+/).filter(Boolean);
        if (zoneTokens.length > 0) {
          const matchCount = zoneTokens.filter(zt => addrTokens.has(zt)).length;
          if (matchCount === zoneTokens.length) {
            // Full match — all zone words found. Prefer more specific (more tokens).
            score = 100 + zoneTokens.length * 10;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = z;
      }
    }

    if (bestMatch && bestScore >= 100) {
      return { zone_id: bestMatch.zone_id, zone_name: bestMatch.zone_name };
    }
    return null;
  }

  async sendToPathao(data: {
    orderId: number;
    storeId?: number;
    recipientCity?: number;
    recipientZone?: number;
    recipientArea?: number;
    itemWeight?: number;
    userId: number;
    userName: string;
    ipAddress?: string;
  }): Promise<any> {
    const order = await this.salesOrderRepository.findOne({ where: { id: data.orderId } });
    if (!order) throw new Error('Order not found');

    if (order.courierCompany && String(order.courierCompany).toLowerCase() === 'pathao' && order.trackingId) {
      return {
        success: true,
        message: 'Order already sent to Pathao',
        courierCompany: order.courierCompany,
        courierOrderId: order.courierOrderId,
        trackingId: order.trackingId,
        status: order.status,
      };
    }

    const items = await this.getOrderItems(order.id);
    const recipientName = (order.customerName ? String(order.customerName).trim() : '') || 'N/A';
    const recipientPhone = this.normalizeBdPhone(order.customerPhone);
    const recipientAddress = (order.shippingAddress ? String(order.shippingAddress).trim() : '') || (order.notes ? String(order.notes).trim() : '');

    if (!recipientPhone || recipientPhone.length !== 11) {
      throw new BadRequestException('Customer phone must be a valid 11 digit number to send to Pathao');
    }
    if (!recipientAddress) {
      throw new BadRequestException('Shipping address is required to send to Pathao');
    }

    // Auto-resolve store
    const resolvedStoreId = await this.resolvePathaoStoreId(data.storeId);

    // Auto-resolve city/zone if not provided
    let resolvedCity = data.recipientCity && data.recipientCity > 0 ? data.recipientCity : 0;
    let resolvedZone = data.recipientZone && data.recipientZone > 0 ? data.recipientZone : 0;

    if (!resolvedCity) {
      const matched = await this.resolvePathaoCityFromAddress(recipientAddress);
      if (!matched) {
        throw new BadRequestException(
          `Could not auto-detect city from address "${recipientAddress.slice(0, 80)}…". Please send from Order Details with manual city/zone selection.`,
        );
      }
      resolvedCity = matched.city_id;
    }

    if (!resolvedZone) {
      const matched = await this.resolvePathaoZoneFromAddress(resolvedCity, recipientAddress);
      if (!matched) {
        throw new BadRequestException(
          `Could not auto-detect zone from address "${recipientAddress.slice(0, 80)}…". Please send from Order Details with manual city/zone selection.`,
        );
      }
      resolvedZone = matched.zone_id;
    }

    const codAmount = Math.max(0, Number(order.totalAmount || 0) - Number(order.discountAmount || 0));
    if (!Number.isFinite(codAmount)) {
      throw new BadRequestException('Invalid COD amount');
    }

    const itemDescription = items
      .slice(0, 20)
      .map((i) => `${i.displayName || i.customProductName || i.productName} x${Number(i.quantity || 0)}`)
      .join(', ')
      .slice(0, 250);

    const itemQuantity = items.reduce((sum, i) => sum + Number(i.quantity || 1), 0);

    const noteParts = [order.courierNotes, order.riderInstructions].filter(Boolean).map((v) => String(v));
    const specialInstruction = noteParts.join(' | ').slice(0, 250) || '';

    const merchantOrderId = order.salesOrderNumber
      ? String(order.salesOrderNumber).trim()
      : String(order.id);

    const payload: any = {
      store_id: resolvedStoreId,
      merchant_order_id: merchantOrderId,
      recipient_name: recipientName.slice(0, 100),
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress.slice(0, 500),
      recipient_city: resolvedCity,
      recipient_zone: resolvedZone,
      delivery_type: 48, // Normal delivery (48 hours)
      item_type: 2, // Parcel
      item_quantity: itemQuantity,
      item_weight: data.itemWeight || 0.5,
      amount_to_collect: codAmount,
      item_description: itemDescription,
    };

    if (data.recipientArea) {
      payload.recipient_area = data.recipientArea;
    }
    if (specialInstruction) {
      payload.special_instruction = specialInstruction;
    }

    let resData: any;
    try {
      const headers = await this.getPathaoHeaders();
      const res = await axios.post(
        `${this.pathaoBaseUrl}/aladdin/api/v1/orders`,
        payload,
        { headers, timeout: 20000 },
      );
      resData = res.data;
    } catch (e: any) {
      const extStatus = e?.response?.status;
      const errData = e?.response?.data;
      const errors = errData?.errors || undefined;

      if (extStatus === 401 || extStatus === 403) {
        // Invalidate cached token and retry once
        this.pathaoAccessToken = null;
        this.pathaoTokenExpiresAt = 0;
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_GATEWAY,
            message: 'Pathao API authentication failed. Please verify Pathao credentials in backend/.env.',
            errors,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      const msg = errData?.message || e?.message || 'Failed to connect to Pathao';
      throw new HttpException(
        { statusCode: HttpStatus.BAD_GATEWAY, message: `Pathao error: ${msg}`, errors },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const consignmentId = resData?.data?.consignment_id ?? null;
    const deliveryFee = resData?.data?.delivery_fee ?? null;
    const orderStatus = resData?.data?.order_status ?? null;

    if (!consignmentId) {
      throw new BadRequestException(resData?.message || 'Pathao did not return consignment_id');
    }

    order.status = 'sent';
    order.shippedAt = new Date();
    order.courierCompany = 'Pathao';
    order.courierOrderId = String(consignmentId);
    order.trackingId = String(consignmentId);
    if (deliveryFee != null) order.deliveryCharge = deliveryFee;

    await this.salesOrderRepository.save(order);

    await this.courierTrackingRepository.save({
      orderId: order.id,
      courierCompany: 'Pathao',
      trackingId: String(consignmentId),
      status: 'sent',
      remarks: `Consignment created in Pathao. Delivery fee: ${deliveryFee ?? 'N/A'}`,
    });

    await this.logActivity({
      orderId: order.id,
      actionType: 'shipped',
      actionDescription: `Order sent to Pathao. Consignment: ${consignmentId}`,
      newValue: {
        courierCompany: 'Pathao',
        courierOrderId: String(consignmentId),
        trackingId: String(consignmentId),
        status: 'sent',
        deliveryFee,
      },
      performedBy: data.userId,
      performedByName: data.userName,
      ipAddress: data.ipAddress,
    });

    return {
      success: true,
      message: resData?.message || 'Sent to Pathao',
      courierCompany: 'Pathao',
      courierOrderId: String(consignmentId),
      trackingId: String(consignmentId),
      deliveryFee,
      status: 'sent',
      raw: resData,
    };
  }

  /**
   * Get Pathao order status by consignment ID.
   */
  async getPathaoOrderStatus(consignmentId: string): Promise<any> {
    const headers = await this.getPathaoHeaders();
    const res = await axios.get(
      `${this.pathaoBaseUrl}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
      { headers, timeout: 20000 },
    );
    return res.data?.data || res.data;
  }

  /**
   * Map Pathao order_status to our internal status.
   */
  private mapPathaoStatus(pathaoStatus: string): string {
    const s = String(pathaoStatus).toLowerCase().replace(/[-_\s]/g, '');
    const map: Record<string, string> = {
      pending: 'pending',
      pickup: 'pickup',
      pickuppending: 'pickup_pending',
      atthehub: 'in_transit',
      intransit: 'in_transit',
      delivered: 'delivered',
      return: 'returned',
      returned: 'returned',
      onhold: 'on_hold',
      cancelled: 'cancelled',
      partialdelivered: 'partial_delivered',
    };
    return map[s] || pathaoStatus;
  }

  /**
   * Handle Pathao webhook notifications.
   */
  async handlePathaoWebhook(
    dto: import('./dto/pathao-webhook.dto').PathaoWebhookDto,
    headers: Record<string, any>,
  ): Promise<{ status: string; message: string }> {
    const consignmentId = dto.consignment_id;
    const orderStatus = dto.order_status || dto.order_status_slug;

    this.logger.log(
      `[Pathao Webhook] Received — CID=${consignmentId ?? '—'} status=${orderStatus ?? '—'} ` +
        `merchant_order_id=${dto.merchant_order_id ?? '—'} reason=${dto.reason ?? '—'}`,
    );
    this.logger.debug(`[Pathao Webhook] Full payload: ${JSON.stringify(dto)}`);

    if (!consignmentId) {
      this.logger.warn('[Pathao Webhook] Missing consignment_id in payload');
      return { status: 'error', message: 'Missing consignment_id in webhook payload' };
    }

    // Find the order by courier order ID (consignment_id)
    const order = await this.salesOrderRepository.findOne({
      where: {
        courierCompany: 'Pathao',
        courierOrderId: String(consignmentId),
      },
    });

    if (!order) {
      // Try by tracking_id
      const orderByTracking = await this.salesOrderRepository.findOne({
        where: {
          courierCompany: 'Pathao',
          trackingId: String(consignmentId),
        },
      });

      if (!orderByTracking) {
        const msg = `Order not found for Pathao consignment ${consignmentId}`;
        this.logger.warn(`[Pathao Webhook] ${msg}`);
        return { status: 'error', message: msg };
      }

      return this.processPathaoStatusUpdate(orderByTracking, dto);
    }

    return this.processPathaoStatusUpdate(order, dto);
  }

  private async processPathaoStatusUpdate(
    order: SalesOrder,
    dto: import('./dto/pathao-webhook.dto').PathaoWebhookDto,
  ): Promise<{ status: string; message: string }> {
    const rawStatus = dto.order_status || dto.order_status_slug;
    if (!rawStatus) {
      return { status: 'error', message: 'No status in webhook payload' };
    }

    const newStatus = this.mapPathaoStatus(rawStatus);

    // Update financial fields
    if (dto.cod_amount != null) order.codAmount = dto.cod_amount;
    if (dto.delivery_fee != null) order.deliveryCharge = dto.delivery_fee;

    // Check packed + sticker conditions
    const isPacked = order.isPacked === true;
    const stickerPrinted = (order as any).stickerPrinted === true;

    if (!isPacked || !stickerPrinted) {
      await this.salesOrderRepository.save(order);
      this.logger.log(
        `[Pathao Webhook] Order #${order.id} not ready (packed=${isPacked}, stickerPrinted=${stickerPrinted}) — status stays '${order.status}'`,
      );

      await this.courierTrackingRepository.save({
        orderId: order.id,
        courierCompany: 'Pathao',
        trackingId: order.trackingId,
        status: newStatus,
        codAmount: dto.cod_amount ?? null,
        deliveryCharge: dto.delivery_fee ?? null,
        consignmentId: dto.consignment_id != null ? String(dto.consignment_id) : null,
        rawPayload: dto,
        remarks: `Pathao webhook: status=${newStatus} (NOT applied — packed=${isPacked}, stickerPrinted=${stickerPrinted})`,
      });

      return { status: 'success', message: 'Order not ready for status update, financial fields updated' };
    }

    const prevStatus = order.status;
    const statusChanged = String(prevStatus || '').trim() !== newStatus.trim();

    if (!statusChanged) {
      await this.salesOrderRepository.save(order);
      return { status: 'success', message: 'Status unchanged, financial fields updated' };
    }

    order.status = newStatus;

    const becameDelivered = this.isDeliveredStatus(newStatus) && prevStatus !== 'delivered';
    const becameCancelled = newStatus === 'cancelled' && prevStatus !== 'cancelled';

    if (becameDelivered) {
      order.deliveredAt = new Date();
    }

    if (becameCancelled) {
      order.cancelReason = order.cancelReason || `Cancelled by courier (Pathao)${dto.reason ? ': ' + dto.reason : ''}`;
      order.cancelledAt = new Date();
    }

    const saved = await this.salesOrderRepository.save(order);

    // Post-delivery side effects (loyalty, customer lifecycle, etc.)
    if (becameDelivered) {
      try {
        const custId = await this.customersService.ensureCustomerForDeliveredOrder({
          customerId: saved.customerId,
          customerPhone: saved.customerPhone,
          customerName: saved.customerName,
          customerEmail: saved.customerEmail,
          orderSource: (saved as any).orderSource,
        });
        if (custId && !saved.customerId) {
          await this.salesOrderRepository.update(saved.id, { customerId: custId });
        }
      } catch {
        // never block courier updates
      }

      try {
        await this.loyaltyService.autoCompleteReferralForDeliveredOrder({
          orderId: saved.id,
          customerId: saved.customerId,
        });
      } catch {
        // never block courier updates
      }
    }

    // Tracking history
    await this.courierTrackingRepository.save({
      orderId: saved.id,
      courierCompany: 'Pathao',
      trackingId: saved.trackingId,
      status: newStatus,
      codAmount: dto.cod_amount ?? null,
      deliveryCharge: dto.delivery_fee ?? null,
      consignmentId: dto.consignment_id != null ? String(dto.consignment_id) : null,
      rawPayload: dto,
      remarks: `Pathao webhook: ${prevStatus || 'null'} → ${newStatus}`,
    });

    // Activity log
    await this.logActivity({
      orderId: saved.id,
      actionType: 'courier_status_webhook',
      actionDescription: `Pathao webhook: ${prevStatus || 'null'} → ${newStatus}${dto.reason ? ` — "${dto.reason}"` : ''}`,
      oldValue: { status: prevStatus },
      newValue: { status: newStatus, codAmount: dto.cod_amount, deliveryFee: dto.delivery_fee },
      performedBy: undefined,
      performedByName: 'Pathao Webhook',
    });

    return { status: 'success', message: `Order #${saved.id} updated: ${prevStatus} → ${newStatus}` };
  }

  /**
   * Sync all Pathao orders' statuses by polling their API.
   */
  async syncAllPathaoStatuses(): Promise<{
    total: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const orders = await this.salesOrderRepository.find({
      where: {
        courierCompany: 'Pathao',
        status: In(['sent', 'shipped', 'pickup', 'pickup_pending', 'in_transit']),
      },
    });

    const results = { total: orders.length, synced: 0, failed: 0, errors: [] as string[] };

    for (const order of orders) {
      try {
        const cid = order.courierOrderId || order.trackingId;
        if (!cid) {
          results.failed++;
          results.errors.push(`Order #${order.id}: No consignment ID`);
          continue;
        }

        const info = await this.getPathaoOrderStatus(cid);
        const rawStatus = info?.order_status || info?.order_status_slug;
        if (!rawStatus) {
          results.synced++;
          continue;
        }

        const newStatus = this.mapPathaoStatus(rawStatus);

        if (String(order.status || '').trim() !== newStatus.trim()) {
          const isPacked = order.isPacked === true;
          const stickerPrinted = (order as any).stickerPrinted === true;

          if (isPacked && stickerPrinted) {
            const prevStatus = order.status;
            order.status = newStatus;

            if (this.isDeliveredStatus(newStatus) && prevStatus !== 'delivered') {
              order.deliveredAt = new Date();
            }

            await this.salesOrderRepository.save(order);
          }
        }

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

    // Auto-ship: if all 3 printing actions are done, move to shipped
    await this.autoShipIfReady(order);

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
        productName: item.displayName || item.customProductName || item.productName || item.product_name || 'Product',
        productNameBn: item.productNameBn || null,
        variantName: item.variantName || item.variant_name || null,
        originalProductName: item.productName || item.product_name || 'Product',
        customProductName: item.customProductName || item.custom_product_name || null,
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
        productName: item.displayName || item.customProductName || item.productName || item.product_name || 'Product',
        productNameBn: item.productNameBn || null,
        variantName: item.variantName || item.variant_name || null,
        originalProductName: item.productName || item.product_name || 'Product',
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

  // ==================== PRODUCT NAMES (for filter dropdowns) ====================

  async getDistinctProductNames(): Promise<{ name_en: string; name_bn: string | null }[]> {
    // Fetch distinct product names (with Bengali) from both item tables via products join
    const [oiRows, soiRows] = await Promise.all([
      this.orderItemRepository.query(`
        SELECT DISTINCT oi.product_name AS name_en, p.name_bn AS name_bn
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.product_name IS NOT NULL AND oi.product_name != ''
      `),
      this.salesOrderItemRepository.query(`
        SELECT DISTINCT soi.product_name AS name_en, p.name_bn AS name_bn
        FROM sales_order_items soi
        LEFT JOIN products p ON p.id = soi.product_id
        WHERE soi.product_name IS NOT NULL AND soi.product_name != ''
      `),
    ]);

    const seen = new Map<string, string | null>();
    for (const row of [...oiRows, ...soiRows]) {
      const en = (row.name_en || '').trim();
      if (!en) continue;
      if (!seen.has(en)) {
        seen.set(en, row.name_bn ? row.name_bn.trim() : null);
      }
    }

    return Array.from(seen.entries())
      .map(([name_en, name_bn]) => ({ name_en, name_bn }))
      .sort((a, b) => a.name_en.localeCompare(b.name_en));
  }

  // ==================== PRINTING MODULE ====================

  async findForPrinting(params: {
    page?: number;
    limit?: number;
    q?: string;
    isPacked?: string;
    invoicePrinted?: string;
    stickerPrinted?: string;
    courierId?: string;
    date?: string;
    productName?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(500, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.salesOrderRepository.createQueryBuilder('o');

    // Show all non-legacy orders (sent to a courier), regardless of status/print state
    qb.andWhere("o.courier_company IS NOT NULL AND o.courier_company != ''");

    // Text search (customer name, phone)
    if (params.q && params.q.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      const normalizedPhone = `%${params.q.trim().replace(/^\+88/, '').toLowerCase()}%`;
      qb.andWhere(
        "(o.customer_name ILIKE :q OR o.customer_phone ILIKE :q OR REPLACE(o.customer_phone, '+88', '') ILIKE :normalizedPhone)",
        { q, normalizedPhone },
      );
    }

    // Single date filter — use shipped_at (date order was sent to courier)
    if (params.date) {
      qb.andWhere('DATE(o.shipped_at) = :filterDate', { filterDate: params.date });
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

    // Product name filter — subquery in order_items / sales_order_items + products table
    if (params.productName && params.productName.trim()) {
      const pName = `%${params.productName.trim().toLowerCase()}%`;
      qb.andWhere(
        `(o.id IN (
          SELECT oi.order_id FROM order_items oi WHERE oi.product_name ILIKE :pName
          UNION
          SELECT oi2.order_id FROM order_items oi2 JOIN products p ON p.id = oi2.product_id WHERE p.name_en ILIKE :pName OR p.name_bn ILIKE :pName
          UNION
          SELECT soi.sales_order_id FROM sales_order_items soi WHERE soi.product_name ILIKE :pName
          UNION
          SELECT soi2.sales_order_id FROM sales_order_items soi2 JOIN products p2 ON p2.id = soi2.product_id WHERE p2.name_en ILIKE :pName OR p2.name_bn ILIKE :pName
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

      // Build the map — also fetch Bengali names from products table
      const allProdIds = new Set<number>();
      for (const item of adminItems) { if (item.productId) allProdIds.add(Number(item.productId)); }
      for (const item of checkoutItems) { if ((item as any).productId) allProdIds.add(Number((item as any).productId)); }
      const bnMap = new Map<number, string>();
      if (allProdIds.size > 0) {
        const bnRows: { id: number; name_bn: string | null }[] = await this.salesOrderRepository.manager.query(
          `SELECT id, name_bn FROM products WHERE id = ANY($1)`, [[...allProdIds]],
        );
        for (const p of bnRows) { if (p.name_bn) bnMap.set(p.id, p.name_bn); }
      }

      for (const item of adminItems) {
        if (!itemsMap[item.orderId]) itemsMap[item.orderId] = [];
        const customName = item.customProductName || null;
        itemsMap[item.orderId].push({
          productName: customName || item.productName,
          productNameBn: customName ? null : (bnMap.get(Number(item.productId)) || null),
          variantName: item.variantName || null,
          quantity: Number(item.quantity || 0),
          customProductName: customName,
          itemId: item.id,
        });
      }
      for (const item of checkoutItems) {
        const orderId = (item as any).salesOrderId;
        if (!itemsMap[orderId]) itemsMap[orderId] = [];
        const customName = (item as any).customProductName || (item as any).custom_product_name || null;
        itemsMap[orderId].push({
          productName: customName || item.productName,
          productNameBn: customName ? null : (bnMap.get(Number((item as any).productId)) || null),
          variantName: null,
          quantity: Number(item.quantity || 0),
          customProductName: customName,
          itemId: item.id,
        });
      }
    }

    // ---------- Detect repeat-phone active orders ----------
    // Collect unique phone numbers (normalized without +88)
    const phoneSet = new Set<string>();
    const orderPhoneMap: Record<number, string> = {};
    for (const order of orders) {
      if (order.customerPhone) {
        const norm = order.customerPhone.replace(/^\+88/, '').trim();
        if (norm) {
          phoneSet.add(norm);
          orderPhoneMap[order.id] = norm;
        }
      }
    }

    // Find all active orders for these phones (excluding the current batch's own orders)
    // Active = NOT delivered, cancelled, partial_delivered
    const activeOrdersByPhone: Record<string, { id: number; status: string; courierOrderId: string | null; courierCompany: string | null; totalAmount: number; createdAt: Date; shippedAt: Date | null; items: { productName: string; quantity: number }[] }[]> = {};
    if (phoneSet.size > 0) {
      const phoneArr = Array.from(phoneSet);
      const activeQb = this.salesOrderRepository.createQueryBuilder('ao');
      const phoneLikeConditions = phoneArr.map((_, i) => `REPLACE(ao.customer_phone, '+88', '') = :ph${i}`).join(' OR ');
      activeQb.where(`(${phoneLikeConditions})`, phoneArr.reduce((acc, ph, i) => ({ ...acc, [`ph${i}`]: ph }), {} as Record<string, string>));
      activeQb.andWhere("ao.status NOT IN ('delivered', 'cancelled', 'admin_cancelled', 'partial_delivered', 'completed', 'returned')");
      activeQb.orderBy('ao.created_at', 'ASC');
      const activeOrders = await activeQb.getMany();

      // Fetch items for active orders
      const activeIds = activeOrders.map(o => o.id);
      let activeItemsMap: Record<number, { productName: string; quantity: number }[]> = {};
      if (activeIds.length > 0) {
        const aItems = await this.orderItemRepository.createQueryBuilder('oi')
          .where('oi.order_id IN (:...ids)', { ids: activeIds }).getMany();
        const coveredIds = new Set(aItems.map(i => i.orderId));
        const missingAIds = activeIds.filter(id => !coveredIds.has(id));
        let aCheckoutItems: any[] = [];
        if (missingAIds.length > 0) {
          aCheckoutItems = await this.salesOrderItemRepository.createQueryBuilder('soi')
            .where('soi.sales_order_id IN (:...ids)', { ids: missingAIds }).getMany();
        }
        for (const item of aItems) {
          if (!activeItemsMap[item.orderId]) activeItemsMap[item.orderId] = [];
          activeItemsMap[item.orderId].push({ productName: item.productName, quantity: Number(item.quantity || 0) });
        }
        for (const item of aCheckoutItems) {
          const oid = (item as any).salesOrderId;
          if (!activeItemsMap[oid]) activeItemsMap[oid] = [];
          activeItemsMap[oid].push({ productName: item.productName, quantity: Number(item.quantity || 0) });
        }
      }

      for (const ao of activeOrders) {
        const norm = (ao.customerPhone || '').replace(/^\+88/, '').trim();
        if (!activeOrdersByPhone[norm]) activeOrdersByPhone[norm] = [];
        activeOrdersByPhone[norm].push({
          id: ao.id,
          status: ao.status,
          courierOrderId: ao.courierOrderId,
          courierCompany: ao.courierCompany,
          totalAmount: parseFloat(ao.totalAmount?.toString() || '0'),
          createdAt: ao.createdAt,
          shippedAt: ao.shippedAt,
          items: activeItemsMap[ao.id] || [],
        });
      }
    }

    // ──── Check rejected customer phones ────
    const rejectedPhones = new Set<string>();
    if (phoneSet.size > 0) {
      const rejRows: { phone: string }[] = await this.salesOrderRepository.query(
        `SELECT DISTINCT REPLACE(c.phone, '+88', '') AS phone
         FROM customers c
         INNER JOIN customer_tiers ct ON ct.customer_id = c.id
         WHERE ct.tier = 'rejected' AND REPLACE(c.phone, '+88', '') = ANY($1)`,
        [Array.from(phoneSet)],
      );
      for (const r of rejRows) rejectedPhones.add(r.phone);
    }

    const data = orders.map((order) => {
      const norm = orderPhoneMap[order.id] || '';
      // Active orders for same phone, excluding THIS order
      const phoneActiveOrders = (activeOrdersByPhone[norm] || []).filter(ao => ao.id !== order.id);
      return {
        id: order.id,
        salesOrderNumber: order.salesOrderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: parseFloat(order.totalAmount?.toString() || '0'),
        courierOrderId: order.courierOrderId,
        courierCompany: order.courierCompany,
        trackingId: order.trackingId,
        orderDate: order.orderDate || order.createdAt,
        createdAt: order.createdAt,
        shippedAt: order.shippedAt,
        isPacked: order.isPacked ?? false,
        invoicePrinted: (order as any).invoicePrinted ?? false,
        stickerPrinted: (order as any).stickerPrinted ?? false,
        status: order.status,
        items: itemsMap[order.id] || [],
        hasActiveOrders: phoneActiveOrders.length > 0,
        activeOrders: phoneActiveOrders.length > 0 ? phoneActiveOrders : undefined,
        isRejectedCustomer: rejectedPhones.has(norm),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markInvoicePrinted(orderId: number, userId?: number, userName?: string, ipAddress?: string) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    (order as any).invoicePrinted = true;
    (order as any).invoicePrintedAt = new Date();
    await this.salesOrderRepository.save(order);

    // Auto-ship: if all 3 printing actions are done, move to shipped
    await this.autoShipIfReady(order);

    if (userId) {
      await this.activityLogRepository.save(
        this.activityLogRepository.create({
          orderId,
          actionType: 'invoice_printed',
          actionDescription: `Invoice marked as printed by ${userName || 'Admin'}`,
          oldValue: { invoicePrinted: false },
          newValue: { invoicePrinted: true },
          performedBy: userId,
          performedByName: userName || 'Admin',
          ipAddress: ipAddress || '',
        }),
      );
    }

    return { success: true, message: 'Invoice marked as printed' };
  }

  async markStickerPrinted(orderId: number, userId?: number, userName?: string, ipAddress?: string) {
    const order = await this.salesOrderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);
    (order as any).stickerPrinted = true;
    (order as any).stickerPrintedAt = new Date();
    await this.salesOrderRepository.save(order);

    // Auto-ship: if all 3 printing actions are done, move to shipped
    await this.autoShipIfReady(order);

    if (userId) {
      await this.activityLogRepository.save(
        this.activityLogRepository.create({
          orderId,
          actionType: 'sticker_printed',
          actionDescription: `Sticker marked as printed by ${userName || 'Admin'}`,
          oldValue: { stickerPrinted: false },
          newValue: { stickerPrinted: true },
          performedBy: userId,
          performedByName: userName || 'Admin',
          ipAddress: ipAddress || '',
        }),
      );
    }

    return { success: true, message: 'Sticker marked as printed' };
  }

  async bulkMarkInvoicePrinted(orderIds: number[], userId?: number, userName?: string, ipAddress?: string) {
    let success = 0;
    let failed = 0;
    for (const id of orderIds) {
      try {
        await this.markInvoicePrinted(id, userId, userName, ipAddress);
        success++;
      } catch {
        failed++;
      }
    }
    return { total: orderIds.length, success, failed };
  }

  async bulkMarkStickerPrinted(orderIds: number[], userId?: number, userName?: string, ipAddress?: string) {
    let success = 0;
    let failed = 0;
    for (const id of orderIds) {
      try {
        await this.markStickerPrinted(id, userId, userName, ipAddress);
        success++;
      } catch {
        failed++;
      }
    }
    return { total: orderIds.length, success, failed };
  }

  /**
   * Auto-transition: After sticker print + packed are both done,
   * sync order status with the latest courier status from Steadfast.
   */
  private async autoShipIfReady(order: SalesOrder) {
    const isPacked = order.isPacked === true;
    const stickerPrinted = (order as any).stickerPrinted === true;

    if (isPacked && stickerPrinted && order.status === 'sent') {
      // Fetch the latest status from Steadfast and apply it
      await this.tryRefreshSteadfastCourierStatus(order);
    }
  }
}
