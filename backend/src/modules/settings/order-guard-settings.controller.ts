import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAnyPermission, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrderGuardSettingsService } from './order-guard-settings.service';

@Controller('order-guard-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderGuardSettingsController {
  constructor(private readonly service: OrderGuardSettingsService) {}

  @Get()
  @RequireAnyPermission('view-order-guard', 'manage-order-guard')
  async getSettings() {
    return this.service.getSettings();
  }

  @Put()
  @RequireAnyPermission('manage-order-guard', 'manage-system-settings')
  async updateSettings(@Body() body: any) {
    return this.service.updateSettings(body);
  }
}
