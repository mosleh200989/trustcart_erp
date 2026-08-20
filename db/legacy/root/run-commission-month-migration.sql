-- Migration: Add commission_month to commission_payment_requests
-- This stores which month's commission the payment covers,
-- separate from paid_at (when the payment was physically made).

ALTER TABLE commission_payment_requests
  ADD COLUMN IF NOT EXISTS commission_month VARCHAR(7) DEFAULT NULL;

COMMENT ON COLUMN commission_payment_requests.commission_month IS
  'The commission month this payment covers, in YYYY-MM format (e.g. 2026-04). '
  'Allows paying April commission in May without it affecting May balance.';
