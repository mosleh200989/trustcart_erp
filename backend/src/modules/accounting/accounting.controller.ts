import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Query, Put, Delete, Request } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAnyPermission, RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('journals')
  @RequirePermissions('view-ledgers')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entry_type') entry_type?: string,
    @Query('reference_type') reference_type?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.accountingService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      entry_type,
      reference_type,
      startDate,
      endDate,
    });
  }

  @Get('journals/summary')
  @RequirePermissions('view-ledgers')
  async getSummary() {
    return this.accountingService.getSummary();
  }

  @Get('journals/:id')
  @RequirePermissions('view-ledgers')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.accountingService.findOne(id);
  }

  @Post('journals')
  @RequirePermissions('manage-ledgers')
  async createJournal(@Body() dto: any) {
    return this.accountingService.createJournal(dto);
  }

  @Get('dollar-consumptions')
  @RequireAnyPermission('view-dollar-consumption', 'manage-dollar-consumption')
  async findDollarConsumptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.accountingService.findDollarConsumptions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      startDate,
      endDate,
      search,
    });
  }

  @Get('dollar-consumptions/summary')
  @RequireAnyPermission('view-dollar-consumption', 'manage-dollar-consumption')
  async getDollarConsumptionSummary() {
    return this.accountingService.getDollarConsumptionSummary();
  }

  @Get('dollar-consumptions/:id')
  @RequireAnyPermission('view-dollar-consumption', 'manage-dollar-consumption')
  async findDollarConsumption(@Param('id', ParseIntPipe) id: number) {
    return this.accountingService.findDollarConsumption(id);
  }

  @Post('dollar-consumptions')
  @RequireAnyPermission('create-dollar-consumption', 'manage-dollar-consumption')
  async createDollarConsumption(@Body() dto: any, @Request() req: any) {
    return this.accountingService.createDollarConsumption(dto, Number(req?.user?.id) || undefined);
  }

  @Put('dollar-consumptions/:id')
  @RequireAnyPermission('edit-dollar-consumption', 'manage-dollar-consumption')
  async updateDollarConsumption(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Request() req: any) {
    return this.accountingService.updateDollarConsumption(id, dto, Number(req?.user?.id) || undefined);
  }

  @Delete('dollar-consumptions/:id')
  @RequireAnyPermission('delete-dollar-consumption', 'manage-dollar-consumption')
  async deleteDollarConsumption(@Param('id', ParseIntPipe) id: number) {
    return this.accountingService.deleteDollarConsumption(id);
  }
}
