import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm/quotes')
@UseGuards(JwtAuthGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    data.createdBy = req.user.id;
    return await this.quoteService.create(data);
  }

  @Get()
  async findAll(@Query() query: any) {
    const filters: any = {};
    
    if (query.customerId) filters.customerId = query.customerId;
    if (query.dealId) filters.dealId = query.dealId;
    if (query.status) filters.status = query.status;

    return await this.quoteService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.quoteService.findOne(id);
  }

  @Get('number/:quoteNumber')
  async findByNumber(@Param('quoteNumber') quoteNumber: string) {
    return await this.quoteService.findByNumber(quoteNumber);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return await this.quoteService.update(id, data);
  }

  @Put(':id/send')
  async send(@Param('id') id: number) {
    return await this.quoteService.markAsSent(id);
  }

  @Put(':id/accept')
  async accept(@Param('id') id: number) {
    return await this.quoteService.markAsAccepted(id);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: number) {
    return await this.quoteService.markAsRejected(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.quoteService.delete(id);
    return { message: 'Quote deleted successfully' };
  }
}
