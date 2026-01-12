import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCustomerTagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;
}
