import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmEmployeeTrainings } from '../entities/hrm-employee-trainings.entity';
import { CreateEmployeeTrainingDto } from '../dto/create-employee-training.dto';
import { UpdateEmployeeTrainingDto } from '../dto/update-employee-training.dto';

@Injectable()
export class HrmEmployeeTrainingsService {
  constructor(
    @InjectRepository(HrmEmployeeTrainings)
    private readonly employeeTrainingsRepository: Repository<HrmEmployeeTrainings>,
  ) {}

  create(dto: CreateEmployeeTrainingDto) {
    const et = this.employeeTrainingsRepository.create(dto);
    return this.employeeTrainingsRepository.save(et);
  }

  findAll() {
    return this.employeeTrainingsRepository.find();
  }

  findOne(id: number) {
    return this.employeeTrainingsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateEmployeeTrainingDto) {
    return this.employeeTrainingsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.employeeTrainingsRepository.delete(id);
  }
}
