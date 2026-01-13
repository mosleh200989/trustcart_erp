import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CourierConfigurationService } from './courier-configuration.service';
import { CreateCourierConfigurationDto } from './dto/create-courier-configuration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('settings/couriers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CourierConfigurationController {
  constructor(private readonly service: CourierConfigurationService) {}

  @Get()
  @RequirePermissions('view-system-settings')
  async list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions('manage-system-settings')
  async create(@Body() dto: CreateCourierConfigurationDto) {
    return this.service.create(dto);
  }
}
