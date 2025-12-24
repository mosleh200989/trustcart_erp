import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CombosService } from './combos.service';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  @Get()
  async findAll() {
    return this.combosService.findAll();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.combosService.findBySlug(slug);
  }

  @Post()
  async create(@Body() createComboDto: any) {
    return this.combosService.create(createComboDto);
  }

  @Put(':id')
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
  async remove(@Param('id') id: string) {
    return this.combosService.remove(id);
  }
}
