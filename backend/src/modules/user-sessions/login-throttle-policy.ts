/**
 * When a login attempt is refused before the password is even checked.
 *
 * Two limits, deliberately very different in strictness:
 *
 * - **Per identifier** — tight. Five wrong passwords for one account in fifteen
 *   minutes locks that identifier for fifteen. This is the limit that stops
 *   someone grinding a single account.
 *
 * - **Per IP** — loose, and short. Staff sit behind one office NAT (production
 *   currently shows two distinct addresses for the whole company), so a strict
 *   IP limit would lock out the entire office the moment one attacker — or one
 *   bad afternoon of typos — crossed it. It exists to blunt spraying across
 *   many accounts from one source, not to be the primary defence; the failed
 *   login list is what a human uses to spot that pattern.
 *
 * The identifier is what the person typed, never a resolved account, so a
 * lockout leaks nothing about whether the account exists.
 */

export const LOGIN_THROTTLE_POLICY = {
  identifier: { maxFailures: 5, windowMinutes: 15, lockMinutes: 15 },
  ip: { maxFailures: 30, windowMinutes: 15, lockMinutes: 5 },
} as const;

export type ThrottleScope = 'identifier' | 'ip';

export interface ThrottleDecision {
  blocked: boolean;
  scope: ThrottleScope | null;
  /** Seconds until the caller may try again; 0 when not blocked. */
  retryAfterSeconds: number;
}

const NOT_BLOCKED: ThrottleDecision = { blocked: false, scope: null, retryAfterSeconds: 0 };

interface FailureWindow {
  /** Failures inside the window (for the identifier: only since the last success or admin unlock). */
  failures: number;
  /** Timestamp of the most recent failure, or null when there are none. */
  newestFailureAt: Date | null;
}

function evaluate(
  window: FailureWindow,
  limit: { maxFailures: number; lockMinutes: number },
  scope: ThrottleScope,
  now: Date,
): ThrottleDecision {
  if (window.failures < limit.maxFailures || !window.newestFailureAt) return NOT_BLOCKED;

  const lockedUntil = new Date(window.newestFailureAt.getTime() + limit.lockMinutes * 60_000);
  const remainingMs = lockedUntil.getTime() - now.getTime();
  if (remainingMs <= 0) return NOT_BLOCKED;

  return { blocked: true, scope, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

/**
 * The identifier limit is checked first: it is the specific, actionable one, and
 * the message a locked-out person sees should be about their own account rather
 * than about their network.
 */
export function decideThrottle(
  identifierWindow: FailureWindow,
  ipWindow: FailureWindow,
  now: Date = new Date(),
): ThrottleDecision {
  const byIdentifier = evaluate(identifierWindow, LOGIN_THROTTLE_POLICY.identifier, 'identifier', now);
  if (byIdentifier.blocked) return byIdentifier;

  return evaluate(ipWindow, LOGIN_THROTTLE_POLICY.ip, 'ip', now);
}

/**
 * Lockout key for a typed identifier, and the string an admin reads back in the
 * attempt list — so it has to stay recognisable.
 *
 * Phone numbers have their punctuation folded away, so "01712-345678" and
 * "01712345678" cannot be alternated to double the allowance. Country prefixes
 * are left alone: merging those is AuthService's job when it resolves an
 * account, and guessing here would key unrelated numbers together.
 *
 * Emails keep every character but case. Stripping punctuation from them would
 * both display the wrong address and collide "a-b@x.com" with "ab@x.com".
 */
export function normalizeIdentifier(raw: string | null | undefined): string {
  const trimmed = String(raw || '').trim().toLowerCase();
  const folded = trimmed.includes('@') ? trimmed : trimmed.replace(/[\s()\-]/g, '');
  return folded.slice(0, 190);
}

export function throttleMessage(decision: ThrottleDecision): string {
  const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));
  const unit = minutes === 1 ? 'minute' : 'minutes';

  return decision.scope === 'ip'
    ? `Too many failed sign-in attempts from this network. Try again in ${minutes} ${unit}.`
    : `Too many failed sign-in attempts. Try again in ${minutes} ${unit}, or ask an administrator to unlock the account.`;
}
