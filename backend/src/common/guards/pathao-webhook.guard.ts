import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Guard that validates incoming Pathao webhook requests.
 *
 * Supports three authentication methods (checked in order):
 *
 * 1. **HMAC-SHA256 Signature** — `X-PATHAO-Signature` header containing
 *    HMAC-SHA256(body, PATHAO_WEBHOOK_SECRET) in hex.
 *
 * 2. **Bearer Token** — `Authorization: Bearer <PATHAO_WEBHOOK_SECRET>` header.
 *
 * 3. **Query Param** — `?secret=<PATHAO_WEBHOOK_SECRET>` on the URL
 *    (useful when the sender doesn't support custom headers).
 *
 * If PATHAO_WEBHOOK_SECRET is NOT configured, the guard allows all requests
 * and logs a warning on every call (open mode for dev/testing).
 */
@Injectable()
export class PathaoWebhookGuard implements CanActivate {
  private readonly logger = new Logger(PathaoWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = this.configService.get<string>('PATHAO_WEBHOOK_SECRET');

    if (!secret) {
      this.logger.warn(
        'PATHAO_WEBHOOK_SECRET is not set — webhook endpoint is OPEN. ' +
          'Set this env variable to secure the endpoint.',
      );
      return true;
    }

    // Method 1: HMAC signature header
    const signature = request.headers['x-pathao-signature'] as string | undefined;
    if (signature) {
      const rawBody =
        typeof (request as any).rawBody === 'string'
          ? (request as any).rawBody
          : JSON.stringify(request.body);
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return true;
      }
      this.logger.warn(`[Pathao Webhook] HMAC signature mismatch from ${request.ip}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Method 2: Bearer token in Authorization header
    const authHeader = (request.headers['authorization'] || '') as string;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      if (token && token === secret) {
        return true;
      }
      this.logger.warn(`[Pathao Webhook] Invalid Bearer token from ${request.ip}`);
      throw new UnauthorizedException('Invalid webhook token');
    }

    // Method 3: Query param ?secret=...
    const querySecret = request.query?.secret as string | undefined;
    if (querySecret && querySecret === secret) {
      return true;
    }

    this.logger.warn(`[Pathao Webhook] No valid auth from ${request.ip}`);
    throw new UnauthorizedException('Missing webhook authentication');
  }
}
