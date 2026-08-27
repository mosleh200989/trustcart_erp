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
import {
  META_SIGNATURE_HEADER,
  META_SIGNATURE_HEADER_SHA1,
} from '../constants/meta-webhook.constants';

/**
 * Guard that validates incoming Meta (Facebook / Instagram) webhook requests.
 *
 * Meta signs every event POST with `X-Hub-Signature-256: sha256=<hex>`, where the
 * hex digest is HMAC-SHA256 of the **raw** request body keyed by the app secret.
 * We compare against `req.rawBody` — re-serializing `req.body` produces different
 * bytes (key order, unicode escaping) and would never match.
 *
 * Configuration:
 *   META_APP_SECRET                    the app secret from the Meta App Dashboard
 *   META_WEBHOOK_ALLOW_UNSIGNED=true   accept unsigned events but log loudly
 *
 * If no app secret is configured the guard runs in open mode and warns on every
 * call, matching how PathaoWebhookGuard degrades — a missing env var should never
 * silently drop live events, but it must be visible in the logs.
 *
 * The request is annotated with `metaSignatureValid` so the controller can record
 * on each stored event whether it arrived signed, even in permissive modes.
 */
@Injectable()
export class MetaWebhookGuard implements CanActivate {
  private readonly logger = new Logger(MetaWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  private timingSafeStringEqual(a: string, b: string): boolean {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  /**
   * Short, non-reversible fingerprint of a credential, for diagnosing a mismatch
   * without ever writing the value itself to the logs.
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
    const request = context.switchToHttp().getRequest<Request>();
    (request as any).metaSignatureValid = false;

    const allowUnsigned =
      String(this.configService.get<string>('META_WEBHOOK_ALLOW_UNSIGNED') ?? '')
        .trim()
        .toLowerCase() === 'true';

    const appSecret = String(
      this.configService.get<string>('META_APP_SECRET') ?? '',
    ).trim();

    // Fail closed. Unlike the Pathao guard, which degrades open so a missing env
    // var cannot silently drop live courier events, this endpoint is new and has
    // no traffic to lose — so an unconfigured secret must not leave a public,
    // unauthenticated write endpoint exposed on the internet.
    if (!appSecret) {
      if (allowUnsigned) {
        this.logger.warn(
          '[Meta Webhook] META_APP_SECRET is not set and META_WEBHOOK_ALLOW_UNSIGNED=true — ' +
            'the endpoint is OPEN. Use this only while debugging.',
        );
        return true;
      }

      this.logger.warn(
        'META_APP_SECRET is not set — rejecting the Meta webhook event. ' +
          'Set it from the Meta App Dashboard (Settings -> Basic -> App Secret).',
      );
      throw new UnauthorizedException('Webhook signature verification is not configured');
    }

    const rawBody = this.getRawBody(request);
    const signature256 = request.headers[META_SIGNATURE_HEADER] as string | undefined;
    const signature1 = request.headers[META_SIGNATURE_HEADER_SHA1] as string | undefined;

    // Primary: SHA-256, the header Meta sends today.
    if (signature256) {
      const expected = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');
      const presented = signature256.startsWith('sha256=')
        ? signature256.slice('sha256='.length)
        : signature256.trim();
      if (this.timingSafeStringEqual(presented, expected)) {
        (request as any).metaSignatureValid = true;
        return true;
      }
    }

    // Fallback: the legacy SHA-1 header, still sent alongside the SHA-256 one.
    if (signature1) {
      const expected = crypto
        .createHmac('sha1', appSecret)
        .update(rawBody)
        .digest('hex');
      const presented = signature1.startsWith('sha1=')
        ? signature1.slice('sha1='.length)
        : signature1.trim();
      if (this.timingSafeStringEqual(presented, expected)) {
        (request as any).metaSignatureValid = true;
        return true;
      }
    }

    if (allowUnsigned) {
      this.logger.warn(
        '[Meta Webhook] Unsigned/invalid event ACCEPTED because ' +
          `META_WEBHOOK_ALLOW_UNSIGNED=true. ip=${request.ip} ` +
          `signature256(${this.fingerprint(signature256)}) ` +
          `bodyBytes=${rawBody.length}`,
      );
      return true;
    }

    this.logger.warn(
      `[Meta Webhook] Rejected: signature mismatch. ip=${request.ip} ` +
        `signature256(${this.fingerprint(signature256)}) ` +
        `signature1(${this.fingerprint(signature1)}) ` +
        `bodyBytes=${rawBody.length} appSecret(${this.fingerprint(appSecret)}). ` +
        'A mismatch here almost always means META_APP_SECRET does not match the ' +
        'App Secret of the app that owns the subscribed Page.',
    );
    throw new UnauthorizedException('Invalid webhook signature');
  }
}
