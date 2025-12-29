import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmAnnouncements } from '../entities/hrm-announcements.entity';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';

@Injectable()
export class HrmAnnouncementsService {
  constructor(
    @InjectRepository(HrmAnnouncements)
    private readonly announcementsRepository: Repository<HrmAnnouncements>,
  ) {}

  create(dto: CreateAnnouncementDto) {
    const announcement = this.announcementsRepository.create(dto);
    return this.announcementsRepository.save(announcement);
  }

  findAll() {
    return this.announcementsRepository.find();
  }

  findOne(id: number) {
    return this.announcementsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateAnnouncementDto) {
    return this.announcementsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.announcementsRepository.delete(id);
  }
}
