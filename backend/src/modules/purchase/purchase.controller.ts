import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('purchase')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  @RequirePermissions('view-purchase-orders')
  async findAll() {
    return this.purchaseService.findAll();
  }

  @Get(':id')
  @RequirePermissions('view-purchase-orders')
  async findOne(@Param('id') id: string) {
    return this.purchaseService.findOne(id);
  }

  @Post()
  @RequirePermissions('create-purchase-orders')
  async create(@Body() dto: any) {
    return this.purchaseService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('edit-purchase-orders')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.purchaseService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete-purchase-orders')
  async remove(@Param('id') id: string) {
    return this.purchaseService.remove(id);
  }
}
