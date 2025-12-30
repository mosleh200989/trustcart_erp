import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmDesignations } from '../entities/hrm-designations.entity';
import { CreateDesignationDto } from '../dto/create-designation.dto';
import { UpdateDesignationDto } from '../dto/update-designation.dto';

@Injectable()
export class HrmDesignationsService {
  constructor(
    @InjectRepository(HrmDesignations)
    private readonly designationRepository: Repository<HrmDesignations>,
  ) {}

  async create(dto: CreateDesignationDto) {
    const { departmentId, ...rest } = dto;
    const designation = this.designationRepository.create(rest);
    if (departmentId) {
      const { HrmDepartments } = await import('../entities/hrm-departments.entity');
      const departmentRepo = this.designationRepository.manager.getRepository(HrmDepartments);
      const department = await departmentRepo.findOne({ where: { id: departmentId } });
      if (department) {
        designation.department = department;
      }
    }
    return this.designationRepository.save(designation);
  }

  findAll() {
    return this.designationRepository.find();
  }

  findOne(id: number) {
    return this.designationRepository.findOne({ where: { id } });
  }

  async update(id: number, dto: UpdateDesignationDto) {
    const designation = await this.designationRepository.findOne({ where: { id } });
    if (!designation) {
      throw new Error('Designation not found');
    }

    const { departmentId, ...rest } = dto;
    Object.assign(designation, rest);

    if (departmentId !== undefined) {
      if (departmentId) {
        const { HrmDepartments } = await import('../entities/hrm-departments.entity');
        const departmentRepo = this.designationRepository.manager.getRepository(HrmDepartments);
        const department = await departmentRepo.findOne({ where: { id: departmentId } });
        if (department) {
          designation.department = department;
        }
      } else {
        designation.department = null;
      }
    }

    return this.designationRepository.save(designation);
  }

  remove(id: number) {
    return this.designationRepository.delete(id);
  }
}
