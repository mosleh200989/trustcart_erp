import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeTrainingDto {
  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  trainingSessionId?: number;

  @IsOptional()
  @IsString()
  completion_status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
