import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async findAll() {
    return this.reviewsService.findAll();
  }

  @Get('featured')
  async findFeatured() {
    return this.reviewsService.findFeatured();
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(parseInt(productId));
  }

  @Post()
  async create(@Body() createReviewDto: any) {
    return this.reviewsService.create(createReviewDto);
  }
}
