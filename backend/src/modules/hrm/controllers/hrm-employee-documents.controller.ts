import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmEmployeeDocumentsService } from '../services/hrm-employee-documents.service';
import { CreateEmployeeDocumentDto } from '../dto/create-employee-document.dto';
import { UpdateEmployeeDocumentDto } from '../dto/update-employee-document.dto';

@Controller('hrm/employee-documents')
export class HrmEmployeeDocumentsController {
  constructor(private readonly employeeDocumentsService: HrmEmployeeDocumentsService) {}

  @Post()
  create(@Body() dto: CreateEmployeeDocumentDto) {
    return this.employeeDocumentsService.create(dto);
  }

  @Get()
  findAll() {
    return this.employeeDocumentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeDocumentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDocumentDto) {
    return this.employeeDocumentsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeDocumentsService.remove(+id);
  }
}
