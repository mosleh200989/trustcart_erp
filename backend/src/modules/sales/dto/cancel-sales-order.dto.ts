import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelSalesOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cancelReason?: string;
}
