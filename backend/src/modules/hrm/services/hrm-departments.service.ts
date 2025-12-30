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

  async create(dto: CreateDepartmentDto) {
    const { branchId, ...rest } = dto;
    const department = this.departmentRepository.create(rest);
    if (branchId) {
      // Use getRepository with the entity class for correct typing
      const { HrmBranches } = await import('../entities/hrm-branches.entity');
      const branchRepo = this.departmentRepository.manager.getRepository(HrmBranches);
      const branch = await branchRepo.findOne({ where: { id: branchId } });
      if (branch) {
        department.branch = branch;
      }
    }
    return this.departmentRepository.save(department);
  }

  findAll() {
    return this.departmentRepository.find();
  }

  findOne(id: number) {
    return this.departmentRepository.findOne({ where: { id } });
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const department = await this.departmentRepository.findOne({ where: { id } });
    if (!department) {
      throw new Error('Department not found');
    }

    const { branchId, ...rest } = dto;
    Object.assign(department, rest);

    if (branchId !== undefined) {
      if (branchId) {
        const { HrmBranches } = await import('../entities/hrm-branches.entity');
        const branchRepo = this.departmentRepository.manager.getRepository(HrmBranches);
        const branch = await branchRepo.findOne({ where: { id: branchId } });
        if (branch) {
          department.branch = branch;
        }
      } else {
        department.branch = null;
      }
    }

    return this.departmentRepository.save(department);
  }

  remove(id: number) {
    return this.departmentRepository.delete(id);
  }
}
