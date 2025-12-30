import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateResignationDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsDateString()
  resignation_date: string;

  @IsOptional()
  @IsDateString()
  notice_date?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
