import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsNumber()
  warehouse_id!: number;

  @IsOptional()
  @IsNumber()
  zone_id?: number;

  @IsString()
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  aisle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  rack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  shelf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bin?: string;

  @IsOptional()
  @IsString()
  @IsIn(['storage', 'receiving', 'shipping', 'returns', 'quarantine'])
  location_type?: string;

  @IsOptional()
  @IsNumber()
  max_weight_kg?: number;

  @IsOptional()
  @IsNumber()
  max_volume_m3?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;
}
