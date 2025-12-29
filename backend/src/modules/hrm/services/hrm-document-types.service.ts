import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmDocumentTypes } from '../entities/hrm-document-types.entity';
import { CreateDocumentTypeDto } from '../dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';

@Injectable()
export class HrmDocumentTypesService {
  constructor(
    @InjectRepository(HrmDocumentTypes)
    private readonly documentTypesRepository: Repository<HrmDocumentTypes>,
  ) {}

  create(dto: CreateDocumentTypeDto) {
    const docType = this.documentTypesRepository.create(dto);
    return this.documentTypesRepository.save(docType);
  }

  findAll() {
    return this.documentTypesRepository.find();
  }

  findOne(id: number) {
    return this.documentTypesRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateDocumentTypeDto) {
    return this.documentTypesRepository.update(id, dto);
  }

  remove(id: number) {
    return this.documentTypesRepository.delete(id);
  }
}
