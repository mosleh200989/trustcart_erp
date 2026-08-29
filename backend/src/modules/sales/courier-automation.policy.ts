/**
 * Which courier-reported statuses automation is allowed to write to an order.
 *
 * Couriers report the whole delivery lifecycle, but not every outcome should move an
 * order on its own. Progress states are safe — they only make our tracking match
 * reality. Terminal, money-affecting outcomes are not: an auto-applied `cancelled` or
 * `returned` silently writes off revenue, releases nothing, and gives no one a chance
 * to phone the customer or challenge the courier first.
 *
 * So automation applies the progress states and `delivered`, and *holds* the rest for
 * a human. A held status is never lost:
 *
 *  - `sales_orders.courier_status` still updates, so the UI can show
 *    "Order: In Transit — Courier says: Cancelled" side by side;
 *  - a `courier_tracking_history` row records the raw payload;
 *  - an activity-log entry with action_type `courier_status_held_for_review` makes the
 *    backlog queryable;
 *  - only `sales_orders.status` is left alone, so the order stays in the operational
 *    queues (Late Delivery included) until somebody decides.
 *
 * This governs every automated write path — the Pathao webhook, the Pathao polling
 * reconciler, and the Steadfast webhook — because a rule that covers one courier and
 * not the other is worse than no rule: ops cannot predict what the system will do.
 */

import { ORDER_STATUS } from './order-status.constants';

/**
 * Statuses a courier may apply on its own.
 *
 * `delivered` is here because it is the outcome the business wants automated. The rest
 * are in-flight progress states: applying them keeps tracking live and none of them
 * closes an order or settles money.
 *
 * `pickup_failed` is included as a progress state — the courier could not collect, so
 * the parcel is simply still with us. No money moves.
 */
export const AUTO_APPLIED_COURIER_STATUSES: string[] = [
  ORDER_STATUS.SENT,
  ORDER_STATUS.PICKED,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.COURIER_HOLD,
  ORDER_STATUS.PICKUP_FAILED,
  ORDER_STATUS.DELIVERED,
];

/**
 * Terminal outcomes that change what the business is owed. Recorded, surfaced, but
 * never written to the order by automation.
 *
 * `partial_delivered` is here alongside cancelled/returned because a partial delivery
 * settles a different COD amount than the order was placed for — the same
 * money-affecting category, and it needs the same human check.
 */
export const REVIEW_REQUIRED_COURIER_STATUSES: string[] = [
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.PARTIAL_DELIVERED,
];

/**
 * Read the effective allowlist.
 *
 * `COURIER_AUTO_APPLY_STATUSES` overrides it as a comma-separated list, so the policy
 * can be tightened ("only delivered") or loosened without a deploy. An empty or absent
 * value keeps the default above.
 */
export function getAutoAppliedCourierStatuses(): string[] {
  const configured = String(process.env.COURIER_AUTO_APPLY_STATUSES ?? '').trim();
  if (!configured) return AUTO_APPLIED_COURIER_STATUSES;
  const parsed = configured
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : AUTO_APPLIED_COURIER_STATUSES;
}

/** True when automation may write `status` to an order by itself. */
export function isAutoAppliableCourierStatus(status?: string | null): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return false;
  return getAutoAppliedCourierStatuses().includes(s);
}

/** Activity-log action_type for a courier status that automation refused to apply. */
export const COURIER_STATUS_HELD_ACTION = 'courier_status_held_for_review';
