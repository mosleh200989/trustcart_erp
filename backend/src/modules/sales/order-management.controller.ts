import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Headers } from '@nestjs/common';
import { OrderManagementService } from './order-management.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

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

  // ==================== STEADFAST WEBHOOK ====================

  /**
   * Webhook endpoint for Steadfast to push delivery status updates.
   * This endpoint does NOT require JWT authentication since it's called by Steadfast servers.
   */
  @Public()
  @Post('webhook/steadfast')
  async steadfastWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>
  ) {
    return await this.orderManagementService.handleSteadfastWebhook(body, headers);
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
