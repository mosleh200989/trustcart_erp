# Device Sessions and sign-in attempts

Which devices every account is signed in on, and the ability to sign any of
them out immediately. Lives in the **Users** module:
`/admin/users/sessions`.

Before this, auth was stateless — a 24h JWT with no server-side record — so the
system could neither list nor revoke a login. Sessions add that record without
changing how tokens are issued or how long they last.

## How it works

| Piece | Where |
|---|---|
| Session row per login | `user_sessions` table (`db/migrations/2026-09-03-user-sessions.sql`) |
| Attempt row per sign-in try | `login_attempts` table (`db/migrations/2026-09-04-login-attempts.sql`) |
| Rate limit policy and lockouts | `login-throttle-policy.ts`, `login-attempts.service.ts` |
| `sid` claim linking token -> session | `AuthService.issueToken()` |
| Per-request validation + `last_seen_at` | `AuthService.validateJwtPayload()` -> `UserSessionsService.touch()` |
| Device parsing from the user agent | `backend/src/modules/user-sessions/device-info.ts` |
| Admin API | `backend/src/modules/user-sessions/user-sessions.controller.ts` |
| Admin page | `frontend/src/pages/admin/users/sessions.tsx` |

A session is **active** while `revoked_at IS NULL AND expires_at > now()`.
`expires_at` is the token's own 24h lifetime, so an untouched session ages out
on its own; `SESSION_TTL_HOURS` must stay equal to the JWT `expiresIn`.

Every authenticated request looks the session up by `sid` — that is what makes a
sign-out immediate — but `last_seen_at` is written at most once a minute per
session, so activity tracking does not add a row update to every API call.

Tokens issued before this shipped carry no `sid` and keep working until they
expire; nobody is logged out by the deploy.

### Signing out

- **Admin, one device** — `POST /user-sessions/:id/revoke`.
- **Admin, every device for an account** — `POST /user-sessions/users/:id/revoke-all`.
- **The person themselves** — `POST /auth/logout`, called by `AuthContext.logout()`,
  so a normal logout stops counting as a signed-in device.

A revoked device gets `401 { code: 'SESSION_REVOKED' }` on its next request. The
frontend API client watches for exactly that code, drops the dead token and
sends the person to `/admin/login?signedOut=1`. Plain 401s are left alone —
public pages produce them normally.

## Statistics

`GET /user-sessions/statistics?windowMinutes=15` returns four slices, all
counting only active sessions:

- **totals** — active sessions, online now, staff signed in vs. total staff,
  accounts on 2+ devices, busiest account, average devices per account,
  distinct IPs, logins today / last 7 days, sign-outs today.
- **byRole** — per role: staff total, how many are signed in, coverage,
  sessions, online now, devices per signed-in user.
- **byDevice / byBrowser / byOs** — sessions and distinct accounts per device
  type, browser and operating system.
- **byUser** — every staff account with an active session: device count, device
  kinds, distinct IPs, first login, last activity, device labels.

"Online" means a request within `windowMinutes` (default 15).

## Rate limiting and the attempt record

`POST /api/auth/login` used to accept unlimited attempts and record none of
them — the audit interceptor skips the login route, and nothing else logged it.
Now every attempt writes a `login_attempts` row (identifier as typed, result,
IP, device, user agent) and the throttle reads those rows back.

`AuthService.login()` wraps the real login so every exit is counted exactly
once, whichever identity path inside it took: `success`, `invalid_password`,
`unknown_account`, `inactive`, or `unlocked` when an admin clears a lockout.
The client always sees a flat "Invalid credentials" — the distinction is only
in the record.

**The policy** lives in `login-throttle-policy.ts`, pure and unit-tested:

| Scope | Limit | Window | Lock |
|---|---|---|---|
| Identifier | 5 failures | 15 min | 15 min |
| IP address | 30 failures | 15 min | 5 min |

Deliberately lopsided. The identifier limit is the real defence. The IP limit is
loose and short because all staff sit behind one office NAT — production shows
two distinct addresses for the whole company — so a strict IP rule would lock
out everyone the moment one attacker crossed it. Spraying across many accounts
from one source is meant to be *seen* (the failed-attempt list and "worst
addresses" panel) rather than auto-blocked.

Two details that matter:

- **Failures count only since the last success or admin unlock.** Four typos, a
  successful sign-in, then four more typos does not lock anyone out.
- **The lockout keys on the identifier as typed**, never on a resolved account,
  so being locked out reveals nothing about whether the account exists. Emails
  keep every character (only case is folded); phone punctuation is folded so
  `01712-345678` and `01712345678` cannot be alternated to double the allowance.

A blocked attempt returns `429` with `code: LOGIN_THROTTLED` and a message
naming the wait. An admin with `revoke-user-sessions` can clear a lockout from
the page — that writes an `unlocked` row rather than deleting the failures, so
the evidence survives.

Attempts are pruned after 180 days.

## Permissions

Both appear on the **Role Permissions** page under the `user-sessions` module
and are granted from there:

| Slug | Grants |
|---|---|
| `view-user-sessions` | See the page: every account's devices, sign-in attempts and all statistics |
| `revoke-user-sessions` | Sign a device out, sign an account out everywhere, clear a lockout |

`super-admin` and `admin` pass every permission check in `PermissionsGuard`
regardless, so they always have both — the migration records the grants anyway
so the Role Permissions page shows their access truthfully.

This is a monitoring surface: it shows staff IP addresses and device details to
whoever holds `view-user-sessions`. Grant it deliberately.

## Housekeeping

Rows outlive their session so "who signed in yesterday" still answers; a daily
job (`pruneOldSessions`, 4am) deletes sessions that expired more than 90 days
ago. Nothing else writes to the table after the session ends.

Customer-portal logins are recorded too (`subject_type = 'customer'`), counted
separately in the totals and filterable in the session list, but they are not
part of the role or per-user breakdowns, which are staff-only.
