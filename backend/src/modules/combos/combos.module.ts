import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComboDeal } from './combo-deal.entity';
import { CombosService } from './combos.service';
import { CombosController } from './combos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ComboDeal])],
  controllers: [CombosController],
  providers: [CombosService],
  exports: [CombosService],
})
export class CombosModule {}
