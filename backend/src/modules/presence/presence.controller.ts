import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresenceService } from './presence.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAnyPermission, RequirePermissions } from '../../common/decorators/permissions.decorator';

function getClientIp(req: ExpressRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const headerIp = String(
    req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      (firstForwarded ? String(firstForwarded).split(',')[0] : '') ||
      req.ip ||
      req.socket?.remoteAddress ||
      '',
  ).trim();
  return headerIp;
}

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
    const requestedState = body.state ?? body.status;
    if (requestedState === 'online') {
      await this.presenceService.assertCheckInIpAllowed(getClientIp(req));
    }
    return this.presenceService.setMyStatus(Number((req as any).user?.id), requestedState, 'manual');
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
  @RequireAnyPermission('view-presence', 'view-presence-history', 'manage-presence-history')
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

  @Get('calendar')
  @RequireAnyPermission('view-presence', 'view-presence-calendar', 'manage-presence-calendar')
  async calendar(@Query('sheetName') sheetName?: string) {
    return this.presenceService.getCalendar({ sheetName });
  }

  @Post('calendar/order')
  @RequireAnyPermission('manage-presence-calendar', 'manage-presence-settings')
  async updateCalendarOrder(@Body() body: { userIds?: number[] }) {
    return this.presenceService.updateCalendarOrder(body?.userIds || []);
  }

  @Post('calendar/override')
  @RequireAnyPermission('manage-presence-calendar', 'manage-presence-settings')
  async updateCalendarOverride(@Req() req: ExpressRequest, @Body() body: { userId?: number; dateKey?: string; attendanceKey?: string; note?: string | null }) {
    return this.presenceService.updateCalendarOverride(body, Number((req as any).user?.id));
  }

  @Get('office-times')
  @RequireAnyPermission('view-presence-office-time', 'manage-presence-office-time', 'manage-presence-settings')
  async officeTimes() {
    return this.presenceService.getOfficeTimes();
  }

  @Post('office-times/:userId')
  @RequireAnyPermission('manage-presence-office-time', 'manage-presence-settings')
  async updateOfficeTime(@Req() req: ExpressRequest, @Body() body: any) {
    const userId = (req as any).params?.userId;
    return this.presenceService.updateOfficeTime(userId, body);
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
    throw new BadRequestException('Google Sheet sync is disabled for the Check In/Out module.');
  }
}
