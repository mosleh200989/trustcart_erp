WITH sales_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Sales'
  ORDER BY id
  LIMIT 1
),
cancelled_item AS (
  SELECT sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM sales_parent)
    AND path = '/admin/sales/cancelled-orders'
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
  'Rejected Orders',
  'FaBan',
  '/admin/sales/rejected-orders',
  sales_parent.id,
  COALESCE((SELECT sort_order FROM cancelled_item), 4) + 1,
  TRUE,
  ARRAY['view-sales-orders']::text[],
  NOW(),
  NOW()
FROM sales_parent
WHERE NOT EXISTS (
  SELECT 1 FROM admin_menu_items WHERE path = '/admin/sales/rejected-orders'
);

UPDATE admin_menu_items
SET title = 'Rejected Orders',
    icon = 'FaBan',
    required_permissions = ARRAY['view-sales-orders']::text[],
    is_active = TRUE,
    updated_at = NOW()
WHERE path = '/admin/sales/rejected-orders';
