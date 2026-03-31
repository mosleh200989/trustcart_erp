import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { ComboDeal } from './combo-deal.entity';
import { CombosService } from './combos.service';
import { CombosController } from './combos.controller';

@Module({
  imports: [TenantTypeOrmModule.forFeature([ComboDeal])],
  controllers: [CombosController],
  providers: [CombosService],
  exports: [CombosService],
})
export class CombosModule {}
