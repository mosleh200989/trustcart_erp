import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreatePerformanceIndicatorDto {
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  max_score?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
