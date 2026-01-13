import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  async findAll(@Query('active') active?: string): Promise<Category[]> {
    if (active === 'true') {
      return this.categoriesService.findActive();
    }
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: number): Promise<Category | null> {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  async findBySlug(@Param('slug') slug: string): Promise<Category | null> {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  @RequirePermissions('manage-categories')
  async create(@Body() categoryData: Partial<Category>): Promise<Category> {
    return this.categoriesService.create(categoryData);
  }

  @Put(':id')
  @RequirePermissions('manage-categories')
  async update(
    @Param('id') id: number,
    @Body() categoryData: Partial<Category>,
  ): Promise<Category | null> {
    return this.categoriesService.update(id, categoryData);
  }

  @Delete(':id')
  @RequirePermissions('manage-categories')
  async remove(@Param('id') id: number): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
