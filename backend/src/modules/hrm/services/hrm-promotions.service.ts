import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmPromotions } from '../entities/hrm-promotions.entity';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';

@Injectable()
export class HrmPromotionsService {
  constructor(
    @InjectRepository(HrmPromotions)
    private readonly promotionsRepository: Repository<HrmPromotions>,
  ) {}

  create(dto: CreatePromotionDto) {
    const promotion = this.promotionsRepository.create(dto);
    return this.promotionsRepository.save(promotion);
  }

  findAll() {
    return this.promotionsRepository.find();
  }

  findOne(id: number) {
    return this.promotionsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdatePromotionDto) {
    return this.promotionsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.promotionsRepository.delete(id);
  }
}
