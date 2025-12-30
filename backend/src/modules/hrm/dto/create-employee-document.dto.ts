import { IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class CreateEmployeeDocumentDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  documentTypeId?: number;

  @IsOptional()
  @IsString()
  document_url?: string;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
