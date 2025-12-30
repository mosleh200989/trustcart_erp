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

  create(dto: CreateDesignationDto) {
    const designation = this.designationRepository.create(dto);
    return this.designationRepository.save(designation);
  }

  findAll() {
    return this.designationRepository.find();
  }

  findOne(id: number) {
    return this.designationRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateDesignationDto) {
    return this.designationRepository.update(id, dto);
  }

  remove(id: number) {
    return this.designationRepository.delete(id);
  }
}
