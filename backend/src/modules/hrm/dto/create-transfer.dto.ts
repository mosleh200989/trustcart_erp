import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateTransferDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  fromBranchId?: number;

  @IsOptional()
  @IsNumber()
  toBranchId?: number;

  @IsOptional()
  @IsDateString()
  transfer_date?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
