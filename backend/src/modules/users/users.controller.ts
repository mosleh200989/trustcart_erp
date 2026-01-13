import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@Request() req: any) {
    return this.usersService.findOneSafe(Number(req.user.id));
  }

  @Put('me')
  async updateMe(@Request() req: any, @Body() body: any) {
    // Intentionally whitelist fields for self-update
    const payload: any = {
      name: body?.name,
      lastName: body?.lastName,
      phone: body?.phone ?? null,
      avatarUrl: body?.avatarUrl ?? null,
    };

    if (typeof body?.password === 'string') {
      payload.password = body.password;
    }

    await this.usersService.update(Number(req.user.id), payload);
    return this.usersService.findOneSafe(Number(req.user.id));
  }

  @Get()
  @RequirePermissions('view-users')
  async findAll() {
    return this.usersService.findAllSafe();
  }

  @Get(':id')
  @RequirePermissions('view-users')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneSafe(Number(id));
  }

  @Post()
  @RequirePermissions('create-users')
  async create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @RequirePermissions('edit-users')
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(Number(id), updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('delete-users')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(Number(id));
  }
}
