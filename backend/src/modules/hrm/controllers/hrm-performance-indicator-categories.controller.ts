import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmPerformanceIndicatorCategoriesService } from '../services/hrm-performance-indicator-categories.service';
import { CreatePerformanceIndicatorCategoryDto } from '../dto/create-performance-indicator-category.dto';
import { UpdatePerformanceIndicatorCategoryDto } from '../dto/update-performance-indicator-category.dto';

@Controller('hrm/performance-indicator-categories')
export class HrmPerformanceIndicatorCategoriesController {
  constructor(private readonly categoriesService: HrmPerformanceIndicatorCategoriesService) {}

  @Post()
  create(@Body() dto: CreatePerformanceIndicatorCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePerformanceIndicatorCategoryDto) {
    return this.categoriesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}
