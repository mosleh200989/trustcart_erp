import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { Banner } from './banner.entity';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async findAll(@Query('active') active?: string): Promise<Banner[]> {
    if (active === 'true') {
      return this.bannersService.findActive();
    }
    return this.bannersService.findAll();
  }

  @Get('type/:type')
  async findByType(@Param('type') type: string): Promise<Banner[]> {
    return this.bannersService.findByType(type);
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Banner | null> {
    return this.bannersService.findOne(id);
  }

  @Post()
  async create(@Body() bannerData: Partial<Banner>): Promise<Banner> {
    return this.bannersService.create(bannerData);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() bannerData: Partial<Banner>,
  ): Promise<Banner | null> {
    return this.bannersService.update(id, bannerData);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.bannersService.remove(id);
  }

  @Put(':id/toggle')
  async toggleActive(@Param('id') id: number): Promise<Banner | null> {
    return this.bannersService.toggleActive(id);
  }

  @Put('reorder/bulk')
  async updateDisplayOrder(
    @Body() updates: Array<{ id: number; display_order: number }>,
  ): Promise<{ success: boolean }> {
    await this.bannersService.updateDisplayOrder(updates);
    return { success: true };
  }
}
