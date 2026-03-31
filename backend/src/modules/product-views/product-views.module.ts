import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { UserProductView } from './user-product-view.entity';
import { ProductViewsService } from './product-views.service';
import { ProductViewsController } from './product-views.controller';

@Module({
  imports: [TenantTypeOrmModule.forFeature([UserProductView])],
  controllers: [ProductViewsController],
  providers: [ProductViewsService],
  exports: [ProductViewsService],
})
export class ProductViewsModule {}
