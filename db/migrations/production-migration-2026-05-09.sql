-- =============================================================================
-- COMMISSION MODULE — PRODUCTION MIGRATION 2026-05-09
-- Only commission-related changes. Run on each DB:
--   psql -h <host> -U postgres -d trustcart_erp   -f production-migration-2026-05-09.sql
--   psql -h <host> -U postgres -d natural_glowra  -f production-migration-2026-05-09.sql
--   psql -h <host> -U postgres -d chinova_db       -f production-migration-2026-05-09.sql
-- All statements are idempotent (safe to re-run).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- [1] commission_payment_requests — add commission_month column
--
-- WHY: Paying April's commission in May was incorrectly deducting from May's
-- Unpaid Balance because the old code used paid_at date for month attribution.
-- This column stores WHICH month's commission a payment covers, regardless of
-- when the admin physically processed it.
-- -----------------------------------------------------------------------------

ALTER TABLE commission_payment_requests
  ADD COLUMN IF NOT EXISTS commission_month VARCHAR(7) DEFAULT NULL;

-- Backfill existing paid records: derive commission_month from paid_at
-- (Only affects records where commission_month is still NULL)
UPDATE commission_payment_requests
SET commission_month = TO_CHAR(DATE(paid_at AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM')
WHERE commission_month IS NULL
  AND paid_at IS NOT NULL
  AND status = 'paid';

-- -----------------------------------------------------------------------------
-- [2] Agent ↔ Team Leader history table
--
-- WHY: The TL commission report uses this table to correctly attribute
-- historical orders to the TL who was assigned at the time of the order.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_tl_history (
  id             SERIAL      PRIMARY KEY,
  agent_id       INT         NOT NULL,
  team_leader_id INT         NOT NULL,
  valid_from     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until    TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ath_agent ON agent_tl_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_ath_tl    ON agent_tl_history(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_ath_dates ON agent_tl_history(valid_from, valid_until);

-- Backfill: seed history from agents' current TL assignment
INSERT INTO agent_tl_history (agent_id, team_leader_id, valid_from, valid_until)
SELECT id, team_leader_id, '2020-01-01'::timestamptz, NULL
FROM users
WHERE team_leader_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- [3] Granular commission permissions
--
-- WHY: Fine-grained access control for each section of the commission module.
-- -----------------------------------------------------------------------------

INSERT INTO permissions (name, slug, module, action, description, created_at)
VALUES
  ('View Commission Settings', 'view-commission-settings', 'commission', 'read',   'View commission settings and slabs (read-only)',                      NOW()),
  ('View Commission Sales',    'view-commission-sales',    'commission', 'read',   'View commission sales data and order details',                        NOW()),
  ('Manage Commission Sales',  'manage-commission-sales',  'commission', 'update', 'Edit fields on commission sales rows',                                NOW()),
  ('View Agent Commissions',   'view-agent-commissions',   'commission', 'read',   'View agent commission reports and breakdowns',                        NOW()),
  ('Manage Agent Commissions', 'manage-agent-commissions', 'commission', 'update', 'Edit agent commission data (extra partial, adjustments)',             NOW()),
  ('View TL Commissions',      'view-tl-commissions',      'commission', 'read',   'View team-leader commission reports (admin/sales-manager only)',      NOW()),
  ('Manage TL Commissions',    'manage-tl-commissions',    'commission', 'update', 'Manage team-leader commission data',                                  NOW()),
  ('View Payment Requests',    'view-payment-requests',    'commission', 'read',   'View commission payment requests',                                    NOW()),
  ('Manage Payment Requests',  'manage-payment-requests',  'commission', 'update', 'Create, approve, pay, or reject commission payment requests',         NOW()),
  ('View Payment History',     'view-payment-history',     'commission', 'read',   'View commission payment history',                                     NOW()),
  ('View Payment Breakdown',   'view-payment-breakdown',   'commission', 'read',   'View agent payment breakdown (daily slab calculations)',               NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;
