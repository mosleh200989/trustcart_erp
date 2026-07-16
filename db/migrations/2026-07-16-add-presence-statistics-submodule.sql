-- Add Presence Statistics sub-module and permission.

INSERT INTO permissions (name, slug, module, action, description)
VALUES (
  'View Presence Statistics',
  'view-presence-statistics',
  'presence',
  'read',
  'View employee presence statistics and export presence reports'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, stats_permission.id
FROM role_permissions rp
JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
JOIN permissions stats_permission ON stats_permission.slug = 'view-presence-statistics'
WHERE existing_permission.slug IN ('view-presence', 'manage-presence-settings')
ON CONFLICT DO NOTHING;

UPDATE admin_menu_items
SET title = 'Presence'
WHERE path IS NULL
  AND title = 'Check In/Out';

UPDATE admin_menu_items
SET title = 'Check In/Out'
WHERE path = '/admin/presence'
  AND title IN ('Dashboard', 'Presence');

WITH parent_menu AS (
  SELECT id
  FROM admin_menu_items
  WHERE path IS NULL
    AND title = 'Presence'
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
  'Statistics',
  'FaChartBar',
  '/admin/presence/statistics',
  parent_menu.id,
  50,
  true,
  ARRAY['view-presence-statistics', 'view-presence', 'manage-presence-settings']::text[],
  NOW(),
  NOW()
FROM parent_menu
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items
  WHERE path = '/admin/presence/statistics'
);

UPDATE admin_menu_items
SET
  title = 'Statistics',
  icon = 'FaChartBar',
  sort_order = 50,
  required_permissions = ARRAY['view-presence-statistics', 'view-presence', 'manage-presence-settings']::text[],
  updated_at = NOW()
WHERE path = '/admin/presence/statistics';
