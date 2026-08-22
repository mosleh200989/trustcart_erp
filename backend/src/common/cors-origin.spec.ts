import { buildAllowedOrigins, isOriginAllowed, APP_DOMAINS } from './cors-origin';

describe('CORS origin matching', () => {
  const allowed = buildAllowedOrigins();

  describe('the prefix bug', () => {
    // The check used to be `origin.startsWith(allowedOrigin)`, so any domain
    // registered with the right prefix was accepted. Credentials are enabled
    // on this API, so that is the difference between a same-origin policy and
    // no policy at all.
    const lookalikes = [
      'https://trustcart.com.bd.attacker.test',
      'https://trustcart.com.bd-attacker.test',
      'https://herbolin.com.evil.test',
      'https://veshoj.site.evil.test',
      'https://trustcart.com.bdsomething',
    ];

    it.each(lookalikes)('rejects %s', (origin) => {
      expect(isOriginAllowed(origin, allowed)).toBe(false);
    });
  });

  describe('genuine origins', () => {
    it('accepts every configured brand domain over https', () => {
      for (const domain of APP_DOMAINS) {
        expect(isOriginAllowed(`https://${domain}`, allowed)).toBe(true);
      }
    });

    it('accepts the www variant of a bare domain', () => {
      expect(isOriginAllowed('https://www.trustcart.com.bd', allowed)).toBe(true);
      expect(isOriginAllowed('https://www.herbolin.com', allowed)).toBe(true);
    });

    it('does not invent a www variant for an api. subdomain', () => {
      expect(isOriginAllowed('https://www.api.herbolin.com', allowed)).toBe(false);
    });

    it('accepts local development origins', () => {
      expect(isOriginAllowed('http://localhost:3000', allowed)).toBe(true);
      expect(isOriginAllowed('http://localhost:3001', allowed)).toBe(true);
    });
  });

  describe('scheme and port are part of the origin', () => {
    it('rejects http for a domain configured as https', () => {
      expect(isOriginAllowed('http://trustcart.com.bd', allowed)).toBe(false);
    });

    it('rejects an unexpected port', () => {
      expect(isOriginAllowed('https://trustcart.com.bd:8443', allowed)).toBe(false);
    });
  });

  describe('FRONTEND_URL', () => {
    it('is honoured', () => {
      const withEnv = buildAllowedOrigins('https://staging.trustcart.com.bd');
      expect(isOriginAllowed('https://staging.trustcart.com.bd', withEnv)).toBe(true);
    });

    it('tolerates a trailing slash, which an Origin header never has', () => {
      const withEnv = buildAllowedOrigins('https://staging.trustcart.com.bd/');
      expect(isOriginAllowed('https://staging.trustcart.com.bd', withEnv)).toBe(true);
    });
  });

  describe('requests without an Origin header', () => {
    // curl, server-to-server calls and the courier webhooks send no Origin.
    // CORS is a browser control and does not apply to them.
    it('are allowed', () => {
      expect(isOriginAllowed(undefined, allowed)).toBe(true);
      expect(isOriginAllowed('', allowed)).toBe(true);
    });
  });

  describe('the development escape hatch', () => {
    it('allows anything only when explicitly enabled', () => {
      const origin = 'https://trustcart.com.bd.attacker.test';
      expect(isOriginAllowed(origin, allowed, { allowAny: true })).toBe(true);
      expect(isOriginAllowed(origin, allowed, { allowAny: false })).toBe(false);
    });
  });
});
