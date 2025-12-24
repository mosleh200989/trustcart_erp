import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  async findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Get(':id/items')
  async getOrderItems(@Param('id') id: string) {
    return this.salesService.getOrderItems(id);
  }

  @Post()
  async create(@Body() createSalesDto: any) {
    return this.salesService.create(createSalesDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSalesDto: any) {
    return this.salesService.update(id, updateSalesDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}
