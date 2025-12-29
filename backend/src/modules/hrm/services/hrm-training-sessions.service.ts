import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmTrainingSessions } from '../entities/hrm-training-sessions.entity';
import { CreateTrainingSessionDto } from '../dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from '../dto/update-training-session.dto';

@Injectable()
export class HrmTrainingSessionsService {
  constructor(
    @InjectRepository(HrmTrainingSessions)
    private readonly trainingSessionsRepository: Repository<HrmTrainingSessions>,
  ) {}

  create(dto: CreateTrainingSessionDto) {
    const session = this.trainingSessionsRepository.create(dto);
    return this.trainingSessionsRepository.save(session);
  }

  findAll() {
    return this.trainingSessionsRepository.find();
  }

  findOne(id: number) {
    return this.trainingSessionsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateTrainingSessionDto) {
    return this.trainingSessionsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.trainingSessionsRepository.delete(id);
  }
}
