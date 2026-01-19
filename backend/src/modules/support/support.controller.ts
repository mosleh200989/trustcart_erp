import { Controller, Get, Post, Body, Param, Put, Delete, Query, Request, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from '../customers/customers.service';
import {
  AddSupportTicketReplyDto,
  AssignSupportTicketDto,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  UpdateSupportTicketPriorityDto,
  UpdateSupportTicketStatusDto,
  UpdateSupportTicketRoutingDto,
  SUPPORT_TICKET_GROUPS,
  SUPPORT_TICKET_SEVERITIES,
} from './dto/support-ticket.dto';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly customersService: CustomersService,
  ) {}

  // Admin endpoints (must be declared before ":id" route to avoid route collisions)
  @Get('all')
  @UseGuards(JwtAuthGuard)
  async findAllAdmin() {
    return this.supportService.findAll();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    const email = req?.user?.email;
    const customer = email ? await this.customersService.findByEmail(email) : null;
    if (customer?.id != null) {
      return this.supportService.findByCustomerId(String(customer.id));
    }
    return email ? this.supportService.findByCustomerEmail(email) : [];
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Query('rangeDays') rangeDays?: string) {
    const days = rangeDays != null ? Number(rangeDays) : 30;
    return this.supportService.getDashboardStats(days);
  }

  @Get('routing/options')
  @UseGuards(JwtAuthGuard)
  async getRoutingOptions() {
    return {
      groups: SUPPORT_TICKET_GROUPS,
      severities: SUPPORT_TICKET_SEVERITIES,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.supportService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateSupportTicketDto, @Request() req: any) {
    const email = req?.user?.email;
    const customer = email ? await this.customersService.findByEmail(email) : null;
    const payload = {
      ...dto,
      customerId: customer?.id != null ? String(customer.id) : null,
      customerEmail: email,
      status: 'open',
    };
    return this.supportService.create(payload);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.supportService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.supportService.remove(+id);
  }

  @Put(':id/reply')
  @UseGuards(JwtAuthGuard)
  async addReply(@Param('id') id: string, @Body() dto: AddSupportTicketReplyDto) {
    return this.supportService.addReply(+id, dto.response, dto.status);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateSupportTicketStatusDto) {
    return this.supportService.updateStatus(+id, dto.status);
  }

  @Put(':id/priority')
  @UseGuards(JwtAuthGuard)
  async updatePriority(@Param('id') id: string, @Body() dto: UpdateSupportTicketPriorityDto) {
    return this.supportService.updatePriority(+id, dto.priority);
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard)
  async assignTicket(@Param('id') id: string, @Body() dto: AssignSupportTicketDto) {
    return this.supportService.assignTicket(+id, dto.assignedTo ?? null);
  }

  @Put(':id/routing')
  @UseGuards(JwtAuthGuard)
  async updateRouting(@Param('id') id: string, @Body() dto: UpdateSupportTicketRoutingDto) {
    return this.supportService.updateRouting(+id, dto);
  }
}
