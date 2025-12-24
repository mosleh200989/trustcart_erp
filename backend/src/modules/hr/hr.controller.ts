import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { HrService } from './hr.service';

@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  async findAll() {
    return this.hrService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.hrService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.hrService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.hrService.remove(id);
  }
}
