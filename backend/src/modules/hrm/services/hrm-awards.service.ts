import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmAwards } from '../entities/hrm-awards.entity';
import { CreateAwardDto } from '../dto/create-award.dto';
import { UpdateAwardDto } from '../dto/update-award.dto';

@Injectable()
export class HrmAwardsService {
  constructor(
    @InjectRepository(HrmAwards)
    private readonly awardsRepository: Repository<HrmAwards>,
  ) {}

  create(dto: CreateAwardDto) {
    const award = this.awardsRepository.create(dto);
    return this.awardsRepository.save(award);
  }

  findAll() {
    return this.awardsRepository.find();
  }

  findOne(id: number) {
    return this.awardsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateAwardDto) {
    return this.awardsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.awardsRepository.delete(id);
  }
}
