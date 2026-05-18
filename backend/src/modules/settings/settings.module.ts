import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { CourierConfiguration } from './courier-configuration.entity';
import { CourierConfigurationController } from './courier-configuration.controller';
import { CourierConfigurationService } from './courier-configuration.service';
import { AdminMenuItem } from './admin-menu-item.entity';
import { AdminMenuController } from './admin-menu.controller';
import { AdminMenuService } from './admin-menu.service';
import { PrinterSettings } from './printer-settings.entity';
import { PrinterSettingsController } from './printer-settings.controller';
import { PrinterSettingsService } from './printer-settings.service';
import { OrderGuardSettings } from './order-guard-settings.entity';
import { OrderGuardSettingsController } from './order-guard-settings.controller';
import { OrderGuardSettingsService } from './order-guard-settings.service';

@Module({
  imports: [TenantTypeOrmModule.forFeature([CourierConfiguration, AdminMenuItem, PrinterSettings, OrderGuardSettings])],
  controllers: [CourierConfigurationController, AdminMenuController, PrinterSettingsController, OrderGuardSettingsController],
  providers: [CourierConfigurationService, AdminMenuService, PrinterSettingsService, OrderGuardSettingsService],
  exports: [PrinterSettingsService, OrderGuardSettingsService],
})
export class SettingsModule {}
