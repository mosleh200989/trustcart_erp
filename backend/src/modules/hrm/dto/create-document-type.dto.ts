import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
