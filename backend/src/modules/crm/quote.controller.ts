import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/quotes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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

  // Phase 1: PDF Generation
  @Post(':id/generate-pdf')
  async generatePDF(@Param('id') id: number) {
    return await this.quoteService.generatePDF(id);
  }

  // Phase 1: Versioning
  @Post(':id/new-version')
  async createNewVersion(@Param('id') id: number, @Body() changes: any, @Request() req: any) {
    changes.createdBy = req.user.id;
    return await this.quoteService.createNewVersion(id, changes);
  }

  @Get(':id/versions')
  async getQuoteVersions(@Param('id') id: number) {
    return await this.quoteService.getQuoteVersions(id);
  }

  // Phase 1: Approval Workflow
  @Put(':id/request-approval')
  async requestApproval(@Param('id') id: number) {
    return await this.quoteService.requestApproval(id);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: number, @Request() req: any) {
    return await this.quoteService.approveQuote(id, req.user.id);
  }

  @Put(':id/reject-approval')
  async rejectApproval(@Param('id') id: number, @Request() req: any) {
    return await this.quoteService.rejectQuote(id, req.user.id);
  }

  @Get('pending/approvals')
  async getPendingApprovals() {
    return await this.quoteService.getPendingApprovals();
  }
}
