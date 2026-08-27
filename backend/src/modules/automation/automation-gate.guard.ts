import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AutomationGateService } from './automation-gate.service';

/** Header carrying the short-lived automation panel token. */
export const AUTOMATION_TOKEN_HEADER = 'x-automation-token';

/**
 * Requires a valid automation panel unlock on top of the normal JWT login.
 *
 * Order matters on the controller: `@UseGuards(JwtAuthGuard, PermissionsGuard,
 * AutomationGateGuard)` — the user must be authenticated and permitted first, so
 * `request.user` is populated by the time this runs.
 *
 * A 403 with code `AUTOMATION_LOCKED` tells the frontend to show the password
 * screen again rather than bouncing the user out to the login page.
 */
@Injectable()
export class AutomationGateGuard implements CanActivate {
  constructor(private readonly gateService: AutomationGateService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const header = request.headers[AUTOMATION_TOKEN_HEADER];
    const token = Array.isArray(header) ? header[0] : header;

    if (!token || !this.gateService.verifyToken(String(token), user.id)) {
      throw new ForbiddenException({
        code: 'AUTOMATION_LOCKED',
        message: 'Automation panel is locked. Enter the panel password to continue.',
      });
    }

    return true;
  }
}
