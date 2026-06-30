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

  private timingSafeStringEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = this.configService.get<string>('PATHAO_WEBHOOK_SECRET');
    const integrationSecret = this.configService.get<string>('PATHAO_WEBHOOK_INTEGRATION_SECRET');

    // Pathao's webhook registration handshake expects the endpoint to echo the
    // integration secret header in the response. Let that verification event through.
    if ((request.body as any)?.event === 'webhook_integration') {
      return true;
    }

    const integrationHeader = (
      request.headers['x-pathao-merchant-webhook-integration-secret'] ||
      request.headers['x-pathao-webhook-integration-secret'] ||
      request.headers['x-pathao-webhook-secret']
    ) as string | undefined;
    if (integrationHeader && integrationSecret) {
      if (this.timingSafeStringEqual(String(integrationHeader), integrationSecret)) {
        return true;
      }
      this.logger.warn(`[Pathao Webhook] Integration secret header did not match from ${request.ip}`);
    }

    if (!secret && !integrationSecret) {
      this.logger.warn(
        'PATHAO_WEBHOOK_SECRET and PATHAO_WEBHOOK_INTEGRATION_SECRET are not set - webhook endpoint is OPEN. ' +
          'Set one of these env variables to secure the endpoint.',
      );
      return true;
    }

    // Method 1: HMAC signature header
    const signature = (
      request.headers['x-pathao-signature'] ||
      request.headers['x-pathao-webhook-signature']
    ) as string | undefined;
    if (signature && secret) {
      const rawBody =
        Buffer.isBuffer((request as any).rawBody)
          ? (request as any).rawBody
          : typeof (request as any).rawBody === 'string'
            ? Buffer.from((request as any).rawBody)
            : Buffer.from(JSON.stringify(request.body));
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const normalizedSignature = signature.startsWith('sha256=')
        ? signature.slice('sha256='.length)
        : signature;
      if (this.timingSafeStringEqual(normalizedSignature, expected)) {
        return true;
      }
      this.logger.warn(`[Pathao Webhook] HMAC signature mismatch from ${request.ip}`);
    }

    // Method 2: Bearer token in Authorization header
    const authHeader = (request.headers['authorization'] || '') as string;
    if (authHeader && secret) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      if (token && token === secret) {
        return true;
      }
      this.logger.warn(`[Pathao Webhook] Invalid Bearer token from ${request.ip}`);
    }

    // Method 3: Query param ?secret=...
    const querySecret = request.query?.secret as string | undefined;
    if (querySecret && secret && querySecret === secret) {
      return true;
    }

    this.logger.warn(`[Pathao Webhook] No valid auth from ${request.ip}`);
    throw new UnauthorizedException('Missing webhook authentication');
  }
}
