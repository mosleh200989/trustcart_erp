import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Headers, Res, Query, UsePipes, ValidationPipe, HttpCode } from '@nestjs/common';
import { OrderManagementService } from './order-management.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SteadfastWebhookGuard } from '../../common/guards/steadfast-webhook.guard';
import { PathaoWebhookGuard } from '../../common/guards/pathao-webhook.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SteadfastWebhookDto } from './dto/steadfast-webhook.dto';
import { PathaoWebhookDto } from './dto/pathao-webhook.dto';

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
  @RequirePermissions('view-printing')
  async getPrintingOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('isPacked') isPacked?: string,
    @Query('invoicePrinted') invoicePrinted?: string,
    @Query('stickerPrinted') stickerPrinted?: string,
    @Query('courierId') courierId?: string,
    @Query('date') date?: string,
    @Query('productName') productName?: string,
  ) {
    return await this.orderManagementService.findForPrinting({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      q,
      isPacked,
      invoicePrinted,
      stickerPrinted,
      courierId,
      date,
      productName,
    });
  }

  @Post('bulk-mark-invoice-printed')
  @RequirePermissions('manage-printing')
  async bulkMarkInvoicePrinted(@Body() body: { orderIds: number[] }, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.bulkMarkInvoicePrinted(body.orderIds, userInfo.userId, userInfo.userName, userInfo.ipAddress);
  }

  @Post('bulk-mark-sticker-printed')
  @RequirePermissions('manage-printing')
  async bulkMarkStickerPrinted(@Body() body: { orderIds: number[] }, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.bulkMarkStickerPrinted(body.orderIds, userInfo.userId, userInfo.userName, userInfo.ipAddress);
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
    @Body() body: { quantity?: number; unitPrice?: number; customProductName?: string | null },
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
  @Get('pathao/stores')
  @RequirePermissions('view-sales-orders')
  async getPathaoStores() {
    return await this.orderManagementService.getPathaoStores();
  }

  @Get('pathao/cities')
  @RequirePermissions('view-sales-orders')
  async getPathaoCities() {
    return await this.orderManagementService.getPathaoCities();
  }

  @Get('pathao/cities/:cityId/zones')
  @RequirePermissions('view-sales-orders')
  async getPathaoZones(@Param('cityId') cityId: number) {
    return await this.orderManagementService.getPathaoZones(cityId);
  }

  @Get('pathao/zones/:zoneId/areas')
  @RequirePermissions('view-sales-orders')
  async getPathaoAreas(@Param('zoneId') zoneId: number) {
    return await this.orderManagementService.getPathaoAreas(zoneId);
  }

  @Post('pathao/price-plan')
  @RequirePermissions('view-sales-orders')
  async getPathaoPricePlan(@Body() body: {
    store_id: number;
    item_type: number;
    delivery_type: number;
    item_weight: number;
    recipient_city: number;
    recipient_zone: number;
  }) {
    return await this.orderManagementService.getPathaoPriceCalculation(body);
  }

  @Post('pathao/sync-all')
  @RequirePermissions('sync-steadfast')
  async syncAllPathaoStatuses() {
    return await this.orderManagementService.syncAllPathaoStatuses();
  }

  /**
   * Pathao webhook receiver.
   * Public endpoint — Pathao requires:
   *  - HTTP 202 response
   *  - X-Pathao-Merchant-Webhook-Integration-Secret header
   */
  @Public()
  @Post('webhook/pathao')
  @HttpCode(202)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async pathaoWebhook(
    @Body() dto: PathaoWebhookDto,
    @Headers() headers: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const integrationSecret = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET || '';
    if (integrationSecret) {
      res.setHeader('X-Pathao-Merchant-Webhook-Integration-Secret', integrationSecret);
    }
    return await this.orderManagementService.handlePathaoWebhook(dto, headers);
  }

  /**
   * GET health-check for the Pathao webhook endpoint.
   * Public so Pathao can verify the URL is live during registration.
   * Returns HTTP 202 with the integration secret header.
   */
  @Public()
  @Get('webhook/pathao')
  @HttpCode(202)
  async pathaoWebhookHealth(@Res({ passthrough: true }) res: Response) {
    const integrationSecret = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET || '';
    if (integrationSecret) {
      res.setHeader('X-Pathao-Merchant-Webhook-Integration-Secret', integrationSecret);
    }
    return {
      status: 'ok',
      webhook: 'pathao',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin endpoint to view Pathao webhook configuration.
   */
  @Get('pathao/webhook-info')
  @RequirePermissions('edit-sales-orders')
  async pathaoWebhookInfo() {
    const secret = process.env.PATHAO_WEBHOOK_SECRET;
    const webhookUrl = process.env.PATHAO_WEBHOOK_URL || '';
    const integrationSecret = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET || '';
    return {
      webhookUrl,
      secured: !!secret,
      integrationSecretSet: !!integrationSecret,
      setup: {
        step1: 'Go to https://merchant.pathao.com/courier/developer-api',
        step2: `Set Webhook URL to: ${webhookUrl}`,
        step3: 'Save — Pathao will verify the URL automatically',
      },
    };
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

  @Put(':orderId/change-status')
  @RequirePermissions('change-order-status')
  async changeOrderStatus(
    @Param('orderId') orderId: number,
    @Body() body: { status: string },
    @Req() req: Request
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.changeOrderStatus(
      orderId,
      body.status,
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
  @RequirePermissions('manage-printing')
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
  @RequirePermissions('manage-printing')
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
  @RequirePermissions('manage-printing')
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
  @RequirePermissions('manage-printing')
  async markInvoicePrinted(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.markInvoicePrinted(orderId, userInfo.userId, userInfo.userName, userInfo.ipAddress);
  }

  @Post(':orderId/mark-sticker-printed')
  @RequirePermissions('manage-printing')
  async markStickerPrinted(@Param('orderId') orderId: number, @Req() req: Request) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.markStickerPrinted(orderId, userInfo.userId, userInfo.userName, userInfo.ipAddress);
  }

  @Post(':orderId/print/invoice')
  @RequirePermissions('view-printing')
  async printInvoice(@Param('orderId') orderId: number) {
    return await this.orderManagementService.generateInvoiceData(orderId);
  }

  @Post(':orderId/print/sticker')
  @RequirePermissions('view-printing')
  async printSticker(@Param('orderId') orderId: number) {
    return await this.orderManagementService.generateStickerData(orderId);
  }

  @Post('bulk-print/invoice')
  @RequirePermissions('view-printing')
  async bulkPrintInvoice(@Body() body: { orderIds: number[] }) {
    return await this.orderManagementService.bulkGenerateInvoiceData(body.orderIds);
  }

  @Post('bulk-print/sticker')
  @RequirePermissions('view-printing')
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
  @RequirePermissions('sync-steadfast')
  async syncAllSteadfastStatuses() {
    return await this.orderManagementService.syncAllSteadfastStatuses();
  }

  // ==================== PATHAO COURIER ====================

  @Post(':orderId/pathao/send')
  @RequirePermissions('edit-sales-orders')
  async sendToPathao(
    @Param('orderId') orderId: number,
    @Body() body: {
      storeId?: number;
      recipientCity?: number;
      recipientZone?: number;
      recipientArea?: number;
      itemWeight?: number;
    },
    @Req() req: Request,
  ) {
    const userInfo = this.getUserInfo(req);
    return await this.orderManagementService.sendToPathao({
      orderId,
      ...body,
      ...userInfo,
    });
  }
}
