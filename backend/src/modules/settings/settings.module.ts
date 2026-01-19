import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourierConfiguration } from './courier-configuration.entity';
import { CourierConfigurationController } from './courier-configuration.controller';
import { CourierConfigurationService } from './courier-configuration.service';
import { AdminMenuItem } from './admin-menu-item.entity';
import { AdminMenuController } from './admin-menu.controller';
import { AdminMenuService } from './admin-menu.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourierConfiguration, AdminMenuItem])],
  controllers: [CourierConfigurationController, AdminMenuController],
  providers: [CourierConfigurationService, AdminMenuService],
})
export class SettingsModule {}
