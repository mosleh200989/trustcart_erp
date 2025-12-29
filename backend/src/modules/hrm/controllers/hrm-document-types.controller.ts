import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmDocumentTypesService } from '../services/hrm-document-types.service';
import { CreateDocumentTypeDto } from '../dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';

@Controller('hrm/document-types')
export class HrmDocumentTypesController {
  constructor(private readonly documentTypesService: HrmDocumentTypesService) {}

  @Post()
  create(@Body() dto: CreateDocumentTypeDto) {
    return this.documentTypesService.create(dto);
  }

  @Get()
  findAll() {
    return this.documentTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentTypeDto) {
    return this.documentTypesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentTypesService.remove(+id);
  }
}
