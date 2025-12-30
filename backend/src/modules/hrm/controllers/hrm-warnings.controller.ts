import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmWarningsService } from '../services/hrm-warnings.service';
import { CreateWarningDto } from '../dto/create-warning.dto';
import { UpdateWarningDto } from '../dto/update-warning.dto';

@Controller('hrm/warnings')
export class HrmWarningsController {
  constructor(private readonly warningsService: HrmWarningsService) {}

  @Post()
  create(@Body() dto: CreateWarningDto) {
    return this.warningsService.create(dto);
  }

  @Get()
  findAll() {
    return this.warningsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warningsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWarningDto) {
    return this.warningsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.warningsService.remove(+id);
  }
}
