import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { StockMovementService, RecordMovementParams } from './stock-movement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
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

  @Get('alerts/unread-count')
  @RequirePermissions('view-inventory')
  getAlertUnreadCount() {
    return this.inventoryService.getAlertUnreadCount();
  }

  @Post('alerts/read-all')
  @RequirePermissions('view-inventory')
  markAllAlertsRead() {
    return this.inventoryService.markAllAlertsRead();
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

  @Post('reorder-rules/evaluate')
  @RequirePermissions('manage-stock')
  evaluateReorderPoints() {
    return this.inventoryService.evaluateReorderPoints();
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

  // ── Phase 4: Availability & Reservations ────────────

  @Public()
  @Get('availability/:productId')
  checkAvailability(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.checkAvailability(productId);
  }

  @Public()
  @Post('availability/bulk')
  checkBulkAvailability(@Body('product_ids') productIds: number[]) {
    return this.inventoryService.checkBulkAvailability(productIds || []);
  }

  @Post('reserve')
  @RequirePermissions('manage-stock')
  reserveStock(@Body() body: { salesOrderId: number; items: Array<{ product_id: number; variant_key?: string; quantity: number }> }) {
    return this.inventoryService.reserveStock({ salesOrderId: body.salesOrderId, items: body.items });
  }

  @Post('release/:salesOrderId')
  @RequirePermissions('manage-stock')
  releaseReservation(@Param('salesOrderId', ParseIntPipe) salesOrderId: number) {
    return this.inventoryService.releaseReservation(salesOrderId);
  }

  @Post('dispatch')
  @RequirePermissions('manage-stock')
  dispatchStock(@Body() body: { salesOrderId: number; items: Array<{ product_id: number; variant_key?: string; quantity: number }>; }, @Req() req: any) {
    return this.inventoryService.dispatchStock({ salesOrderId: body.salesOrderId, items: body.items, performedBy: req.user?.id });
  }

  @Post('restock-return')
  @RequirePermissions('manage-stock')
  restockReturn(@Body() body: { salesOrderId: number; items: Array<{ product_id: number; variant_key?: string; quantity: number; condition: 'restock' | 'damaged' | 'dispose' }>; warehouseId: number; }, @Req() req: any) {
    return this.inventoryService.restockReturn({ salesOrderId: body.salesOrderId, items: body.items, warehouseId: body.warehouseId, performedBy: req.user?.id });
  }

  @Get('reservations/:salesOrderId')
  @RequirePermissions('view-inventory')
  getReservations(@Param('salesOrderId', ParseIntPipe) salesOrderId: number) {
    return this.inventoryService.getReservationsForOrder(salesOrderId);
  }

  // ── Phase 5: Dashboard, Reports & Exports ───────────

  @Get('dashboard')
  @RequirePermissions('view-inventory')
  getDashboard() {
    return this.inventoryService.getDashboardKpis();
  }

  @Get('reports/valuation')
  @RequirePermissions('view-stock-levels')
  getValuationReport(@Query('warehouse_id') warehouseId?: string) {
    return this.inventoryService.getStockValuation(warehouseId ? parseInt(warehouseId, 10) : undefined);
  }

  @Get('reports/movement-log')
  @RequirePermissions('view-stock-movements')
  getMovementReport(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('product_id') productId?: string,
    @Query('movement_type') movementType?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovementReport({
      dateFrom,
      dateTo,
      product_id: productId ? parseInt(productId, 10) : undefined,
      movement_type: movementType,
      warehouse_id: warehouseId ? parseInt(warehouseId, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('reports/supplier-performance')
  @RequirePermissions('view-inventory')
  getSupplierPerformance(@Query('supplier_id') supplierId?: string) {
    return this.inventoryService.getSupplierPerformance(supplierId ? parseInt(supplierId, 10) : undefined);
  }

  @Get('reports/abc-analysis')
  @RequirePermissions('view-inventory')
  getAbcAnalysis() {
    return this.inventoryService.getAbcAnalysis();
  }

  @Get('reports/dead-stock')
  @RequirePermissions('view-inventory')
  getDeadStock(@Query('days') days?: string) {
    return this.inventoryService.getDeadStock(days ? parseInt(days, 10) : 90);
  }

  @Get('reports/fast-slow-movers')
  @RequirePermissions('view-inventory')
  getFastSlowMovers(@Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    return this.inventoryService.getFastSlowMovers(dateFrom, dateTo);
  }

  @Get('reports/count-variance')
  @RequirePermissions('view-inventory')
  getCountVariance(@Query('count_id') countId?: string) {
    return this.inventoryService.getCountVarianceReport(countId ? parseInt(countId, 10) : undefined);
  }

  @Get('reports/export')
  @RequirePermissions('view-inventory')
  async exportReport(
    @Query('type') reportType: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Res() res?: Response,
  ) {
    let data: any[];
    let columns: { key: string; header: string }[];
    let filename: string;

    switch (reportType) {
      case 'valuation':
        data = await this.inventoryService.getStockValuation(warehouseId ? parseInt(warehouseId, 10) : undefined);
        columns = [
          { key: 'product_name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'warehouse_name', header: 'Warehouse' },
          { key: 'total_quantity', header: 'Total Qty' },
          { key: 'total_available', header: 'Available' },
          { key: 'avg_cost', header: 'Avg Cost' },
          { key: 'total_value', header: 'Total Value' },
        ];
        filename = 'stock-valuation';
        break;

      case 'movement-log':
        data = await this.inventoryService.getMovementReport({ dateFrom, dateTo });
        columns = [
          { key: 'reference_number', header: 'Reference' },
          { key: 'movement_type', header: 'Type' },
          { key: 'product_name', header: 'Product' },
          { key: 'quantity', header: 'Quantity' },
          { key: 'created_at', header: 'Date' },
        ];
        filename = 'movement-log';
        break;

      case 'abc-analysis':
        data = await this.inventoryService.getAbcAnalysis();
        columns = [
          { key: 'product_name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'category', header: 'Category' },
          { key: 'total_quantity', header: 'Quantity' },
          { key: 'total_value', header: 'Value' },
          { key: 'cumulative_percent', header: 'Cumulative %' },
          { key: 'classification', header: 'Class' },
        ];
        filename = 'abc-analysis';
        break;

      case 'dead-stock':
        data = await this.inventoryService.getDeadStock();
        columns = [
          { key: 'product_name', header: 'Product' },
          { key: 'sku', header: 'SKU' },
          { key: 'total_quantity', header: 'Quantity' },
          { key: 'total_value', header: 'Value' },
          { key: 'days_since_movement', header: 'Days Idle' },
        ];
        filename = 'dead-stock';
        break;

      default:
        data = [];
        columns = [];
        filename = 'report';
    }

    const csv = this.inventoryService.generateCsv(data, columns);
    res!.setHeader('Content-Type', 'text/csv');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`);
    res!.send(csv);
  }
}
