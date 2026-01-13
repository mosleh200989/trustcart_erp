import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('offers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // =====================================================
  // ADMIN ENDPOINTS
  // =====================================================

  @Post()
  @RequirePermissions('manage-discounts')
  async create(@Body() data: any) {
    return this.offersService.create(data);
  }

  @Get()
  @RequirePermissions('manage-discounts')
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.offersService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @RequirePermissions('manage-discounts')
  async findOne(@Param('id') id: number) {
    return this.offersService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('manage-discounts')
  async update(@Param('id') id: number, @Body() data: any) {
    return this.offersService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('manage-discounts')
  async delete(@Param('id') id: number) {
    return this.offersService.delete(id);
  }

  @Get(':id/stats')
  @RequirePermissions('manage-discounts')
  async getStats(@Param('id') id: number) {
    return this.offersService.getOfferStats(id);
  }

  // =====================================================
  // CUSTOMER / CHECKOUT ENDPOINTS
  // =====================================================

  @Get('active/list')
  @Public()
  async getActiveOffers(@Query('customerId') customerId?: number) {
    return this.offersService.getActiveOffers(customerId);
  }

  @Post('evaluate')
  @Public()
  async evaluateOffers(@Body() data: {
    cart: any[];
    customerId?: number;
    customerData?: any;
    code?: string;
  }) {
    if (data.code) {
      return await this.offersService.evaluateOfferCode({
        code: data.code,
        cart: data.cart,
        customerId: data.customerId,
        customerData: data.customerData,
      });
    }

    return await this.offersService.evaluateOffers(data.cart, data.customerId, data.customerData);
  }

  @Post('best')
  @Public()
  async getBestOffer(@Body() data: {
    cart: any[];
    customerId?: number;
    customerData?: any;
    code?: string;
  }) {
    if (data.code) {
      return await this.offersService.evaluateOfferCode({
        code: data.code,
        cart: data.cart,
        customerId: data.customerId,
        customerData: data.customerData,
      });
    }

    return await this.offersService.getBestOffer(data.cart, data.customerId, data.customerData);
  }

  @Post('usage')
  @Public()
  async recordUsage(@Body() data: {
    offerId: number;
    customerId: number;
    orderId: number;
    discountAmount: number;
  }) {
    return this.offersService.recordUsage(
      data.offerId,
      data.customerId,
      data.orderId,
      data.discountAmount,
    );
  }
}
