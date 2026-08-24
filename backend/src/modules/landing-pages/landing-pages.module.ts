import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './landing-pages.service';
import { LpTemplatesController } from './lp-templates.controller';
import { LandingPage } from './landing-page.entity';
import { LandingPageOrder } from './landing-page-order.entity';
import { LpTemplate } from './lp-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LandingPage, LandingPageOrder, LpTemplate])],
  controllers: [LandingPagesController, LpTemplatesController],
  providers: [LandingPagesService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}
