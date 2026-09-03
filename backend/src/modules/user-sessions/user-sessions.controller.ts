import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { UserSessionsService } from './user-sessions.service';
import { LoginAttemptsService } from './login-attempts.service';

/**
 * Admin view of every login: which accounts are signed in, on what devices,
 * and the ability to sign any of them out immediately.
 *
 * Reading is gated on view-user-sessions and signing out on
 * revoke-user-sessions; both are granted from the Role Permissions page.
 * super-admin and admin pass every permission check by design
 * (see PermissionsGuard), so they always have this.
 */
@Controller('user-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserSessionsController {
  constructor(
    private readonly service: UserSessionsService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  @Get()
  @RequirePermissions('view-user-sessions')
  list(
    @Query('status') status?: string,
    @Query('subjectType') subjectType?: string,
    @Query('userId') userId?: string,
    @Query('roleId') roleId?: string,
    @Query('deviceType') deviceType?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      status,
      subjectType,
      userId: userId ? Number(userId) : undefined,
      roleId: roleId ? Number(roleId) : undefined,
      deviceType,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('statistics')
  @RequirePermissions('view-user-sessions')
  statistics(@Query('windowMinutes') windowMinutes?: string) {
    return this.service.statistics({
      windowMinutes: windowMinutes ? Number(windowMinutes) : undefined,
    });
  }

  @Get('users/:userId')
  @RequirePermissions('view-user-sessions')
  forUser(@Param('userId', ParseIntPipe) userId: number, @Query('status') status?: string) {
    return this.service.listForSubject('user', userId, status || 'active');
  }

  /** Failed and successful sign-in attempts. Defaults to failures only. */
  @Get('login-attempts')
  @RequirePermissions('view-user-sessions')
  loginAttemptList(
    @Query('result') result?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.loginAttempts.list({
      result,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Counters, currently locked identifiers and the worst offending addresses. */
  @Get('login-attempts/statistics')
  @RequirePermissions('view-user-sessions')
  loginAttemptStatistics() {
    return this.loginAttempts.statistics();
  }

  /** Let someone back in before their lockout expires. */
  @Post('login-attempts/unlock')
  @RequirePermissions('revoke-user-sessions')
  unlockIdentifier(@Body() body: { identifier: string }, @Req() req: any) {
    return this.loginAttempts.unlock(body?.identifier, Number(req.user?.id) || null);
  }

  @Post(':id/revoke')
  @RequirePermissions('revoke-user-sessions')
  revoke(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.revokeById(id, Number(req.user?.id) || null, 'admin');
  }

  @Post('users/:userId/revoke-all')
  @RequirePermissions('revoke-user-sessions')
  revokeAllForUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
    @Body() body?: { subjectType?: 'user' | 'customer' },
  ) {
    const subjectType = body?.subjectType === 'customer' ? 'customer' : 'user';
    return this.service.revokeAllForSubject(subjectType, userId, Number(req.user?.id) || null, 'admin-all');
  }
}
