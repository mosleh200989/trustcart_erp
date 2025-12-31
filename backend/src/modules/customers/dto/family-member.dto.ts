import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export const FAMILY_RELATIONSHIPS = [
  'spouse',
  'child',
  'parent',
  'sibling',
  'grandparent',
  'other',
] as const;

export type FamilyRelationship = (typeof FAMILY_RELATIONSHIPS)[number];

export class CreateFamilyMemberDto {
  @IsInt()
  @Min(1)
  customerId!: number;

  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  @Length(1, 20)
  phone!: string;

  @IsString()
  @IsIn(FAMILY_RELATIONSHIPS)
  relationship!: FamilyRelationship;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;
}

export class UpdateFamilyMemberDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(FAMILY_RELATIONSHIPS)
  relationship?: FamilyRelationship;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsDateString()
  anniversaryDate?: string | null;
}
