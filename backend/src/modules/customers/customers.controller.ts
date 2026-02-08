import { Controller, Get, Post, Body, Param, Put, Delete, BadRequestException, UseGuards, Query, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // Public lookup used by guest checkout to avoid exposing full customer lists
  @Get('lookup')
  @Public()
  async lookup(@Query('phone') phone?: string, @Query('email') email?: string) {
    let customer: any | null = null;
    if (phone) customer = await this.customersService.findByPhone(String(phone));
    if (!customer && email) customer = await this.customersService.findByEmail(String(email));
    return { id: customer?.id ?? null };
  }

  // Authenticated self-profile (used by customer portal / checkout autofill)
  @Get('me')
  async me(@Request() req: any) {
    const email = req?.user?.email;
    const phone = req?.user?.phone;

    let customer: any | null = null;
    if (email) customer = await this.customersService.findByEmail(String(email));
    if (!customer && phone) customer = await this.customersService.findByPhone(String(phone));
    return customer;
  }

  // Public customer creation (registration / guest checkout)
  @Post('public')
  @Public()
  async createPublic(@Body() createCustomerDto: any) {
    try {
      return await this.customersService.create(createCustomerDto);
    } catch (error: any) {
      console.error('Customer creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create customer');
    }
  }

  @Get()
  @RequirePermissions('view-customers')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.customersService.findAllPaginated({
      page: pageNum,
      limit: limitNum,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('view-customers')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @RequirePermissions('create-customers')
  async create(@Body() createCustomerDto: any) {
    try {
      return await this.customersService.create(createCustomerDto);
    } catch (error: any) {
      console.error('Customer creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create customer');
    }
  }

  @Put(':id')
  @RequirePermissions('edit-customers')
  async update(@Param('id') id: string, @Body() updateCustomerDto: any) {
    try {
      return await this.customersService.update(id, updateCustomerDto);
    } catch (error: any) {
      console.error('Customer update error:', error);
      throw new BadRequestException(error.message || 'Failed to update customer');
    }
  }

  @Delete(':id')
  @RequirePermissions('delete-customers')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
