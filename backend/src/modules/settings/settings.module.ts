import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourierConfiguration } from './courier-configuration.entity';
import { CourierConfigurationController } from './courier-configuration.controller';
import { CourierConfigurationService } from './courier-configuration.service';
import { AdminMenuItem } from './admin-menu-item.entity';
import { AdminMenuController } from './admin-menu.controller';
import { AdminMenuService } from './admin-menu.service';
import { PrinterSettings } from './printer-settings.entity';
import { PrinterSettingsController } from './printer-settings.controller';
import { PrinterSettingsService } from './printer-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourierConfiguration, AdminMenuItem, PrinterSettings])],
  controllers: [CourierConfigurationController, AdminMenuController, PrinterSettingsController],
  providers: [CourierConfigurationService, AdminMenuService, PrinterSettingsService],
  exports: [PrinterSettingsService],
})
export class SettingsModule {}
