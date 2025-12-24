import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  async findAll() {
    return this.crmService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.crmService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.crmService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.crmService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.crmService.remove(id);
  }
}
