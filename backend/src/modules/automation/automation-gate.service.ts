import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AutomationSettingsService } from './automation-settings.service';

/** Scope claim that marks a token as an automation-panel unlock, not a login. */
export const AUTOMATION_TOKEN_SCOPE = 'automation-panel';

export type AutomationGateStatus = {
  configured: boolean;
  locked: boolean;
  locked_until: string | null;
  attempts_remaining: number;
  session_minutes: number;
};

function jwtSecret(): string {
  return process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024';
}

/**
 * The second password in front of the Automation panel.
 *
 * This is a re-authentication gate, not a second identity: the caller must
 * already be a logged-in staff user holding `view-automation`. It exists so that
 * an unattended admin session cannot be used to change what the brand's Facebook
 * pages say to customers.
 *
 * The unlock issues a short-lived token bound to the user id, carried in the
 * `x-automation-token` header and checked by AutomationGateGuard. It is
 * deliberately separate from the login token so it expires on its own schedule
 * and can be revoked by changing the panel password.
 */
@Injectable()
export class AutomationGateService {
  private readonly logger = new Logger(AutomationGateService.name);

  constructor(private readonly settings: AutomationSettingsService) {}

  async status(): Promise<AutomationGateStatus> {
    const gate = await this.settings.getGate();
    const lockedUntil = gate.locked_until ? new Date(gate.locked_until) : null;
    const locked = Boolean(lockedUntil && lockedUntil.getTime() > Date.now());

    return {
      configured: Boolean(gate.password_hash),
      locked,
      locked_until: locked ? lockedUntil!.toISOString() : null,
      attempts_remaining: Math.max(
        0,
        Number(gate.max_attempts || 5) - Number(gate.failed_attempts || 0),
      ),
      session_minutes: Number(gate.session_minutes || 30),
    };
  }

  /**
   * Sets or changes the panel password.
   *
   * When a password already exists the current one must be supplied — the
   * caller's `manage-automation-security` permission is checked by the controller,
   * but knowing the existing password is what stops a hijacked session from
   * silently taking the panel over.
   */
  async setPassword(
    userId: number | string | null,
    newPassword: string,
    currentPassword?: string,
  ): Promise<{ ok: true }> {
    const password = String(newPassword ?? '');
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const gate = await this.settings.getGate();

    if (gate.password_hash) {
      const current = String(currentPassword ?? '');
      if (!current) {
        throw new BadRequestException('Current password is required to change it');
      }
      const matches = await bcrypt.compare(current, gate.password_hash);
      if (!matches) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const hash = await bcrypt.hash(password, 10);
    await this.settings.update(
      'gate',
      { password_hash: hash, failed_attempts: 0, locked_until: null },
      userId == null ? null : Number(userId) || null,
    );

    return { ok: true };
  }

  /**
   * Clears the panel password entirely, sending the panel back to first-time
   * setup. Reserved for `manage-automation-security` holders and always audited
   * by the caller — it is the recovery path when the password is forgotten.
   */
  async resetPassword(userId: number | string | null): Promise<{ ok: true }> {
    await this.settings.update(
      'gate',
      { password_hash: null, failed_attempts: 0, locked_until: null },
      userId == null ? null : Number(userId) || null,
    );
    this.logger.warn(`Automation panel password was reset by user ${userId ?? 'unknown'}`);
    return { ok: true };
  }

  /**
   * Verifies the password and issues a short-lived panel token.
   * The id is kept as a string end to end so the check never depends on the
   * identity column being numeric.
   */
  async unlock(
    userId: number | string,
    password: string,
  ): Promise<{ token: string; expiresAt: string; sessionMinutes: number }> {
    const gate = await this.settings.getGate();

    if (!gate.password_hash) {
      throw new BadRequestException(
        'The automation panel password has not been set yet. Set it before unlocking.',
      );
    }

    const lockedUntil = gate.locked_until ? new Date(gate.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Too many failed attempts. Try again in ${minutes} minute(s).`,
      );
    }

    const matches = await bcrypt.compare(String(password ?? ''), gate.password_hash);

    if (!matches) {
      const failed = Number(gate.failed_attempts || 0) + 1;
      const maxAttempts = Number(gate.max_attempts || 5);
      const patch: Record<string, any> = { failed_attempts: failed };

      if (failed >= maxAttempts) {
        const lockoutMinutes = Number(gate.lockout_minutes || 15);
        patch.locked_until = new Date(Date.now() + lockoutMinutes * 60000).toISOString();
        patch.failed_attempts = 0;
        this.logger.warn(
          `Automation panel locked for ${lockoutMinutes} minutes after ${maxAttempts} failed attempts (user ${userId}).`,
        );
      }

      await this.settings.update('gate', patch, Number(userId) || null);
      throw new UnauthorizedException('Incorrect automation panel password');
    }

    // A successful unlock clears the counter.
    if (Number(gate.failed_attempts || 0) > 0 || gate.locked_until) {
      await this.settings.update(
        'gate',
        { failed_attempts: 0, locked_until: null },
        Number(userId) || null,
      );
    }

    const sessionMinutes = Number(gate.session_minutes || 30);
    const token = jwt.sign(
      { sub: String(userId), scope: AUTOMATION_TOKEN_SCOPE },
      jwtSecret(),
      { expiresIn: `${sessionMinutes}m` },
    );

    return {
      token,
      expiresAt: new Date(Date.now() + sessionMinutes * 60000).toISOString(),
      sessionMinutes,
    };
  }

  /**
   * Validates a panel token against the user making the request.
   * Returns true only when the token is valid, unexpired, correctly scoped, and
   * issued to this same user — a token cannot be lifted into another session.
   */
  verifyToken(token: string, userId: number | string): boolean {
    if (!token) return false;
    try {
      const decoded = jwt.verify(token, jwtSecret()) as Record<string, any>;
      if (decoded?.scope !== AUTOMATION_TOKEN_SCOPE) return false;
      return String(decoded?.sub ?? '') === String(userId);
    } catch {
      return false;
    }
  }
}
