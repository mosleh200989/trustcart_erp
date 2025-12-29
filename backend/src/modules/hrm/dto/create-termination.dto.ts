import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateTerminationDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsDateString()
  termination_date: string;

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
