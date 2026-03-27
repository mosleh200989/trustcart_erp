import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockMovementService, RecordMovementParams } from './stock-movement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { StockQueryDto } from './dto/stock-query.dto';
import { CreateReorderRuleDto } from './dto/create-reorder-rule.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CreateInventoryCountDto, RecordCountItemDto } from './dto/create-inventory-count.dto';

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

  // ── Stock Adjustments ───────────────────────────────

  @Get('adjustments')
  @RequirePermissions('view-inventory')
  getAdjustments(
    @Query('status') status?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('adjustment_type') adjustmentType?: string,
  ) {
    return this.inventoryService.getAdjustments({
      status,
      warehouse_id: warehouseId ? parseInt(warehouseId, 10) : undefined,
      adjustment_type: adjustmentType,
    });
  }

  @Get('adjustments/:id')
  @RequirePermissions('view-inventory')
  getAdjustment(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getAdjustment(id);
  }

  @Post('adjustments')
  @RequirePermissions('stock-adjustment')
  createAdjustment(@Body() dto: CreateStockAdjustmentDto, @Req() req: any) {
    return this.inventoryService.createAdjustment(dto, req.user?.id);
  }

  @Put('adjustments/:id')
  @RequirePermissions('stock-adjustment')
  updateAdjustment(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateStockAdjustmentDto>) {
    return this.inventoryService.updateAdjustment(id, dto);
  }

  @Post('adjustments/:id/submit')
  @RequirePermissions('stock-adjustment')
  submitAdjustment(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.submitAdjustment(id);
  }

  @Post('adjustments/:id/approve')
  @RequirePermissions('approve-stock-adjustment')
  approveAdjustment(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inventoryService.approveAdjustment(id, req.user?.id);
  }

  @Post('adjustments/:id/reject')
  @RequirePermissions('approve-stock-adjustment')
  rejectAdjustment(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('reason') reason?: string) {
    return this.inventoryService.rejectAdjustment(id, req.user?.id, reason);
  }

  // ── Stock Transfers ─────────────────────────────────

  @Get('transfers')
  @RequirePermissions('view-inventory')
  getTransfers(
    @Query('status') status?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.inventoryService.getTransfers({
      status,
      warehouse_id: warehouseId ? parseInt(warehouseId, 10) : undefined,
    });
  }

  @Get('transfers/:id')
  @RequirePermissions('view-inventory')
  getTransfer(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getTransfer(id);
  }

  @Post('transfers')
  @RequirePermissions('stock-transfer')
  createTransfer(@Body() dto: CreateStockTransferDto, @Req() req: any) {
    return this.inventoryService.createTransfer(dto, req.user?.id);
  }

  @Put('transfers/:id')
  @RequirePermissions('stock-transfer')
  updateTransfer(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateStockTransferDto>) {
    return this.inventoryService.updateTransfer(id, dto);
  }

  @Post('transfers/:id/approve')
  @RequirePermissions('approve-stock-adjustment')
  approveTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inventoryService.approveTransfer(id, req.user?.id);
  }

  @Post('transfers/:id/ship')
  @RequirePermissions('stock-transfer')
  shipTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: any) {
    return this.inventoryService.shipTransfer(id, req.user?.id, body);
  }

  @Post('transfers/:id/receive')
  @RequirePermissions('stock-transfer')
  receiveTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: any) {
    return this.inventoryService.receiveTransfer(id, req.user?.id, body);
  }

  @Post('transfers/:id/cancel')
  @RequirePermissions('stock-transfer')
  cancelTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inventoryService.cancelTransfer(id, req.user?.id);
  }

  // ── Inventory Counts ────────────────────────────────

  @Get('counts')
  @RequirePermissions('view-inventory')
  getCounts(
    @Query('status') status?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('count_type') countType?: string,
  ) {
    return this.inventoryService.getCounts({
      status,
      warehouse_id: warehouseId ? parseInt(warehouseId, 10) : undefined,
      count_type: countType,
    });
  }

  @Get('counts/:id')
  @RequirePermissions('view-inventory')
  getCount(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getCount(id);
  }

  @Post('counts')
  @RequirePermissions('manage-stock')
  createCount(@Body() dto: CreateInventoryCountDto, @Req() req: any) {
    return this.inventoryService.createCount(dto, req.user?.id);
  }

  @Post('counts/:id/start')
  @RequirePermissions('manage-stock')
  startCount(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inventoryService.startCount(id, req.user?.id);
  }

  @Post('counts/:id/items')
  @RequirePermissions('manage-stock')
  recordCountItems(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('items') items: RecordCountItemDto[]) {
    return this.inventoryService.recordCountItems(id, req.user?.id, items);
  }

  @Post('counts/:id/complete')
  @RequirePermissions('manage-stock')
  completeCount(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.completeCount(id);
  }

  @Post('counts/:id/approve')
  @RequirePermissions('approve-stock-adjustment')
  approveCount(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inventoryService.approveCount(id, req.user?.id);
  }
}
