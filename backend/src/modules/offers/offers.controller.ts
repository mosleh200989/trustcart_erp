import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // =====================================================
  // ADMIN ENDPOINTS
  // =====================================================

  @Post()
  async create(@Body() data: any) {
    return this.offersService.create(data);
  }

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.offersService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.offersService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return this.offersService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.offersService.delete(id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: number) {
    return this.offersService.getOfferStats(id);
  }

  // =====================================================
  // CUSTOMER / CHECKOUT ENDPOINTS
  // =====================================================

  @Get('active/list')
  async getActiveOffers(@Query('customerId') customerId?: number) {
    return this.offersService.getActiveOffers(customerId);
  }

  @Post('evaluate')
  async evaluateOffers(@Body() data: {
    cart: any[];
    customerId?: number;
    customerData?: any;
  }) {
    return this.offersService.evaluateOffers(
      data.cart,
      data.customerId,
      data.customerData,
    );
  }

  @Post('best')
  async getBestOffer(@Body() data: {
    cart: any[];
    customerId?: number;
    customerData?: any;
  }) {
    return this.offersService.getBestOffer(
      data.cart,
      data.customerId,
      data.customerData,
    );
  }

  @Post('usage')
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
