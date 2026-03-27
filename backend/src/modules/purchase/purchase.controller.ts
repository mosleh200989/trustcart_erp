import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, ParseIntPipe, Query, Req } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('purchase')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // ── Purchase Orders ─────────────────────────────────

  @Get('orders')
  @RequirePermissions('view-purchase-orders')
  findAll(@Query('status') status?: string) {
    return this.purchaseService.findAll(status);
  }

  @Get('orders/:id')
  @RequirePermissions('view-purchase-orders')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.findOne(id);
  }

  @Post('orders')
  @RequirePermissions('create-purchase-orders')
  create(@Body() dto: any, @Req() req: any) {
    return this.purchaseService.create(dto, req.user?.id);
  }

  @Put('orders/:id')
  @RequirePermissions('edit-purchase-orders')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.purchaseService.update(id, dto);
  }

  @Post('orders/:id/submit')
  @RequirePermissions('create-purchase-orders')
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.submitForApproval(id);
  }

  @Post('orders/:id/approve')
  @RequirePermissions('edit-purchase-orders')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.purchaseService.approve(id, req.user?.id);
  }

  @Post('orders/:id/reject')
  @RequirePermissions('edit-purchase-orders')
  reject(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('reason') reason?: string) {
    return this.purchaseService.reject(id, req.user?.id, reason);
  }

  @Post('orders/:id/cancel')
  @RequirePermissions('delete-purchase-orders')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('reason') reason: string) {
    return this.purchaseService.cancel(id, req.user?.id, reason);
  }

  @Delete('orders/:id')
  @RequirePermissions('delete-purchase-orders')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.remove(id);
  }

  // ── GRNs ────────────────────────────────────────────

  @Get('grns')
  @RequirePermissions('view-purchase-orders')
  findAllGrns(@Query('po_id') poId?: string) {
    return this.purchaseService.findAllGrns(poId ? parseInt(poId, 10) : undefined);
  }

  @Get('grns/:id')
  @RequirePermissions('view-purchase-orders')
  findOneGrn(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.findOneGrn(id);
  }
}
