/**
 * Shared constants for the Meta (Facebook / Instagram) Graph API webhook contract.
 *
 * Reference: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 *
 * The contract Meta implements is:
 *
 *  - Registration is a GET with `hub.mode=subscribe`, `hub.verify_token=<the token
 *    you typed into the App Dashboard>` and `hub.challenge=<random string>`.
 *    The endpoint must answer HTTP 200 with the challenge value as the raw body —
 *    plain text, not JSON — or Meta refuses to save the URL.
 *
 *  - Events arrive as POST with header `X-Hub-Signature-256: sha256=<hex>`, where
 *    the hex is HMAC-SHA256 of the **raw request body** keyed by the App Secret.
 *    Verifying against a re-serialized body will not match; we read `req.rawBody`
 *    (enabled globally in main.ts via `NestFactory.create(..., { rawBody: true })`).
 *
 *  - The endpoint must return 200 quickly. Meta retries on non-2xx or on a slow
 *    response, which is why the controller answers before doing any work.
 */

/** Header carrying the HMAC-SHA256 signature of the raw body. */
export const META_SIGNATURE_HEADER = 'x-hub-signature-256';

/** Legacy SHA1 header. Still sent by Meta; accepted only as a fallback. */
export const META_SIGNATURE_HEADER_SHA1 = 'x-hub-signature';

/** Query params Meta sends during the registration handshake. */
export const META_HUB_MODE = 'hub.mode';
export const META_HUB_VERIFY_TOKEN = 'hub.verify_token';
export const META_HUB_CHALLENGE = 'hub.challenge';

/** The only `hub.mode` value Meta sends. */
export const META_HUB_SUBSCRIBE = 'subscribe';

/** Top-level `object` values we handle. */
export const META_OBJECT_PAGE = 'page';
export const META_OBJECT_INSTAGRAM = 'instagram';

/** The constant body Meta expects back on a successful event POST. */
export const META_EVENT_ACK = 'EVENT_RECEIVED';

/**
 * Graph API version used for every outbound call. Bumping this is a deliberate,
 * reviewable change — Meta deprecates versions on a ~2 year cycle.
 */
export const META_GRAPH_VERSION = 'v21.0';

export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
