import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateComplaintDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsString()
  complaint_type?: string;

  @IsOptional()
  @IsDateString()
  complaint_date?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
