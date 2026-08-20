import { UnauthorizedException } from '@nestjs/common';
import { PathaoWebhookGuard } from './pathao-webhook.guard';
import { PATHAO_DEFAULT_INTEGRATION_SECRET } from '../constants/pathao-webhook.constants';

const SECRET = 'a'.repeat(64);

function makeContext(headers: Record<string, string>, body: any = {}, query: any = {}) {
  const setHeader = jest.fn();
  const request = { headers, body, query, ip: '1.2.3.4', rawBody: Buffer.from(JSON.stringify(body)) };
  return {
    ctx: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setHeader }),
      }),
    } as any,
    setHeader,
  };
}

function makeGuard(config: Record<string, string | undefined>) {
  return new PathaoWebhookGuard({ get: (k: string) => config[k] } as any);
}

describe('PathaoWebhookGuard', () => {
  const guard = makeGuard({ PATHAO_WEBHOOK_SECRET: SECRET });

  it('accepts the header Pathao actually sends: the secret verbatim in X-PATHAO-Signature', () => {
    // This is the bug that broke automatic status updates — the secret was previously
    // compared against an HMAC digest, so every genuine Pathao event was rejected 401.
    const { ctx } = makeContext({ 'x-pathao-signature': SECRET }, { event: 'order.delivered' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('tolerates surrounding whitespace on the signature', () => {
    const { ctx } = makeContext({ 'x-pathao-signature': `  ${SECRET}  ` }, { event: 'order.picked' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('still accepts an HMAC-SHA256 signature as a fallback', () => {
    const crypto = require('crypto');
    const body = { event: 'order.delivered' };
    const digest = crypto
      .createHmac('sha256', SECRET)
      .update(Buffer.from(JSON.stringify(body)))
      .digest('hex');
    expect(guard.canActivate(makeContext({ 'x-pathao-signature': digest }, body).ctx)).toBe(true);
    expect(
      guard.canActivate(makeContext({ 'x-pathao-signature': `sha256=${digest}` }, body).ctx),
    ).toBe(true);
  });

  it('accepts a Bearer token and a ?secret= query param', () => {
    expect(guard.canActivate(makeContext({ authorization: `Bearer ${SECRET}` }).ctx)).toBe(true);
    expect(guard.canActivate(makeContext({}, {}, { secret: SECRET }).ctx)).toBe(true);
  });

  it('lets the registration handshake through without credentials', () => {
    const { ctx } = makeContext({}, { event: 'webhook_integration' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('always echoes the integration secret, even when rejecting', () => {
    const { ctx, setHeader } = makeContext({ 'x-pathao-signature': 'wrong' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(setHeader).toHaveBeenCalledWith(
      'X-Pathao-Merchant-Webhook-Integration-Secret',
      PATHAO_DEFAULT_INTEGRATION_SECRET,
    );
  });

  it('rejects a wrong or missing secret', () => {
    expect(() => guard.canActivate(makeContext({ 'x-pathao-signature': 'nope' }).ctx)).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(makeContext({}).ctx)).toThrow(UnauthorizedException);
  });

  it('runs open (with a warning) when no secret is configured', () => {
    expect(makeGuard({}).canActivate(makeContext({}).ctx)).toBe(true);
  });

  it('honours the PATHAO_WEBHOOK_ALLOW_UNSIGNED escape hatch', () => {
    const lenient = makeGuard({
      PATHAO_WEBHOOK_SECRET: SECRET,
      PATHAO_WEBHOOK_ALLOW_UNSIGNED: 'true',
    });
    expect(lenient.canActivate(makeContext({}, { event: 'order.delivered' }).ctx)).toBe(true);
  });

  it('does not crash on a signature of a different length (timing-safe compare)', () => {
    expect(() => guard.canActivate(makeContext({ 'x-pathao-signature': 'x' }).ctx)).toThrow(
      UnauthorizedException,
    );
  });
});
