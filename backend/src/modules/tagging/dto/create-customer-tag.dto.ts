import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;
}
