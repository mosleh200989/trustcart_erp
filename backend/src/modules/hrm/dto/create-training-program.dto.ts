import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateTrainingProgramDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  trainingTypeId?: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
