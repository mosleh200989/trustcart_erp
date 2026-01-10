import { Body, Controller, Get, Post } from '@nestjs/common';
import { CourierConfigurationService } from './courier-configuration.service';
import { CreateCourierConfigurationDto } from './dto/create-courier-configuration.dto';

@Controller('settings/couriers')
export class CourierConfigurationController {
  constructor(private readonly service: CourierConfigurationService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post()
  async create(@Body() dto: CreateCourierConfigurationDto) {
    return this.service.create(dto);
  }
}
