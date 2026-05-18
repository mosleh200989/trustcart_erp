CREATE TABLE IF NOT EXISTS dollar_consumption_calculations (
  id serial PRIMARY KEY,
  title varchar(160) NOT NULL,
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_name varchar(160) NULL,
  reference_no varchar(120) NULL,
  usd_amount numeric(15,4) NOT NULL DEFAULT 0,
  exchange_rate numeric(15,4) NOT NULL DEFAULT 0,
  bdt_amount numeric(15,2) NOT NULL DEFAULT 0,
  bank_charge numeric(15,2) NOT NULL DEFAULT 0,
  vat_amount numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  other_cost numeric(15,2) NOT NULL DEFAULT 0,
  total_bdt numeric(15,2) NOT NULL DEFAULT 0,
  effective_rate numeric(15,4) NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NULL,
  created_by integer NULL,
  updated_by integer NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dollar_consumption_date ON dollar_consumption_calculations(calculation_date);
CREATE INDEX IF NOT EXISTS idx_dollar_consumption_reference ON dollar_consumption_calculations(reference_no);

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Dollar Consumption', 'view-dollar-consumption', 'accounts', 'read', 'View dollar consumption calculations and summaries'),
  ('Create Dollar Consumption', 'create-dollar-consumption', 'accounts', 'create', 'Create dollar consumption calculations'),
  ('Edit Dollar Consumption', 'edit-dollar-consumption', 'accounts', 'update', 'Edit dollar consumption calculations'),
  ('Delete Dollar Consumption', 'delete-dollar-consumption', 'accounts', 'delete', 'Delete dollar consumption calculations'),
  ('Manage Dollar Consumption', 'manage-dollar-consumption', 'accounts', 'manage', 'Full access to dollar consumption calculations')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE (
    r.slug IN ('super-admin', 'admin', 'accounts', 'accountant')
    OR LOWER(r.name) IN ('super admin', 'admin', 'accounts', 'accountant')
  )
  AND p.slug IN (
    'view-dollar-consumption',
    'create-dollar-consumption',
    'edit-dollar-consumption',
    'delete-dollar-consumption',
    'manage-dollar-consumption'
  )
ON CONFLICT DO NOTHING;

WITH accounting_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Accounting'
  ORDER BY id
  LIMIT 1
)
UPDATE admin_menu_items
SET path = NULL,
    required_permissions = ARRAY[
      'view-financial-reports',
      'view-ledgers',
      'view-invoices',
      'view-dollar-consumption',
      'manage-dollar-consumption'
    ]::text[],
    updated_at = NOW()
WHERE id IN (SELECT id FROM accounting_parent);

WITH accounting_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Accounting'
  ORDER BY id
  LIMIT 1
)
INSERT INTO admin_menu_items (
  title,
  icon,
  path,
  parent_id,
  sort_order,
  is_active,
  required_permissions,
  created_at,
  updated_at
)
SELECT
  'Overview',
  'FaBook',
  '/admin/accounting',
  accounting_parent.id,
  1,
  TRUE,
  ARRAY['view-financial-reports','view-ledgers','view-invoices']::text[],
  NOW(),
  NOW()
FROM accounting_parent
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items
  WHERE parent_id = accounting_parent.id
    AND path = '/admin/accounting'
);

WITH accounting_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Accounting'
  ORDER BY id
  LIMIT 1
)
INSERT INTO admin_menu_items (
  title,
  icon,
  path,
  parent_id,
  sort_order,
  is_active,
  required_permissions,
  created_at,
  updated_at
)
SELECT
  'Dollar Consumption',
  'FaCalculator',
  '/admin/accounting/dollar-consumption',
  accounting_parent.id,
  2,
  TRUE,
  ARRAY['view-dollar-consumption','manage-dollar-consumption']::text[],
  NOW(),
  NOW()
FROM accounting_parent
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items
  WHERE path = '/admin/accounting/dollar-consumption'
);

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-dollar-consumption','manage-dollar-consumption']::text[],
    icon = 'FaCalculator',
    updated_at = NOW()
WHERE path = '/admin/accounting/dollar-consumption';
