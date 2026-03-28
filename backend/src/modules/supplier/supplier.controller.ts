import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @RequirePermissions('view-suppliers')
  findAll(@Query('status') status?: string) {
    return this.supplierService.findAll(status);
  }

  @Get(':id')
  @RequirePermissions('view-suppliers')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-suppliers')
  create(@Body() dto: CreateSupplierDto) {
    return this.supplierService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('manage-suppliers')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.supplierService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage-suppliers')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.remove(id);
  }

  // ── Supplier Products ───────────────────────────────

  @Get(':supplierId/products')
  @RequirePermissions('view-suppliers')
  findProducts(@Param('supplierId', ParseIntPipe) supplierId: number) {
    return this.supplierService.findProducts(supplierId);
  }

  @Post('products')
  @RequirePermissions('manage-suppliers')
  addProduct(@Body() dto: CreateSupplierProductDto) {
    return this.supplierService.addProduct(dto);
  }

  @Put('products/:id')
  @RequirePermissions('manage-suppliers')
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateSupplierProductDto>) {
    return this.supplierService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('manage-suppliers')
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.removeProduct(id);
  }
}
