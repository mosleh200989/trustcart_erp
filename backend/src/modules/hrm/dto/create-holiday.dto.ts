import { IsString, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  name: string;

  @IsDateString()
  holiday_date: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
