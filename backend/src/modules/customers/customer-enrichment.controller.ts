import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerEnrichmentService, EnrichmentSummary } from './customer-enrichment.service';

@Controller('customers/enrichment')
@UseGuards(JwtAuthGuard)
export class CustomerEnrichmentController {
  constructor(
    private readonly enrichmentService: CustomerEnrichmentService,
  ) {}

  /**
   * Get the count of customers needing enrichment
   * GET /customers/enrichment/count
   */
  @Get('count')
  async getCount() {
    const count = await this.enrichmentService.getCustomersNeedingEnrichmentCount();
    return {
      success: true,
      count,
      message: `Found ${count} customers without name or address`,
    };
  }

  /**
   * Get the status of the current or last enrichment run
   * GET /customers/enrichment/status
   */
  @Get('status')
  getStatus(): { isRunning: boolean; summary: EnrichmentSummary | null } {
    return this.enrichmentService.getStatus();
  }

  /**
   * Stop the current enrichment process
   * POST /customers/enrichment/stop
   */
  @Post('stop')
  stopEnrichment() {
    this.enrichmentService.stopEnrichment();
    return {
      success: true,
      message: 'Stop request sent. The process will stop after the current customer.',
    };
  }

  /**
   * Start customer enrichment (test mode - 100 customers by default)
   * POST /customers/enrichment/start?limit=100&delay=100
   * 
   * Query params:
   * - limit: Number of customers to process (default 100, use 0 for all)
   * - delay: Delay between API calls in ms (default 100)
   * - batchSize: Batch size for processing (default 50)
   */
  @Post('start')
  async startEnrichment(
    @Query('limit') limitParam?: string,
    @Query('delay') delayParam?: string,
    @Query('batchSize') batchSizeParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    const delay = delayParam ? parseInt(delayParam, 10) : 100;
    const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 50;

    // Run enrichment in background and return immediately
    this.enrichmentService.enrichCustomers(limit, batchSize, delay)
      .then(() => {
        console.log('Enrichment completed successfully');
      })
      .catch((error) => {
        console.error('Enrichment failed:', error);
      });

    return {
      success: true,
      message: `Enrichment started. Processing ${limit || 'ALL'} customers with ${delay}ms delay between calls.`,
      hint: 'Use GET /customers/enrichment/status to check progress',
    };
  }

  /**
   * Start full production enrichment (all customers)
   * POST /customers/enrichment/start-full?delay=150
   * 
   * This processes ALL customers without name or address.
   * Use with caution - this may take a long time!
   */
  @Post('start-full')
  async startFullEnrichment(
    @Query('delay') delayParam?: string,
  ) {
    const delay = delayParam ? parseInt(delayParam, 10) : 150; // Slightly higher delay for production

    // Run enrichment in background
    this.enrichmentService.enrichCustomers(0, 50, delay)
      .then(() => {
        console.log('Full enrichment completed successfully');
      })
      .catch((error) => {
        console.error('Full enrichment failed:', error);
      });

    return {
      success: true,
      message: `Full enrichment started. Processing ALL customers with ${delay}ms delay between calls.`,
      warning: 'This process may take several hours for 69,000+ customers!',
      hint: 'Use GET /customers/enrichment/status to check progress. Use POST /customers/enrichment/stop to stop.',
    };
  }
}
