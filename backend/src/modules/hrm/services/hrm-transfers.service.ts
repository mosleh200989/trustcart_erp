import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmTransfers } from '../entities/hrm-transfers.entity';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { UpdateTransferDto } from '../dto/update-transfer.dto';

@Injectable()
export class HrmTransfersService {
  constructor(
    @InjectRepository(HrmTransfers)
    private readonly transfersRepository: Repository<HrmTransfers>,
  ) {}

  create(dto: CreateTransferDto) {
    const transfer = this.transfersRepository.create(dto);
    return this.transfersRepository.save(transfer);
  }

  findAll() {
    return this.transfersRepository.find();
  }

  findOne(id: number) {
    return this.transfersRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateTransferDto) {
    return this.transfersRepository.update(id, dto);
  }

  remove(id: number) {
    return this.transfersRepository.delete(id);
  }
}
