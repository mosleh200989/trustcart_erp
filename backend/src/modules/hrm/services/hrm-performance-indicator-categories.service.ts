import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmPerformanceIndicatorCategories } from '../entities/hrm-performance-indicator-categories.entity';
import { CreatePerformanceIndicatorCategoryDto } from '../dto/create-performance-indicator-category.dto';
import { UpdatePerformanceIndicatorCategoryDto } from '../dto/update-performance-indicator-category.dto';

@Injectable()
export class HrmPerformanceIndicatorCategoriesService {
  constructor(
    @InjectRepository(HrmPerformanceIndicatorCategories)
    private readonly categoriesRepository: Repository<HrmPerformanceIndicatorCategories>,
  ) {}

  create(dto: CreatePerformanceIndicatorCategoryDto) {
    const category = this.categoriesRepository.create(dto);
    return this.categoriesRepository.save(category);
  }

  findAll() {
    return this.categoriesRepository.find();
  }

  findOne(id: number) {
    return this.categoriesRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdatePerformanceIndicatorCategoryDto) {
    return this.categoriesRepository.update(id, dto);
  }

  remove(id: number) {
    return this.categoriesRepository.delete(id);
  }
}
