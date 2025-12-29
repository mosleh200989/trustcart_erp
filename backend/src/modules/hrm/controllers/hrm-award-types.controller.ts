import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmAwardTypesService } from '../services/hrm-award-types.service';
import { CreateAwardTypeDto } from '../dto/create-award-type.dto';
import { UpdateAwardTypeDto } from '../dto/update-award-type.dto';

@Controller('hrm/award-types')
export class HrmAwardTypesController {
  constructor(private readonly awardTypesService: HrmAwardTypesService) {}

  @Post()
  create(@Body() dto: CreateAwardTypeDto) {
    return this.awardTypesService.create(dto);
  }

  @Get()
  findAll() {
    return this.awardTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.awardTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAwardTypeDto) {
    return this.awardTypesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.awardTypesService.remove(+id);
  }
}
