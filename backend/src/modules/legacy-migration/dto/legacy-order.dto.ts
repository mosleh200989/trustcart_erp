/**
 * DTO representing the raw order data from the legacy API
 * API: https://kasrioil.com/dropbd/api/v1/sales/currier
 */
export interface LegacyOrderDto {
  id: string;
  daily_serial: string;
  date: string; // Format: "2026-01-31 20:28:47"
  mobile_no: string;
  product_details: string; // Bengali text with product info
  total_amount: string;
  delivery_charge: string;
  other_cost: string;
  curier_company: string;
  curier_id: string;
  tracking_id: string;
  delivery_status: string; // "pending", "delivered", "unknown"
  curier_note: string | null;
  courier_note: string; // Both fields exist in API
  order_sourch: string;
  sourch_details: string;
  platform: string | null; // "painoil", "leoqone", "Allergy-Cure", etc.
  platform_status: string | null;
  pak_status: string;
  user_id: string;
  pictures: string;
  received_date: string | null;
  is_deleted: string;
  is_exchange: string;
  is_printed: string;
  is_received: string;
  is_sent_trustcart: string;
  is_shipped: string;
  is_syncronized: string;
}

/**
 * API Response structure
 */
export interface LegacyApiResponse {
  data: LegacyOrderDto[];
  limit: number;
  start: number;
  total: number;
  painoil_total: number;
  leoqone_total: number;
  Period_total: number;
  AllergyCure_total: number;
  mpower_total: number;
  fpower_total: number;
  total_parcel: number;
  status: boolean;
  message: string;
  total_packed: number;
  total_remaining_packed: number;
}

import { IsDateString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

/**
 * Request DTO for migration endpoint
 */
export class MigrateLegacyOrdersDto {
  /**
   * Date in YYYY-MM-DD format
   * @example "2026-01-31"
   */
  @IsDateString()
  date: string;

  /**
   * If true, only simulate the migration without inserting data
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  /**
   * Maximum number of records to process (for testing)
   * @default 500
   */
  @IsOptional()
  @IsNumber()
  limit?: number;
}

/**
 * Request DTO for batch migration (date range)
 */
export class MigrateBatchDto {
  /**
   * Start date in YYYY-MM-DD format
   * @example "2026-01-21"
   */
  @IsDateString()
  startDate: string;

  /**
   * End date in YYYY-MM-DD format
   * @example "2026-01-30"
   */
  @IsDateString()
  endDate: string;

  /**
   * If true, only simulate the migration without inserting data
   * @default false
   */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

/**
 * Batch migration result
 */
export interface BatchMigrationResult {
  startDate: string;
  endDate: string;
  dryRun: boolean;
  totalDays: number;
  totalOrdersFetched: number;
  totalOrdersCreated: number;
  totalOrdersSkipped: number;
  totalCustomersCreated: number;
  totalErrors: number;
  dailyResults: MigrationResult[];
  duration: number;
}

/**
 * Migration result summary
 */
export interface MigrationResult {
  date: string;
  dryRun: boolean;
  totalFetched: number;
  totalProcessed: number;
  customersCreated: number;
  customersFound: number;
  ordersCreated: number;
  ordersSkipped: number;
  orderItemsCreated: number;
  errors: MigrationError[];
  duration: number; // in milliseconds
}

export interface MigrationError {
  legacyId: string;
  mobile: string;
  error: string;
}

/**
 * Product mapping configuration
 */
export interface ProductMapping {
  platform: string;
  keywords: string[];
  productId: number;
}
