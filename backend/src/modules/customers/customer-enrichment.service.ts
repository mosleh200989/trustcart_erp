import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Or, Equal } from 'typeorm';
import axios from 'axios';
import { Customer } from './customer.entity';

interface DropBDResponse {
  data?: {
    id: string;
    company_id: string;
    line1: string; // Customer name
    line2: string; // Customer address
    city: string;
    postal_code: string;
    state: string;
    country: string;
    phone: string;
    updated_at: string;
  };
  message?: string;
  status: boolean;
}

interface EnrichmentResult {
  customerId: number;
  phone: string;
  success: boolean;
  name?: string;
  address?: string;
  error?: string;
}

export interface EnrichmentSummary {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  notFoundCount: number;
  results: EnrichmentResult[];
  startedAt: Date;
  completedAt?: Date;
  isRunning: boolean;
}

@Injectable()
export class CustomerEnrichmentService {
  private readonly logger = new Logger(CustomerEnrichmentService.name);
  private readonly API_BASE_URL = 'https://kasrioil.com/dropbd/api/v1/sales/customerinfo';
  private readonly API_KEY = 'sk4ksoc0oc44kw0wcow8c8wk8cw0skwscgskck4s';
  
  // Track if enrichment is currently running
  private isRunning = false;
  private currentSummary: EnrichmentSummary | null = null;

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * Get the status of the current or last enrichment run
   */
  getStatus(): { isRunning: boolean; summary: EnrichmentSummary | null } {
    return {
      isRunning: this.isRunning,
      summary: this.currentSummary,
    };
  }

