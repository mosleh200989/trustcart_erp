import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourierConfiguration } from './courier-configuration.entity';
import { CourierConfigurationController } from './courier-configuration.controller';
import { CourierConfigurationService } from './courier-configuration.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourierConfiguration])],
  controllers: [CourierConfigurationController],
  providers: [CourierConfigurationService],
})
export class SettingsModule {}
