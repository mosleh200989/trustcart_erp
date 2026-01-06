import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCourierConfigurationDto {
  @IsOptional()
  @IsString()
  companyname?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
