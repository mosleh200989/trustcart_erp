import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ProductViewsService } from './product-views.service';

@Controller('product-views')
export class ProductViewsController {
  constructor(private readonly productViewsService: ProductViewsService) {}

  @Post('track')
  async trackView(
    @Body() body: { productId: number; userId?: number; sessionId?: string }
  ) {
    return this.productViewsService.trackView(
      body.productId,
      body.userId,
      body.sessionId
    );
  }

  @Get('recent')
  async getRecentlyViewed(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: string
  ) {
    return this.productViewsService.getRecentlyViewed(
      userId ? parseInt(userId) : undefined,
      sessionId,
      limit ? parseInt(limit) : 8
    );
  }
}
