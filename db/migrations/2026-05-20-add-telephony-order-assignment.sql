ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS telephony_called_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS telephony_call_status varchar(30) NULL,
  ADD COLUMN IF NOT EXISTS telephony_outcome varchar(50) NULL,
  ADD COLUMN IF NOT EXISTS telephony_suggestion varchar(100) NULL,
  ADD COLUMN IF NOT EXISTS telephony_notes text NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_assigned_call_status ON sales_orders(assigned_to, telephony_call_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_telephony_outcome ON sales_orders(telephony_outcome);

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Order Assignment', 'view-order-assignment', 'telephony', 'read', 'View assigned order calling queue in Telephony'),
  ('Manage Order Assignment', 'manage-order-assignment', 'telephony', 'update', 'Assign and unassign sales orders for telephony calling')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin', 'sales-manager')
  AND p.slug IN ('view-order-assignment', 'manage-order-assignment')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'sales-team-leader'
  AND p.slug IN ('view-order-assignment', 'manage-order-assignment')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'sales-executive'
  AND p.slug = 'view-order-assignment'
ON CONFLICT DO NOTHING;

WITH telephony_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Telephony'
  ORDER BY id
  LIMIT 1
),
last_child AS (
  SELECT COALESCE(MAX(sort_order), 0) AS sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM telephony_parent)
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
  'Order Assignment',
  'FaPhone',
  '/admin/telephony/order-assignment',
  telephony_parent.id,
  last_child.sort_order + 1,
  TRUE,
  ARRAY['view-order-assignment']::text[],
  NOW(),
  NOW()
FROM telephony_parent, last_child
WHERE NOT EXISTS (
  SELECT 1 FROM admin_menu_items WHERE path = '/admin/telephony/order-assignment'
);

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-order-assignment']::text[],
    icon = 'FaPhone',
    updated_at = NOW()
WHERE path = '/admin/telephony/order-assignment';
