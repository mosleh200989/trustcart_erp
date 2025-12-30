import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmTrainingTypesService } from '../services/hrm-training-types.service';
import { CreateTrainingTypeDto } from '../dto/create-training-type.dto';
import { UpdateTrainingTypeDto } from '../dto/update-training-type.dto';

@Controller('hrm/training-types')
export class HrmTrainingTypesController {
  constructor(private readonly trainingTypesService: HrmTrainingTypesService) {}

  @Post()
  create(@Body() dto: CreateTrainingTypeDto) {
    return this.trainingTypesService.create(dto);
  }

  @Get()
  findAll() {
    return this.trainingTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainingTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrainingTypeDto) {
    return this.trainingTypesService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trainingTypesService.remove(+id);
  }
}
