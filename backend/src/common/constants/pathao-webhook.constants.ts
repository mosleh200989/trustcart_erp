/**
 * Shared constants for the Pathao Courier merchant webhook contract.
 *
 * Reference: Pathao's official WooCommerce plugin (`pathao-eng/courier-woocommerce-plugin`).
 *
 * The contract Pathao actually implements is:
 *
 *  - Pathao POSTs the event to the merchant's webhook URL and sends the merchant's
 *    own webhook secret **verbatim** in the `X-PATHAO-Signature` header. It is NOT
 *    an HMAC digest of the body.
 *
 *  - The merchant endpoint must answer with HTTP `202 Accepted` and echo the header
 *    `X-Pathao-Merchant-Webhook-Integration-Secret`. Its value is a **fixed constant
 *    published by Pathao** and is the same for every merchant — it is not the
 *    merchant's own secret. Pathao refuses to activate/keep a webhook that does not
 *    echo this exact value.
 *
 *  - During registration Pathao first sends `{ "event": "webhook_integration" }`,
 *    which must be acknowledged the same way (202 + header) without any auth header.
 */

/** Header Pathao sends containing the merchant's webhook secret, verbatim. */
export const PATHAO_SIGNATURE_HEADER = 'x-pathao-signature';

/** Header the merchant must echo back on every response. */
export const PATHAO_INTEGRATION_SECRET_HEADER =
  'X-Pathao-Merchant-Webhook-Integration-Secret';

/**
 * Pathao's published, merchant-independent integration secret.
 * Used as the fallback when `PATHAO_WEBHOOK_INTEGRATION_SECRET` is not set so a
 * missing env var can never silently break webhook registration.
 */
export const PATHAO_DEFAULT_INTEGRATION_SECRET =
  'f3992ecc-59da-4cbe-a049-a13da2018d51';

/** The handshake event Pathao sends when the webhook URL is first registered. */
export const PATHAO_WEBHOOK_INTEGRATION_EVENT = 'webhook_integration';

/** Resolve the integration secret to echo back, falling back to Pathao's constant. */
export function resolvePathaoIntegrationSecret(configured?: string | null): string {
  const value = String(configured ?? '').trim();
  return value || PATHAO_DEFAULT_INTEGRATION_SECRET;
}
