import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainingProgramDto } from './create-training-program.dto';

export class UpdateTrainingProgramDto extends PartialType(CreateTrainingProgramDto) {}
