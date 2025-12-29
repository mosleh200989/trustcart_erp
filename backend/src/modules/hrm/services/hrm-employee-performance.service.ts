import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmEmployeePerformance } from '../entities/hrm-employee-performance.entity';
import { CreateEmployeePerformanceDto } from '../dto/create-employee-performance.dto';
import { UpdateEmployeePerformanceDto } from '../dto/update-employee-performance.dto';

@Injectable()
export class HrmEmployeePerformanceService {
  constructor(
    @InjectRepository(HrmEmployeePerformance)
    private readonly employeePerformanceRepository: Repository<HrmEmployeePerformance>,
  ) {}

  create(dto: CreateEmployeePerformanceDto) {
    const ep = this.employeePerformanceRepository.create(dto);
    return this.employeePerformanceRepository.save(ep);
  }

  findAll() {
    return this.employeePerformanceRepository.find();
  }

  findOne(id: number) {
    return this.employeePerformanceRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateEmployeePerformanceDto) {
    return this.employeePerformanceRepository.update(id, dto);
  }

  remove(id: number) {
    return this.employeePerformanceRepository.delete(id);
  }
}
