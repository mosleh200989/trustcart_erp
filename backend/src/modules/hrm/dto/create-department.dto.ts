import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
