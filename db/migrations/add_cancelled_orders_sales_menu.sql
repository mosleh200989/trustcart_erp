-- Add Sales > Cancelled Orders menu item.
-- Run: psql -U postgres -d trustcart_erp -f db/migrations/add_cancelled_orders_sales_menu.sql

WITH sales_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Sales'
  ORDER BY id
  LIMIT 1
),
late_delivery AS (
  SELECT sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM sales_parent)
    AND path = '/admin/sales/late-delivery'
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
  'Cancelled Orders',
  'FaShoppingCart',
  '/admin/sales/cancelled-orders',
  sales_parent.id,
  COALESCE((SELECT sort_order FROM late_delivery), 3) + 1,
  TRUE,
  ARRAY['view-sales-orders']::text[],
  NOW(),
  NOW()
FROM sales_parent
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items
  WHERE path = '/admin/sales/cancelled-orders'
);
