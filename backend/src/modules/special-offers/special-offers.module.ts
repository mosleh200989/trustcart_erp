import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialOffersController } from './special-offers.controller';
import { SpecialOffersService } from './special-offers.service';
import { SpecialOffer } from './special-offer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpecialOffer])],
  controllers: [SpecialOffersController],
  providers: [SpecialOffersService],
  exports: [SpecialOffersService],
})
export class SpecialOffersModule {}
