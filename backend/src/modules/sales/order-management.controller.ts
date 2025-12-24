import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { OrderManagementService } from './order-management.service';
import { Request } from 'express';

@Controller('order-management')
export class OrderManagementController {
  constructor(private readonly orderManagementService: OrderManagementService) {}

  // Helper to extract user info from request (adjust based on your auth setup)
  private getUserInfo(req: Request) {
    const user = (req as any).user || {};
    return {
      userId: user.id || 1,
      userName: user.name || user.username || 'Admin',
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    };
  }

  // ==================== ORDER ITEMS ====================

  @Get(':orderId/items')
  async getOrderItems(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getOrderItems(orderId);
  }

  @Post(':orderId/items')
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

  @Post(':orderId/courier-status')
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
  async getCourierTracking(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getCourierTrackingHistory(orderId);
  }

  // ==================== NOTES ====================

  @Put(':orderId/notes')
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
  async getActivityLogs(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getActivityLogs(orderId);
  }

  // ==================== ORDER DETAILS ====================

  @Get(':orderId/details')
  async getOrderDetails(@Param('orderId') orderId: number) {
    return await this.orderManagementService.getOrderDetails(orderId);
  }

  // ==================== ORDER TRACKING ====================

  @Put(':orderId/tracking')
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
    }
  ) {
    return await this.orderManagementService.updateOrderTracking({
      orderId,
      ...body,
    });
  }
}
