import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmTrainingTypes } from '../entities/hrm-training-types.entity';
import { CreateTrainingTypeDto } from '../dto/create-training-type.dto';
import { UpdateTrainingTypeDto } from '../dto/update-training-type.dto';

@Injectable()
export class HrmTrainingTypesService {
  constructor(
    @InjectRepository(HrmTrainingTypes)
    private readonly trainingTypesRepository: Repository<HrmTrainingTypes>,
  ) {}

  create(dto: CreateTrainingTypeDto) {
    const trainingType = this.trainingTypesRepository.create(dto);
    return this.trainingTypesRepository.save(trainingType);
  }

  findAll() {
    return this.trainingTypesRepository.find();
  }

  findOne(id: number) {
    return this.trainingTypesRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateTrainingTypeDto) {
    return this.trainingTypesRepository.update(id, dto);
  }

  remove(id: number) {
    return this.trainingTypesRepository.delete(id);
  }
}
