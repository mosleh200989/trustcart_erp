import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { Banner } from './banner.entity';

@Module({
  imports: [TenantTypeOrmModule.forFeature([Banner])],
  controllers: [BannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
