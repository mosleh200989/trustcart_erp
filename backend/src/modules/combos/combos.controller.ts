import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CombosService } from './combos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('combos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  @Public()
  async findAll() {
    return this.combosService.findAll();
  }

  @Get(':slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    return this.combosService.findBySlug(slug);
  }

  @Post()
  @RequirePermissions('create-products')
  async create(@Body() createComboDto: any) {
    return this.combosService.create(createComboDto);
  }

  @Put(':id')
  @RequirePermissions('edit-products')
  async update(@Param('id') id: string, @Body() updateComboDto: any) {
    try {
      console.log('PUT /combos/:id called with:', id, updateComboDto);
      return await this.combosService.update(id, updateComboDto);
    } catch (error) {
      console.error('Error in combo update controller:', error);
      throw error;
    }
  }

  @Delete(':id')
  @RequirePermissions('delete-products')
  async remove(@Param('id') id: string) {
    return this.combosService.remove(id);
  }
}
