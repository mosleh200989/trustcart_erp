import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmTerminationsService } from '../services/hrm-terminations.service';
import { CreateTerminationDto } from '../dto/create-termination.dto';
import { UpdateTerminationDto } from '../dto/update-termination.dto';

@Controller('hrm/terminations')
export class HrmTerminationsController {
  constructor(private readonly terminationsService: HrmTerminationsService) {}

  @Post()
  create(@Body() dto: CreateTerminationDto) {
    return this.terminationsService.create(dto);
  }

  @Get()
  findAll() {
    return this.terminationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.terminationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTerminationDto) {
    return this.terminationsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.terminationsService.remove(+id);
  }
}
