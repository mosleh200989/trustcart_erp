import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalesOrder } from '../sales/sales-order.entity';
import { SalesOrderItem } from '../sales/sales-order-item.entity';
import { Customer } from '../customers/customer.entity';
import {
  LegacyOrderDto,
  LegacyApiResponse,
  MigrateLegacyOrdersDto,
  MigrateBatchDto,
  MigrationResult,
  BatchMigrationResult,
  MigrationError,
  ProductMapping,
} from './dto/legacy-order.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LegacyMigrationService {
  private readonly logger = new Logger(LegacyMigrationService.name);

  // API Configuration
  private readonly API_BASE_URL = 'https://kasrioil.com/dropbd/api/v1/sales/currier';
  private readonly SYNC_API_URL = 'https://kasrioil.com/dropbd/api/v1/sales/upateissyncronizedtrustcart';
  private readonly API_KEY = 'sk4ksoc0oc44kw0wcow8c8wk8cw0skwscgskck4s';
  private readonly CREATED_BY = '1';

  // Product Mapping Configuration
  // Priority: 1. platform field, 2. product_details keywords
  private readonly productMappings: ProductMapping[] = [
    // Bedsheet - check first as it has specific keywords in product_details
    { platform: 'bedsheet', keywords: ['waterproof', 'Waterproof', 'WATERPROOF', 'বেডশীট', 'code', 'Code', 'CODE', 'কোড'], productId: 314 },
    { platform: 'painoil', keywords: ['kasri', 'Kasri', 'KASRI', 'কাসরি'], productId: 311 },
    { platform: 'leoqone', keywords: ['leoqone', 'Leoqone', 'LEOQONE', 'লিওকুওন'], productId: 312 },
    { platform: 'Allergy-Cure', keywords: ['allergy', 'Allergy', 'ALLERGY', 'এলার্জি'], productId: 313 },
  ];

  // Status Mapping
  // Valid values: pending, approved, hold, processing, shipped, delivered, cancelled, returned
  private readonly statusMapping: Record<string, string> = {
    'pending': 'pending',
    'delivered': 'delivered',
    'unknown': 'pending',
    'cancelled': 'cancelled',
    'returned': 'returned',
  };

  constructor(
    @InjectRepository(SalesOrder)
    private salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private dataSource: DataSource,
  ) {}

  /**
   * Main migration method
   */
  async migrateOrders(dto: MigrateLegacyOrdersDto): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      date: dto.date,
      dryRun: dto.dryRun ?? false,
      totalFetched: 0,
      totalProcessed: 0,
      customersCreated: 0,
      customersFound: 0,
      ordersCreated: 0,
      ordersSkipped: 0,
      orderItemsCreated: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Step 1: Fetch data from legacy API
      this.logger.log(`Starting migration for date: ${dto.date}, dryRun: ${dto.dryRun}`);
      const legacyOrders = await this.fetchLegacyOrders(dto.date, dto.limit ?? 500);
      result.totalFetched = legacyOrders.length;
      this.logger.log(`Fetched ${legacyOrders.length} orders from legacy API`);

      if (legacyOrders.length === 0) {
        this.logger.warn('No orders found for the specified date');
        result.duration = Date.now() - startTime;
        return result;
      }

      // Step 2: Process each order
      for (const legacyOrder of legacyOrders) {
        try {
          await this.processOrder(legacyOrder, result, dto.dryRun ?? false);
          result.totalProcessed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Error processing order ${legacyOrder.id}: ${errorMessage}`);
          result.errors.push({
            legacyId: legacyOrder.id,
            mobile: legacyOrder.mobile_no,
            error: errorMessage,
          });
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Migration failed: ${errorMessage}`);
      throw error;
    }

    result.duration = Date.now() - startTime;
    this.logger.log(`Migration completed in ${result.duration}ms`);
    this.logger.log(`Summary: Created ${result.ordersCreated} orders, Skipped ${result.ordersSkipped}, Errors: ${result.errors.length}`);

    return result;
  }

  /**
   * Batch migration for a date range
   */
  async migrateBatch(dto: MigrateBatchDto): Promise<BatchMigrationResult> {
    const startTime = Date.now();
    const result: BatchMigrationResult = {
      startDate: dto.startDate,
      endDate: dto.endDate,
      dryRun: dto.dryRun ?? false,
      totalDays: 0,
      totalOrdersFetched: 0,
      totalOrdersCreated: 0,
      totalOrdersSkipped: 0,
      totalCustomersCreated: 0,
      totalErrors: 0,
      dailyResults: [],
      duration: 0,
    };

    // Generate list of dates between startDate and endDate
    const dates = this.getDateRange(dto.startDate, dto.endDate);
    result.totalDays = dates.length;

    this.logger.log(`Starting batch migration for ${dates.length} days: ${dto.startDate} to ${dto.endDate}`);

    // Process each date
    for (const date of dates) {
      this.logger.log(`Processing date: ${date}`);
      
      try {
        const dayResult = await this.migrateOrders({
          date,
          dryRun: dto.dryRun,
          limit: 10000, // High limit to get all orders for the day
        });

        result.dailyResults.push(dayResult);
        result.totalOrdersFetched += dayResult.totalFetched;
        result.totalOrdersCreated += dayResult.ordersCreated;
        result.totalOrdersSkipped += dayResult.ordersSkipped;
        result.totalCustomersCreated += dayResult.customersCreated;
        result.totalErrors += dayResult.errors.length;

        this.logger.log(`Date ${date}: Fetched=${dayResult.totalFetched}, Created=${dayResult.ordersCreated}, Skipped=${dayResult.ordersSkipped}, Errors=${dayResult.errors.length}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to process date ${date}: ${errorMessage}`);
        
        // Create an error result for this day
        result.dailyResults.push({
          date,
          dryRun: dto.dryRun ?? false,
          totalFetched: 0,
          totalProcessed: 0,
          customersCreated: 0,
          customersFound: 0,
          ordersCreated: 0,
          ordersSkipped: 0,
          orderItemsCreated: 0,
          errors: [{ legacyId: 'N/A', mobile: 'N/A', error: errorMessage }],
          duration: 0,
        });
        result.totalErrors++;
      }
    }

    result.duration = Date.now() - startTime;
    this.logger.log(`Batch migration completed in ${result.duration}ms`);
    this.logger.log(`Total: Fetched=${result.totalOrdersFetched}, Created=${result.totalOrdersCreated}, Skipped=${result.totalOrdersSkipped}, Errors=${result.totalErrors}`);

    return result;
  }

  /**
   * Generate array of dates between start and end (inclusive)
   */
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates;
  }

  /**
   * Fetch orders from legacy API
   */
  private async fetchLegacyOrders(date: string, limit: number): Promise<LegacyOrderDto[]> {
    const allOrders: LegacyOrderDto[] = [];
    let start = 0;
    const batchSize = 500;

    while (true) {
      const url = this.buildApiUrl(date, start, Math.min(batchSize, limit - allOrders.length));
      this.logger.log(`Fetching from API: ${url}`);

      try {
        const response = await fetch(url);
        this.logger.log(`API Response status: ${response.status}`);
        if (!response.ok) {
          const errorBody = await response.text();
          this.logger.error(`API Error body: ${errorBody}`);
          throw new Error(`API returned status ${response.status}: ${errorBody}`);
        }

        const data = (await response.json()) as LegacyApiResponse;
        this.logger.log(`API Response: status=${data.status}, total=${data.total}, data.length=${data.data?.length || 0}`);

        if (!data.status || !data.data || data.data.length === 0) {
          this.logger.log(`No more data: status=${data.status}, data=${data.data?.length || 0}`);
          break;
        }

        allOrders.push(...data.data);
        this.logger.log(`Fetched batch: ${data.data.length} orders (total: ${allOrders.length})`);

        // Check if we've reached the total or our limit
        if (allOrders.length >= data.total || allOrders.length >= limit) {
          break;
        }

        start += batchSize;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to fetch from API: ${errorMessage}`);
        throw new Error(`Failed to fetch legacy orders: ${errorMessage}`);
      }
    }

    return allOrders;
  }

  /**
   * Build API URL with parameters
   */
  private buildApiUrl(date: string, start: number, limit: number): string {
    const params = new URLSearchParams({
      start: start.toString(),
      limit: limit.toString(),
      'api-key': this.API_KEY,
      created_by: this.CREATED_BY,
      date: date,
      is_sent_trustcart: '0',  // Fetch only unsynced orders
    });
    return `${this.API_BASE_URL}?${params.toString()}`;
  }

  /**
   * Process a single order
   */
  private async processOrder(
    legacyOrder: LegacyOrderDto,
    result: MigrationResult,
    dryRun: boolean,
  ): Promise<void> {
    // Step 1: Check for duplicate
    const isDuplicate = await this.checkDuplicate(legacyOrder.id);
    if (isDuplicate) {
      this.logger.debug(`Skipping duplicate order: Legacy ID ${legacyOrder.id}`);
      result.ordersSkipped++;
      return;
    }

    // Step 2: Find or create customer
    const customer = await this.findOrCreateCustomer(legacyOrder, result, dryRun);
    if (!customer && !dryRun) {
      throw new Error('Failed to find or create customer');
    }

    // Step 3: Determine product ID
    const productId = this.determineProductId(legacyOrder);

    // Step 4: Map status
    const status = this.mapStatus(legacyOrder.delivery_status);

    // Step 5: Generate order data
    const orderData = this.buildOrderData(legacyOrder, customer?.id ?? null, status);
    const orderItemData = this.buildOrderItemData(legacyOrder, productId);

    if (dryRun) {
      this.logger.debug(`[DRY RUN] Would create order:`, JSON.stringify(orderData, null, 2));
      this.logger.debug(`[DRY RUN] Would create order item:`, JSON.stringify(orderItemData, null, 2));
      result.ordersCreated++;
      result.orderItemsCreated++;
      return;
    }

    // Step 6: Insert order and order item in a transaction
    await this.dataSource.transaction(async (manager) => {
      // Insert sales order
      const salesOrder = manager.create(SalesOrder, orderData);
      const savedOrder = await manager.save(SalesOrder, salesOrder);

      // Insert order item with the new order ID
      const orderItem = manager.create(SalesOrderItem, {
        ...orderItemData,
        salesOrderId: savedOrder.id,
      });
      await manager.save(SalesOrderItem, orderItem);

      result.ordersCreated++;
      result.orderItemsCreated++;

      this.logger.debug(`Created order ${savedOrder.id} (Legacy ID: ${legacyOrder.id})`);
    });

    // Step 7: Mark as synced in legacy database (only after successful insert)
    await this.markAsSyncedInLegacy(legacyOrder.curier_id, legacyOrder.date);
  }

  /**
   * Mark order as synced in the legacy database
   * This prevents the same order from being migrated again
   */
  private async markAsSyncedInLegacy(curierId: string, date: string): Promise<void> {
    if (!curierId) {
      this.logger.warn('No curier_id provided, skipping sync API call');
      return;
    }

    // Extract just the date part (YYYY-MM-DD) from the datetime string
    const dateOnly = date.split(' ')[0];

    const params = new URLSearchParams({
      start: '0',
      limit: '500',
      'api-key': this.API_KEY,
      created_by: this.CREATED_BY,
      searchby: '',
      producttype: '',
      order_by: 'pak_status',
      date: dateOnly,
      curier_id: curierId,
    });

    const url = `${this.SYNC_API_URL}?${params.toString()}`;
    
    try {
      this.logger.debug(`Calling sync API for curier_id: ${curierId}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        this.logger.warn(`Sync API returned status ${response.status} for curier_id: ${curierId}`);
      } else {
        this.logger.debug(`Successfully marked as synced: curier_id ${curierId}`);
      }
    } catch (error) {
      // Log but don't fail the migration if sync API fails
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to call sync API for curier_id ${curierId}: ${errorMessage}`);
    }
  }

  /**
   * Check if order already exists (by legacy ID in internal_notes)
   */
  private async checkDuplicate(legacyId: string): Promise<boolean> {
    const existing = await this.salesOrderRepository
      .createQueryBuilder('order')
      .where('order.internal_notes LIKE :pattern', { pattern: `%Legacy API ID: ${legacyId}%` })
      .getOne();
    return !!existing;
  }

  /**
   * Find existing customer or create new one
   */
  private async findOrCreateCustomer(
    legacyOrder: LegacyOrderDto,
    result: MigrationResult,
    dryRun: boolean,
  ): Promise<Customer | null> {
    const mobile = this.normalizePhone(legacyOrder.mobile_no);

    // Search by phone or mobile
    let customer = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.phone = :mobile OR customer.mobile = :mobile', { mobile })
      .getOne();

    if (customer) {
      result.customersFound++;
      this.logger.debug(`Found existing customer: ${customer.id} for mobile: ${mobile}`);
      return customer;
    }

    if (dryRun) {
      this.logger.debug(`[DRY RUN] Would create customer for mobile: ${mobile}`);
      result.customersCreated++;
      return null;
    }

    // Create new customer
    const newCustomer = this.customerRepository.create({
      phone: mobile,
      mobile: mobile,
      name: `Customer ${mobile}`,
      customerType: 'new',
      lifecycleStage: 'first_buyer', // Valid values: lead, prospect, first_buyer, repeat_buyer, loyal, inactive
      source: 'legacy_migration',
      isGuest: false,
      isActive: true,
      is_deleted: false,
      notes: `Migrated from legacy system. Original order date: ${legacyOrder.date}`,
    });

    customer = await this.customerRepository.save(newCustomer);
    result.customersCreated++;
    this.logger.debug(`Created new customer: ${customer.id} for mobile: ${mobile}`);

    return customer;
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    // Remove any non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with 0 for Bangladesh numbers
    if (normalized.startsWith('+880')) {
      normalized = '0' + normalized.substring(4);
    } else if (normalized.startsWith('880')) {
      normalized = '0' + normalized.substring(3);
    } else if (!normalized.startsWith('0') && normalized.length === 10) {
      normalized = '0' + normalized;
    }

    return normalized;
  }

  /**
   * Determine product ID based on platform and product_details
   */
  private determineProductId(legacyOrder: LegacyOrderDto): number {
    // Priority 1: Check platform field
    if (legacyOrder.platform) {
      const platformLower = legacyOrder.platform.toLowerCase();
      for (const mapping of this.productMappings) {
        if (platformLower.includes(mapping.platform.toLowerCase())) {
          this.logger.debug(`Product matched by platform: ${mapping.platform} -> ${mapping.productId}`);
          return mapping.productId;
        }
      }
    }

    // Priority 2: Check product_details for keywords
    const productDetails = legacyOrder.product_details?.toLowerCase() || '';
    for (const mapping of this.productMappings) {
      for (const keyword of mapping.keywords) {
        if (productDetails.includes(keyword.toLowerCase())) {
          this.logger.debug(`Product matched by keyword: ${keyword} -> ${mapping.productId}`);
          return mapping.productId;
        }
      }
    }

    // Default to Kasri (311) if no match found
    this.logger.warn(`No product match found for order ${legacyOrder.id}, using default: 311`);
    return 311;
  }

  /**
   * Map legacy status to current status
   */
  private mapStatus(legacyStatus: string): string {
    const status = this.statusMapping[legacyStatus?.toLowerCase()] || 'pending';
    return status;
  }

  /**
   * Build sales order data
   */
  private buildOrderData(
    legacyOrder: LegacyOrderDto,
    customerId: number | null,
    status: string,
  ): Partial<SalesOrder> {
    const totalAmount = parseFloat(legacyOrder.total_amount) || 0;
    const orderDate = this.parseDate(legacyOrder.date);
    // Use legacy ID for unique order number to avoid duplicates when daily_serial is null
    const uniqueId = legacyOrder.daily_serial || legacyOrder.id;
    const dateStr = orderDate.toISOString().split('T')[0].replace(/-/g, '');

    // Combine both note fields
    const courierNotes = [
      legacyOrder.curier_note,
      legacyOrder.courier_note,
    ].filter(Boolean).join('\n').trim() || null;

    // Build internal notes with legacy ID for duplicate detection
    const internalNotes = [
      `Legacy API ID: ${legacyOrder.id}`,
      `Daily Serial: ${legacyOrder.daily_serial}`,
      `Order Source: ${legacyOrder.order_sourch || 'N/A'}`,
      legacyOrder.sourch_details ? `Source Details: ${legacyOrder.sourch_details}` : null,
      legacyOrder.product_details ? `Product Details: ${legacyOrder.product_details}` : null,
    ].filter(Boolean).join('\n');

    return {
      salesOrderNumber: `LEG-${dateStr}-${uniqueId}`,
      customerId: customerId,
      customerPhone: this.normalizePhone(legacyOrder.mobile_no),
      orderDate: orderDate,
      status: status,
      totalAmount: totalAmount,
      discountAmount: 0,
      createdBy: 1, // Admin user ID for legacy migration
      courierCompany: legacyOrder.curier_company || undefined,
      courierOrderId: legacyOrder.curier_id || undefined,
      trackingId: legacyOrder.tracking_id || undefined,
      courierNotes: courierNotes || undefined,
      internalNotes: internalNotes,
      trafficSource: legacyOrder.order_sourch || 'legacy_migration',
      notes: `Migrated from legacy system on ${new Date().toISOString()}`,
    };
  }

  /**
   * Build order item data
   */
  private buildOrderItemData(
    legacyOrder: LegacyOrderDto,
    productId: number,
  ): Partial<SalesOrderItem> {
    const totalAmount = parseFloat(legacyOrder.total_amount) || 0;

    // Try to extract quantity from product_details
    const quantity = this.extractQuantity(legacyOrder.product_details);
    const unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;

    return {
      productId: productId,
      quantity: quantity,
      unitPrice: unitPrice,
      lineTotal: totalAmount,
    };
  }

  /**
   * Extract quantity from product details
   */
  private extractQuantity(productDetails: string): number {
    if (!productDetails) return 1;

    // Try to find patterns like "2pis", "3 pcs", "-2", "x3", etc.
    const patterns = [
      /(\d+)\s*pis/i,
      /(\d+)\s*pcs/i,
      /(\d+)\s*piece/i,
      /-(\d+)/,
      /x\s*(\d+)/i,
      /(\d+)\s*টি/,
      /(\d+)\s*পিস/,
    ];

    for (const pattern of patterns) {
      const match = productDetails.match(pattern);
      if (match && match[1]) {
        const qty = parseInt(match[1], 10);
        if (qty > 0 && qty <= 100) { // Sanity check
          return qty;
        }
      }
    }

    return 1; // Default quantity
  }

  /**
   * Parse date string from API
   */
  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    try {
      // Format: "2026-01-31 20:28:47"
      const [datePart, timePart] = dateStr.split(' ');
      if (datePart && timePart) {
        return new Date(`${datePart}T${timePart}`);
      }
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  }

  /**
   * Get migration statistics for a date range
   */
  async getMigrationStats(startDate: string, endDate: string): Promise<any> {
    const stats = await this.salesOrderRepository
      .createQueryBuilder('order')
      .select('COUNT(*)', 'total')
      .addSelect('DATE(order.order_date)', 'date')
      .where('order.internal_notes LIKE :pattern', { pattern: '%Legacy API ID:%' })
      .andWhere('order.order_date BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      })
      .groupBy('DATE(order.order_date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return stats;
  }

  /**
   * Rollback migration for a specific date
   */
  async rollbackMigration(date: string, dryRun: boolean = true): Promise<{ deletedOrders: number; deletedItems: number }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find orders from this migration date
    const orders = await this.salesOrderRepository
      .createQueryBuilder('order')
      .select('order.id')
      .where('order.internal_notes LIKE :pattern', { pattern: '%Legacy API ID:%' })
      .andWhere('order.order_date BETWEEN :startDate AND :endDate', {
        startDate: startOfDay,
        endDate: endOfDay,
      })
      .getMany();

    const orderIds = orders.map(o => o.id);
    
    if (dryRun) {
      this.logger.log(`[DRY RUN] Would delete ${orderIds.length} orders and their items`);
      return { deletedOrders: orderIds.length, deletedItems: orderIds.length };
    }

    if (orderIds.length === 0) {
      return { deletedOrders: 0, deletedItems: 0 };
    }

    // Delete in transaction
    let deletedItems = 0;
    await this.dataSource.transaction(async (manager) => {
      // Delete order items first
      const itemResult = await manager
        .createQueryBuilder()
        .delete()
        .from(SalesOrderItem)
        .where('sales_order_id IN (:...ids)', { ids: orderIds })
        .execute();
      deletedItems = itemResult.affected || 0;

      // Delete orders
      await manager
        .createQueryBuilder()
        .delete()
        .from(SalesOrder)
        .where('id IN (:...ids)', { ids: orderIds })
        .execute();
    });

    this.logger.log(`Rollback complete: Deleted ${orderIds.length} orders and ${deletedItems} items`);
    return { deletedOrders: orderIds.length, deletedItems };
  }
}
