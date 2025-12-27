import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // Deal-specific routes (must come before :id route)
  @Get('deals/pipeline-stats')
  async getPipelineStats() {
    return this.crmService.getPipelineStats();
  }

  @Get('deals')
  async getDeals(@Query('ownerId') ownerId?: string, @Query('priority') priority?: string) {
    return this.crmService.getDeals(ownerId, priority);
  }

  @Get('deal-stages')
  async getDealStages() {
    return this.crmService.getDealStages();
  }

  @Post('deals')
  async createDeal(@Body() dto: any) {
    return this.crmService.createDeal(dto);
  }

  @Put('deals/:id')
  async updateDeal(@Param('id') id: string, @Body() dto: any) {
    return this.crmService.updateDeal(id, dto);
  }

  // Email routes
  @Get('emails')
  async getEmails() {
    return this.crmService.getEmails();
  }

  @Get('emails/stats')
  async getEmailStats() {
    return this.crmService.getEmailStats();
  }

  @Post('emails')
  async sendEmail(@Body() dto: any) {
    return this.crmService.sendEmail(dto);
  }

  // Meeting routes
  @Get('meetings')
  async getMeetings() {
    return this.crmService.getMeetings();
  }

  @Post('meetings')
  async createMeeting(@Body() dto: any) {
    return this.crmService.createMeeting(dto);
  }

  // Task routes
  @Get('tasks')
  async getTasks() {
    return this.crmService.getTasks();
  }

  @Get('tasks/stats')
  async getTaskStats() {
    return this.crmService.getTaskStats();
  }

  @Post('tasks')
  async createTask(@Body() dto: any) {
    return this.crmService.createTask(dto);
  }

  // Quote routes
  @Get('quotes')
  async getQuotes() {
    return this.crmService.getQuotes();
  }

  @Post('quotes')
  async createQuote(@Body() dto: any) {
    return this.crmService.createQuote(dto);
  }

  // Analytics routes
  @Get('analytics/overview')
  async getAnalyticsOverview() {
    return this.crmService.getAnalyticsOverview();
  }

  // Generic CRUD routes (must come last)
  @Get()
  async findAll() {
    return this.crmService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.crmService.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.crmService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.crmService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.crmService.remove(id);
  }
}
