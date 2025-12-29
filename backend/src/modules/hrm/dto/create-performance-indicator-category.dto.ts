import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePerformanceIndicatorCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
