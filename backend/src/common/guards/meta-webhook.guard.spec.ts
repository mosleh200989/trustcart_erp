import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MetaWebhookGuard } from './meta-webhook.guard';

const APP_SECRET = 'test-app-secret';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function makeContext(request: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function signedRequest(
  body: string,
  secret = APP_SECRET,
  algorithm: 'sha256' | 'sha1' = 'sha256',
): Record<string, any> {
  const digest = crypto.createHmac(algorithm, secret).update(Buffer.from(body)).digest('hex');
  const header = algorithm === 'sha256' ? 'x-hub-signature-256' : 'x-hub-signature';
  return {
    ip: '1.2.3.4',
    rawBody: Buffer.from(body),
    body: JSON.parse(body),
    headers: { [header]: `${algorithm}=${digest}` },
  };
}

describe('MetaWebhookGuard', () => {
  const body = JSON.stringify({ object: 'page', entry: [{ id: '1' }] });

  it('accepts a correctly signed SHA-256 request and flags it as verified', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_APP_SECRET: APP_SECRET }));
    const request = signedRequest(body);

    expect(guard.canActivate(makeContext(request))).toBe(true);
    expect(request.metaSignatureValid).toBe(true);
  });

  it('accepts the legacy SHA-1 signature as a fallback', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_APP_SECRET: APP_SECRET }));
    const request = signedRequest(body, APP_SECRET, 'sha1');

    expect(guard.canActivate(makeContext(request))).toBe(true);
    expect(request.metaSignatureValid).toBe(true);
  });

  it('rejects a signature made with the wrong secret', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_APP_SECRET: APP_SECRET }));
    const request = signedRequest(body, 'wrong-secret');

    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException);
    expect(request.metaSignatureValid).toBe(false);
  });

  it('rejects a request whose body was tampered with after signing', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_APP_SECRET: APP_SECRET }));
    const request = signedRequest(body);
    request.rawBody = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: '999' }] }));

    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException);
  });

  it('rejects an unsigned request', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_APP_SECRET: APP_SECRET }));
    const request: Record<string, any> = {
      ip: '1.2.3.4',
      rawBody: Buffer.from(body),
      body: {},
      headers: {},
    };

    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException);
  });

  it('accepts an unsigned request when explicitly allowed, but does not mark it verified', () => {
    const guard = new MetaWebhookGuard(
      makeConfig({ META_APP_SECRET: APP_SECRET, META_WEBHOOK_ALLOW_UNSIGNED: 'true' }),
    );
    const request: Record<string, any> = {
      ip: '1.2.3.4',
      rawBody: Buffer.from(body),
      body: {},
      headers: {},
    };

    expect(guard.canActivate(makeContext(request))).toBe(true);
    expect(request.metaSignatureValid).toBe(false);
  });

  it('fails closed when no app secret is configured, so the public endpoint is never open', () => {
    const guard = new MetaWebhookGuard(makeConfig({}));
    const request: Record<string, any> = {
      ip: '1.2.3.4',
      rawBody: Buffer.from(body),
      body: {},
      headers: {},
    };

    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException);
    expect(request.metaSignatureValid).toBe(false);
  });

  it('opens only when an unset secret is paired with the explicit debug escape hatch', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_WEBHOOK_ALLOW_UNSIGNED: 'true' }));
    const request: Record<string, any> = {
      ip: '1.2.3.4',
      rawBody: Buffer.from(body),
      body: {},
      headers: {},
    };

    expect(guard.canActivate(makeContext(request))).toBe(true);
    expect(request.metaSignatureValid).toBe(false);
  });

  it('falls back to the parsed body when rawBody is unavailable', () => {
    const guard = new MetaWebhookGuard(makeConfig({ META_APP_SECRET: APP_SECRET }));
    const parsed = { object: 'page' };
    const serialized = JSON.stringify(parsed);
    const digest = crypto.createHmac('sha256', APP_SECRET).update(serialized).digest('hex');

    const request: Record<string, any> = {
      ip: '1.2.3.4',
      body: parsed,
      headers: { 'x-hub-signature-256': `sha256=${digest}` },
    };

    expect(guard.canActivate(makeContext(request))).toBe(true);
  });
});
