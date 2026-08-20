-- CRM Restructuring & Tier Management System
-- Data Analyst direct lead assignment, manual Tier 1-6, notes permissions,
-- and rejected-customer recovery support.

BEGIN;

-- Direct Data Analyst -> Agent assignment metadata on customers.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_customers_assigned_by ON customers(assigned_by);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_at ON customers(assigned_at);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to_at ON customers(assigned_to, assigned_at);

-- Data Analyst role and permissions.
INSERT INTO roles (name, slug, description, priority, is_active, created_at, updated_at)
VALUES ('Data Analyst', 'data-analyst', 'Central CRM lead assignment and customer tier moderator', 80, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

INSERT INTO permissions (name, slug, module, action, description, created_at)
VALUES
  ('View Data Analyst Dashboard', 'view-data-analyst-dashboard', 'crm', 'view', 'View Data Analyst CRM dashboard and lead assignment screens', NOW()),
  ('Assign Leads as Data Analyst', 'assign-leads-data-analyst', 'crm', 'assign', 'Assign and reassign leads directly to sales agents', NOW()),
  ('Manage Customer Notes', 'manage-customer-notes', 'crm', 'manage', 'Edit and delete CRM customer notes', NOW())
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug IN (
  'view-data-analyst-dashboard',
  'assign-leads-data-analyst',
  'manage-customer-notes',
  'view-customers',
  'view-leads'
)
WHERE r.slug = 'data-analyst'
ON CONFLICT DO NOTHING;

-- Replace old purchase-count tiers with manual business tiers.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'customer_tiers'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tier%'
  LOOP
    EXECUTE format('ALTER TABLE customer_tiers DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE customer_tiers ALTER COLUMN tier SET DEFAULT 'tier_3';

UPDATE customer_tiers
SET tier = CASE
  WHEN tier = 'vip' THEN 'tier_1'
  WHEN tier = 'platinum' THEN 'tier_2'
  WHEN tier = 'gold' THEN 'tier_3'
  WHEN tier IN ('silver', 'repeat', 'new', 'normal') THEN 'tier_4'
  WHEN tier = 'blacklist' THEN 'tier_6'
  WHEN tier = 'rejected' THEN 'tier_6'
  WHEN tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6') THEN tier
  ELSE 'tier_3'
END,
is_active = true,
auto_assigned = false,
notes = CASE
  WHEN tier = 'rejected' THEN COALESCE(notes, '') || CASE WHEN notes IS NULL OR notes = '' THEN '' ELSE E'\n' END || 'Migrated from rejected list into active Tier 6 pool.'
  ELSE notes
END,
tier_assigned_at = NOW()
WHERE tier IS DISTINCT FROM CASE
  WHEN tier = 'vip' THEN 'tier_1'
  WHEN tier = 'platinum' THEN 'tier_2'
  WHEN tier = 'gold' THEN 'tier_3'
  WHEN tier IN ('silver', 'repeat', 'new', 'normal') THEN 'tier_4'
  WHEN tier = 'blacklist' THEN 'tier_6'
  WHEN tier = 'rejected' THEN 'tier_6'
  WHEN tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6') THEN tier
  ELSE 'tier_3'
END
OR auto_assigned = true;

ALTER TABLE customer_tiers
ADD CONSTRAINT customer_tiers_tier_manual_check
CHECK (tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6', 'rejected'));

-- Bulk restore existing rejected customers into the normal active customer pool.
UPDATE customers
SET customer_type = CASE WHEN customer_type = 'rejected' THEN 'new' ELSE customer_type END,
    lead_status = NULL,
    is_active = true,
    updated_at = NOW()
WHERE customer_type = 'rejected'
   OR EXISTS (
     SELECT 1
     FROM customer_tiers ct
     WHERE ct.customer_id = customers.id
       AND ct.tier = 'tier_6'
       AND COALESCE(ct.notes, '') ILIKE '%Migrated from rejected list%'
   );

COMMIT;
