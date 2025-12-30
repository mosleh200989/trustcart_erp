import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmEmployees } from '../entities/hrm-employees.entity';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';

@Injectable()
export class HrmEmployeesService {
  constructor(
    @InjectRepository(HrmEmployees)
    private readonly employeeRepository: Repository<HrmEmployees>,
  ) {}

  create(dto: CreateEmployeeDto) {
    const employee = this.employeeRepository.create(dto);
    return this.employeeRepository.save(employee);
  }

  findAll() {
    return this.employeeRepository.find();
  }

  findOne(id: number) {
    return this.employeeRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateEmployeeDto) {
    return this.employeeRepository.update(id, dto);
  }

  remove(id: number) {
    return this.employeeRepository.delete(id);
  }
}
