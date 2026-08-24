import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LpTemplate } from './lp-template.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('lp-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LpTemplatesController {
  constructor(
    @InjectRepository(LpTemplate)
    private readonly templateRepo: Repository<LpTemplate>,
  ) {}

  @Get()
  @RequirePermissions('view-landing-pages')
  findAll(): Promise<LpTemplate[]> {
    return this.templateRepo.find({ order: { created_at: 'DESC' } });
  }

  @Get(':id')
  @RequirePermissions('view-landing-pages')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<LpTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  @Post()
  @RequirePermissions('manage-landing-pages')
  async create(@Body() data: Partial<LpTemplate>): Promise<LpTemplate> {
    if (!data.name?.trim()) throw new BadRequestException('Template name is required');
    if (!Array.isArray(data.blocks)) throw new BadRequestException('blocks must be an array');
    const template = this.templateRepo.create({
      name: data.name.trim(),
      description: data.description || null as any,
      thumbnail_url: data.thumbnail_url || null as any,
      blocks: data.blocks,
    });
    return this.templateRepo.save(template);
  }

  @Put(':id')
  @RequirePermissions('manage-landing-pages')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<LpTemplate>,
  ): Promise<LpTemplate> {
    const template = await this.findOne(id);
    const { id: _id, ...rest } = data as any;
    Object.assign(template, rest);
    return this.templateRepo.save(template);
  }

  @Delete(':id')
  @RequirePermissions('manage-landing-pages')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepo.remove(template);
  }
}
