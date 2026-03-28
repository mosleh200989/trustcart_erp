import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, MaxLength } from 'class-validator';

export class CreateZoneDto {
  @IsNumber()
  warehouse_id!: number;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(['ambient', 'cold', 'frozen', 'dry', 'hazardous'])
  type!: string;

  @IsOptional()
  @IsNumber()
  temperature_min?: number;

  @IsOptional()
  @IsNumber()
  temperature_max?: number;

  @IsOptional()
  @IsNumber()
  humidity_min?: number;

  @IsOptional()
  @IsNumber()
  humidity_max?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
