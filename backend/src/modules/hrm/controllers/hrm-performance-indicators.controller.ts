import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmPerformanceIndicatorsService } from '../services/hrm-performance-indicators.service';
import { CreatePerformanceIndicatorDto } from '../dto/create-performance-indicator.dto';
import { UpdatePerformanceIndicatorDto } from '../dto/update-performance-indicator.dto';

@Controller('hrm/performance-indicators')
export class HrmPerformanceIndicatorsController {
  constructor(private readonly indicatorsService: HrmPerformanceIndicatorsService) {}

  @Post()
  create(@Body() dto: CreatePerformanceIndicatorDto) {
    return this.indicatorsService.create(dto);
  }

  @Get()
  findAll() {
    return this.indicatorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.indicatorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePerformanceIndicatorDto) {
    return this.indicatorsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.indicatorsService.remove(+id);
  }
}
