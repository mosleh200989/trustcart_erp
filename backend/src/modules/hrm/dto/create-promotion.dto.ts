import { IsNumber, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class CreatePromotionDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  oldDesignationId?: number;

  @IsOptional()
  @IsNumber()
  newDesignationId?: number;

  @IsOptional()
  @IsDateString()
  promotion_date?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
