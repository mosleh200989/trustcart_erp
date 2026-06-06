WITH reports_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Reports'
  ORDER BY id
  LIMIT 1
),
monthly_item AS (
  SELECT sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM reports_parent)
    AND path = '/admin/reports/agent-monthly'
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
  'Cross Sell Analysis',
  'FaChartBar',
  '/admin/reports/cross-sell-analysis',
  reports_parent.id,
  COALESCE((SELECT sort_order FROM monthly_item), 3) + 1,
  TRUE,
  ARRAY['view-sales-reports']::text[],
  NOW(),
  NOW()
FROM reports_parent
WHERE NOT EXISTS (
  SELECT 1 FROM admin_menu_items WHERE path = '/admin/reports/cross-sell-analysis'
);

UPDATE admin_menu_items
SET title = 'Cross Sell Analysis',
    icon = 'FaChartBar',
    required_permissions = ARRAY['view-sales-reports']::text[],
    is_active = TRUE,
    updated_at = NOW()
WHERE path = '/admin/reports/cross-sell-analysis';
