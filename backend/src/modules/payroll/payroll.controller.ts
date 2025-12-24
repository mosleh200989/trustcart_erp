import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  async findAll() {
    return this.payrollService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.payrollService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.payrollService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.payrollService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.payrollService.remove(id);
  }
}
