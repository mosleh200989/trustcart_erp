import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockMovementService, RecordMovementParams } from './stock-movement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { StockQueryDto } from './dto/stock-query.dto';
import { CreateReorderRuleDto } from './dto/create-reorder-rule.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly stockMovementService: StockMovementService,
  ) {}

  // ── Stock Levels ────────────────────────────────────

  @Get('stock-levels')
  @RequirePermissions('view-stock-levels')
  getStockLevels(@Query() query: StockQueryDto) {
    return this.inventoryService.getStockLevels(query);
  }

  @Get('stock-levels/summary')
  @RequirePermissions('view-stock-levels')
  getStockSummary() {
    return this.inventoryService.getStockSummary();
  }

  @Get('stock-levels/product/:productId')
  @RequirePermissions('view-stock-levels')
  getStockByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getStockByProduct(productId);
  }

  @Get('stock-levels/warehouse/:warehouseId')
  @RequirePermissions('view-stock-levels')
  getStockByWarehouse(@Param('warehouseId', ParseIntPipe) warehouseId: number) {
    return this.inventoryService.getStockByWarehouse(warehouseId);
  }

  // ── Stock Movements ─────────────────────────────────

  @Get('movements')
  @RequirePermissions('view-stock-movements')
  getMovements(
    @Query('product_id') productId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('movement_type') movementType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockMovementService.getMovements({
      product_id: productId ? parseInt(productId, 10) : undefined,
      warehouse_id: warehouseId ? parseInt(warehouseId, 10) : undefined,
      movement_type: movementType,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('movements/:id')
  @RequirePermissions('view-stock-movements')
  getMovement(@Param('id', ParseIntPipe) id: number) {
    return this.stockMovementService.getMovement(id);
  }

  @Post('movements')
  @RequirePermissions('manage-stock-movements')
  recordMovement(@Body() dto: RecordMovementParams, @Req() req: any) {
    dto.performed_by = dto.performed_by || req.user?.id;
    return this.stockMovementService.recordMovement(dto);
  }

  // ── Batches ─────────────────────────────────────────

  @Get('batches')
  @RequirePermissions('view-stock-batches')
  getBatches(
    @Query('product_id') productId?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.inventoryService.getBatches(
      productId ? parseInt(productId, 10) : undefined,
      warehouseId ? parseInt(warehouseId, 10) : undefined,
    );
  }

  @Get('batches/expiring')
  @RequirePermissions('view-stock-batches')
  getExpiringBatches(@Query('days') days?: string) {
    return this.inventoryService.getExpiringBatches(days ? parseInt(days, 10) : 30);
  }

  @Get('batches/:id')
  @RequirePermissions('view-stock-batches')
  getBatch(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getBatch(id);
  }

  // ── Alerts ──────────────────────────────────────────

  @Get('alerts')
  @RequirePermissions('view-inventory')
  getAlerts(@Query('unread') unread?: string) {
    return this.inventoryService.getAlerts(unread === 'true');
  }

  @Put('alerts/:id/read')
  @RequirePermissions('view-inventory')
  markAlertRead(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.markAlertRead(id);
  }

  @Put('alerts/:id/resolve')
  @RequirePermissions('manage-stock')
  resolveAlert(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body('notes') notes?: string,
  ) {
    return this.inventoryService.resolveAlert(id, req.user?.id, notes);
  }

  // ── Reorder Rules ──────────────────────────────────

  @Get('reorder-rules')
  @RequirePermissions('view-inventory')
  getReorderRules(@Query('product_id') productId?: string) {
    return this.inventoryService.getReorderRules(
      productId ? parseInt(productId, 10) : undefined,
    );
  }

  @Post('reorder-rules')
  @RequirePermissions('manage-stock')
  createReorderRule(@Body() dto: CreateReorderRuleDto) {
    return this.inventoryService.createReorderRule(dto);
  }

  @Put('reorder-rules/:id')
  @RequirePermissions('manage-stock')
  updateReorderRule(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateReorderRuleDto>) {
    return this.inventoryService.updateReorderRule(id, dto);
  }

  @Delete('reorder-rules/:id')
  @RequirePermissions('manage-stock')
  removeReorderRule(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeReorderRule(id);
  }
}
