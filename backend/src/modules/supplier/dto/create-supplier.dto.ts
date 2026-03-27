import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsIn, IsArray, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(200)
  company_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company_name_bn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contact_person?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  alt_phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tax_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  trade_license?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bank_account_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank_branch?: string;

  @IsOptional()
  @IsString()
  @IsIn(['cod', 'net_15', 'net_30', 'net_60', 'advance'])
  payment_terms?: string;

  @IsOptional()
  @IsNumber()
  credit_limit?: number;

  @IsOptional()
  @IsNumber()
  lead_time_days?: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  @IsIn(['organic_produce', 'dairy', 'grains', 'spices', 'packaging', 'general'])
  category?: string;

  @IsOptional()
  @IsArray()
  certifications?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'blacklisted', 'pending_approval'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  user_id?: number;
}
