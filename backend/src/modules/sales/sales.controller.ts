import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Body, Param, Put, Delete, Request, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly customersService: CustomersService,
  ) {}

  // Customer portal endpoint
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyOrders(@Request() req: any) {
    const email = req?.user?.email;
    const customer = email ? await this.customersService.findByEmail(email) : null;
    if (!customer?.id) return [];
    return this.salesService.findForCustomer(Number(customer.id));
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