  /**
   * Stop the current enrichment process
   */
  stopEnrichment(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.logger.warn('Enrichment process stop requested');
    }
  }

  /**
   * Run customer enrichment
   * @param limit - Number of customers to process (default 100 for testing, use 0 or null for all)
   * @param batchSize - Number of customers to process in each batch (default 50)
   * @param delayMs - Delay between API calls in milliseconds (default 100ms to avoid rate limiting)
   */
  async enrichCustomers(
    limit: number = 100,
    batchSize: number = 50,
    delayMs: number = 100,
  ): Promise<EnrichmentSummary> {
    if (this.isRunning) {
      throw new Error('Enrichment process is already running');
    }

    this.isRunning = true;
    this.currentSummary = {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      notFoundCount: 0,
      results: [],
      startedAt: new Date(),
      isRunning: true,
    };

    this.logger.log(`Starting customer enrichment. Limit: ${limit || 'ALL'}, Batch size: ${batchSize}`);

    try {
      // Get customers without name or address
      const queryBuilder = this.customerRepository
        .createQueryBuilder('customer')
        .where('customer.phone IS NOT NULL')
        .andWhere("customer.phone != ''")
        .andWhere(
          '(customer.name IS NULL OR customer.name = \'\' OR customer.address IS NULL OR customer.address = \'\')'
        )
        .orderBy('customer.id', 'ASC');

      if (limit && limit > 0) {
        queryBuilder.take(limit);
      }

      const customers = await queryBuilder.getMany();
      this.logger.log(`Found ${customers.length} customers to enrich`);

      let processedCount = 0;

      for (const customer of customers) {
        // Check if stop was requested
        if (!this.isRunning) {
          this.logger.warn('Enrichment stopped by user request');
          break;
        }

        const result = await this.enrichSingleCustomer(customer);
        this.currentSummary.results.push(result);
        this.currentSummary.totalProcessed++;

        if (result.success) {
          this.currentSummary.successCount++;
        } else if (result.error === 'not_found') {
          this.currentSummary.notFoundCount++;
        } else if (result.error === 'skipped') {
          this.currentSummary.skippedCount++;
        } else {
          this.currentSummary.failedCount++;
        }

        processedCount++;

        // Log progress every 100 customers
        if (processedCount % 100 === 0) {
          this.logger.log(
            `Progress: ${processedCount}/${customers.length} - Success: ${this.currentSummary.successCount}, Failed: ${this.currentSummary.failedCount}, Not Found: ${this.currentSummary.notFoundCount}`
          );
        }

        // Add delay between API calls to avoid rate limiting
        if (delayMs > 0) {
          await this.delay(delayMs);
        }
      }

      this.currentSummary.completedAt = new Date();
      this.currentSummary.isRunning = false;
      this.isRunning = false;

      this.logger.log(
        `Enrichment completed. Total: ${this.currentSummary.totalProcessed}, Success: ${this.currentSummary.successCount}, Failed: ${this.currentSummary.failedCount}, Not Found: ${this.currentSummary.notFoundCount}`
      );

      return this.currentSummary;
    } catch (error) {
      this.isRunning = false;
      if (this.currentSummary) {
        this.currentSummary.isRunning = false;
        this.currentSummary.completedAt = new Date();
      }
      this.logger.error('Enrichment process failed', error);
      throw error;
    }
  }

  /**
   * Enrich a single customer
   */
  private async enrichSingleCustomer(customer: Customer): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {
      customerId: customer.id,
      phone: customer.phone,
      success: false,
    };

    try {
      // Skip if already has both name and address
      if (customer.name && customer.name.trim() && customer.address && customer.address.trim()) {
        result.error = 'skipped';
        return result;
      }

      // Clean phone number
      const cleanPhone = this.cleanPhoneNumber(customer.phone);
      if (!cleanPhone) {
        result.error = 'invalid_phone';
        return result;
      }

      // Call the external API
      const response = await axios.get<DropBDResponse>(this.API_BASE_URL, {
        params: {
          'api-key': this.API_KEY,
          mobile: cleanPhone,
        },
        timeout: 10000, // 10 second timeout
      });

      const data = response.data;

      // Check if customer was found
      if (!data.data || data.message?.includes('could not be found')) {
        result.error = 'not_found';
        return result;
      }

      // Extract name and address
      const newName = data.data.line1?.trim() || null;
      const newAddress = data.data.line2?.trim() || null;

      // Prepare update object
      const updateData: Partial<Customer> = {};
      
      // Only update name if current name is empty and new name exists
      if ((!customer.name || !customer.name.trim()) && newName) {
        updateData.name = newName;
        result.name = newName;
      }

      // Only update address if current address is empty and new address exists
      if ((!customer.address || !customer.address.trim()) && newAddress) {
        updateData.address = newAddress;
        result.address = newAddress;
      }

      // Update customer if there's something to update
      if (Object.keys(updateData).length > 0) {
        await this.customerRepository.update(customer.id, updateData);
        result.success = true;
        this.logger.debug(`Updated customer ${customer.id}: ${JSON.stringify(updateData)}`);
      } else {
        result.error = 'no_data_to_update';
      }

      return result;
    } catch (error: any) {
      result.error = error?.message || 'api_error';
      this.logger.error(`Failed to enrich customer ${customer.id}: ${result.error}`);
      return result;
    }
  }

  /**
   * Clean and normalize phone number for the API
   */
  private cleanPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-numeric characters
    let cleaned = phone.replace(/[^0-9]/g, '');

    // If starts with 880, remove it (Bangladesh country code)
    if (cleaned.startsWith('880')) {
      cleaned = cleaned.substring(3);
    }

    // Ensure it starts with 0
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }

    // Validate Bangladesh mobile number format (11 digits starting with 01)
    if (cleaned.length === 11 && cleaned.startsWith('01')) {
      return cleaned;
    }

    return null;
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get count of customers needing enrichment
   */
  async getCustomersNeedingEnrichmentCount(): Promise<number> {
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.phone IS NOT NULL')
      .andWhere("customer.phone != ''")
      .andWhere(
        '(customer.name IS NULL OR customer.name = \'\' OR customer.address IS NULL OR customer.address = \'\')'
      )
      .getCount();
  }
}
