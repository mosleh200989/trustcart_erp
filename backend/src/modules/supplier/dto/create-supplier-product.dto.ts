import { IsNumber, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class CreateSupplierProductDto {
  @IsNumber()
  supplier_id!: number;

  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  variant_key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplier_sku?: string;

  @IsNumber()
  unit_price!: number;

  @IsOptional()
  @IsNumber()
  min_order_quantity?: number;

  @IsOptional()
  @IsNumber()
  lead_time_days?: number;

  @IsOptional()
  @IsBoolean()
  is_preferred?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
