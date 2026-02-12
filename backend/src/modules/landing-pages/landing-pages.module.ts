import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './landing-pages.service';
import { LandingPage } from './landing-page.entity';
import { LandingPageOrder } from './landing-page-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage, LandingPageOrder])],
  controllers: [LandingPagesController],
  providers: [LandingPagesService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}
