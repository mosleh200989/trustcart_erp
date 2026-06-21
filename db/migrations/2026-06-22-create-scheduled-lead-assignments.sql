-- Schedule future assign/unassign actions for CRM sales-manager lead assignment.

CREATE TABLE IF NOT EXISTS scheduled_lead_assignments (
  id BIGSERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('assign', 'unassign')),
  agent_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'cancelled')),
  scheduled_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_lead_assignments DROP CONSTRAINT IF EXISTS scheduled_lead_assignments_status_check;

ALTER TABLE scheduled_lead_assignments ADD CONSTRAINT scheduled_lead_assignments_status_check
  CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_scheduled_lead_assignments_customer
  ON scheduled_lead_assignments(customer_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_lead_assignments_pending_due
  ON scheduled_lead_assignments(status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_lead_assignments_filters
  ON scheduled_lead_assignments(status, action, agent_id, scheduled_at);
