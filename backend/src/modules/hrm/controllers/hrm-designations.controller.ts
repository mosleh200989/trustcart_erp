import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmDesignationsService } from '../services/hrm-designations.service';
import { CreateDesignationDto } from '../dto/create-designation.dto';
import { UpdateDesignationDto } from '../dto/update-designation.dto';

@Controller('hrm/designations')
export class HrmDesignationsController {
  constructor(private readonly designationsService: HrmDesignationsService) {}

  @Post()
  create(@Body() dto: CreateDesignationDto) {
    return this.designationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.designationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.designationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDesignationDto) {
    return this.designationsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.designationsService.remove(+id);
  }
}
