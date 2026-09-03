import { clientIpFromRequest, parseDeviceInfo } from './device-info';

describe('parseDeviceInfo', () => {
  it('reads a Windows Chrome desktop', () => {
    const info = parseDeviceInfo(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    );
    expect(info).toEqual({ deviceType: 'desktop', browser: 'Chrome', os: 'Windows', label: 'Chrome on Windows' });
  });

  it('does not call Edge "Chrome"', () => {
    const info = parseDeviceInfo(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    );
    expect(info.browser).toBe('Edge');
  });

  it('reads an Android phone', () => {
    const info = parseDeviceInfo(
      'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    );
    expect(info.deviceType).toBe('mobile');
    expect(info.os).toBe('Android');
    expect(info.browser).toBe('Chrome');
  });

  it('treats an Android UA without "Mobile" as a tablet', () => {
    const info = parseDeviceInfo(
      'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    );
    expect(info.deviceType).toBe('tablet');
  });

  it('reads an iPhone as Safari on iOS', () => {
    const info = parseDeviceInfo(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    );
    expect(info).toEqual({ deviceType: 'mobile', browser: 'Safari', os: 'iOS', label: 'Safari on iOS' });
  });

  it('reads an iPad as a tablet', () => {
    expect(
      parseDeviceInfo(
        'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1',
      ).deviceType,
    ).toBe('tablet');
  });

  it('flags scripted clients as bots', () => {
    expect(parseDeviceInfo('curl/8.4.0').deviceType).toBe('bot');
    expect(parseDeviceInfo('PostmanRuntime/7.37.0').deviceType).toBe('bot');
  });

  it('falls back for a missing user agent', () => {
    expect(parseDeviceInfo('').deviceType).toBe('unknown');
    expect(parseDeviceInfo(null).label).toBe('Unknown device');
  });
});

describe('clientIpFromRequest', () => {
  it('takes the first hop of x-forwarded-for', () => {
    expect(clientIpFromRequest({ headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.1' } })).toBe('203.0.113.4');
  });

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(clientIpFromRequest({ headers: {}, ip: '::ffff:203.0.113.9' })).toBe('203.0.113.9');
  });

  it('returns null when nothing is available', () => {
    expect(clientIpFromRequest({ headers: {} })).toBeNull();
  });
});
