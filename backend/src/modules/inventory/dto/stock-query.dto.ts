import { IsOptional, IsNumber, IsString, MaxLength } from 'class-validator';

export class StockQueryDto {
  @IsOptional()
  @IsNumber()
  product_id?: number;

  @IsOptional()
  @IsString()
  variant_key?: string;

  @IsOptional()
  @IsNumber()
  warehouse_id?: number;

  @IsOptional()
  @IsNumber()
  location_id?: number;

  @IsOptional()
  @IsNumber()
  batch_id?: number;
}
