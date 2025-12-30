import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmAwardTypes } from '../entities/hrm-award-types.entity';
import { CreateAwardTypeDto } from '../dto/create-award-type.dto';
import { UpdateAwardTypeDto } from '../dto/update-award-type.dto';

@Injectable()
export class HrmAwardTypesService {
  constructor(
    @InjectRepository(HrmAwardTypes)
    private readonly awardTypeRepository: Repository<HrmAwardTypes>,
  ) {}

  create(dto: CreateAwardTypeDto) {
    const awardType = this.awardTypeRepository.create(dto);
    return this.awardTypeRepository.save(awardType);
  }

  findAll() {
    return this.awardTypeRepository.find();
  }

  findOne(id: number) {
    return this.awardTypeRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateAwardTypeDto) {
    return this.awardTypeRepository.update(id, dto);
  }

  remove(id: number) {
    return this.awardTypeRepository.delete(id);
  }
}
