import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerReview } from './customer-review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerReview]), LoyaltyModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
