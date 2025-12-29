import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmResignationsService } from '../services/hrm-resignations.service';
import { CreateResignationDto } from '../dto/create-resignation.dto';
import { UpdateResignationDto } from '../dto/update-resignation.dto';

@Controller('hrm/resignations')
export class HrmResignationsController {
  constructor(private readonly resignationsService: HrmResignationsService) {}

  @Post()
  create(@Body() dto: CreateResignationDto) {
    return this.resignationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.resignationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resignationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResignationDto) {
    return this.resignationsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resignationsService.remove(+id);
  }
}
