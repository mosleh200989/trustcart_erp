import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query('active') active?: string): Promise<Category[]> {
    if (active === 'true') {
      return this.categoriesService.findActive();
    }
    return this.categoriesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Category | null> {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Category | null> {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  async create(@Body() categoryData: Partial<Category>): Promise<Category> {
    return this.categoriesService.create(categoryData);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() categoryData: Partial<Category>,
  ): Promise<Category | null> {
    return this.categoriesService.update(id, categoryData);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
