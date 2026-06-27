export const CALL_OUTCOME_OPTIONS = [
  { value: 'connected', label: 'Connected - Talked to Customer', tone: 'default' },
  { value: 'customer_hung_up', label: 'Customer Hung Up / Call Cut', tone: 'default' },
  { value: 'whatsapp_message_sent', label: 'WhatsApp Message Sent', tone: 'whatsapp' },
  { value: 'order_confirmed', label: 'Order Confirmed', tone: 'success' },
  { value: 'callback_requested', label: 'Callback Requested (Call Later)', tone: 'default' },
  { value: 'no_answer', label: 'No Answer (Ringing)', tone: 'warning' },
  { value: 'line_busy', label: 'Line Busy', tone: 'default' },
  { value: 'not_interested', label: 'Not Interested', tone: 'danger' },
  { value: 'number_switched_off', label: 'Number Switched Off', tone: 'default' },
  { value: 'wrong_number', label: 'Wrong Number', tone: 'default' },
] as const;

export type CallOutcomeValue = typeof CALL_OUTCOME_OPTIONS[number]['value'];

export const ORDER_REJECTION_REASON_OPTIONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'duplicate_order', label: 'Duplicate Order' },
  { value: 'fraud_detected', label: 'Fraud Detected' },
  { value: 'customer_unreachable', label: 'Customer Unreachable' },
  { value: 'pickup_failed', label: 'Pickup Failed' },
  { value: 'customer_unwilling_to_pay_delivery_charge', label: 'Customer Unwilling to Pay Delivery Charge' },
  { value: 'refused_mandatory_cross_sell', label: 'Refused Mandatory Cross Sell' },
] as const;

export type OrderRejectionReasonValue = typeof ORDER_REJECTION_REASON_OPTIONS[number]['value'];

export const CALL_OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...CALL_OUTCOME_OPTIONS.map((option) => [option.value, option.label]),
    ['connected_disqualified', 'Customer Hung Up / Call Cut'],
    ['connected_whatsapp', 'WhatsApp Message Sent'],
    ['order_placed', 'Order Confirmed'],
    ['busy', 'Line Busy'],
    ['unreachable', 'Number Switched Off'],
  ],
);

export const CALL_OUTCOME_TONES: Record<string, string> = Object.fromEntries(
  [
    ...CALL_OUTCOME_OPTIONS.map((option) => [option.value, option.tone || 'default']),
    ['connected_disqualified', 'default'],
    ['connected_whatsapp', 'whatsapp'],
    ['order_placed', 'success'],
    ['busy', 'default'],
    ['unreachable', 'default'],
  ],
);

export const ORDER_REJECTION_REASON_LABELS: Record<string, string> = Object.fromEntries(
  ORDER_REJECTION_REASON_OPTIONS.map((option) => [option.value, option.label]),
);
