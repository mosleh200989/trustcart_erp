import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmTerminations } from '../entities/hrm-terminations.entity';
import { CreateTerminationDto } from '../dto/create-termination.dto';
import { UpdateTerminationDto } from '../dto/update-termination.dto';

@Injectable()
export class HrmTerminationsService {
  constructor(
    @InjectRepository(HrmTerminations)
    private readonly terminationsRepository: Repository<HrmTerminations>,
  ) {}

  create(dto: CreateTerminationDto) {
    const termination = this.terminationsRepository.create(dto);
    return this.terminationsRepository.save(termination);
  }

  findAll() {
    return this.terminationsRepository.find();
  }

  findOne(id: number) {
    return this.terminationsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateTerminationDto) {
    return this.terminationsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.terminationsRepository.delete(id);
  }
}
