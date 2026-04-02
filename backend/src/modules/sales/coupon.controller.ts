import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { CouponService } from './coupon.service';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ─── CAMPAIGNS ───────────────────────────────────────────────

  @Get('campaigns')
  async listCampaigns(@Query() query: any) {
    return this.couponService.listCampaigns(query);
  }

  @Get('campaigns/:id')
  async getCampaign(@Param('id') id: string) {
    return this.couponService.getCampaign(Number(id));
  }

  @Post('campaigns')
  async createCampaign(@Body() body: any, @Request() req: any) {
    return this.couponService.createCampaign({
      ...body,
      createdBy: req.user?.id || req.user?.userId || null,
    });
  }

  @Put('campaigns/:id')
  async updateCampaign(@Param('id') id: string, @Body() body: any) {
    return this.couponService.updateCampaign(Number(id), body);
  }

  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: string) {
    return this.couponService.deleteCampaign(Number(id));
  }

  // ─── CUSTOMER ASSIGNMENTS ──────────────────────────────────

  @Get('customers')
  async listCustomers(@Query() query: any) {
    return this.couponService.listCustomers(query);
  }

  @Post('customers/assign')
  async assignCustomer(@Body() body: any) {
    return this.couponService.assignCustomer({
      campaignId: Number(body.campaignId),
      customerId: body.customerId != null ? Number(body.customerId) : null,
      customerPhone: body.customerPhone || null,
      customerName: body.customerName || null,
    });
  }

  @Post('customers/bulk-assign')
  async bulkAssignCustomers(@Body() body: any) {
    return this.couponService.bulkAssignCustomers({
      campaignId: Number(body.campaignId),
      customers: body.customers || [],
    });
  }

  @Delete('customers/:id')
  async removeCustomer(@Param('id') id: string) {
    return this.couponService.removeCustomer(Number(id));
  }

  // ─── CHECKOUT VALIDATION (public) ────────────────────────────

  @Post('validate')
  async validateCoupon(@Body() body: any) {
    return this.couponService.validateCoupon({
      code: body.code,
      customerId: body.customerId != null ? Number(body.customerId) : null,
      customerPhone: body.customerPhone || null,
      cartTotal: Number(body.cartTotal) || 0,
    });
  }

  @Get('available')
  async getAvailableCoupons(@Query('phone') phone: string) {
    return this.couponService.getAvailableCoupons(phone);
  }

  @Post('redeem')
  async redeemCoupon(@Body() body: any) {
    await this.couponService.redeemCoupon(
      body.code,
      Number(body.orderId),
      body.customerId != null ? Number(body.customerId) : null,
      body.customerPhone || null,
    );
    return { success: true };
  }
}
