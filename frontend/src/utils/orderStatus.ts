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
  pending:    { label: 'Awaiting Processing', color: 'bg-yellow-100 text-yellow-800' },
  approved:   { label: 'Approved',            color: 'bg-blue-100 text-blue-800' },
  confirmed:  { label: 'Confirmed',           color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing',          color: 'bg-indigo-100 text-indigo-800' },
  preparing:  { label: 'Preparing',           color: 'bg-indigo-100 text-indigo-800' },
  printing:   { label: 'Printing',            color: 'bg-cyan-100 text-cyan-800' },
  shipped:    { label: 'Shipped',             color: 'bg-purple-100 text-purple-800' },
  delivered:  { label: 'Delivered',           color: 'bg-green-100 text-green-800' },
  completed:  { label: 'Completed',           color: 'bg-green-100 text-green-800' },
  hold:       { label: 'On Hold',             color: 'bg-orange-100 text-orange-800' },
  cancelled:  { label: 'Cancelled',           color: 'bg-red-100 text-red-800' },
  returned:   { label: 'Returned',            color: 'bg-gray-100 text-gray-800' },
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
