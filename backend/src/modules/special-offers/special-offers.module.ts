import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { SpecialOffersController } from './special-offers.controller';
import { SpecialOffersService } from './special-offers.service';
import { SpecialOffer } from './special-offer.entity';

@Module({
  imports: [TenantTypeOrmModule.forFeature([SpecialOffer])],
  controllers: [SpecialOffersController],
  providers: [SpecialOffersService],
  exports: [SpecialOffersService],
})
export class SpecialOffersModule {}
