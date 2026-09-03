import { requireJwtSecret } from './jwt-secret';

describe('requireJwtSecret', () => {
  const original = process.env.JWT_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it('returns the configured secret', () => {
    process.env.JWT_SECRET = 'a-perfectly-reasonable-secret-value';
    expect(requireJwtSecret()).toBe('a-perfectly-reasonable-secret-value');
  });

  it('trims surrounding whitespace', () => {
    process.env.JWT_SECRET = '  a-perfectly-reasonable-secret  ';
    expect(requireJwtSecret()).toBe('a-perfectly-reasonable-secret');
  });

  it('refuses a missing secret rather than falling back to a default', () => {
    delete process.env.JWT_SECRET;
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET is not set/);
  });

  it('refuses an empty secret', () => {
    process.env.JWT_SECRET = '   ';
    expect(() => requireJwtSecret()).toThrow(/JWT_SECRET is not set/);
  });

  it('refuses a secret short enough to brute force', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => requireJwtSecret()).toThrow(/at least 16/);
  });

  it('never returns the retired hardcoded default', () => {
    process.env.JWT_SECRET = 'trustcart-erp-secret-key-2024';
    // It is a legal value if someone deliberately sets it, but nothing in the
    // code may supply it on its own.
    delete process.env.JWT_SECRET;
    expect(() => requireJwtSecret()).toThrow();
  });
});
