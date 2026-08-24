import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { StorefrontsService } from './storefronts.service';
import { Storefront } from './storefront.entity';
import { StorefrontCategory } from './storefront-category.entity';
import { StorefrontProduct } from './storefront-product.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('storefronts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorefrontsController {
  constructor(private readonly storefrontsService: StorefrontsService) {}

  // ─── Public endpoints (storefront websites) ──────────────
  // Declared before ':id' routes so 'public' is not captured as an id.

  @Get('public/:slug/config')
  @Public()
  getPublicConfig(@Param('slug') slug: string) {
    return this.storefrontsService.getPublicConfig(slug);
  }

  @Get('public/:slug/products')
  @Public()
  getPublicProducts(
    @Param('slug') slug: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
  ) {
    return this.storefrontsService.getPublicProducts(slug, {
      category,
      search,
      featured: featured === 'true',
    });
  }

  @Get('public/:slug/products/:productSlug')
  @Public()
  getPublicProduct(
    @Param('slug') slug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.storefrontsService.getPublicProduct(slug, productSlug);
  }

  // ─── Storefront CRUD (admin) ─────────────────────────────

  @Get()
  @RequirePermissions('view-storefronts')
  findAll(): Promise<Storefront[]> {
    return this.storefrontsService.findAll();
  }

  // Declared before ':id' so "performance" is not captured as an id
  @Get('performance/summary')
  @RequirePermissions('view-storefronts')
  performanceSummary(@Query('days') days?: string) {
    const parsed = Number(days);
    return this.storefrontsService.performanceSummary(
      Number.isFinite(parsed) && parsed > 0 ? Math.min(365, parsed) : null,
    );
  }

  @Get(':id')
  @RequirePermissions('view-storefronts')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Storefront> {
    return this.storefrontsService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-storefronts')
  create(@Body() data: Partial<Storefront>): Promise<Storefront> {
    return this.storefrontsService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage-storefronts')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Storefront>,
  ): Promise<Storefront> {
    return this.storefrontsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('delete-storefronts')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.storefrontsService.remove(id);
  }

  // ─── Categories (admin) ──────────────────────────────────

  @Get(':id/categories')
  @RequirePermissions('view-storefronts')
  findCategories(@Param('id', ParseIntPipe) id: number): Promise<StorefrontCategory[]> {
    return this.storefrontsService.findCategories(id);
  }

  @Post(':id/categories')
  @RequirePermissions('manage-storefronts')
  createCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<StorefrontCategory>,
  ): Promise<StorefrontCategory> {
    return this.storefrontsService.createCategory(id, data);
  }

  @Put(':id/categories/:categoryId')
  @RequirePermissions('manage-storefronts')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() data: Partial<StorefrontCategory>,
  ): Promise<StorefrontCategory> {
    return this.storefrontsService.updateCategory(id, categoryId, data);
  }

  @Delete(':id/categories/:categoryId')
  @RequirePermissions('manage-storefronts')
  removeCategory(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<void> {
    return this.storefrontsService.removeCategory(id, categoryId);
  }

  // ─── Product listings (admin) ────────────────────────────

  @Get(':id/products')
  @RequirePermissions('view-storefronts')
  findListings(@Param('id', ParseIntPipe) id: number): Promise<StorefrontProduct[]> {
    return this.storefrontsService.findListings(id);
  }

  @Post(':id/products')
  @RequirePermissions('manage-storefronts')
  addProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { product_id: number; storefront_category_id?: number },
  ): Promise<StorefrontProduct> {
    return this.storefrontsService.addProduct(id, data);
  }

  @Put(':id/products/:listingId')
  @RequirePermissions('manage-storefronts')
  updateListing(
    @Param('id', ParseIntPipe) id: number,
    @Param('listingId', ParseIntPipe) listingId: number,
    @Body() data: Partial<StorefrontProduct>,
  ): Promise<StorefrontProduct> {
    return this.storefrontsService.updateListing(id, listingId, data);
  }

  @Delete(':id/products/:listingId')
  @RequirePermissions('manage-storefronts')
  removeListing(
    @Param('id', ParseIntPipe) id: number,
    @Param('listingId', ParseIntPipe) listingId: number,
  ): Promise<void> {
    return this.storefrontsService.removeListing(id, listingId);
  }
}
