-- Per-call visibility controls for the Admin Sales Order modal.
-- Hidden logs remain visible to users with manage-call-log-visibility.

CREATE TABLE IF NOT EXISTS call_log_visibility (
  log_key VARCHAR(160) PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  hidden_from_sales_agents BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_log_visibility_customer
  ON call_log_visibility (customer_id, hidden_from_sales_agents);

CREATE TABLE IF NOT EXISTS call_log_visibility_history (
  id BIGSERIAL PRIMARY KEY,
  log_key VARCHAR(160) NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  hidden_from_sales_agents BOOLEAN NOT NULL,
  changed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_log_visibility_history_log
  ON call_log_visibility_history (log_key, changed_at DESC);

INSERT INTO permissions (name, slug, module, action, description)
VALUES (
  'Manage Call Log Visibility',
  'manage-call-log-visibility',
  'crm',
  'update',
  'Hide or reveal individual customer call logs for Sales Agents'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

-- Admins and Data Analysts receive the control initially. It remains configurable
-- from Role Permissions and is intentionally not granted to Sales Executives.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug IN ('super-admin', 'admin', 'data-analyst')
  AND p.slug IN ('view-call-logs', 'manage-call-log-visibility')
ON CONFLICT DO NOTHING;
