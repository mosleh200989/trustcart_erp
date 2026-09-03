-- 2026-09-04-data-access-log.sql
--
-- Who *read* customer data, and permission to export it.
--
-- audit_logs only ever recorded mutations (POST/PUT/PATCH/DELETE), and the CSV
-- export on the CRM customers page was built in the browser from data already
-- fetched — so the server saw neither. With 95,000 customer records, every one
-- carrying a phone number, and the list endpoint honouring any `limit` the
-- caller asked for, an account with view-customers could take the entire base in
-- one request and leave nothing behind. This table is the missing half of the
-- audit trail; the page-size cap and the server-side export close the hole it
-- was there to record.
--
-- Idempotent throughout; safe to re-run.

CREATE TABLE IF NOT EXISTS data_access_log (
  id           SERIAL PRIMARY KEY,
  user_id      integer REFERENCES users(id),
  user_name    varchar(190),                  -- denormalised: the reader may be deleted later
  resource     varchar(60)  NOT NULL,         -- customers | orders | ...
  action       varchar(20)  NOT NULL,         -- list | view | export | search
  record_count integer      NOT NULL DEFAULT 0,
  record_id    varchar(100),                  -- set for single-record reads
  filters      jsonb        NOT NULL DEFAULT '{}',  -- query string, minus paging noise
  endpoint     varchar(300),
  ip_address   varchar(100),
  user_agent   text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE data_access_log IS
  'One row per read of sensitive data: who saw how many records, with which filters, from where.';

CREATE INDEX IF NOT EXISTS idx_data_access_user     ON data_access_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_resource ON data_access_log (resource, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_created  ON data_access_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_action   ON data_access_log (action);
CREATE INDEX IF NOT EXISTS idx_data_access_volume   ON data_access_log (record_count DESC);

-- ============================================================ RBAC

INSERT INTO permissions (name, slug, module, action, description) VALUES
  ('Export Customers',      'export-customers',      'customers',   'export',
   'Download customer lists as CSV. Every export is recorded with who ran it, the filters used and the row count'),
  ('View Data Access Log',  'view-data-access-log',  'data-access', 'read',
   'See who has been reading and exporting customer data, and in what volume')
ON CONFLICT (slug) DO NOTHING;

-- Deliberately narrow. Exporting the customer base used to be available to
-- anyone who could open the page; it now has to be granted, per role, from the
-- Role Permissions page.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('export-customers', 'view-data-access-log')
ON CONFLICT DO NOTHING;
