import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ── Warehouses ──────────────────────────────────────

  @Get()
  @RequirePermissions('view-warehouses')
  findAll() {
    return this.warehouseService.findAll();
  }

  @Get(':id')
  @RequirePermissions('view-warehouses')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-warehouses')
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehouseService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('manage-warehouses')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWarehouseDto) {
    return this.warehouseService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage-warehouses')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.remove(id);
  }

  // ── Zones ───────────────────────────────────────────

  @Get(':warehouseId/zones')
  @RequirePermissions('view-warehouses')
  findAllZones(@Param('warehouseId', ParseIntPipe) warehouseId: number) {
    return this.warehouseService.findAllZones(warehouseId);
  }

  @Get('zones/:id')
  @RequirePermissions('view-warehouses')
  findOneZone(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findOneZone(id);
  }

  @Post('zones')
  @RequirePermissions('manage-warehouses')
  createZone(@Body() dto: CreateZoneDto) {
    return this.warehouseService.createZone(dto);
  }

  @Put('zones/:id')
  @RequirePermissions('manage-warehouses')
  updateZone(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateZoneDto>) {
    return this.warehouseService.updateZone(id, dto);
  }

  @Delete('zones/:id')
  @RequirePermissions('manage-warehouses')
  removeZone(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.removeZone(id);
  }

  // ── Locations ───────────────────────────────────────

  @Get(':warehouseId/locations')
  @RequirePermissions('view-warehouses')
  findAllLocations(@Param('warehouseId', ParseIntPipe) warehouseId: number) {
    return this.warehouseService.findAllLocations(warehouseId);
  }

  @Get('locations/:id')
  @RequirePermissions('view-warehouses')
  findOneLocation(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.findOneLocation(id);
  }

  @Post('locations')
  @RequirePermissions('manage-warehouses')
  createLocation(@Body() dto: CreateLocationDto) {
    return this.warehouseService.createLocation(dto);
  }

  @Put('locations/:id')
  @RequirePermissions('manage-warehouses')
  updateLocation(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateLocationDto>) {
    return this.warehouseService.updateLocation(id, dto);
  }

  @Delete('locations/:id')
  @RequirePermissions('manage-warehouses')
  removeLocation(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.removeLocation(id);
  }
}
