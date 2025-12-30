import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmPerformanceIndicators } from '../entities/hrm-performance-indicators.entity';
import { CreatePerformanceIndicatorDto } from '../dto/create-performance-indicator.dto';
import { UpdatePerformanceIndicatorDto } from '../dto/update-performance-indicator.dto';

@Injectable()
export class HrmPerformanceIndicatorsService {
  constructor(
    @InjectRepository(HrmPerformanceIndicators)
    private readonly indicatorsRepository: Repository<HrmPerformanceIndicators>,
  ) {}

  create(dto: CreatePerformanceIndicatorDto) {
    const indicator = this.indicatorsRepository.create(dto);
    return this.indicatorsRepository.save(indicator);
  }

  findAll() {
    return this.indicatorsRepository.find();
  }

  findOne(id: number) {
    return this.indicatorsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdatePerformanceIndicatorDto) {
    return this.indicatorsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.indicatorsRepository.delete(id);
  }
}
