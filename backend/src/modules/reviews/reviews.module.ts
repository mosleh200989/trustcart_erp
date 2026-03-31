import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { CustomerReview } from './customer-review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [TenantTypeOrmModule.forFeature([CustomerReview]), LoyaltyModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
