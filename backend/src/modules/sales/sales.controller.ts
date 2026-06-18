import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Body, Param, Put, Delete, Request, Req, UseGuards, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { OrderManagementService } from './order-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { SpecialOffersService } from '../special-offers/special-offers.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAnyPermission, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { getDhakaDateString } from '../../common/utils/dhaka-date';
import * as jwt from 'jsonwebtoken';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly orderManagementService: OrderManagementService,
    private readonly customersService: CustomersService,
    private readonly specialOffersService: SpecialOffersService,
  ) {}

  private getDhakaDateString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return year && month && day ? `${year}-${month}-${day}` : getDhakaDateString();
  }

  private getClientIp(req: any): string {
    const forwarded = req?.headers?.['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded || req?.headers?.['x-real-ip'] || req?.ip || req?.socket?.remoteAddress || '';
    return String(raw).split(',')[0].trim().replace(/^::ffff:/, '');
  }

  // Public endpoint: track order by tracking ID, order number, or consignment ID
  @Get('public/track/:trackingId')
  @Public()
  async trackByTrackingId(@Param('trackingId') trackingId: string) {
    const order = await this.salesService.findByTrackingId(trackingId);
    if (!order) {
      throw new NotFoundException('No order found for this tracking ID or order number');
    }

    // Fetch local tracking history; also get live Steadfast status if it's a Steadfast order with a tracking code
    const isSteadfast = order.courierCompany && String(order.courierCompany).toLowerCase() === 'steadfast';
    const [trackingHistory, liveStatus, orderItems] = await Promise.all([
      this.orderManagementService.getCourierTrackingHistory(order.id),
      isSteadfast && order.trackingId
        ? this.orderManagementService.getLiveSteadfastStatus(order.trackingId)
        : Promise.resolve(null),
      this.salesService.getOrderItems(String(order.id)),
    ]);

    // Mask customer phone: show only last 3 digits with a clean format
    const rawPhone = (order as any).customerPhone || '';
    const maskedPhone = rawPhone.length > 3
      ? '****' + rawPhone.slice(-3)
      : rawPhone;

    return {
      id: order.id,
      salesOrderNumber: order.salesOrderNumber,
      status: liveStatus || order.status,
      courierCompany: order.courierCompany,
      courierStatus: liveStatus || order.courierStatus,
      trackingId: order.trackingId,
      createdAt: order.createdAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      shippingAddress: order.shippingAddress,
      district: (order as any).district,
      customerPhone: maskedPhone,
      items: orderItems.map((item: any) => ({
        productName: item.displayName || item.productName || 'Product',
        quantity: item.quantity,
        productImage: item.productImage || null,
      })),
      trackingHistory: trackingHistory.map(h => ({
        status: h.status,
        location: h.location,
        remarks: h.remarks,
        trackingMessage: h.trackingMessage,
        updatedAt: h.updatedAt,
      })),
    };
  }

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

  @Get('assigned-orders')
  @RequireAnyPermission('view-assigned-orders', 'view-own-assigned-orders', 'view-team-assigned-orders', 'view-all-assigned-orders')
  async findAssignedOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('assignment') assignment?: string,
    @Query('todayOnly') todayOnly?: string,
    @Query('teamLeaderId') teamLeaderId?: string,
    @Query('agentId') agentId?: string,
    @Query('product') product?: string,
    @Query('productName') productName?: string,
    @Query('landingPage') landingPage?: string,
  ) {
    return this.salesService.findAssignedOrdersPaginated({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      q: q || '',
      status: status || '',
      startDate: startDate || '',
      endDate: endDate || '',
      assignment: assignment || '',
      todayOnly: todayOnly === 'true',
      teamLeaderId: teamLeaderId ? parseInt(teamLeaderId, 10) : undefined,
      agentId: agentId ? parseInt(agentId, 10) : undefined,
      product: product || productName || '',
      landingPage: landingPage || '',
    }, req.user);
  }

  @Get('assignment-agents')
  @RequireAnyPermission('view-assigned-orders', 'view-own-assigned-orders', 'view-team-assigned-orders', 'view-all-assigned-orders', 'manage-assigned-orders')
  async getAssignmentAgents(@Req() req: any, @Query('teamLeaderId') teamLeaderId?: string) {
    return this.salesService.getAssignmentAgents(req.user, {
      teamLeaderId: teamLeaderId ? parseInt(teamLeaderId, 10) : undefined,
    });
  }

  @Get('assignment-team-leaders')
  @RequireAnyPermission('view-assigned-orders', 'view-team-assigned-orders', 'view-all-assigned-orders', 'manage-assigned-orders')
  async getAssignmentTeamLeaders(@Req() req: any) {
    return this.salesService.getAssignmentTeamLeaders(req.user);
  }

  @Get('order-assignment-agents')
  @RequireAnyPermission('manage-order-assignment', 'manage-assigned-orders')
  async getOrderAssignmentAgents(@Req() req: any, @Query('teamLeaderId') teamLeaderId?: string) {
    return this.salesService.getAssignmentAgents(req.user, {
      teamLeaderId: teamLeaderId ? parseInt(teamLeaderId, 10) : undefined,
    });
  }

  @Put('order-assignments/bulk-assign')
  @RequireAnyPermission('manage-order-assignment', 'manage-assigned-orders')
  async bulkAssignOrdersForTelephony(@Body() body: { orderIds?: number[]; agentId?: number }, @Req() req: any) {
    return this.salesService.assignOrdersForTelephony(body.orderIds || [], Number(body.agentId), req.user);
  }

  @Put('order-assignments/bulk-unassign')
  @RequireAnyPermission('manage-order-assignment', 'manage-assigned-orders')
  async bulkUnassignOrdersForTelephony(@Body() body: { orderIds?: number[] }, @Req() req: any) {
    return this.salesService.unassignOrdersForTelephony(body.orderIds || [], req.user);
  }

  @Put('assigned-orders/:id/assign')
  @RequirePermissions('manage-assigned-orders')
  async assignWebOrder(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.salesService.assignWebOrder(Number(id), body, req.user);
  }

  @Put('assigned-orders/:id/unassign')
  @RequirePermissions('manage-assigned-orders')
  async unassignWebOrder(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.salesService.unassignWebOrder(Number(id), body, req.user);
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
    @Query('sourceGroup') sourceGroup?: string,
    @Query('source') source?: string,
    @Query('landingPage') landingPage?: string,
    @Query('assignment') assignment?: string,
    @Query('totalCancelledOrders') totalCancelledOrders?: string,
    @Query('orderRejectedReason') orderRejectedReason?: string,
  ) {
    // If pagination params are provided, use the paginated method
    if (page || limit || q || status || startDate || endDate || todayOnly || productName || sourceGroup || source || landingPage || assignment || totalCancelledOrders || orderRejectedReason) {
      return this.salesService.findAllPaginated({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        q: q || '',
        status: status || '',
        startDate: startDate || '',
        endDate: endDate || '',
        todayOnly: todayOnly === 'true',
        productName: productName || '',
        sourceGroup: sourceGroup || '',
        source: source || '',
        landingPage: landingPage || '',
        assignment: assignment || '',
        totalCancelledOrders: totalCancelledOrders || '',
        orderRejectedReason: orderRejectedReason || '',
      });
    }
    // Fallback for backwards compatibility (no params = return all)
    return this.salesService.findAll();
  }

  @Get('source-options')
  @RequireAnyPermission('view-sales-orders', 'view-late-delivery')
  async getSourceOptions() {
    return this.salesService.getSourceFilterOptions();
  }

  @Get('landing-page-options')
  @RequireAnyPermission(
    'view-sales-orders',
    'view-assigned-orders',
    'view-own-assigned-orders',
    'view-team-assigned-orders',
    'view-all-assigned-orders',
    'view-sales-reports',
  )
  async getLandingPageOptions() {
    return this.salesService.getLandingPageFilterOptions();
  }

  @Get('automatic-assignment/overview')
  @RequireAnyPermission('view-auto-order-assignment', 'manage-auto-order-assignment', 'view-team-performance')
  async getAutomaticAssignmentOverview(@Req() req: any, @Query('teamLeaderId') teamLeaderId?: string) {
    return this.salesService.getAutomaticAssignmentOverview(req.user, {
      teamLeaderId: teamLeaderId ? Number(teamLeaderId) : undefined,
    });
  }

  @Get('automatic-assignment/team-report')
  @RequireAnyPermission('view-auto-order-assignment', 'manage-auto-order-assignment', 'view-team-performance')
  async getAutomaticAssignmentTeamReport(
    @Req() req: any,
    @Query('teamLeaderId') teamLeaderId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.getAutomaticAssignmentTeamReport(req.user, {
      teamLeaderId: teamLeaderId ? Number(teamLeaderId) : undefined,
      from,
      to,
    });
  }

  @Get('automatic-assignment/team-leaders')
  @RequireAnyPermission('view-auto-order-assignment', 'manage-auto-order-assignment', 'view-team-performance')
  async getAutomaticAssignmentTeamLeaders(@Req() req: any) {
    return this.salesService.getAutomaticAssignmentTeamLeaders(req.user);
  }

  @Get('automatic-assignment/products')
  @RequireAnyPermission('view-auto-order-assignment', 'manage-auto-order-assignment')
  async getAutomaticAssignmentProducts(@Req() req: any) {
    return this.salesService.getAutomaticAssignmentProducts(req.user);
  }

  @Put('automatic-assignment/settings')
  @RequirePermissions('manage-auto-order-assignment')
  async updateAutomaticAssignmentSettings(@Req() req: any, @Body() body: any) {
    return this.salesService.updateAutomaticAssignmentSettings(req.user, body);
  }

  @Post('automatic-assignment/run')
  @RequirePermissions('manage-auto-order-assignment')
  async runAutomaticAssignmentNow(@Req() req: any, @Body() body: any) {
    return this.salesService.runAutomaticAssignmentNow(req.user, body);
  }

  @Get('late-deliveries')
  @RequirePermissions('view-late-delivery')
  async findLateDeliveries(@Query('thresholdDays') thresholdDays?: string) {
    const days = thresholdDays != null ? Number(thresholdDays) : undefined;
    return this.salesService.findLateDeliveries({ thresholdDays: days });
  }

  @Get('cancelled-orders')
  @RequirePermissions('view-sales-orders')
  async findCancelledOrders() {
    return this.salesService.findCancelledOrders();
  }

  @Get('rejected-orders')
  @RequirePermissions('view-sales-orders')
  async findRejectedOrders() {
    return this.salesService.findRejectedOrders();
  }

  @Get('sent-courier-orders')
  @RequirePermissions('view-sent-courier-orders')
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
  @RequirePermissions('manage-courier-returns')
  async markCourierReturns(@Body() body: { courierOrderIds: string[]; returnDate: string }, @Req() req: any) {
    if (!body.courierOrderIds?.length) {
      throw new BadRequestException('At least one courier ID is required');
    }
    if (!body.returnDate) {
      throw new BadRequestException('Return date is required');
    }
    const userName = [req?.user?.name, req?.user?.lastName].filter(Boolean).join(' ').trim() || req?.user?.email || 'Admin';
    const ipAddress = String(req?.headers?.['x-forwarded-for'] || req?.ip || req?.socket?.remoteAddress || '').split(',')[0].trim();
    return this.salesService.markCourierReturns(body.courierOrderIds, body.returnDate, Number(req?.user?.id) || undefined, userName, ipAddress);
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
    const reportDate = date || this.getDhakaDateString();
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

  @Get('website-monthly-report')
  @RequirePermissions('view-sales-reports')
  async getWebsiteMonthlyReport(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.salesService.getWebsiteMonthlyReport({ month: m, year: y });
  }

  @Get('landing-page-report')
  @RequirePermissions('view-sales-reports')
  async getLandingPageReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('slug') slug?: string,
    @Query('groupBy') groupBy?: 'hour' | 'day',
  ) {
    return this.salesService.getLandingPageReport({ startDate, endDate, slug, groupBy });
  }

  @Get('cross-sell-analysis')
  @RequirePermissions('view-sales-reports')
  async getCrossSellAnalysisReport(
    @Query('productId') productId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getCrossSellAnalysisReport({
      productId: productId ? parseInt(productId, 10) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
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

    return this.salesService.create(createSalesDto, { clientIp: this.getClientIp(req) });
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
