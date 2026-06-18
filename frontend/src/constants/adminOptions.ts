export const CALL_OUTCOME_OPTIONS = [
  { value: 'connected', label: 'Connected - Spoke with customer' },
  { value: 'connected_disqualified', label: 'Connected but Discharged' },
  { value: 'connected_whatsapp', label: 'Connected on WhatsApp' },
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'unreachable', label: 'Unreachable' },
  { value: 'busy', label: 'Busy / Line Engaged' },
  { value: 'not_interested', label: 'Not Interested' },
] as const;

export type CallOutcomeValue = typeof CALL_OUTCOME_OPTIONS[number]['value'];

export const ORDER_REJECTION_REASON_OPTIONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'duplicate_order', label: 'Duplicate Order' },
  { value: 'fraud_detected', label: 'Fraud Detected' },
  { value: 'customer_unreachable', label: 'Customer Unreachable' },
  { value: 'customer_unwilling_to_pay_delivery_charge', label: 'Customer Unwilling to Pay Delivery Charge' },
  { value: 'refused_mandatory_cross_sell', label: 'Refused Mandatory Cross Sell' },
] as const;

export type OrderRejectionReasonValue = typeof ORDER_REJECTION_REASON_OPTIONS[number]['value'];

export const CALL_OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  CALL_OUTCOME_OPTIONS.map((option) => [option.value, option.label]),
);

export const ORDER_REJECTION_REASON_LABELS: Record<string, string> = Object.fromEntries(
  ORDER_REJECTION_REASON_OPTIONS.map((option) => [option.value, option.label]),
);
