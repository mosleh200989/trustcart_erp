import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

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
}
