import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { DataAccessService } from './data-access.service';

/**
 * Who has been reading customer data, and how much of it.
 *
 * Deliberately read-only: this log is evidence, and nothing in the application
 * may edit or delete it. Rows age out on their own after a year.
 */
@Controller('data-access')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DataAccessController {
  constructor(private readonly service: DataAccessService) {}

  @Get()
  @RequirePermissions('view-data-access-log')
  list(
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('minRecords') minRecords?: string,
    @Query('days') days?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      userId: userId ? Number(userId) : undefined,
      resource,
      action,
      minRecords: minRecords ? Number(minRecords) : undefined,
      days: days ? Number(days) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('statistics')
  @RequirePermissions('view-data-access-log')
  statistics(@Query('days') days?: string) {
    return this.service.statistics({ days: days ? Number(days) : undefined });
  }
}
