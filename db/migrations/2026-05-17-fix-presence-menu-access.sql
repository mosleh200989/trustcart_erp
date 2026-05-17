UPDATE admin_menu_items
SET path = '/admin/presence',
    icon = 'FaUser',
    required_permissions = ARRAY[]::text[],
    updated_at = NOW()
WHERE parent_id IS NULL
  AND title = 'Presence';

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
  'Presence History',
  'FaHistory',
  '/admin/presence/history',
  NULL,
  COALESCE((SELECT sort_order FROM admin_menu_items WHERE path = '/admin/presence' ORDER BY id LIMIT 1), 0) + 1,
  TRUE,
  ARRAY['view-presence', 'view-presence-history', 'manage-presence-history']::text[],
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items
  WHERE path = '/admin/presence/history'
);

UPDATE admin_menu_items
SET title = 'Presence History',
    icon = 'FaHistory',
    parent_id = NULL,
    required_permissions = ARRAY['view-presence', 'view-presence-history', 'manage-presence-history']::text[],
    updated_at = NOW()
WHERE path = '/admin/presence/history';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-presence', 'view-presence-history', 'manage-presence-history', 'manage-presence-settings', 'sync-presence-sheet')
ON CONFLICT DO NOTHING;
