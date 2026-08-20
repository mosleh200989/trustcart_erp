/**
 * Pathao webhook event → internal order status mapping.
 *
 * Pathao's webhook payload carries **no `order_status` field** — the delivery state is
 * conveyed entirely by the `event` name (`order.delivered`, `order.pickup-failed`, …).
 * Guessing the status from substrings of the event name is unsafe: `order.delivery-failed`
 * contains "deliver" and would otherwise be read as a successful delivery.
 *
 * So every documented event is mapped explicitly. Events that carry no delivery state
 * (payment invoices, store CRUD, plain `order.updated`) map to `null`, meaning
 * "acknowledge and record, but do not touch the order status".
 *
 * Event list source: Pathao merchant webhook documentation and Pathao's official
 * WooCommerce plugin (`pathao-eng/courier-woocommerce-plugin`).
 */

/** Internal status, or `null` for an informational event that must not change status. */
export type PathaoMappedStatus = string | null;

export const PATHAO_EVENT_STATUS_MAP: Record<string, PathaoMappedStatus> = {
  // ── Creation / pickup ──
  'order.created': 'sent',
  'order.updated': null, // metadata change only — never a delivery state
  'order.pickup-requested': 'sent',
  'order.assigned-for-pickup': 'sent',
  'order.picked': 'picked',
  'order.pickup-failed': 'pickup_failed',
  'order.pickup-cancelled': 'cancelled',

  // ── In the network ──
  'order.at-the-sorting-hub': 'in_transit',
  'order.in-transit': 'in_transit',
  'order.received-at-last-mile-hub': 'in_transit',
  'order.assigned-for-delivery': 'in_transit',

  // ── Delivery outcome ──
  'order.delivered': 'delivered',
  'order.partial-delivery': 'partial_delivered',
  'order.delivery-failed': 'courier_hold', // NOT delivered — the courier is holding it
  'order.on-hold': 'courier_hold',

  // ── Returns ──
  'order.return-id-created': null, // a return consignment exists; parcel not returned yet
  'order.return-in-transit': 'returned',
  'order.returned': 'returned',
  'order.returned-to-merchant': 'returned',
  'order.paid-return': 'returned',

  // ── Financial / non-delivery events ──
  'order.paid': null, // payment invoice issued by Pathao
  'order.exchanged': null, // exchange leg; delivery state comes via its own consignment

  // ── Store events (no order attached) ──
  'store.created': null,
  'store.updated': null,
};

/**
 * Statuses that represent a finished journey. Once an order reaches one of these, a
 * late or out-of-order webhook (Pathao does not guarantee ordering) must not drag it
 * back to an in-flight status such as `sent` or `in_transit`.
 */
export const PATHAO_TERMINAL_STATUSES = new Set([
  'delivered',
  'partial_delivered',
  'returned',
  'cancelled',
]);

/** True when `next` would move a terminal order backwards into an in-flight status. */
export function isPathaoStatusRegression(current: string | null | undefined, next: string): boolean {
  const from = String(current ?? '').trim().toLowerCase();
  if (!PATHAO_TERMINAL_STATUSES.has(from)) return false;
  return !PATHAO_TERMINAL_STATUSES.has(next.trim().toLowerCase());
}

/** Normalise an event name for lookup: `Order.Delivered ` → `order.delivered`. */
export function normalizePathaoEvent(event: unknown): string {
  return String(event ?? '').trim().toLowerCase();
}

/**
 * Look up a Pathao event.
 *
 * Returns `undefined` when the event is unknown (caller should fall back to the
 * generic status mapper), or `{ status }` where `status` may be `null` for a
 * recognised event that carries no delivery state.
 */
export function lookupPathaoEventStatus(event: unknown): { status: PathaoMappedStatus } | undefined {
  const key = normalizePathaoEvent(event);
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(PATHAO_EVENT_STATUS_MAP, key)) {
    return { status: PATHAO_EVENT_STATUS_MAP[key] };
  }
  return undefined;
}

/** Human-readable courier status text: `order.at-the-sorting-hub` → `At The Sorting Hub`. */
export function humanizePathaoEvent(event: unknown): string {
  return normalizePathaoEvent(event)
    .replace(/^(order|store)\./, '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
