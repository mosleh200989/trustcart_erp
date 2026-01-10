import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourierConfiguration } from './courier-configuration.entity';
import { CreateCourierConfigurationDto } from './dto/create-courier-configuration.dto';

@Injectable()
export class CourierConfigurationService {
  constructor(
    @InjectRepository(CourierConfiguration)
    private readonly repo: Repository<CourierConfiguration>,
  ) {}

  async list(): Promise<CourierConfiguration[]> {
    return this.repo.find({ order: { updatedAt: 'DESC' } });
  }

  async create(dto: CreateCourierConfigurationDto): Promise<CourierConfiguration> {
    const entity = this.repo.create({
      companyname: dto.companyname ?? null,
      username: dto.username ?? null,
      password: dto.password ?? null,
      apiKey: dto.apiKey ?? null,
      token: dto.token ?? null,
      refreshToken: dto.refreshToken ?? null,
      isActive: dto.isActive ?? true,
    });

    return this.repo.save(entity);
  }
}
