ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS assigned_to integer NULL,
  ADD COLUMN IF NOT EXISTS assigned_by integer NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS late_delivery_note text NULL,
  ADD COLUMN IF NOT EXISTS cancelled_order_note text NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_assigned_to ON sales_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_orders_assigned_by ON sales_orders(assigned_by);
CREATE INDEX IF NOT EXISTS idx_sales_orders_source_approval ON sales_orders(order_source, approved_at, status);

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Assigned Orders', 'view-assigned-orders', 'sales', 'read', 'View website and landing page orders waiting for assignment'),
  ('Manage Assigned Orders', 'manage-assigned-orders', 'sales', 'update', 'Assign, reassign, and unassign website and landing page orders')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin', 'sales-team-leader')
  AND p.slug IN ('view-assigned-orders', 'manage-assigned-orders')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'sales-executive'
  AND p.slug = 'view-assigned-orders'
ON CONFLICT DO NOTHING;

WITH sales_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Sales'
  ORDER BY id
  LIMIT 1
),
orders_item AS (
  SELECT sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM sales_parent)
    AND path = '/admin/sales'
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
  'Assigned Orders',
  'FaClipboardList',
  '/admin/sales/assigned-orders',
  sales_parent.id,
  COALESCE((SELECT sort_order FROM orders_item), 1) + 1,
  TRUE,
  ARRAY['view-assigned-orders']::text[],
  NOW(),
  NOW()
FROM sales_parent
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items
  WHERE path = '/admin/sales/assigned-orders'
);

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-assigned-orders']::text[],
    icon = 'FaClipboardList',
    updated_at = NOW()
WHERE path = '/admin/sales/assigned-orders';
