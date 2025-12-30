import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmDepartments } from '../entities/hrm-departments.entity';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';

@Injectable()
export class HrmDepartmentsService {
  constructor(
    @InjectRepository(HrmDepartments)
    private readonly departmentRepository: Repository<HrmDepartments>,
  ) {}

  create(dto: CreateDepartmentDto) {
    const department = this.departmentRepository.create(dto);
    return this.departmentRepository.save(department);
  }

  findAll() {
    return this.departmentRepository.find();
  }

  findOne(id: number) {
    return this.departmentRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateDepartmentDto) {
    return this.departmentRepository.update(id, dto);
  }

  remove(id: number) {
    return this.departmentRepository.delete(id);
  }
}
