import { Controller, Post, Get, Delete, Body, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { LegacyMigrationService } from './legacy-migration.service';
import { MigrateLegacyOrdersDto, MigrateBatchDto, MigrationResult, BatchMigrationResult } from './dto/legacy-order.dto';

@Controller('admin/legacy-migration')
export class LegacyMigrationController {
  private readonly logger = new Logger(LegacyMigrationController.name);

  constructor(private readonly legacyMigrationService: LegacyMigrationService) {}

  /**
   * Migrate orders from legacy API for a specific date
   * 
   * POST /api/v1/admin/legacy-migration/orders
   * Body: { "date": "2026-01-31", "dryRun": true, "limit": 500 }
   */
  @Post('orders')
  async migrateOrders(@Body() dto: MigrateLegacyOrdersDto): Promise<MigrationResult> {
    this.logger.log(`Migration request received: ${JSON.stringify(dto)}`);

    // Validate date format
    if (!dto.date || !/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      throw new HttpException(
        'Invalid date format. Use YYYY-MM-DD (e.g., 2026-01-31)',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.legacyMigrationService.migrateOrders(dto);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Migration failed: ${errorMessage}`);
      throw new HttpException(
        `Migration failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Batch migrate orders for a date range
   * 
   * POST /api/admin/legacy-migration/batch
   * Body: { "startDate": "2026-01-21", "endDate": "2026-01-30", "dryRun": false }
   */
  @Post('batch')
  async migrateBatch(@Body() dto: MigrateBatchDto): Promise<BatchMigrationResult> {
    this.logger.log(`Batch migration request received: ${JSON.stringify(dto)}`);

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dto.startDate || !dateRegex.test(dto.startDate)) {
      throw new HttpException(
        'Invalid startDate format. Use YYYY-MM-DD (e.g., 2026-01-21)',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!dto.endDate || !dateRegex.test(dto.endDate)) {
      throw new HttpException(
        'Invalid endDate format. Use YYYY-MM-DD (e.g., 2026-01-30)',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate startDate <= endDate
    if (dto.startDate > dto.endDate) {
      throw new HttpException(
        'startDate must be before or equal to endDate',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.legacyMigrationService.migrateBatch(dto);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Batch migration failed: ${errorMessage}`);
      throw new HttpException(
        `Batch migration failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get migration statistics for a date range
   * 
   * GET /api/v1/admin/legacy-migration/stats?startDate=2026-01-01&endDate=2026-01-31
   */
  @Get('stats')
  async getMigrationStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    if (!startDate || !endDate) {
      throw new HttpException(
        'Both startDate and endDate are required (YYYY-MM-DD format)',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const stats = await this.legacyMigrationService.getMigrationStats(startDate, endDate);
      return {
        status: 'success',
        startDate,
        endDate,
        data: stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get stats: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Rollback migration for a specific date
   * 
   * DELETE /api/v1/admin/legacy-migration/rollback?date=2026-01-31&dryRun=true
   */
  @Delete('rollback')
  async rollbackMigration(
    @Query('date') date: string,
    @Query('dryRun') dryRun: string = 'true',
  ): Promise<any> {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpException(
        'Invalid date format. Use YYYY-MM-DD (e.g., 2026-01-31)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isDryRun = dryRun !== 'false';

    try {
      const result = await this.legacyMigrationService.rollbackMigration(date, isDryRun);
      return {
        status: 'success',
        date,
        dryRun: isDryRun,
        ...result,
        message: isDryRun 
          ? `Would delete ${result.deletedOrders} orders and ${result.deletedItems} items` 
          : `Deleted ${result.deletedOrders} orders and ${result.deletedItems} items`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Rollback failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint
   * 
   * GET /api/v1/admin/legacy-migration/health
   */
  @Get('health')
  async healthCheck(): Promise<any> {
    return {
      status: 'ok',
      service: 'legacy-migration',
      timestamp: new Date().toISOString(),
    };
  }
}
