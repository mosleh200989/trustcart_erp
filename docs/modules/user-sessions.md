# Device Sessions (login sessions)

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

## Permissions

Both appear on the **Role Permissions** page under the `user-sessions` module
and are granted from there:

| Slug | Grants |
|---|---|
| `view-user-sessions` | See the page: every account's devices and all statistics |
| `revoke-user-sessions` | Sign a device out, or sign an account out everywhere |

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
