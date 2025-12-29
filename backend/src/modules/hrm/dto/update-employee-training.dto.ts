import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeTrainingDto } from './create-employee-training.dto';

export class UpdateEmployeeTrainingDto extends PartialType(CreateEmployeeTrainingDto) {}
