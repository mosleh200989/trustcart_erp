import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  @RequirePermissions('view-ledgers')
  async findAll() {
    return this.accountingService.findAll();
  }

  @Get(':id')
  @RequirePermissions('view-ledgers')
  async findOne(@Param('id') id: string) {
    return this.accountingService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-ledgers')
  async create(@Body() dto: any) {
    return this.accountingService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('manage-ledgers')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.accountingService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('manage-ledgers')
  async remove(@Param('id') id: string) {
    return this.accountingService.remove(id);
  }
}
