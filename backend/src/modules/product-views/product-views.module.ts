import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProductView } from './user-product-view.entity';
import { ProductViewsService } from './product-views.service';
import { ProductViewsController } from './product-views.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserProductView])],
  controllers: [ProductViewsController],
  providers: [ProductViewsService],
  exports: [ProductViewsService],
})
export class ProductViewsModule {}
