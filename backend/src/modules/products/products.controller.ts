import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  @Get()
  async findAll() {
    const products = await this.productsService.findAll();
    console.log(`Controller returning ${products.length} products`);
    return products;
  }

  @Get('categories')
  async findAllCategories() {
    return await this.productsService.findAllCategories();
  }

  @Get('test')
  async test() {
    return { message: 'API is working', timestamp: new Date() };
  }

  @Get('debug-count')
  async debugCount() {
    console.log('Debug endpoint hit');
    try {
      const count = await this.productsRepository.count();
      console.log('Count result:', count);
      return { count, message: 'Count retrieved successfully' };
    } catch (error) {
      console.error('Count error:', error);
      return { error: String(error), message: 'Count failed' };
    }
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.trim() === '') {
      return [];
    }
    return await this.productsService.searchProducts(query);
  }

  @Get('by-slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    console.log('Finding product by slug:', slug);
    const product = await this.productsService.findBySlug(slug);
    if (!product) {
      throw new Error(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  async create(@Body() createProductDto: any) {
    try {
      console.log('POST /products called with:', createProductDto);
      return await this.productsService.create(createProductDto);
    } catch (error: any) {
      console.error('Error in create controller:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error message:', error?.message);
      // Return more detailed error for debugging
      throw {
        statusCode: 500,
        message: error?.message || 'Failed to create product',
        detail: error?.detail || error?.toString()
      };
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: any) {
    try {
      console.log('PUT /products/:id called with:', id, updateProductDto);
      return await this.productsService.update(id, updateProductDto);
    } catch (error) {
      console.error('Error in update controller:', error);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // Homepage Features Endpoints
  @Get('featured/deal-of-day')
  async getDealOfDay() {
    return this.productsService.findDealOfDay();
  }

  @Get('featured/popular')
  async getPopular() {
    return this.productsService.findPopular();
  }

  @Get('featured/new-arrivals')
  async getNewArrivals() {
    return this.productsService.findNewArrivals();
  }

  @Get('featured/featured')
  async getFeatured() {
    return this.productsService.findFeatured();
  }

  @Get('related/:productId')
  async getRelated(
    @Param('productId') productId: string,
    @Query('limit') limit?: string
  ) {
    return this.productsService.findRelated(
      parseInt(productId),
      limit ? parseInt(limit) : 4
    );
  }

  @Get('featured/suggested')
  async getSuggested(@Query('limit') limit?: string) {
    return this.productsService.findSuggested(limit ? parseInt(limit) : 4);
  }

  @Get('featured/recently-viewed')
  async getRecentlyViewed(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: string
  ) {
    return this.productsService.findRecentlyViewed(
      userId ? parseInt(userId) : undefined,
      sessionId,
      limit ? parseInt(limit) : 8
    );
  }
}
