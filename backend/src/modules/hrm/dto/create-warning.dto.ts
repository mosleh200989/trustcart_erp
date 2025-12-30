import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateWarningDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsString()
  warning_type?: string;

  @IsOptional()
  @IsDateString()
  warning_date?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
