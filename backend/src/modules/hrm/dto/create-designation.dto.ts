import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
