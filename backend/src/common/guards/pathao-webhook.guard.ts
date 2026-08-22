import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import {
  PATHAO_INTEGRATION_SECRET_HEADER,
  PATHAO_SIGNATURE_HEADER,
  PATHAO_WEBHOOK_INTEGRATION_EVENT,
  resolvePathaoIntegrationSecret,
} from '../constants/pathao-webhook.constants';

/**
 * Guard that validates incoming Pathao webhook requests.
 *
 * Pathao's real contract (see `pathao-webhook.constants.ts`) is that the merchant's
 * webhook secret arrives **verbatim** in the `X-PATHAO-Signature` header. That is the
 * primary check. The remaining methods are defensive fallbacks for proxies/senders
 * that cannot set that header:
 *
 * 1. `X-PATHAO-Signature` == PATHAO_WEBHOOK_SECRET (verbatim)  ← what Pathao sends
 * 2. `X-PATHAO-Signature` == HMAC-SHA256(rawBody, PATHAO_WEBHOOK_SECRET) in hex
 * 3. `X-Pathao-Merchant-Webhook-Integration-Secret` == PATHAO_WEBHOOK_INTEGRATION_SECRET
 * 4. `Authorization: Bearer <PATHAO_WEBHOOK_SECRET>`
 * 5. `?secret=<PATHAO_WEBHOOK_SECRET>` on the URL
 *
 * The `webhook_integration` handshake is always allowed through — Pathao sends it
 * without credentials while registering the URL.
 *
 * If no secret is configured at all the guard runs in open mode and warns on every
 * call. Set `PATHAO_WEBHOOK_ALLOW_UNSIGNED=true` to accept unsigned events while
 * still logging loudly (useful if Pathao ever changes the header again — it keeps
 * status updates flowing instead of silently dropping them).
 */
@Injectable()
export class PathaoWebhookGuard implements CanActivate {
  private readonly logger = new Logger(PathaoWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  private timingSafeStringEqual(a: string, b: string): boolean {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  /**
   * Short, non-reversible fingerprint of a credential, for diagnosing a mismatch
   * without ever writing the value itself to the logs. Comparing the fingerprint of
   * what arrived against the fingerprint of what is configured tells us instantly
   * whether the two sides hold the same secret.
   */
  private fingerprint(value?: string | null): string {
    const v = String(value ?? '').trim();
    if (!v) return 'absent';
    const hash = crypto.createHash('sha256').update(v).digest('hex').slice(0, 12);
    return `len=${v.length},sha=${hash}`;
  }

  private getRawBody(request: Request): Buffer {
    const raw = (request as any).rawBody;
    if (Buffer.isBuffer(raw)) return raw;
    if (typeof raw === 'string') return Buffer.from(raw);
    return Buffer.from(JSON.stringify(request.body ?? {}));
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Always echo the integration secret, even on a rejected request. Pathao inspects
    // this header on every response and de-activates webhooks that stop returning it.
    const integrationSecret = resolvePathaoIntegrationSecret(
      this.configService.get<string>('PATHAO_WEBHOOK_INTEGRATION_SECRET'),
    );
    response.setHeader(PATHAO_INTEGRATION_SECRET_HEADER, integrationSecret);

    // Registration handshake — Pathao sends this with no credentials.
    if ((request.body as any)?.event === PATHAO_WEBHOOK_INTEGRATION_EVENT) {
      return true;
    }

    const secret = String(this.configService.get<string>('PATHAO_WEBHOOK_SECRET') ?? '').trim();

    if (!secret) {
      this.logger.warn(
        'PATHAO_WEBHOOK_SECRET is not set — the Pathao webhook endpoint is OPEN. ' +
          'Set it here and in the Pathao merchant portal to secure the endpoint.',
      );
      return true;
    }

    const signature = (
      request.headers[PATHAO_SIGNATURE_HEADER] ||
      request.headers['x-pathao-webhook-signature']
    ) as string | undefined;

    // Method 1 — the header Pathao actually sends: the secret, verbatim.
    if (signature && this.timingSafeStringEqual(signature.trim(), secret)) {
      return true;
    }

    // Method 2 — HMAC-SHA256 of the raw body, kept as a defensive fallback.
    if (signature) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(this.getRawBody(request))
        .digest('hex');
      const normalized = signature.startsWith('sha256=')
        ? signature.slice('sha256='.length)
        : signature.trim();
      if (this.timingSafeStringEqual(normalized, expected)) {
        return true;
      }
    }

    // Method 3 — integration secret header.
    const integrationHeader = (
      request.headers['x-pathao-merchant-webhook-integration-secret'] ||
      request.headers['x-pathao-webhook-integration-secret'] ||
      request.headers['x-pathao-webhook-secret']
    ) as string | undefined;
    if (
      integrationHeader &&
      (this.timingSafeStringEqual(String(integrationHeader).trim(), integrationSecret) ||
        this.timingSafeStringEqual(String(integrationHeader).trim(), secret))
    ) {
      return true;
    }

    // Method 4 — Bearer token.
    const authHeader = String(request.headers['authorization'] || '');
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      if (token && this.timingSafeStringEqual(token, secret)) {
        return true;
      }
    }

    // Method 5 — ?secret= query param.
    const querySecret = request.query?.secret as string | undefined;
    if (querySecret && this.timingSafeStringEqual(String(querySecret).trim(), secret)) {
      return true;
    }

    // Log the header names that did arrive (never their values) so a future change
    // to Pathao's contract is diagnosable straight from the logs.
    const pathaoHeaderNames = Object.keys(request.headers)
      .filter((name) => name.toLowerCase().includes('pathao') || name.toLowerCase() === 'authorization')
      .join(', ') || 'none';

    const allowUnsigned =
      String(this.configService.get<string>('PATHAO_WEBHOOK_ALLOW_UNSIGNED') ?? '')
        .trim()
        .toLowerCase() === 'true';

    if (allowUnsigned) {
      this.logger.warn(
        `[Pathao Webhook] Unauthenticated event ACCEPTED because PATHAO_WEBHOOK_ALLOW_UNSIGNED=true. ` +
          `ip=${request.ip} pathao-ish headers=[${pathaoHeaderNames}]`,
      );
      return true;
    }

    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    this.logger.warn(
      `[Pathao Webhook] Rejected: no valid credentials. ip=${request.ip} ` +
        `headers=[${pathaoHeaderNames}] event=${(request.body as any)?.event ?? '—'} ` +
        `| signature(${this.fingerprint(signature)}) ` +
        `authorization(${this.fingerprint(bearer)}) ` +
        `integrationHeader(${this.fingerprint(integrationHeader)}) ` +
        `vs configured secret(${this.fingerprint(secret)}) ` +
        `integrationSecret(${this.fingerprint(integrationSecret)}). ` +
        `Matching fingerprints on either side means the secrets agree; differing ones mean ` +
        `the value in the Pathao merchant portal does not match PATHAO_WEBHOOK_SECRET.`,
    );
    throw new UnauthorizedException('Missing webhook authentication');
  }
}
