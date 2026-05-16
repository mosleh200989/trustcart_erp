import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresenceService } from './presence.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('presence')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get('me')
  async getMe(@Req() req: ExpressRequest) {
    return this.presenceService.getMyStatus(Number((req as any).user?.id));
  }

  @Post('me')
  async setMe(@Req() req: ExpressRequest, @Body() body: { state?: string; status?: string }) {
    return this.presenceService.setMyStatus(Number((req as any).user?.id), body.state ?? body.status, 'manual');
  }

  @Post('heartbeat')
  async heartbeat(@Req() req: ExpressRequest) {
    return this.presenceService.heartbeat(Number((req as any).user?.id));
  }

  @Get('me/history')
  async myHistory(
    @Req() req: ExpressRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rangeDays') rangeDays?: string,
  ) {
    const userId = Number((req as any).user?.id);
    return this.presenceService.getEvents({
      from,
      to,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      userId,
    });
  }

  @Get('me/summary')
  async mySummary(
    @Req() req: ExpressRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rangeDays') rangeDays?: string,
  ) {
    const userId = Number((req as any).user?.id);
    return this.presenceService.getDashboard({
      from,
      to,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      userId,
    });
  }

  @Get('dashboard')
  @RequirePermissions('view-presence')
  async dashboard(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rangeDays') rangeDays?: string,
    @Query('userId') userId?: string,
  ) {
    return this.presenceService.getDashboard({
      from,
      to,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      userId: userId != null ? Number(userId) : undefined,
    });
  }

  @Get('history')
  @RequirePermissions('view-presence')
  async history(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rangeDays') rangeDays?: string,
    @Query('userId') userId?: string,
  ) {
    return this.presenceService.getEvents({
      from,
      to,
      rangeDays: rangeDays != null ? Number(rangeDays) : undefined,
      userId: userId != null ? Number(userId) : undefined,
    });
  }

  @Get('settings')
  @RequirePermissions('manage-presence-settings')
  async getSettings() {
    return this.presenceService.getSettings();
  }

  @Post('settings')
  @RequirePermissions('manage-presence-settings')
  async updateSettings(@Body() body: any) {
    return this.presenceService.updateSettings(body);
  }

  @Post('sync/google-sheet')
  @RequirePermissions('sync-presence-sheet')
  async syncGoogleSheet() {
    return this.presenceService.syncGoogleSheet();
  }
}
