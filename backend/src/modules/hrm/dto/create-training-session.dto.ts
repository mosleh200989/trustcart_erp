import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class CreateTrainingSessionDto {
  @IsOptional()
  @IsNumber()
  trainingProgramId?: number;

  @IsString()
  session_title: string;

  @IsOptional()
  @IsDateString()
  session_date?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  trainer?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
