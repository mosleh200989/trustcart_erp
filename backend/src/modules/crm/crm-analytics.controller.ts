import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CrmAnalyticsService } from './crm-analytics.service';

@Controller('crm/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmAnalyticsController {
  constructor(private readonly crmAnalyticsService: CrmAnalyticsService) {}

  @Get('summary')
  async getSummary(@Query('rangeDays') rangeDays?: string) {
    const days = rangeDays != null ? Number(rangeDays) : 30;
    return this.crmAnalyticsService.getSummary(days);
  }

  @Get('dashboard')
  async getDashboard() {
    return this.crmAnalyticsService.getDashboardStats();
  }
}
