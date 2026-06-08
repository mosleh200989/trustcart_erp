-- Simplify commission payment requests to a requested -> paid workflow.
-- Approved-but-unpaid requests remain actionable as requested payments.

UPDATE commission_payment_requests
SET status = 'pending',
    updated_at = NOW()
WHERE status = 'approved';

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_payment_requests_one_open_per_month
ON commission_payment_requests(agent_id, commission_month)
WHERE status = 'pending'
  AND commission_month IS NOT NULL;
