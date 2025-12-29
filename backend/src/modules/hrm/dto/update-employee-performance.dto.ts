import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeePerformanceDto } from './create-employee-performance.dto';

export class UpdateEmployeePerformanceDto extends PartialType(CreateEmployeePerformanceDto) {}
