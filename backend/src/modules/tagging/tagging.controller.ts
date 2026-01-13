import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TaggingService } from './tagging.service';
import { AssignCustomersDto } from './dto/assign-customers.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';
import { ListTagsQueryDto } from './dto/list-tags.query.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('customer-segmentation')
export class TaggingController {
  constructor(private readonly service: TaggingService) {}

  @Get()
  async list(@Query() query: ListTagsQueryDto) {
    return this.service.listTags(query);
  }

  @Post()
  async create(@Body() dto: CreateCustomerTagDto) {
    return this.service.createTag(dto);
  }

  @Get('customers')
  async listCustomers(@Query() query: ListCustomersQueryDto) {
    return this.service.listCustomers(query);
  }

  @Post('bulk-delete')
  async bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.service.bulkDelete(dto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.getTag(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerTagDto) {
    return this.service.updateTag(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.deleteTag(id);
  }

  @Post(':id/customers')
  async assignCustomers(@Param('id') id: string, @Body() dto: AssignCustomersDto) {
    return this.service.assignCustomers(id, dto);
  }

  @Post(':id/customers/remove')
  async removeCustomers(@Param('id') id: string, @Body() dto: AssignCustomersDto) {
    return this.service.removeCustomers(id, dto);
  }
}
