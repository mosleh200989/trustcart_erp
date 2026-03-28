import { IsNumber, IsOptional, IsString, IsIn, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AdjustmentItemDto {
  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsString()
  variant_key?: string;

  @IsOptional()
  @IsNumber()
  batch_id?: number;

  @IsOptional()
  @IsNumber()
  location_id?: number;

  @IsNumber()
  quantity_before!: number;

  @IsNumber()
  quantity_after!: number;

  @IsNumber()
  quantity_change!: number;

  @IsOptional()
  @IsNumber()
  unit_cost?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateStockAdjustmentDto {
  @IsNumber()
  warehouse_id!: number;

  @IsString()
  @IsIn(['increase', 'decrease', 'write_off', 'damage', 'expiry', 'recount'])
  adjustment_type!: string;

  @IsString()
  @MaxLength(255)
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentItemDto)
  items!: AdjustmentItemDto[];
}
