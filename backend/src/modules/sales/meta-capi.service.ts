import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { OrderItem } from './entities/order-item.entity';
import { MetaCapiEvent } from './entities/meta-capi-event.entity';
import {
  ARABIAN_KHALTA_PIXEL_ID,
  HERBOLIN_PIXEL_ID,
  MAIN_TRUSTCART_PIXEL_ID,
  VESHOJ_PIXEL_ID,
  getMetaPixelIdForOrder,
  normalizeMetaFbc,
  normalizeMetaFbp,
} from './meta-conversion-policy';

type MetaPixelConfig = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  landingPageSlugs?: string[];
  domains?: string[];
};

type OrderLifecycleEvent = {
  statusTrigger: string;
  eventName: string;
};

const VESHOJ_LANDING_PAGE_SLUGS = ['veshoj'];
const VESHOJ_DOMAINS = ['veshoj.site', 'www.veshoj.site'];

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);
  private retrySweepRunning = false;

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

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    const targetPixelId = getMetaPixelIdForOrder(order, this.getSystemUserId());
    if (!targetPixelId) {
      await this.eventRepository
        .createQueryBuilder()
        .update(MetaCapiEvent)
        .set({
          status: 'skipped',
          errorMessage: 'Skipped because the order did not originate from the website or a landing page.',
        })
        .where('order_id = :orderId', { orderId })
        .andWhere('event_name = :eventName', { eventName: lifecycleEvent.eventName })
        .andWhere('status IN (:...statuses)', { statuses: ['pending', 'failed'] })
        .execute();
      return;
    }

    const configs = this.getPixelConfigs(order);
    if (configs.length === 0) {
      this.logger.warn(
        `Meta CAPI pixel ${targetPixelId} is not configured for eligible order #${orderId}.`,
      );
      return;
    }

    const existing = await this.eventRepository.findOne({
      where: {
        orderId,
        eventName: lifecycleEvent.eventName,
      },
      order: { createdAt: 'ASC' },
    });
    if (existing && existing.status === 'sent') return;
    if (existing && existing.status === 'pending') return;
    if (existing && existing.status === 'skipped') return;
    if (existing && Number(existing.attemptCount || 0) >= this.getMaxAttempts()) {
      this.logger.warn(
        `Meta CAPI ${lifecycleEvent.eventName} retry limit reached for order #${orderId}.`,
      );
      return;
    }

    const eventId = this.buildEventId(orderId, lifecycleEvent);
    const event = existing || this.eventRepository.create({
      orderId,
      eventName: lifecycleEvent.eventName,
      statusTrigger: lifecycleEvent.statusTrigger,
      eventId,
      pixelId: configs[0]?.pixelId || null,
      status: 'pending',
      attemptCount: 0,
    });
    if (existing && existing.eventId !== eventId) {
      event.eventId = eventId;
    }

    event.status = 'pending';
    event.pixelId = configs[0]?.pixelId || event.pixelId || null;
    event.errorMessage = null;
    event.responsePayload = null;
    event.attemptCount = Number(event.attemptCount || 0) + 1;
    await this.eventRepository.save(event);

    const payload = await this.buildPayload(
      order,
      lifecycleEvent.eventName,
      event.eventId,
      event.createdAt || new Date(),
      event.statusTrigger,
      configs[0].pixelId,
    );
    event.requestPayload = this.redactPayload(payload);
    await this.eventRepository.save(event);

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

  async sendPageView(input: {
    eventId: unknown;
    eventSourceUrl: unknown;
    pageTitle?: unknown;
    fbp?: unknown;
    fbc?: unknown;
    fbclid?: unknown;
    clientIp?: unknown;
    userAgent?: unknown;
  }): Promise<{ sent: boolean }> {
    if (!this.isEnabled()) return { sent: false };

    const eventId = String(input.eventId || '').trim();
    const eventSourceUrl = String(input.eventSourceUrl || '').trim();
    if (!/^pv_[A-Za-z0-9_-]{8,116}$/.test(eventId) || !this.isMainTrustCartUrl(eventSourceUrl)) {
      return { sent: false };
    }

    const routingOrder = Object.assign(new SalesOrder(), {
      orderSource: 'website',
      metaEventSourceUrl: eventSourceUrl,
      metaLandingUrl: eventSourceUrl,
    });
    const configs = this.getPixelConfigs(routingOrder)
      .filter((config) => String(config.pixelId) === MAIN_TRUSTCART_PIXEL_ID);
    if (configs.length === 0) {
      this.logger.warn('Meta CAPI PageView skipped because the main TrustCart pixel is not configured.');
      return { sent: false };
    }

    const userData: Record<string, any> = {};
    const clientIp = String(input.clientIp || '').trim();
    const userAgent = String(input.userAgent || '').trim();
    if (clientIp && clientIp !== 'unknown' && this.isLikelyRawUserAgent(userAgent)) {
      userData.client_ip_address = clientIp;
      userData.client_user_agent = userAgent;
    }
    const fbp = normalizeMetaFbp(input.fbp);
    const fbc = normalizeMetaFbc(input.fbc, input.fbclid);
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const payload = {
      data: [{
        event_name: 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: eventSourceUrl,
        user_data: userData,
        custom_data: {
          page_title: String(input.pageTitle || '').trim().slice(0, 300) || undefined,
        },
      }],
    };

    const graphVersion = this.configService.get<string>('META_CAPI_GRAPH_VERSION') || 'v20.0';
    let sent = false;
    for (const config of configs) {
      try {
        await axios.post(
          `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(config.pixelId)}/events`,
          {
            ...payload,
            ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
          },
          {
            params: { access_token: config.accessToken },
            timeout: 5000,
          },
        );
        sent = true;
      } catch (error: any) {
        this.logger.warn(
          `Meta CAPI PageView failed: ${error?.response?.data?.error?.message || error?.message || error}`,
        );
      }
    }

    return { sent };
  }

  @Cron('*/5 * * * *')
  async retryRecoverableEvents(): Promise<void> {
    if (!this.isEnabled() || this.retrySweepRunning) return;

    this.retrySweepRunning = true;
    try {
      const maxAttempts = this.getMaxAttempts();
      const batchSize = this.getPositiveIntegerConfig('META_CAPI_RETRY_BATCH_SIZE', 50, 200);
      const staleMinutes = this.getPositiveIntegerConfig('META_CAPI_PENDING_STALE_MINUTES', 5, 60);
      const maxAgeHours = this.getPositiveIntegerConfig('META_CAPI_RETRY_MAX_AGE_HOURS', 168, 720);
      const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000);
      const oldestRetryable = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

      const events = await this.eventRepository
        .createQueryBuilder('event')
        .where(
          `(event.status = :failedStatus
            OR (event.status = :pendingStatus AND event.updatedAt < :staleBefore))`,
          {
            failedStatus: 'failed',
            pendingStatus: 'pending',
            staleBefore,
          },
        )
        .andWhere('event.attemptCount < :maxAttempts', { maxAttempts })
        .andWhere('event.createdAt >= :oldestRetryable', { oldestRetryable })
        .orderBy('event.updatedAt', 'ASC')
        .take(batchSize)
        .getMany();

      for (const event of events) {
        if (event.status === 'pending') {
          event.status = 'failed';
          event.errorMessage = `Recovered after remaining pending for more than ${staleMinutes} minutes`;
          await this.eventRepository.save(event);
        }

        await this.sendForStatusTransition(event.orderId, event.statusTrigger);
      }

      if (events.length > 0) {
        this.logger.log(`Retried ${events.length} recoverable Meta CAPI event(s).`);
      }
    } catch (error: any) {
      this.logger.warn(`Meta CAPI retry sweep failed: ${error?.message || error}`);
    } finally {
      this.retrySweepRunning = false;
    }
  }

  private isEnabled(): boolean {
    const value = String(this.configService.get<string>('META_CAPI_ENABLED') || '').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(value);
  }

  private getMaxAttempts(): number {
    return this.getPositiveIntegerConfig('META_CAPI_MAX_ATTEMPTS', 5, 20);
  }

  private getSystemUserId(): number {
    const value = Number(this.configService.get<string>('SYSTEM_USER_ID') || 1);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  private getPositiveIntegerConfig(key: string, fallback: number, maximum: number): number {
    const value = Number(this.configService.get<string>(key));
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return Math.min(Math.floor(value), maximum);
  }

  private mapStatusToEvent(status: string): OrderLifecycleEvent | null {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'created') {
      return { statusTrigger: 'created', eventName: 'Purchase' };
    }
    if (normalized === 'approved') {
      return { statusTrigger: 'approved', eventName: 'Purchase' };
    }
    if (normalized === 'delivered') {
      return { statusTrigger: 'delivered', eventName: 'Delivered' };
    }
    return null;
  }

  private buildEventId(orderId: number, lifecycleEvent: OrderLifecycleEvent): string {
    if (lifecycleEvent.eventName === 'Purchase') {
      return `purchase_${orderId}`;
    }
    return `${lifecycleEvent.eventName.toLowerCase()}_${orderId}`;
  }

  private getPixelConfigs(order: SalesOrder): MetaPixelConfig[] {
    const parsedConfigs: MetaPixelConfig[] = [];
    const rawGroups = this.configService.get<string>('META_CAPI_PIXEL_GROUPS');
    if (rawGroups) {
      try {
        const parsed = JSON.parse(rawGroups);
        if (Array.isArray(parsed)) {
          parsedConfigs.push(...parsed
            .map((item) => ({
              pixelId: String(item.pixelId || item.pixel_id || '').trim(),
              accessToken: String(item.accessToken || item.access_token || '').trim(),
              testEventCode: item.testEventCode || item.test_event_code ? String(item.testEventCode || item.test_event_code).trim() : undefined,
              landingPageSlugs: this.normalizeConfigList(item.landingPageSlugs || item.landing_page_slugs || item.landingPageSlug || item.landing_page_slug),
              domains: this.normalizeConfigList(item.domains || item.domain || item.hosts || item.host),
            }))
            .filter((item) => item.pixelId && item.accessToken));
        }
      } catch {
        this.logger.warn('META_CAPI_PIXEL_GROUPS is not valid JSON. Falling back to META_CAPI_PIXEL_ID/META_CAPI_ACCESS_TOKEN.');
      }
    }

    const veshojEnvConfig = this.getVeshojPixelConfigFromEnv();
    if (veshojEnvConfig) {
      parsedConfigs.unshift(veshojEnvConfig);
    }

    const targetPixelId = getMetaPixelIdForOrder(order, this.getSystemUserId());
    if (!targetPixelId) return [];

    const configuredTarget = this.dedupePixelConfigs(
      parsedConfigs.filter((config) => config.pixelId === targetPixelId),
    );
    if (configuredTarget.length > 0) return configuredTarget;

    const pixelId = String(this.configService.get<string>('META_CAPI_PIXEL_ID') || '').trim();
    const accessToken = String(this.configService.get<string>('META_CAPI_ACCESS_TOKEN') || '').trim();
    const testEventCode = String(this.configService.get<string>('META_CAPI_TEST_EVENT_CODE') || '').trim();
    return targetPixelId === MAIN_TRUSTCART_PIXEL_ID && pixelId === targetPixelId && accessToken
      ? [{ pixelId, accessToken, testEventCode: testEventCode || undefined }]
      : [];
  }

  private getVeshojPixelConfigFromEnv(): MetaPixelConfig | null {
    const accessToken = String(
      this.configService.get<string>('VESHOJ_META_CAPI_ACCESS_TOKEN') ||
      this.configService.get<string>('META_CAPI_VESHOJ_ACCESS_TOKEN') ||
      '',
    ).trim();
    if (!accessToken) return null;

    const pixelId = String(this.configService.get<string>('VESHOJ_META_CAPI_PIXEL_ID') || VESHOJ_PIXEL_ID).trim();
    const testEventCode = String(this.configService.get<string>('VESHOJ_META_CAPI_TEST_EVENT_CODE') || '').trim();

    return {
      pixelId,
      accessToken,
      testEventCode: testEventCode || undefined,
      landingPageSlugs: VESHOJ_LANDING_PAGE_SLUGS,
      domains: VESHOJ_DOMAINS,
    };
  }

  private dedupePixelConfigs(configs: MetaPixelConfig[]): MetaPixelConfig[] {
    const seen = new Set<string>();
    const unique: MetaPixelConfig[] = [];

    for (const config of configs) {
      const key = config.pixelId;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(config);
    }

    return unique;
  }

  private normalizeConfigList(value: unknown): string[] {
    if (value == null) return [];
    const values = Array.isArray(value) ? value : String(value).split(',');
    return values
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean);
  }

  private async buildPayload(
    order: SalesOrder,
    eventName: string,
    eventId: string,
    eventTime: Date,
    statusTrigger: string,
    pixelId: string,
  ) {
    const items = await this.getOrderItems(order.id);
    const contentIds = this.getContentIds(items);
    const contents = items.map((item) => ({
      id: this.getPrimaryContentId(item) || `order-${order.id}`,
      quantity: item.quantity,
      item_price: item.unitPrice,
    }));
    const productIds = this.uniqueValues(items.map((item) => item.productId));
    const contentSkus = this.uniqueValues(items.map((item) => item.productSku));

    const userData = this.buildUserData(order);
    const eventSourceUrl =
      order.metaEventSourceUrl ||
      order.metaLandingUrl ||
      order.referrerUrl ||
      this.getDefaultEventSourceUrl(pixelId);

    return {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(new Date(eventTime).getTime() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: eventSourceUrl,
          user_data: userData,
          custom_data: {
            currency: this.configService.get<string>('META_CAPI_CURRENCY') || 'BDT',
            value: Number(order.totalAmount || 0),
            order_id: order.salesOrderNumber || String(order.id),
            content_type: 'product',
            content_name: items.map((item) => item.productName).filter(Boolean).join(', ') || undefined,
            content_ids: contentIds,
            product_ids: productIds,
            content_skus: contentSkus,
            contents,
            num_items: contents.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
            status_trigger: statusTrigger,
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
    const clientIp = String(order.userIp || '').trim();
    const userAgent = String(order.browserInfo || '').trim();
    if (clientIp && clientIp !== 'unknown' && this.isLikelyRawUserAgent(userAgent)) {
      userData.client_ip_address = clientIp;
      userData.client_user_agent = userAgent;
    }
    const fbp = normalizeMetaFbp(order.metaFbp);
    const fbc = normalizeMetaFbc(order.metaFbc, order.metaFbclid, order.createdAt || new Date());
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    return userData;
  }

  private isLikelyRawUserAgent(value: string): boolean {
    return /Mozilla\/|Dalvik\/|okhttp\/|curl\/|PostmanRuntime\/|facebookexternalhit|Instagram|FBAN|FBAV/i.test(value);
  }

  private getDefaultEventSourceUrl(pixelId: string): string {
    if (pixelId === VESHOJ_PIXEL_ID) return 'https://veshoj.site/';
    if (pixelId === ARABIAN_KHALTA_PIXEL_ID) return 'https://arabiankhalta.com/';
    if (pixelId === HERBOLIN_PIXEL_ID) return 'https://herbolin.com/';

    const configured = String(this.configService.get<string>('FRONTEND_URL') || '').trim();
    return this.isMainTrustCartUrl(configured) ? configured : 'https://trustcart.com.bd/';
  }

  private isMainTrustCartUrl(value: string): boolean {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      return ['trustcart.com.bd', 'trustkert.com'].includes(host) || host === 'shop.trustcart.com.bd';
    } catch {
      return false;
    }
  }

  private normalizeTrackingValue(value: unknown): string {
    return String(value ?? '').trim();
  }

  private uniqueValues(values: unknown[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => this.normalizeTrackingValue(value))
          .filter(Boolean),
      ),
    );
  }

  private getPrimaryContentId(item: { productId: number | null; productName: string | null; productSku?: string | null; conversionId?: string | null }) {
    return this.normalizeTrackingValue(item.conversionId || item.productSku || item.productId || item.productName);
  }

  private getContentIds(items: Array<{ productId: number | null; productName: string | null; productSku?: string | null; conversionId?: string | null }>) {
    return this.uniqueValues(
      items.flatMap((item) => [
        this.getPrimaryContentId(item),
        item.productSku,
        item.productId,
      ]),
    );
  }

  private async getOrderItems(orderId: number): Promise<Array<{ productId: number | null; productName: string | null; productSku: string | null; conversionId: string | null; variantName: string | null; quantity: number; unitPrice: number }>> {
    const adminItems = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('products', 'product', 'product.id = item.product_id')
      .select([
        'item.product_id AS "productId"',
        'COALESCE(item.custom_product_name, product.name_en, item.product_name) AS "productName"',
        'product.sku AS "productSku"',
        'COALESCE(NULLIF(product.sku, \'\'), item.product_id::text, item.product_name) AS "conversionId"',
        'item.variant_name AS "variantName"',
        'item.quantity AS quantity',
        'item.unit_price AS "unitPrice"',
      ])
      .where('item.order_id = :orderId', { orderId })
      .orderBy('item.id', 'ASC')
      .getRawMany();

    if (adminItems.length > 0) {
      return adminItems.map((item) => ({
        productId: item.productId ? Number(item.productId) : null,
        productName: item.productName || null,
        productSku: item.productSku || null,
        conversionId: item.conversionId || null,
        variantName: item.variantName || null,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }));
    }

    const checkoutItems = await this.salesOrderItemRepository
      .createQueryBuilder('item')
      .leftJoin('products', 'product', 'product.id = item.product_id')
      .select([
        'item.product_id AS "productId"',
        'COALESCE(item.custom_product_name, product.name_en, item.product_name) AS "productName"',
        'product.sku AS "productSku"',
        'COALESCE(NULLIF(product.sku, \'\'), item.product_id::text, item.product_name) AS "conversionId"',
        'NULL AS "variantName"',
        'item.quantity AS quantity',
        'item.unit_price AS "unitPrice"',
      ])
      .where('item.sales_order_id = :orderId', { orderId })
      .orderBy('item.id', 'ASC')
      .getRawMany();

    return checkoutItems.map((item) => ({
      productId: item.productId ? Number(item.productId) : null,
      productName: item.productName || null,
      productSku: item.productSku || null,
      conversionId: item.conversionId || null,
      variantName: item.variantName || null,
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
