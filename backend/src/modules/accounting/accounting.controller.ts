import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AccountingService } from './accounting.service';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  async findAll() {
    return this.accountingService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.accountingService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.accountingService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.accountingService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.accountingService.remove(id);
  }
}
