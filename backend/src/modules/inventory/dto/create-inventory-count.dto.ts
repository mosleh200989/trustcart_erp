import { IsNumber, IsOptional, IsString, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CountItemDto {
  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsString()
  variant_key?: string;

  @IsOptional()
  @IsNumber()
  location_id?: number;

  @IsOptional()
  @IsNumber()
  batch_id?: number;
}

export class CreateInventoryCountDto {
  @IsNumber()
  warehouse_id!: number;

  @IsString()
  @IsIn(['full', 'cycle', 'spot'])
  count_type!: string;

  @IsOptional()
  @IsNumber()
  scope_zone_id?: number;

  @IsOptional()
  @IsNumber()
  scope_category_id?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountItemDto)
  items?: CountItemDto[];
}

export class RecordCountItemDto {
  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsString()
  variant_key?: string;

  @IsOptional()
  @IsNumber()
  location_id?: number;

  @IsOptional()
  @IsNumber()
  batch_id?: number;

  @IsNumber()
  counted_quantity!: number;

  @IsOptional()
  @IsString()
  variance_reason?: string;
}
