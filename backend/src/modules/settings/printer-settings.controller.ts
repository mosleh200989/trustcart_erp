import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PrinterSettingsService } from './printer-settings.service';
import { PrinterSettings } from './printer-settings.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('printer-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrinterSettingsController {
  constructor(private readonly printerSettingsService: PrinterSettingsService) {}

  @Get()
  @RequirePermissions('manage-system-settings')
  async findAll(): Promise<PrinterSettings[]> {
    return this.printerSettingsService.findAll();
  }

  @Get('default')
  @RequirePermissions('manage-system-settings')
  async getDefault(): Promise<PrinterSettings | null> {
    return this.printerSettingsService.getDefault();
  }

  @Get(':id')
  @RequirePermissions('manage-system-settings')
  async findOne(@Param('id') id: number): Promise<PrinterSettings> {
    return this.printerSettingsService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-system-settings')
  async create(@Body() data: Partial<PrinterSettings>): Promise<PrinterSettings> {
    return this.printerSettingsService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage-system-settings')
  async update(@Param('id') id: number, @Body() data: Partial<PrinterSettings>): Promise<PrinterSettings> {
    return this.printerSettingsService.update(id, data);
  }

  @Put(':id/set-default')
  @RequirePermissions('manage-system-settings')
  async setDefault(@Param('id') id: number): Promise<PrinterSettings> {
    return this.printerSettingsService.setDefault(id);
  }

  @Delete(':id')
  @RequirePermissions('manage-system-settings')
  async remove(@Param('id') id: number): Promise<{ success: boolean }> {
    await this.printerSettingsService.remove(id);
    return { success: true };
  }
}
