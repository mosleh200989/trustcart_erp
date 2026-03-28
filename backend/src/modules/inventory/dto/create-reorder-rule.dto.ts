import { IsNumber, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class CreateReorderRuleDto {
  @IsNumber()
  product_id!: number;

  @IsOptional()
  @IsString()
  variant_key?: string;

  @IsOptional()
  @IsNumber()
  warehouse_id?: number;

  @IsNumber()
  reorder_point!: number;

  @IsNumber()
  reorder_quantity!: number;

  @IsOptional()
  @IsNumber()
  max_stock_level?: number;

  @IsOptional()
  @IsNumber()
  safety_stock?: number;

  @IsOptional()
  @IsNumber()
  lead_time_days?: number;

  @IsOptional()
  @IsNumber()
  preferred_supplier_id?: number;

  @IsOptional()
  @IsBoolean()
  auto_reorder?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
