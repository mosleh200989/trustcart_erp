import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PresenceService } from './presence.service';

@Controller('presence')
@UseGuards(JwtAuthGuard)
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

  @Get('dashboard')
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
}
