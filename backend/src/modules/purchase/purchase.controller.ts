import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { PurchaseService } from './purchase.service';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  async findAll() {
    return this.purchaseService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchaseService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.purchaseService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.purchaseService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.purchaseService.remove(id);
  }
}
