import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmTrips } from '../entities/hrm-trips.entity';
import { CreateTripDto } from '../dto/create-trip.dto';
import { UpdateTripDto } from '../dto/update-trip.dto';

@Injectable()
export class HrmTripsService {
  constructor(
    @InjectRepository(HrmTrips)
    private readonly tripsRepository: Repository<HrmTrips>,
  ) {}

  create(dto: CreateTripDto) {
    const trip = this.tripsRepository.create(dto);
    return this.tripsRepository.save(trip);
  }

  findAll() {
    return this.tripsRepository.find();
  }

  findOne(id: number) {
    return this.tripsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateTripDto) {
    return this.tripsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.tripsRepository.delete(id);
  }
}
