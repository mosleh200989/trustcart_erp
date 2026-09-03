/**
 * The one place the JWT signing secret is read.
 *
 * Every one of these call sites used to end in `|| 'trustcart-erp-secret-key-2024'`.
 * This repository is public, so that fallback meant any environment missing the
 * variable would silently start accepting admin tokens that anyone could mint
 * from a value published on GitHub. Production has always set JWT_SECRET, but
 * a default that dangerous should not exist to be reached by accident.
 *
 * Refusing to boot is the point: a backend that cannot verify tokens safely is
 * more useful stopped than running.
 */

const MINIMUM_LENGTH = 16;

export function requireJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || '').trim();

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Add it to backend/.env — a long random string, e.g. `openssl rand -base64 36`. ' +
        'The application will not start without it.',
    );
  }

  if (secret.length < MINIMUM_LENGTH) {
    throw new Error(
      `JWT_SECRET is only ${secret.length} characters. Use at least ${MINIMUM_LENGTH} ` +
        '(e.g. `openssl rand -base64 36`); a short secret is guessable offline from any token.',
    );
  }

  return secret;
}

/**
 * Called once at boot so a misconfigured environment fails immediately and
 * visibly, rather than at whichever request first needs to verify a token.
 */
export function assertJwtSecretConfigured(): void {
  requireJwtSecret();
}
