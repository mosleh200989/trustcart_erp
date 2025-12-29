import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmTrainingProgramsService } from '../services/hrm-training-programs.service';
import { CreateTrainingProgramDto } from '../dto/create-training-program.dto';
import { UpdateTrainingProgramDto } from '../dto/update-training-program.dto';

@Controller('hrm/training-programs')
export class HrmTrainingProgramsController {
  constructor(private readonly trainingProgramsService: HrmTrainingProgramsService) {}

  @Post()
  create(@Body() dto: CreateTrainingProgramDto) {
    return this.trainingProgramsService.create(dto);
  }

  @Get()
  findAll() {
    return this.trainingProgramsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainingProgramsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrainingProgramDto) {
    return this.trainingProgramsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trainingProgramsService.remove(+id);
  }
}
