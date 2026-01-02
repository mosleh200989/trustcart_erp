import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Body, Param, Put, Delete, Request, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { SpecialOffersService } from '../special-offers/special-offers.service';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly customersService: CustomersService,
    private readonly specialOffersService: SpecialOffersService,
  ) {}

  // Customer portal endpoint
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyOrders(@Request() req: any) {
    const email = req?.user?.email;
    const phone = req?.user?.phone;

    // Customer tokens may omit email (email is optional on customer accounts).
    // Prefer email match, then fall back to phone match.
    let customer: any | null = null;
    if (email) customer = await this.customersService.findByEmail(email);
    if (!customer && phone) {
      customer = await this.customersService.findByPhone(phone);
    }

    // Even if we can't find a customer record, we can still return orders matched by contact info.
    const customerId = customer?.id ?? req?.user?.id;
    return this.salesService.findForCustomerPortal({ id: customerId, email, phone });
  }

  @Get()
  async findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Get(':id/items')
  async getOrderItems(@Param('id') id: string) {
    return this.salesService.getOrderItems(id);
  }

  // Customer portal cancel endpoint
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelMyOrder(@Param('id') id: string, @Body() dto: CancelSalesOrderDto, @Request() req: any) {
    const email = req?.user?.email;
    const customer = email ? await this.customersService.findByEmail(email) : null;
    if (!customer?.id) {
      throw new ForbiddenException('Customer not found');
    }

    try {
      return await this.salesService.cancelForCustomer(Number(id), Number(customer.id), dto.cancelReason);
    } catch (e: any) {
      const message = e?.message || 'Failed to cancel order';
      if (message.toLowerCase().includes('not found')) throw new NotFoundException(message);
      if (message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('ownership')) {
        throw new ForbiddenException(message);
      }
      throw new BadRequestException(message);
    }
  }

  // Public endpoint (supports guest checkout) to accept the configured thank-you offer
  @Post(':id/accept-thank-you-offer')
  async acceptThankYouOffer(@Param('id') id: string) {
    try {
      const offer = await this.specialOffersService.findThankYouOffer(false);
      if (!offer?.is_active) {
        throw new Error('No active offer');
      }
      if (!offer.product_id || !offer.offer_price) {
        throw new Error('Offer is not configured');
      }

      return await this.salesService.acceptThankYouOffer(
        Number(id),
        Number(offer.product_id),
        Number(offer.offer_price),
      );
    } catch (e: any) {
      const message = e?.message || 'Failed to accept offer';
      if (message.toLowerCase().includes('not found')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
  }

  @Post()
  async create(@Body() createSalesDto: any) {
    return this.salesService.create(createSalesDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSalesDto: any) {
    return this.salesService.update(id, updateSalesDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}
