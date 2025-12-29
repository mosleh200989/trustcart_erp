import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmEmployeePerformanceService } from '../services/hrm-employee-performance.service';
import { CreateEmployeePerformanceDto } from '../dto/create-employee-performance.dto';
import { UpdateEmployeePerformanceDto } from '../dto/update-employee-performance.dto';

@Controller('hrm/employee-performance')
export class HrmEmployeePerformanceController {
  constructor(private readonly employeePerformanceService: HrmEmployeePerformanceService) {}

  @Post()
  create(@Body() dto: CreateEmployeePerformanceDto) {
    return this.employeePerformanceService.create(dto);
  }

  @Get()
  findAll() {
    return this.employeePerformanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeePerformanceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeePerformanceDto) {
    return this.employeePerformanceService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeePerformanceService.remove(+id);
  }
}
