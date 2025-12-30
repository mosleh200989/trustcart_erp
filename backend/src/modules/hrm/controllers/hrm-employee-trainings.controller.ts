import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmEmployeeTrainingsService } from '../services/hrm-employee-trainings.service';
import { CreateEmployeeTrainingDto } from '../dto/create-employee-training.dto';
import { UpdateEmployeeTrainingDto } from '../dto/update-employee-training.dto';

@Controller('hrm/employee-trainings')
export class HrmEmployeeTrainingsController {
  constructor(private readonly employeeTrainingsService: HrmEmployeeTrainingsService) {}

  @Post()
  create(@Body() dto: CreateEmployeeTrainingDto) {
    return this.employeeTrainingsService.create(dto);
  }

  @Get()
  findAll() {
    return this.employeeTrainingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeTrainingsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeTrainingDto) {
    return this.employeeTrainingsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeTrainingsService.remove(+id);
  }
}
