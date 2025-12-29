import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmHolidaysService } from '../services/hrm-holidays.service';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';

@Controller('hrm/holidays')
export class HrmHolidaysController {
  constructor(private readonly holidaysService: HrmHolidaysService) {}

  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.holidaysService.create(dto);
  }

  @Get()
  findAll() {
    return this.holidaysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidaysService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(+id);
  }
}
