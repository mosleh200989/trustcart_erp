import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';
import { LpExperiment } from './lp-experiment.entity';
import { LandingPage } from '../landing-pages/landing-page.entity';
import { SalesOrder } from '../sales/sales-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LpExperiment, LandingPage, SalesOrder])],
  controllers: [ExperimentsController],
  providers: [ExperimentsService],
  exports: [ExperimentsService],
})
export class ExperimentsModule {}
