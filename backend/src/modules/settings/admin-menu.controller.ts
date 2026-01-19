import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AdminMenuService } from './admin-menu.service';
import { CreateAdminMenuItemDto } from './dto/create-admin-menu-item.dto';
import { UpdateAdminMenuItemDto } from './dto/update-admin-menu-item.dto';

@Controller('settings/admin-menu')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminMenuController {
  constructor(private readonly service: AdminMenuService) {}

  @Get()
  @RequirePermissions('view-system-settings')
  async listTree(@Query('includeInactive') includeInactive?: string) {
    return this.service.listTree(String(includeInactive) === 'true');
  }

  @Get('flat')
  @RequirePermissions('view-system-settings')
  async listFlat(@Query('includeInactive') includeInactive?: string) {
    return this.service.listFlat(String(includeInactive) === 'true');
  }

  @Post()
  @RequirePermissions('manage-system-settings')
  async create(@Body() dto: CreateAdminMenuItemDto) {
    return this.service.create(dto);
  }

  @Post('disable')
  @RequirePermissions('manage-system-settings')
  async disableDbMenu() {
    return this.service.disableDbMenu();
  }

  @Post('seed-default')
  @RequirePermissions('manage-system-settings')
  async seedDefault(@Query('mode') mode?: string) {
    const normalized = String(mode || 'replace').toLowerCase();
    const m = normalized === 'merge' ? 'merge' : 'replace';
    return this.service.seedDefaultMenu(m);
  }

  @Put(':id')
  @RequirePermissions('manage-system-settings')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminMenuItemDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @RequirePermissions('manage-system-settings')
  async remove(@Param('id') id: string) {
    await this.service.remove(Number(id));
    return { message: 'Menu item deleted' };
  }
}
