import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmResignations } from '../entities/hrm-resignations.entity';
import { CreateResignationDto } from '../dto/create-resignation.dto';
import { UpdateResignationDto } from '../dto/update-resignation.dto';

@Injectable()
export class HrmResignationsService {
  constructor(
    @InjectRepository(HrmResignations)
    private readonly resignationsRepository: Repository<HrmResignations>,
  ) {}

  create(dto: CreateResignationDto) {
    const resignation = this.resignationsRepository.create(dto);
    return this.resignationsRepository.save(resignation);
  }

  findAll() {
    return this.resignationsRepository.find();
  }

  findOne(id: number) {
    return this.resignationsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateResignationDto) {
    return this.resignationsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.resignationsRepository.delete(id);
  }
}
