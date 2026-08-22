# API hardening

What protects the API at the edge of the NestJS process, and what still does not.

## Rate limiting

`@nestjs/throttler` is registered globally in
[app.module.ts](../../backend/src/app.module.ts).

| Scope | Limit |
| --- | --- |
| Everything by default | 1,000 requests / minute / IP |
| `POST /api/auth/login`, `/register`, `/validate` | 20 requests / minute / IP |
| Courier and telephony webhooks | exempt |

**The global ceiling is deliberately high.** Mobile networks in Bangladesh use
carrier-grade NAT, so a large number of genuine customers can share a single
public IP. A tight global limit would lock out real traffic long before it
inconvenienced anyone malicious. This exists to stop runaway scripts and cheap
scraping — it is not a precision control.

**Webhooks are exempt** via `@SkipThrottle()` on `webhook/pathao`,
`webhook/steadfast` and `webhook/bracknet`. A courier pushing a burst of
delivery-status updates is legitimate traffic, and dropping any of it means
orders silently keep a stale status. Those endpoints are protected by a
shared-secret header instead.

### How requests are bucketed

The app sits behind nginx, so the socket address is always `127.0.0.1` — using
it would put every visitor in one bucket and throttle the whole site as a single
client. [ThrottlerBehindProxyGuard](../../backend/src/common/guards/throttler-behind-proxy.guard.ts)
keys off `X-Real-IP`, which nginx sets from `$remote_addr` and *overwrites*, so a
caller cannot forge it.

`X-Forwarded-For` is deliberately not used: nginx appends to whatever the client
sent, so its left-hand entries are attacker-supplied and would let anyone rotate
their own rate-limit bucket at will.

> If nginx is ever replaced or reconfigured, check `X-Real-IP` is still set.
> Without it every request falls back to `req.ip` — behind a proxy that is one
> shared value, and the global limit would then apply to all traffic combined.

### Changing the limits

Global: the `ThrottlerModule.forRoot` block in `app.module.ts`.
Auth: `AUTH_RATE_LIMIT` in
[auth.controller.ts](../../backend/src/modules/auth/auth.controller.ts).

Exempt an endpoint with `@SkipThrottle()`; tighten one with
`@Throttle({ default: { limit, ttl } })`.

## Security headers

`helmet` is applied in [main.ts](../../backend/src/main.ts), giving HSTS,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and friends.

Two defaults are overridden, both on purpose:

- **`contentSecurityPolicy` is off.** This process serves JSON and the Swagger
  UI. Helmet's default CSP breaks Swagger's inline scripts, and a CSP for the
  storefront belongs on the Next.js side where HTML is actually rendered.
- **`crossOriginResourcePolicy` is `cross-origin`.** `/uploads` is served from
  this process and loaded by storefronts on other origins. The `same-origin`
  default would blank every product image.

## CORS

One backend serves every brand storefront, so the allow-list is built from a
list of domains in [cors-origin.ts](../../backend/src/common/cors-origin.ts).
**Adding a storefront means editing that file**, not just nginx.

Matching is by equality. It previously accepted any origin that merely *started
with* an allowed one, so `https://trustcart.com.bd.attacker.test` passed — an
attacker only had to register a domain with the right prefix. That is covered by
tests now; see `cors-origin.spec.ts`.

The impact of that bug was limited because auth tokens live in `localStorage` and
travel as `Authorization` headers rather than cookies, so a hostile origin could
not read a victim's session. **`credentials: true` is still set**, so the day
anyone introduces an auth cookie, origin matching becomes load-bearing.

`NODE_ENV=development` allows all origins. That is intended for local work and
is one mis-set environment variable away from being live — check `NODE_ENV` on
the server if CORS ever behaves unexpectedly.

## Gaps

**No per-account lockout.** Rate limiting is per IP, which under CGNAT is a
weak identifier in both directions. Locking or delaying an *account* after
repeated failures is the stronger control and does not exist yet.

**No brute-force logging or alerting.** A sustained attack against login
produces 429s and nothing else — nobody is told.

**The attendance IP allow-list trusts `CF-Connecting-IP`.** `getClientIp` in
[presence.controller.ts](../../backend/src/modules/presence/presence.controller.ts)
checks that header first. There is no Cloudflare in front of this deployment, so
nginx never sets it and a client can supply any value — meaning the office-IP
check for check-in can be bypassed. Worth fixing; left alone here because
changing it risks locking staff out and deserves its own change.
