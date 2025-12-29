import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class CreateAwardDto {
  @IsOptional()
  @IsNumber()
  awardTypeId?: number;

  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date_awarded?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
