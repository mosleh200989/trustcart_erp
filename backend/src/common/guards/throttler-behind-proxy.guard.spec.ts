import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard';

/**
 * How requests are bucketed for rate limiting.
 *
 * Two ways to get this wrong, both bad:
 *
 *  - Use the socket address. Behind nginx that is always 127.0.0.1, so every
 *    visitor shares one bucket and the whole site throttles as a single client.
 *  - Trust X-Forwarded-For. nginx *appends* to whatever the caller sent, so its
 *    left-hand entries are attacker-supplied and anyone could rotate their own
 *    bucket at will.
 *
 * nginx sets X-Real-IP from $remote_addr and overwrites any client value, so it
 * is the one trustworthy source here.
 */
const guard: ThrottlerBehindProxyGuard = Object.create(ThrottlerBehindProxyGuard.prototype);
const track = (req: any): Promise<string> => (guard as any).getTracker(req);

describe('rate-limit bucketing', () => {
  it('uses X-Real-IP, which nginx controls', async () => {
    await expect(
      track({ headers: { 'x-real-ip': '203.0.113.9' }, ip: '127.0.0.1' }),
    ).resolves.toBe('203.0.113.9');
  });

  it('ignores a spoofed X-Forwarded-For', async () => {
    // The caller sent "1.2.3.4"; nginx appended their real address. Honouring
    // the left-hand entry would let anyone pick their own bucket.
    const tracker = await track({
      headers: {
        'x-forwarded-for': '1.2.3.4, 203.0.113.9',
        'x-real-ip': '203.0.113.9',
      },
      ip: '127.0.0.1',
    });
    expect(tracker).toBe('203.0.113.9');
    expect(tracker).not.toContain('1.2.3.4');
  });

  it('ignores a spoofed X-Real-IP-shaped body but takes the header nginx set', async () => {
    // nginx overwrites X-Real-IP, so whatever arrives in it is nginx's value.
    await expect(
      track({ headers: { 'x-real-ip': '198.51.100.7' }, ip: '127.0.0.1' }),
    ).resolves.toBe('198.51.100.7');
  });

  it('takes the first value if the header somehow arrives twice', async () => {
    await expect(
      track({ headers: { 'x-real-ip': ['203.0.113.9', '1.2.3.4'] }, ip: '127.0.0.1' }),
    ).resolves.toBe('203.0.113.9');
  });

  it('normalises IPv4-mapped IPv6 so one client is one bucket', async () => {
    // ::ffff:203.0.113.9 and 203.0.113.9 are the same client.
    await expect(
      track({ headers: { 'x-real-ip': '::ffff:203.0.113.9' } }),
    ).resolves.toBe('203.0.113.9');
  });

  it('falls back to req.ip when the header is absent', async () => {
    // Direct hits that bypass nginx, and local development.
    await expect(track({ headers: {}, ip: '203.0.113.4' })).resolves.toBe('203.0.113.4');
  });

  it('falls back to the socket address when there is no req.ip', async () => {
    await expect(
      track({ headers: {}, socket: { remoteAddress: '203.0.113.5' } }),
    ).resolves.toBe('203.0.113.5');
  });

  it('never returns an empty tracker', async () => {
    // An empty key would put every such request into one shared bucket, which
    // is the site-wide throttle failure this class exists to avoid.
    for (const req of [{}, { headers: {} }, { headers: { 'x-real-ip': '   ' } }]) {
      await expect(track(req)).resolves.toBe('unknown');
    }
  });

  it('gives different clients different buckets', async () => {
    const a = await track({ headers: { 'x-real-ip': '203.0.113.1' } });
    const b = await track({ headers: { 'x-real-ip': '203.0.113.2' } });
    expect(a).not.toBe(b);
  });
});
