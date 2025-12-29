import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmComplaints } from '../entities/hrm-complaints.entity';
import { CreateComplaintDto } from '../dto/create-complaint.dto';
import { UpdateComplaintDto } from '../dto/update-complaint.dto';

@Injectable()
export class HrmComplaintsService {
  constructor(
    @InjectRepository(HrmComplaints)
    private readonly complaintsRepository: Repository<HrmComplaints>,
  ) {}

  create(dto: CreateComplaintDto) {
    const complaint = this.complaintsRepository.create(dto);
    return this.complaintsRepository.save(complaint);
  }

  findAll() {
    return this.complaintsRepository.find();
  }

  findOne(id: number) {
    return this.complaintsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateComplaintDto) {
    return this.complaintsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.complaintsRepository.delete(id);
  }
}
