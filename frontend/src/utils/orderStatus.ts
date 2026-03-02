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
  hold:              { label: 'On Hold',            color: 'bg-orange-100 text-orange-800' },
  cancelled:         { label: 'Cancelled',          color: 'bg-red-100 text-red-800' },
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
