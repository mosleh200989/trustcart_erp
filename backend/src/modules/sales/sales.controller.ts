import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Body, Param, Put, Delete, Request, UseGuards, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { SpecialOffersService } from '../special-offers/special-offers.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly customersService: CustomersService,
    private readonly specialOffersService: SpecialOffersService,
  ) {}

  // Public endpoint for thank-you page to get order details
  @Get('public/:id')
  @Public()
  async findOnePublic(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  // Public endpoint for thank-you page to get order items
  @Get('public/:id/items')
  @Public()
  async getOrderItemsPublic(@Param('id') id: string) {
    return this.salesService.getOrderItems(id);
  }

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

  @Get('orders')
  @RequirePermissions('view-sales-orders')
  async findOrders(@Query('customerId') customerId?: string, @Query('limit') limit?: string) {
    if (customerId) {
      const custId = parseInt(customerId, 10);
      if (!Number.isFinite(custId)) {
        return { items: [], total: 0 };
      }
      const orders = await this.salesService.findForCustomer(custId);
      return { items: orders, total: orders.length };
    }
    const orders = await this.salesService.findAll();
    return { items: orders, total: orders.length };
  }

  @Get()
  @RequirePermissions('view-sales-orders')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('courierStatus') courierStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('todayOnly') todayOnly?: string,
  ) {
    // If pagination params are provided, use the paginated method
    if (page || limit || q || status || courierStatus || startDate || endDate || todayOnly) {
      return this.salesService.findAllPaginated({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        q: q || '',
        status: status || '',
        courierStatus: courierStatus || '',
        startDate: startDate || '',
        endDate: endDate || '',
        todayOnly: todayOnly === 'true',
      });
    }
    // Fallback for backwards compatibility (no params = return all)
    return this.salesService.findAll();
  }

  @Get('late-deliveries')
  @RequirePermissions('view-sales-orders')
  async findLateDeliveries(@Query('thresholdDays') thresholdDays?: string) {
    const days = thresholdDays != null ? Number(thresholdDays) : undefined;
    return this.salesService.findLateDeliveries({ thresholdDays: days });
  }

  @Get(':id')
  @RequirePermissions('view-sales-orders')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Get(':id/items')
  @RequirePermissions('view-sales-orders')
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
  @Public()
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
  @Public()
  async create(@Body() createSalesDto: any) {
    return this.salesService.create(createSalesDto);
  }

  @Put(':id')
  @RequirePermissions('edit-sales-orders')
  async update(@Param('id') id: string, @Body() updateSalesDto: any) {
    return this.salesService.update(id, updateSalesDto);
  }

  @Delete(':id')
  @RequirePermissions('delete-sales-orders')
  async remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}
