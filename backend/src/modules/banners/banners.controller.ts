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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('banners')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // Public homepage banners
  @Get('public')
  @Public()
  async findPublic(): Promise<Banner[]> {
    return this.bannersService.findActive();
  }

  @Get()
  @RequirePermissions('manage-banners')
  async findAll(@Query('active') active?: string): Promise<Banner[]> {
    if (active === 'true') {
      return this.bannersService.findActive();
    }
    return this.bannersService.findAll();
  }

  @Get('type/:type')
  @RequirePermissions('manage-banners')
  async findByType(@Param('type') type: string): Promise<Banner[]> {
    return this.bannersService.findByType(type);
  }

  @Get(':id')
  @RequirePermissions('manage-banners')
  async findOne(@Param('id') id: number): Promise<Banner | null> {
    return this.bannersService.findOne(id);
  }

  @Post()
  @RequirePermissions('manage-banners')
  async create(@Body() bannerData: Partial<Banner>): Promise<Banner> {
    return this.bannersService.create(bannerData);
  }

  @Put(':id')
  @RequirePermissions('manage-banners')
  async update(
    @Param('id') id: number,
    @Body() bannerData: Partial<Banner>,
  ): Promise<Banner | null> {
    return this.bannersService.update(id, bannerData);
  }

  @Delete(':id')
  @RequirePermissions('manage-banners')
  async remove(@Param('id') id: number): Promise<void> {
    return this.bannersService.remove(id);
  }

  @Put(':id/toggle')
  @RequirePermissions('manage-banners')
  async toggleActive(@Param('id') id: number): Promise<Banner | null> {
    return this.bannersService.toggleActive(id);
  }

  @Put('reorder/bulk')
  @RequirePermissions('manage-banners')
  async updateDisplayOrder(
    @Body() updates: Array<{ id: number; display_order: number }>,
  ): Promise<{ success: boolean }> {
    await this.bannersService.updateDisplayOrder(updates);
    return { success: true };
  }
}
