import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { CustomerAddressesService } from './customer-addresses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from './customers.service';

@Controller('customer-addresses')
@UseGuards(JwtAuthGuard)
export class CustomerAddressesController {
  constructor(
    private readonly addressesService: CustomerAddressesService,
    private readonly customersService: CustomersService,
  ) {}

  private async getCustomerId(email: string): Promise<string> {
    try {
      console.log('=== getCustomerId START ===');
      console.log('Looking for email:', email);
      
      const customers = await this.customersService.findAll();
      console.log('Total customers found:', customers.length);
      
      const customer = customers.find((c: any) => c.email === email);
      console.log('Customer found:', customer ? 'YES' : 'NO');
      
      if (!customer) {
        console.error('Customer not found with email:', email);
        throw new Error(`Customer not found with email: ${email}`);
      }
      
      console.log('Customer ID:', customer.id);
      console.log('=== getCustomerId END ===');
      return customer.id;
    } catch (error) {
      console.error('=== ERROR in getCustomerId ===');
      console.error('Error:', error);
      throw error;
    }
  }

  @Get()
  async findAll(@Request() req: any) {
    try {
      console.log('=== GET /customer-addresses START ===');
      console.log('Request user:', JSON.stringify(req.user));
      console.log('User email:', req.user?.email);
      
      const customerId = await this.getCustomerId(req.user.email);
      console.log('Found customer ID:', customerId);
      console.log('Customer ID type:', typeof customerId);
      
      const addresses = await this.addressesService.findByCustomerId(customerId);
      console.log('Found addresses count:', addresses.length);
      console.log('Addresses data:', JSON.stringify(addresses));
      console.log('=== GET /customer-addresses END ===');
      
      return addresses;
    } catch (error: any) {
      console.error('=== ERROR in findAll addresses ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const customerId = await this.getCustomerId(req.user.email);
    return this.addressesService.findOne(+id, customerId);
  }

  @Post()
  async create(@Body() createAddressDto: any, @Request() req: any) {
    try {
      console.log('Creating address, user:', req.user);
      console.log('Address data:', createAddressDto);
      const customerId = await this.getCustomerId(req.user.email);
      console.log('Customer ID for address:', customerId);
      const result = await this.addressesService.create(customerId, createAddressDto);
      console.log('Address created:', result);
      return result;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateAddressDto: any, @Request() req: any) {
    try {
      console.log('=== UPDATE address START ===');
      console.log('Address ID:', id);
      console.log('Update data:', JSON.stringify(updateAddressDto));
      console.log('User:', req.user.email);
      
      const customerId = await this.getCustomerId(req.user.email);
      console.log('Customer ID:', customerId);
      
      const result = await this.addressesService.update(+id, customerId, updateAddressDto);
      console.log('Update result:', JSON.stringify(result));
      console.log('=== UPDATE address END ===');
      
      return result;
    } catch (error: any) {
      console.error('=== ERROR updating address ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  @Put(':id/set-default')
  async setDefault(@Param('id') id: string, @Request() req: any) {
    const customerId = await this.getCustomerId(req.user.email);
    return this.addressesService.setDefault(+id, customerId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const customerId = await this.getCustomerId(req.user.email);
    return this.addressesService.remove(+id, customerId);
  }
}
