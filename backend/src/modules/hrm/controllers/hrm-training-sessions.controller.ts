import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmTrainingSessionsService } from '../services/hrm-training-sessions.service';
import { CreateTrainingSessionDto } from '../dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from '../dto/update-training-session.dto';

@Controller('hrm/training-sessions')
export class HrmTrainingSessionsController {
  constructor(private readonly trainingSessionsService: HrmTrainingSessionsService) {}

  @Post()
  create(@Body() dto: CreateTrainingSessionDto) {
    return this.trainingSessionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.trainingSessionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainingSessionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrainingSessionDto) {
    return this.trainingSessionsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trainingSessionsService.remove(+id);
  }
}
