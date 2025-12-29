import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAwardTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
