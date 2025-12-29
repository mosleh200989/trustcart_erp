import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmHolidays } from '../entities/hrm-holidays.entity';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';

@Injectable()
export class HrmHolidaysService {
  constructor(
    @InjectRepository(HrmHolidays)
    private readonly holidaysRepository: Repository<HrmHolidays>,
  ) {}

  create(dto: CreateHolidayDto) {
    const holiday = this.holidaysRepository.create(dto);
    return this.holidaysRepository.save(holiday);
  }

  findAll() {
    return this.holidaysRepository.find();
  }

  findOne(id: number) {
    return this.holidaysRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateHolidayDto) {
    return this.holidaysRepository.update(id, dto);
  }

  remove(id: number) {
    return this.holidaysRepository.delete(id);
  }
}
