import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateEmployeePerformanceDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  indicatorId?: number;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsDateString()
  review_date?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
