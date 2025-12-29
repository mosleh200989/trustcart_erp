import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmEmployeeDocuments } from '../entities/hrm-employee-documents.entity';
import { CreateEmployeeDocumentDto } from '../dto/create-employee-document.dto';
import { UpdateEmployeeDocumentDto } from '../dto/update-employee-document.dto';

@Injectable()
export class HrmEmployeeDocumentsService {
  constructor(
    @InjectRepository(HrmEmployeeDocuments)
    private readonly employeeDocumentsRepository: Repository<HrmEmployeeDocuments>,
  ) {}

  create(dto: CreateEmployeeDocumentDto) {
    const doc = this.employeeDocumentsRepository.create(dto);
    return this.employeeDocumentsRepository.save(doc);
  }

  findAll() {
    return this.employeeDocumentsRepository.find();
  }

  findOne(id: number) {
    return this.employeeDocumentsRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateEmployeeDocumentDto) {
    return this.employeeDocumentsRepository.update(id, dto);
  }

  remove(id: number) {
    return this.employeeDocumentsRepository.delete(id);
  }
}
