import { PartialType } from '@nestjs/mapped-types';
import { CreatePerformanceIndicatorCategoryDto } from './create-performance-indicator-category.dto';

export class UpdatePerformanceIndicatorCategoryDto extends PartialType(CreatePerformanceIndicatorCategoryDto) {}
