import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Headers, Res, Query, UsePipes, ValidationPipe, HttpCode } from '@nestjs/common';
import { OrderManagementService } from './order-management.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SteadfastWebhookGuard } from '../../common/guards/steadfast-webhook.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SteadfastWebhookDto } from './dto/steadfast-webhook.dto';

@Controller('order-management')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderManagementController {
  constructor(private readonly orderManagementService: OrderManagementService) {}

  // Helper to extract user info from request (adjust based on your auth setup)
  private getUserInfo(req: Request) {
    const user = (req as any).user || {};
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return {
      userId: user.id,
      userName: user.name || user.username || 'Admin',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    };
  }

  // ==================== PRODUCT NAMES (for filter dropdowns) ====================

  @Get('product-names')
  @RequirePermissions('view-sales-orders')
  async getDistinctProductNames() {
    return await this.orderManagementService.getDistinctProductNames();
  }

  // ==================== PRINTING PAGE ====================

  @Get('printing')
  @RequirePermissions('view-sales-orders')
  async getPrintingOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('todayOnly') todayOnly?: string,
    @Query('isPacked') isPacked?: string,
    @Query('invoicePrinted') invoicePrinted?: string,
    @Query('stickerPrinted') stickerPrinted?: string,
    @Query('courierId') courierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productName') productName?: string,
  ) {
    return await this.orderManagementService.findForPrinting({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      q,
      todayOnly: todayOnly === 'true',
      isPacked,
      invoicePrinted,
      stickerPrinted,
      courierId,
      startDate,
      endDate,
      productName,
    });
  }

  @Post('bulk-mark-invoice-printed')
  @RequirePermissions('edit-sales-orders')
  async bulkMarkInvoicePrinted(@Body() body: { orderIds: number[] }) {
    return await this.orderManagementService.bulkMarkInvoicePrinted(body.orderIds);
  }

  @Post('bulk-mark-sticker-printed')
  @RequirePermissions('edit-sales-orders')
  async bulkMarkStickerPrinted(@Body() body: { orderIds: number[] }) {
    return await this.orderManagementService.bulkMarkStickerPrinted(body.orderIds);
  }

  // ==================== ORDER ITEMS ====================

  @Get(':orderId/items')
  @RequirePermissions('view-sales-orders')
  async getOrderItems(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getOrderItems(orderId);
  }

  @Post(':orderId/items')
  @RequirePermissions('edit-sales-orders')
  async addOrderItem(
    @Param('orderId') orderId: number,
    @Body() body: {
      productId: number;
      productName: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
    },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.addOrderItem({
      orderId,
      ...body,
      ...userInfo,
    });
  }

  @Put('items/:itemId')
  @RequirePermissions('edit-sales-orders')
  async updateOrderItem(
    @Param('itemId') itemId: number,
    @Body() body: { quantity?: number; unitPrice?: number },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.updateOrderItem(itemId, {
      ...body,
      ...userInfo,
    });
  }

  @Delete('items/:itemId')
  @RequirePermissions('edit-sales-orders')
  async deleteOrderItem(@Param('itemId') itemId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    await this.orderManagementService.deleteOrderItem(
      itemId,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress
    );
    return { success: true, message: 'Item deleted successfully' };
  }

  // ==================== DELIVERY CHARGE ====================

  @Put(':orderId/delivery-charge')
  @RequirePermissions('edit-sales-orders')
  async updateDeliveryCharge(
    @Param('orderId') orderId: number,
    @Body() body: { deliveryCharge: number },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.updateDeliveryCharge({
      orderId,
      deliveryCharge: body.deliveryCharge,
      ...userInfo,
    });
  }

  // ==================== DISCOUNT ====================

  @Put(':orderId/discount')
  @RequirePermissions('edit-sales-orders')
  async updateDiscount(
    @Param('orderId') orderId: number,
    @Body() body: { discountAmount: number },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.updateDiscount({
      orderId,
      discountAmount: body.discountAmount,
      ...userInfo,
    });
  }

  // ==================== ORDER STATUS ====================

  @Post(':orderId/approve')
  @RequirePermissions('approve-sales-orders')
  async approveOrder(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.approveOrder(
      orderId,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress
    );
  }

  @Post(':orderId/hold')
  @RequirePermissions('edit-sales-orders')
  async holdOrder(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.holdOrder(
      orderId,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress
    );
  }

  @Post(':orderId/unhold')
  @RequirePermissions('edit-sales-orders')
  async unholdOrder(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.unholdOrder(
      orderId,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress
    );
  }

  @Post(':orderId/cancel')
  @RequirePermissions('edit-sales-orders')
  async cancelOrder(
    @Param('orderId') orderId: number,
    @Body() body: { cancelReason: string },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.cancelOrder(
      orderId,
      body.cancelReason,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress
    );
  }

  // ==================== COURIER ====================

  @Post(':orderId/ship')
  @RequirePermissions('edit-sales-orders')
  async shipOrder(
    @Param('orderId') orderId: number,
    @Body() body: {
      courierCompany: string;
      courierOrderId?: string;
      trackingId: string;
    },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.shipOrder({
      orderId,
      ...body,
      ...userInfo,
    });
  }

  @Post(':orderId/steadfast/send')
  @RequirePermissions('edit-sales-orders')
  async sendToSteadfast(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.sendToSteadfast({
      orderId,
      ...userInfo,
    });
  }

  @Post(':orderId/courier-status')
  @RequirePermissions('edit-sales-orders')
  async updateCourierStatus(
    @Param('orderId') orderId: number,
    @Body() body: {
      status: string;
      location?: string;
      remarks?: string;
    }
  ) {
    await this.orderManagementService.updateCourierStatus({
      orderId,
      ...body,
    });
    return { success: true, message: 'Courier status updated' };
  }

  @Get(':orderId/courier-tracking')
  @RequirePermissions('view-sales-orders')
  async getCourierTracking(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getCourierTrackingHistory(orderId);
  }

  // ==================== NOTES ====================

  @Put(':orderId/notes')
  @RequirePermissions('edit-sales-orders')
  async updateNotes(
    @Param('orderId') orderId: number,
    @Body() body: {
      shippingAddress?: string;
      courierNotes?: string;
      riderInstructions?: string;
      internalNotes?: string;
    },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.updateOrderNotes({
      orderId,
      ...body,
      ...userInfo,
    });
  }

  // ==================== ACTIVITY LOGS ====================

  @Get(':orderId/activity-logs')
  @RequirePermissions('view-sales-orders')
  async getActivityLogs(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getActivityLogs(orderId);
  }

  // ==================== CUSTOMER ORDERS ====================

  @Get('customer/:customerId/orders')
  @RequirePermissions('view-sales-orders')
  async getCustomerOrders(@Param('customerId') customerId: number) {
    return await this.orderManagementService.getCustomerOrders(customerId);
  }

  // ==================== ORDER DETAILS ====================

  @Get(':orderId/details')
  @RequirePermissions('view-sales-orders')
  async getOrderDetails(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getOrderDetails(orderId);
  }

  // ==================== CUSTOMER PRODUCT HISTORY ====================

  @Get(':orderId/product-history')
  @RequirePermissions('view-sales-orders')
  async getCustomerProductHistory(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getCustomerProductHistory(orderId);
  }

  // ==================== ORDER TRACKING ====================

  @Put(':orderId/tracking')
  @RequirePermissions('edit-sales-orders')
  async updateOrderTracking(
    @Param('orderId') orderId: number,
    @Body() body: {
      userIp?: string;
      geoLocation?: any;
      browserInfo?: string;
      deviceType?: string;
      operatingSystem?: string;
      trafficSource?: string;
      referrerUrl?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    },
    @Req() req: Request
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const ua = (req.headers['user-agent'] as string) || '';
    return await this.orderManagementService.updateOrderTracking({
      orderId,
      ...body,
      userIp: body.userIp ?? ipAddress,
      browserInfo: body.browserInfo ?? ua,
    });
  }

  // ==================== MARK AS PACKED ====================

  @Post(':orderId/mark-packed')
  @RequirePermissions('edit-sales-orders')
  async markAsPacked(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.markAsPacked(
      orderId,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress,
    );
  }

  @Post(':orderId/unmark-packed')
  @RequirePermissions('edit-sales-orders')
  async unmarkPacked(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.unmarkPacked(
      orderId,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress,
    );
  }

  @Post('bulk-mark-packed')
  @RequirePermissions('edit-sales-orders')
  async bulkMarkAsPacked(@Body() body: { orderIds: number[] }, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.bulkMarkAsPacked(
      body.orderIds,
      userInfo.userId,
      userInfo.userName,
      userInfo.ipAddress,
    );
  }

  // ==================== PRINT ====================

  @Post(':orderId/mark-invoice-printed')
  @RequirePermissions('edit-sales-orders')
  async markInvoicePrinted(@Param('orderId') orderId: number) {
    return await this.orderManagementService.markInvoicePrinted(orderId);
  }

  @Post(':orderId/mark-sticker-printed')
  @RequirePermissions('edit-sales-orders')
  async markStickerPrinted(@Param('orderId') orderId: number) {
    return await this.orderManagementService.markStickerPrinted(orderId);
  }

  @Post(':orderId/print/invoice')
  @RequirePermissions('view-sales-orders')
  async printInvoice(@Param('orderId') orderId: number) {
    return await this.orderManagementService.generateInvoiceData(orderId);
  }

  @Post(':orderId/print/sticker')
  @RequirePermissions('view-sales-orders')
  async printSticker(@Param('orderId') orderId: number) {
    return await this.orderManagementService.generateStickerData(orderId);
  }

  @Post('bulk-print/invoice')
  @RequirePermissions('view-sales-orders')
  async bulkPrintInvoice(@Body() body: { orderIds: number[] }) {
    return await this.orderManagementService.bulkGenerateInvoiceData(body.orderIds);
  }

  @Post('bulk-print/sticker')
  @RequirePermissions('view-sales-orders')
  async bulkPrintSticker(@Body() body: { orderIds: number[] }) {
    return await this.orderManagementService.bulkGenerateStickerData(body.orderIds);
  }

  // ==================== STEADFAST WEBHOOK ====================

  /**
   * Webhook endpoint for Steadfast to push delivery status and tracking updates.
   *
   * - Bypasses JWT authentication (@Public) since it's called by Steadfast servers.
   * - Uses SteadfastWebhookGuard to validate the Bearer token from Steadfast.
   * - Uses a lenient ValidationPipe (forbidNonWhitelisted: false) so that
   *   unexpected fields from Steadfast don't cause 400 errors.
   * - Returns HTTP 200 on success as required by Steadfast's webhook contract.
   */
  @Public()
  @Post('webhook/steadfast')
  @HttpCode(200)
  @UseGuards(SteadfastWebhookGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async steadfastWebhook(
    @Body() dto: SteadfastWebhookDto,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.orderManagementService.handleSteadfastWebhook(dto, headers);
  }

  /**
   * Manual trigger to sync all Steadfast orders' statuses.
   * Useful for batch syncing or recovery.
   */
  @Post('steadfast/sync-all')
  @RequirePermissions('edit-sales-orders')
  async syncAllSteadfastStatuses() {
    return await this.orderManagementService.syncAllSteadfastStatuses();
  }
}
