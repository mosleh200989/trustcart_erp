import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;
}
