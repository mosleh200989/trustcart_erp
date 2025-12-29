import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateTripDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsString()
  trip_type?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
