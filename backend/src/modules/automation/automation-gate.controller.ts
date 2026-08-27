import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AutomationGateService } from './automation-gate.service';
import { AutomationAuditService } from './automation-audit.service';
import { SetGatePasswordDto, UnlockAutomationDto } from './dto/automation.dto';

/**
 * The password screen in front of the Automation panel.
 *
 * These routes deliberately do NOT carry AutomationGateGuard — they are how a
 * user gets past it. They still require a normal login plus `view-automation`,
 * so the second password is an additional factor, never the only one.
 */
@Controller('automation/gate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutomationGateController {
  constructor(
    private readonly gateService: AutomationGateService,
    private readonly audit: AutomationAuditService,
  ) {}

  private actor(request: Request) {
    const user = (request as any).user || {};
    return { id: user.id ?? null, email: user.email ?? null, ip: request.ip };
  }

  /** Tells the frontend whether to show "set a password" or "enter password". */
  @Get('status')
  @RequirePermissions('view-automation')
  status() {
    return this.gateService.status();
  }

  @Post('unlock')
  @RequirePermissions('view-automation')
  async unlock(@Body() dto: UnlockAutomationDto, @Req() request: Request) {
    const actor = this.actor(request);
    try {
      const result = await this.gateService.unlock(actor.id, dto.password);
      await this.audit.record(actor, 'gate.unlock', 'gate', null, null, {
        expires_at: result.expiresAt,
      });
      return result;
    } catch (error: any) {
      await this.audit.record(actor, 'gate.unlock_failed', 'gate', null, null, {
        message: error?.message,
      });
      throw error;
    }
  }

  /** Sets the panel password, or changes it when the current one is supplied. */
  @Post('password')
  @RequirePermissions('manage-automation-security')
  async setPassword(@Body() dto: SetGatePasswordDto, @Req() request: Request) {
    const actor = this.actor(request);
    const result = await this.gateService.setPassword(
      actor.id,
      dto.new_password,
      dto.current_password,
    );
    await this.audit.record(actor, 'gate.password_set', 'gate');
    return result;
  }

  /**
   * Recovery path when the password is forgotten: clears it and sends the panel
   * back to first-time setup. Loudly audited, because it removes a control.
   */
  @Delete('password')
  @RequirePermissions('manage-automation-security')
  async resetPassword(@Req() request: Request) {
    const actor = this.actor(request);
    const result = await this.gateService.resetPassword(actor.id);
    await this.audit.record(actor, 'gate.password_reset', 'gate');
    return result;
  }
}
