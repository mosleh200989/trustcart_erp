import { Controller, Get, Post, Body, Param, Put, Delete, Request, UseGuards, Patch } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    try {
      console.log('=== GET /support START ===');
      console.log('User:', JSON.stringify(req.user));
      console.log('User email:', req.user.email);
      
      // Get customer by email
      const customers = await this.customersService.findAll();
      console.log('Total customers:', customers.length);
      
      const customer = customers.find((c: any) => c.email === req.user.email);
      console.log('Customer found:', customer ? 'YES' : 'NO');
      
      if (customer) {
        console.log('Customer ID:', customer.id);
        const tickets = await this.supportService.findByCustomerId(customer.id);
        console.log('Tickets found:', tickets.length);
        return tickets;
      }
      
      // Fallback to email if no customer found
      console.log('Searching by email:', req.user.email);
      const tickets = await this.supportService.findByCustomerEmail(req.user.email);
      console.log('Tickets found by email:', tickets.length);
      console.log('=== GET /support END ===');
      return tickets;
    } catch (error: any) {
      console.error('=== ERROR in GET /support ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.supportService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: any, @Request() req: any) {
    try {
      console.log('=== POST /support START ===');
      console.log('User:', JSON.stringify(req.user));
      console.log('Request body:', JSON.stringify(dto));
      
      // Get customer by email
      console.log('Fetching customers...');
      const customers = await this.customersService.findAll();
      console.log('Total customers:', customers.length);
      
      const customer = customers.find((c: any) => c.email === req.user.email);
      console.log('Customer found:', customer ? 'YES' : 'NO');
      if (customer) {
        console.log('Customer ID:', customer.id);
      }
      
      const payload = {
        ...dto,
        customerId: customer?.id || null,
        customerEmail: req.user.email,
        status: 'open',
      };
      
      console.log('Payload to save:', JSON.stringify(payload));
      const result = await this.supportService.create(payload);
      console.log('Ticket created:', JSON.stringify(result));
      console.log('=== POST /support END ===');
      
      return result;
    } catch (error: any) {
      console.error('=== ERROR in POST /support ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.supportService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.supportService.remove(+id);
  }

  // Admin endpoints
  @Get('all')
  async findAllAdmin() {
    return this.supportService.findAll();
  }

  @Put(':id/reply')
  async addReply(@Param('id') id: string, @Body() dto: { response: string; status?: string }) {
    return this.supportService.addReply(+id, dto.response, dto.status);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.supportService.updateStatus(+id, dto.status);
  }

  @Put(':id/priority')
  async updatePriority(@Param('id') id: string, @Body() dto: { priority: string }) {
    return this.supportService.updatePriority(+id, dto.priority);
  }

  @Put(':id/assign')
  async assignTicket(@Param('id') id: string, @Body() dto: { assignedTo: number | null }) {
    return this.supportService.assignTicket(+id, dto.assignedTo);
  }
}
