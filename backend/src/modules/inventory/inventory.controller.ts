import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('view-inventory')
  async findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  @RequirePermissions('view-inventory')
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-stock')
  async create(@Body() dto: any) {
    return this.inventoryService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('manage-stock')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage-stock')
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
