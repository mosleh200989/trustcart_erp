import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('manage-system-settings')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('performedBy') performedBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 30,
      search,
      module,
      action,
      entityType,
      performedBy: performedBy ? parseInt(performedBy, 10) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('stats')
  @RequirePermissions('manage-system-settings')
  async getStats() {
    return this.auditLogService.getStats();
  }

  @Get('filters')
  @RequirePermissions('manage-system-settings')
  async getFilters() {
    const [modules, entityTypes] = await Promise.all([
      this.auditLogService.getDistinctModules(),
      this.auditLogService.getDistinctEntityTypes(),
    ]);
    return { modules, entityTypes };
  }

  @Get(':id')
  @RequirePermissions('manage-system-settings')
  async findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(parseInt(id, 10));
  }
}
