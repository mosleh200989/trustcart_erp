import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard that validates the Bearer token on incoming Steadfast webhook requests.
 *
 * Steadfast sends:
 *   Authorization: Bearer {your_api_key}
 *
 * The expected token is stored in the environment variable `STEADFAST_WEBHOOK_SECRET`.
 * If the env variable is NOT set, the guard allows all requests (open mode)
 * and logs a warning so you know authentication is disabled.
 */
@Injectable()
export class SteadfastWebhookGuard implements CanActivate {
  private readonly logger = new Logger(SteadfastWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken = this.configService.get<string>('STEADFAST_WEBHOOK_SECRET');

    // If no secret configured, allow all requests but warn
    if (!expectedToken) {
      this.logger.warn(
        'STEADFAST_WEBHOOK_SECRET is not set — webhook endpoint is OPEN (no auth). ' +
          'Set this env variable to the token you configured in the Steadfast dashboard.',
      );
      return true;
    }

    const authHeader = request.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) {
      this.logger.warn('Steadfast webhook request received without Authorization header');
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.timingSafeEqual(token, expectedToken)) {
      this.logger.warn('Steadfast webhook request received with INVALID Bearer token');
      throw new UnauthorizedException('Invalid webhook token');
    }

    return true;
  }

  /**
   * Constant-time string comparison to mitigate timing-based attacks.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
