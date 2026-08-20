/**
 * Centralized order status display mapping.
 *
 * The database may still store "pending" but we display a friendlier label
 * ("Awaiting Processing") to avoid confusion with legacy orders.
 */

export interface StatusConfig {
  label: string;
  color: string;         // Tailwind badge classes
}

export const ORDER_STATUS_MAP: Record<string, StatusConfig> = {
  processing:        { label: 'Processing',        color: 'bg-pink-100 text-pink-600' },
  approved:          { label: 'Approved',           color: 'bg-blue-100 text-blue-800' },
  sent:              { label: 'Sent',               color: 'bg-cyan-100 text-cyan-800' },
  pending:           { label: 'Pending',            color: 'bg-yellow-100 text-yellow-800' },
  in_review:         { label: 'In Review',          color: 'bg-amber-100 text-amber-800' },
  in_transit:        { label: 'In Transit',         color: 'bg-violet-100 text-violet-800' },
  picked:            { label: 'Picked',             color: 'bg-teal-100 text-teal-800' },
  partial_delivered:  { label: 'Partial Delivered',  color: 'bg-lime-100 text-lime-800' },
  shipped:           { label: 'Shipped',            color: 'bg-purple-100 text-purple-800' },
  delivered:         { label: 'Delivered',          color: 'bg-green-100 text-green-800' },
  completed:         { label: 'Completed',          color: 'bg-green-100 text-green-800' },
  customer_hold:     { label: 'Customer Hold',      color: 'bg-orange-100 text-orange-800' },
  courier_hold:      { label: 'Courier Hold',        color: 'bg-amber-200 text-amber-900' },
  /** @deprecated Legacy ambiguous value, kept so historical orders still render. */
  hold:              { label: 'On Hold (legacy)',    color: 'bg-orange-100 text-orange-800' },
  cancelled:         { label: 'Cancelled',          color: 'bg-red-100 text-red-800' },
  admin_cancelled:   { label: 'Order Rejected',     color: 'bg-red-200 text-red-900' },
  pickup_failed:     { label: 'Pickup Failed',      color: 'bg-rose-100 text-rose-800' },
  returned:          { label: 'Returned',           color: 'bg-gray-100 text-gray-800' },
  unknown:           { label: 'Unknown',            color: 'bg-gray-100 text-gray-800' },
};

const DEFAULT_CONFIG: StatusConfig = { label: '', color: 'bg-gray-100 text-gray-800' };

/** Get human-friendly display label for an order status. */
export function getOrderStatusLabel(status?: string | null): string {
  if (!status) return 'Unknown';
  return ORDER_STATUS_MAP[status.toLowerCase()]?.label || status;
}

/** Get Tailwind colour classes for an order status badge. */
export function getOrderStatusColor(status?: string | null): string {
  if (!status) return DEFAULT_CONFIG.color;
  return ORDER_STATUS_MAP[status.toLowerCase()]?.color || DEFAULT_CONFIG.color;
}

/** Get both label + color in one call. */
export function getOrderStatusConfig(status?: string | null): StatusConfig {
  if (!status) return { ...DEFAULT_CONFIG, label: 'Unknown' };
  return ORDER_STATUS_MAP[status.toLowerCase()] || { ...DEFAULT_CONFIG, label: status };
}

/**
 * Every hold flavour, including the legacy ambiguous `hold`.
 *
 * `hold` used to mean both "we paused this before it went to a courier" and "the
 * courier paused it after pickup". It is now split into `customer_hold` and
 * `courier_hold`; `hold` only ever appears on historical rows.
 */
export const HOLD_STATUSES = ['customer_hold', 'courier_hold', 'hold'] as const;

/** Holds an agent applied themselves, and can resume. */
export const RELEASABLE_HOLD_STATUSES = ['customer_hold', 'hold'] as const;

/**
 * Statuses meaning the parcel is with the courier and has no final outcome yet —
 * what the Late Delivery page lists. Delivered / returned / cancelled orders drop
 * off automatically, and `pickup_failed` is excluded because the parcel is back
 * with us rather than in transit.
 */
export const IN_COURIER_HANDS_STATUSES = [
  'pending', 'sent', 'picked', 'in_transit', 'shipped', 'courier_hold',
] as const;

export function isHoldStatus(status?: string | null): boolean {
  return (HOLD_STATUSES as readonly string[]).includes(String(status ?? '').toLowerCase());
}

export function isReleasableHoldStatus(status?: string | null): boolean {
  return (RELEASABLE_HOLD_STATUSES as readonly string[]).includes(String(status ?? '').toLowerCase());
}
