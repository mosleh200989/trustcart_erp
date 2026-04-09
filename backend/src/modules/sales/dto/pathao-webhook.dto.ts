import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Pathao Courier webhook payloads.
 *
 * Pathao sends order status updates to the configured webhook URL.
 * All fields are optional since the payload shape may vary.
 */
export class PathaoWebhookDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consignment_id?: number;

  @IsOptional()
  @IsString()
  order_status?: string;

  @IsOptional()
  @IsString()
  order_status_slug?: string;

  @IsOptional()
  @IsString()
  merchant_order_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  delivery_fee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cod_amount?: number;

  @IsOptional()
  @IsString()
  recipient_name?: string;

  @IsOptional()
  @IsString()
  recipient_phone?: string;

  @IsOptional()
  @IsString()
  recipient_address?: string;

  @IsOptional()
  @IsString()
  updated_at?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  invoice_id?: string;
}
