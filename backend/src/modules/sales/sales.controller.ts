import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Body, Param, Put, Delete, Request, Req, UseGuards, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { SpecialOffersService } from '../special-offers/special-offers.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('todayOnly') todayOnly?: string,
    @Query('productName') productName?: string,
    @Query('source') source?: string,
  ) {
    // If pagination params are provided, use the paginated method
    if (page || limit || q || status || startDate || endDate || todayOnly || productName || source) {
      return this.salesService.findAllPaginated({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        q: q || '',
        status: status || '',
        startDate: startDate || '',
        endDate: endDate || '',
        todayOnly: todayOnly === 'true',
        productName: productName || '',
        source: source || '',
      });
    }
    // Fallback for backwards compatibility (no params = return all)
    return this.salesService.findAll();
  }

  @Get('source-options')
  @RequirePermissions('view-sales-orders')
  async getSourceOptions() {
    return this.salesService.getSourceFilterOptions();
  }

  @Get('late-deliveries')
  @RequirePermissions('view-sales-orders')
  async findLateDeliveries(@Query('thresholdDays') thresholdDays?: string) {
    const days = thresholdDays != null ? Number(thresholdDays) : undefined;
    return this.salesService.findLateDeliveries({ thresholdDays: days });
  }

  @Get('sent-courier-orders')
  @RequirePermissions('view-sales-orders')
  async findSentCourierOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('courierCompany') courierCompany?: string,
    @Query('shippedFrom') shippedFrom?: string,
    @Query('shippedTo') shippedTo?: string,
  ) {
    return this.salesService.findSentCourierOrders({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      q: q || '',
      status: status || '',
      courierCompany: courierCompany || '',
      shippedFrom: shippedFrom || '',
      shippedTo: shippedTo || '',
    });
  }

  @Post('courier-returns')
  @RequirePermissions('view-sales-orders')
  async markCourierReturns(@Body() body: { courierOrderIds: string[]; returnDate: string }) {
    if (!body.courierOrderIds?.length) {
      throw new BadRequestException('At least one courier ID is required');
    }
    if (!body.returnDate) {
      throw new BadRequestException('Return date is required');
    }
    return this.salesService.markCourierReturns(body.courierOrderIds, body.returnDate);
  }

  @Get('my-order-stats')
  async getMyOrderStats(@Req() req: any) {
    const userId = req?.user?.id;
    if (!userId) return { totalOrders: 0, todayOrders: 0 };
    return this.salesService.getAgentOrderStats(Number(userId));
  }

  @Get('daily-report')
  @RequirePermissions('view-sales-reports')
  async getDailyReport(@Query('date') date?: string) {
    const reportDate = date || new Date().toISOString().slice(0, 10);
    return this.salesService.getDailyReport(reportDate);
  }

  @Get('agent-wise-report')
  @RequirePermissions('view-sales-reports')
  async getAgentWiseReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.salesService.getAgentWiseReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      agentId: agentId ? parseInt(agentId, 10) : undefined,
    });
  }

  @Get('agent-monthly-report')
  @RequirePermissions('view-sales-reports')
  async getAgentMonthlyReport(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.salesService.getAgentMonthlyReport({ month: m, year: y });
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
  async create(@Body() createSalesDto: any, @Req() req: any) {
    // Optionally extract logged-in user from JWT for @Public route
    let authUser: any = null;
    try {
      const authHeader = req?.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024') as any;
        if (decoded && decoded.id && decoded.type === 'user') {
          authUser = decoded;
        }
      }
    } catch { /* ignore invalid tokens */ }

    // If an admin/agent user is authenticated, pass their info for source tracking
    if (authUser) {
      if (!createSalesDto.created_by && !createSalesDto.createdBy) {
        createSalesDto.created_by = authUser.id;
      }
      if (!createSalesDto.order_source && !createSalesDto.orderSource) {
        createSalesDto.order_source = 'admin_panel';
      }
    }

    return this.salesService.create(createSalesDto);
  }

  @Put('sync-customer/:customerId')
  @RequirePermissions('edit-sales-orders')
  async syncCustomerInfo(
    @Param('customerId') customerId: string,
    @Body() body: { customerName?: string; customerEmail?: string; customerPhone?: string },
  ) {
    return this.salesService.syncCustomerInfo(Number(customerId), body);
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
