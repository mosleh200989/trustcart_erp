import { IsNumber, IsOptional, IsString, IsIn, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class TransferItemDto {
  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsString()
  variant_key?: string;

  @IsOptional()
  @IsNumber()
  batch_id?: number;

  @IsNumber()
  quantity_requested!: number;

  @IsOptional()
  @IsNumber()
  source_location_id?: number;

  @IsOptional()
  @IsNumber()
  destination_location_id?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStockTransferDto {
  @IsNumber()
  source_warehouse_id!: number;

  @IsNumber()
  destination_warehouse_id!: number;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];
}
