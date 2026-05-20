import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { OrderItem } from './entities/order-item.entity';
import { MetaCapiEvent } from './entities/meta-capi-event.entity';

type MetaPixelConfig = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
};

type OrderLifecycleEvent = {
  statusTrigger: string;
  eventName: string;
};

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MetaCapiEvent)
    private readonly eventRepository: Repository<MetaCapiEvent>,
    @InjectRepository(SalesOrder)
    private readonly orderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private readonly salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async sendForStatusTransition(orderId: number, newStatus: string): Promise<void> {
    const lifecycleEvent = this.mapStatusToEvent(newStatus);
    if (!lifecycleEvent) return;

    if (!this.isEnabled()) return;

    const configs = this.getPixelConfigs();
    if (configs.length === 0) {
      this.logger.warn('Meta CAPI is enabled, but no pixel/access token is configured.');
      return;
    }

    const existing = await this.eventRepository.findOne({
      where: {
        orderId,
        eventName: lifecycleEvent.eventName,
        statusTrigger: lifecycleEvent.statusTrigger,
      },
    });
    if (existing && existing.status === 'sent') return;
    if (existing && existing.status === 'pending') return;

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    const event = existing || this.eventRepository.create({
      orderId,
      eventName: lifecycleEvent.eventName,
      statusTrigger: lifecycleEvent.statusTrigger,
      eventId: randomUUID(),
      pixelId: configs[0]?.pixelId || null,
      status: 'pending',
      attemptCount: 0,
    });

    await this.eventRepository.save(event);

    const payload = await this.buildPayload(order, lifecycleEvent.eventName, event.eventId);
    event.requestPayload = this.redactPayload(payload);
    event.attemptCount = Number(event.attemptCount || 0) + 1;

    const graphVersion = this.configService.get<string>('META_CAPI_GRAPH_VERSION') || 'v20.0';
    const responses: any[] = [];

    try {
      for (const config of configs) {
        const perPixelPayload = {
          ...payload,
          ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
        };

        const url = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(config.pixelId)}/events`;
        const response = await axios.post(url, perPixelPayload, {
          params: { access_token: config.accessToken },
          timeout: 15000,
        });

        responses.push({
          pixelId: config.pixelId,
          status: response.status,
          data: response.data,
        });
      }

      event.status = 'sent';
      event.responsePayload = responses;
      event.errorMessage = null;
      event.sentAt = new Date();
      await this.eventRepository.save(event);
    } catch (error: any) {
      event.status = 'failed';
      event.responsePayload = error?.response?.data || null;
      event.errorMessage = error?.response?.data?.error?.message || error?.message || 'Meta CAPI request failed';
      await this.eventRepository.save(event);
      this.logger.warn(`Meta CAPI ${lifecycleEvent.eventName} failed for order #${orderId}: ${event.errorMessage}`);
    }
  }

  private isEnabled(): boolean {
    const value = String(this.configService.get<string>('META_CAPI_ENABLED') || '').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(value);
  }

  private mapStatusToEvent(status: string): OrderLifecycleEvent | null {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'approved') {
      return { statusTrigger: 'approved', eventName: 'Purchase' };
    }
    if (normalized === 'delivered') {
      return { statusTrigger: 'delivered', eventName: 'Delivered' };
    }
    return null;
  }

  private getPixelConfigs(): MetaPixelConfig[] {
    const rawGroups = this.configService.get<string>('META_CAPI_PIXEL_GROUPS');
    if (rawGroups) {
      try {
        const parsed = JSON.parse(rawGroups);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => ({
              pixelId: String(item.pixelId || item.pixel_id || '').trim(),
              accessToken: String(item.accessToken || item.access_token || '').trim(),
              testEventCode: item.testEventCode || item.test_event_code ? String(item.testEventCode || item.test_event_code).trim() : undefined,
            }))
            .filter((item) => item.pixelId && item.accessToken);
        }
      } catch {
        this.logger.warn('META_CAPI_PIXEL_GROUPS is not valid JSON. Falling back to META_CAPI_PIXEL_ID/META_CAPI_ACCESS_TOKEN.');
      }
    }

    const pixelId = String(this.configService.get<string>('META_CAPI_PIXEL_ID') || '').trim();
    const accessToken = String(this.configService.get<string>('META_CAPI_ACCESS_TOKEN') || '').trim();
    const testEventCode = String(this.configService.get<string>('META_CAPI_TEST_EVENT_CODE') || '').trim();
    return pixelId && accessToken ? [{ pixelId, accessToken, testEventCode: testEventCode || undefined }] : [];
  }

  private async buildPayload(order: SalesOrder, eventName: string, eventId: string) {
    const items = await this.getOrderItems(order.id);
    const contentIds = items.map((item) => item.productId || item.productName).filter(Boolean);
    const contents = items.map((item) => ({
      id: item.productId || item.productName || `order-${order.id}`,
      quantity: item.quantity,
      item_price: item.unitPrice,
    }));

    const userData = this.buildUserData(order);
    const eventSourceUrl = order.metaEventSourceUrl || order.metaLandingUrl || order.referrerUrl || this.configService.get<string>('FRONTEND_URL') || undefined;

    return {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: eventSourceUrl,
          user_data: userData,
          custom_data: {
            currency: this.configService.get<string>('META_CAPI_CURRENCY') || 'BDT',
            value: Number(order.totalAmount || 0),
            order_id: order.salesOrderNumber || String(order.id),
            content_type: 'product',
            content_ids: contentIds,
            contents,
            num_items: contents.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
            status_trigger: eventName === 'Purchase' ? 'approved' : 'delivered',
          },
        },
      ],
    };
  }

  private buildUserData(order: SalesOrder): Record<string, any> {
    const userData: Record<string, any> = {};

    const emailHash = this.hashIdentifier(order.customerEmail);
    const phoneHash = this.hashIdentifier(this.normalizePhone(order.customerPhone));
    const nameParts = this.splitName(order.customerName);

    if (emailHash) userData.em = [emailHash];
    if (phoneHash) userData.ph = [phoneHash];
    if (nameParts.firstName) userData.fn = [this.hashIdentifier(nameParts.firstName)];
    if (nameParts.lastName) userData.ln = [this.hashIdentifier(nameParts.lastName)];
    if (order.userIp && order.userIp !== 'unknown') userData.client_ip_address = order.userIp;
    if (order.browserInfo) userData.client_user_agent = order.browserInfo;
    if (order.metaFbp) userData.fbp = order.metaFbp;
    if (order.metaFbc) userData.fbc = order.metaFbc;

    return userData;
  }

  private async getOrderItems(orderId: number): Promise<Array<{ productId: number | null; productName: string | null; quantity: number; unitPrice: number }>> {
    const adminItems = await this.orderItemRepository.find({ where: { orderId } });
    if (adminItems.length > 0) {
      return adminItems.map((item) => ({
        productId: item.productId || null,
        productName: item.customProductName || item.productName || null,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }));
    }

    const checkoutItems = await this.salesOrderItemRepository.find({ where: { salesOrderId: orderId } });
    return checkoutItems.map((item) => ({
      productId: item.productId || null,
      productName: item.customProductName || item.productName || null,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }));
  }

  private hashIdentifier(value: any): string | undefined {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return undefined;
    return createHash('sha256').update(normalized).digest('hex');
  }

  private normalizePhone(value: any): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('01')) return `88${digits}`;
    if (digits.length === 13 && digits.startsWith('8801')) return digits;
    return digits;
  }

  private splitName(value: any): { firstName?: string; lastName?: string } {
    const parts = String(value ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return {};
    if (parts.length === 1) return { firstName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private redactPayload(payload: any) {
    return payload;
  }
}
