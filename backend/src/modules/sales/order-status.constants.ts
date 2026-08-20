/**
 * Canonical sales-order status values and the groupings the app reasons about.
 *
 * ## Why "hold" was split
 *
 * `hold` used to mean two unrelated things, which made the status ambiguous and
 * unusable for filtering:
 *
 *  - an order **we** paused before handing it to a courier (customer unreachable,
 *    payment unconfirmed, address being verified), and
 *  - an order **the courier** paused after pickup (`order.on-hold` /
 *    `order.delivery-failed` from Pathao, `hold` from Steadfast).
 *
 * They are now `customer_hold` and `courier_hold` respectively. The legacy `hold`
 * value is kept in the enum and in every read-side grouping below so historical
 * rows and any straggler writes still behave sensibly; nothing writes it any more.
 */

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  IN_REVIEW: 'in_review',
  SENT: 'sent',
  PICKED: 'picked',
  IN_TRANSIT: 'in_transit',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  PARTIAL_DELIVERED: 'partial_delivered',
  COMPLETED: 'completed',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  ADMIN_CANCELLED: 'admin_cancelled',
  PICKUP_FAILED: 'pickup_failed',
  UNKNOWN: 'unknown',

  /** Paused by us, before the parcel reaches a courier. */
  CUSTOMER_HOLD: 'customer_hold',
  /** Paused by the courier, after pickup. Driven by courier webhooks. */
  COURIER_HOLD: 'courier_hold',
  /** @deprecated Ambiguous legacy value — read-only, never written. */
  HOLD_LEGACY: 'hold',
} as const;

/** Every hold flavour, including the legacy ambiguous one. For read/filter paths. */
export const HOLD_STATUSES: string[] = [
  ORDER_STATUS.CUSTOMER_HOLD,
  ORDER_STATUS.COURIER_HOLD,
  ORDER_STATUS.HOLD_LEGACY,
];

/** Holds an agent can release back into the normal workflow. */
export const RELEASABLE_HOLD_STATUSES: string[] = [
  ORDER_STATUS.CUSTOMER_HOLD,
  ORDER_STATUS.HOLD_LEGACY,
];

/** Statuses that block a manual hold — the parcel is already with the courier. */
export const NOT_HOLDABLE_STATUSES: string[] = [
  ORDER_STATUS.SENT,
  ORDER_STATUS.PICKED,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.PARTIAL_DELIVERED,
  ORDER_STATUS.COURIER_HOLD,
];

/**
 * The parcel is physically with the courier and has not reached a final outcome.
 *
 * This is what the Late Delivery page lists. `pickup_failed` is deliberately absent:
 * the courier failed to collect it, so the parcel is back with us, not in transit.
 * Any delivered/returned/cancelled order drops off the list automatically.
 */
export const IN_COURIER_HANDS_STATUSES: string[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.SENT,
  ORDER_STATUS.PICKED,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.COURIER_HOLD,
];

/** Open orders — anything not yet delivered, returned or cancelled. */
export const ACTIVE_ORDER_STATUSES: string[] = [
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.PENDING,
  ORDER_STATUS.APPROVED,
  ORDER_STATUS.IN_REVIEW,
  ORDER_STATUS.SENT,
  ORDER_STATUS.PICKED,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.SHIPPED,
  ...HOLD_STATUSES,
];

/** Statuses the Pathao/courier polling reconciler should keep chasing. */
export const COURIER_SYNC_ELIGIBLE_STATUSES: string[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.APPROVED,
  ORDER_STATUS.SENT,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.PICKED,
  ORDER_STATUS.IN_TRANSIT,
  ...HOLD_STATUSES,
];

/** Accepted by the manual status-change endpoint. */
export const MANUALLY_SETTABLE_STATUSES: string[] = [
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.APPROVED,
  ORDER_STATUS.SENT,
  ORDER_STATUS.PENDING,
  ORDER_STATUS.IN_REVIEW,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.PICKED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.PARTIAL_DELIVERED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.ADMIN_CANCELLED,
  ORDER_STATUS.PICKUP_FAILED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.CUSTOMER_HOLD,
  ORDER_STATUS.COURIER_HOLD,
  ORDER_STATUS.HOLD_LEGACY,
];

/** Enum values this codebase requires; ensured at runtime on boot. */
export const REQUIRED_ORDER_STATUS_ENUM_VALUES: string[] = [
  ORDER_STATUS.PICKUP_FAILED,
  ORDER_STATUS.CUSTOMER_HOLD,
  ORDER_STATUS.COURIER_HOLD,
];

/** Quote a status list for inlining into a raw SQL `IN (...)`. */
export function sqlStatusList(statuses: string[]): string {
  return statuses.map((s) => `'${s}'`).join(', ');
}

/** True for any hold flavour, legacy included. */
export function isHoldStatus(status?: string | null): boolean {
  return HOLD_STATUSES.includes(String(status ?? '').trim().toLowerCase());
}
