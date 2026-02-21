import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Steadfast webhook payloads.
 *
 * Steadfast sends two notification types:
 *
 * 1. `delivery_status` — delivery status change (includes cod_amount, delivery_charge, status)
 * 2. `tracking_update` — tracking progress update (tracking_message only)
 *
 * All fields are marked optional because the two types have different shapes,
 * and Steadfast may evolve the payload over time.
 */
export class SteadfastWebhookDto {
  @IsOptional()
  @IsString()
  @IsIn(['delivery_status', 'tracking_update'], {
    message: 'notification_type must be "delivery_status" or "tracking_update"',
  })
  notification_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consignment_id?: number;

  @IsOptional()
  @IsString()
  invoice?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'cod_amount must be a number' })
  cod_amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'delivered', 'partial_delivered', 'cancelled', 'unknown'], {
    message: 'status must be one of: pending, delivered, partial_delivered, cancelled, unknown',
  })
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'delivery_charge must be a number' })
  delivery_charge?: number;

  @IsOptional()
  @IsString()
  tracking_message?: string;

  @IsOptional()
  @IsString()
  updated_at?: string;

  // ── Legacy / alternative field names that Steadfast may also send ──

  @IsOptional()
  @IsString()
  tracking_code?: string;

  @IsOptional()
  @IsString()
  delivery_status?: string;

  @IsOptional()
  @IsString()
  current_status?: string;

  @IsOptional()
  @IsString()
  consignment_status?: string;
}
