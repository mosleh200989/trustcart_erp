import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmWarnings } from '../entities/hrm-warnings.entity';
import { CreateWarningDto } from '../dto/create-warning.dto';
import { UpdateWarningDto } from '../dto/update-warning.dto';

@Injectable()
export class HrmWarningsService {
  constructor(
    @InjectRepository(HrmWarnings)
    private readonly warningsRepository: Repository<HrmWarnings>,
  ) {}

  create(dto: CreateWarningDto) {
    const warning = this.warningsRepository.create(dto);
    return this.warningsRepository.save(warning);
  }

  findAll() {
    return this.warningsRepository.find();
  }

  findOne(id: number) {
    return this.warningsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateWarningDto) {
    return this.warningsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.warningsRepository.delete(id);
  }
}
