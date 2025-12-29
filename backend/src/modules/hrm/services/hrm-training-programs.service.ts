import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmTrainingPrograms } from '../entities/hrm-training-programs.entity';
import { CreateTrainingProgramDto } from '../dto/create-training-program.dto';
import { UpdateTrainingProgramDto } from '../dto/update-training-program.dto';

@Injectable()
export class HrmTrainingProgramsService {
  constructor(
    @InjectRepository(HrmTrainingPrograms)
    private readonly trainingProgramsRepository: Repository<HrmTrainingPrograms>,
  ) {}

  create(dto: CreateTrainingProgramDto) {
    const program = this.trainingProgramsRepository.create(dto);
    return this.trainingProgramsRepository.save(program);
  }

  findAll() {
    return this.trainingProgramsRepository.find();
  }

  findOne(id: number) {
    return this.trainingProgramsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateTrainingProgramDto) {
    return this.trainingProgramsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.trainingProgramsRepository.delete(id);
  }
}
