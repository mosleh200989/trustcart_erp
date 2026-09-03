import {
  LOGIN_THROTTLE_POLICY,
  decideThrottle,
  normalizeIdentifier,
  throttleMessage,
} from './login-throttle-policy';

const now = new Date('2026-09-04T10:00:00Z');
const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);
const none = { failures: 0, newestFailureAt: null };

describe('decideThrottle', () => {
  it('allows an attempt when nothing has failed', () => {
    expect(decideThrottle(none, none, now)).toEqual({ blocked: false, scope: null, retryAfterSeconds: 0 });
  });

  it('allows one attempt below the identifier limit', () => {
    const window = { failures: LOGIN_THROTTLE_POLICY.identifier.maxFailures - 1, newestFailureAt: minutesAgo(1) };
    expect(decideThrottle(window, none, now).blocked).toBe(false);
  });

  it('blocks at the identifier limit and reports the wait', () => {
    const window = { failures: LOGIN_THROTTLE_POLICY.identifier.maxFailures, newestFailureAt: minutesAgo(1) };
    const decision = decideThrottle(window, none, now);

    expect(decision.blocked).toBe(true);
    expect(decision.scope).toBe('identifier');
    // 15 minute lock, one minute elapsed
    expect(decision.retryAfterSeconds).toBe(14 * 60);
  });

  it('lets the identifier lock lapse once the failures go quiet', () => {
    const window = {
      failures: LOGIN_THROTTLE_POLICY.identifier.maxFailures,
      newestFailureAt: minutesAgo(LOGIN_THROTTLE_POLICY.identifier.lockMinutes + 1),
    };
    expect(decideThrottle(window, none, now).blocked).toBe(false);
  });

  it('blocks on the IP limit when no single account is over its own', () => {
    const ip = { failures: LOGIN_THROTTLE_POLICY.ip.maxFailures, newestFailureAt: minutesAgo(1) };
    const decision = decideThrottle(none, ip, now);

    expect(decision.blocked).toBe(true);
    expect(decision.scope).toBe('ip');
    expect(decision.retryAfterSeconds).toBe(4 * 60);
  });

  it('does not trip the IP limit at office-scale typo volume', () => {
    const ip = { failures: 12, newestFailureAt: minutesAgo(2) };
    expect(decideThrottle(none, ip, now).blocked).toBe(false);
  });

  it('reports the identifier first when both limits are exceeded', () => {
    const identifier = { failures: 9, newestFailureAt: minutesAgo(1) };
    const ip = { failures: 99, newestFailureAt: minutesAgo(1) };
    expect(decideThrottle(identifier, ip, now).scope).toBe('identifier');
  });
});

describe('normalizeIdentifier', () => {
  it('folds case and whitespace', () => {
    expect(normalizeIdentifier('  Admin@TrustCart.com ')).toBe('admin@trustcart.com');
  });

  it('keeps an email intact so it stays searchable and cannot collide', () => {
    expect(normalizeIdentifier('session-check@local.test')).toBe('session-check@local.test');
    expect(normalizeIdentifier('a-b@x.com')).not.toBe(normalizeIdentifier('ab@x.com'));
  });

  it('folds phone punctuation so variants share one lockout', () => {
    expect(normalizeIdentifier('01712-345 678')).toBe('01712345678');
    expect(normalizeIdentifier('(01712) 345678')).toBe('01712345678');
  });

  it('leaves country prefixes distinct', () => {
    expect(normalizeIdentifier('+8801712345678')).not.toBe(normalizeIdentifier('01712345678'));
  });

  it('survives empty input', () => {
    expect(normalizeIdentifier(null)).toBe('');
    expect(normalizeIdentifier(undefined)).toBe('');
  });
});

describe('throttleMessage', () => {
  it('points a locked account at an administrator', () => {
    const message = throttleMessage({ blocked: true, scope: 'identifier', retryAfterSeconds: 600 });
    expect(message).toContain('10 minutes');
    expect(message).toContain('administrator');
  });

  it('names the network for an IP lock', () => {
    expect(throttleMessage({ blocked: true, scope: 'ip', retryAfterSeconds: 60 })).toContain('network');
  });

  it('never says "0 minutes"', () => {
    expect(throttleMessage({ blocked: true, scope: 'ip', retryAfterSeconds: 5 })).toContain('1 minute');
  });
});
