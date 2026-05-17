INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Presence History', 'view-presence-history', 'presence-history', 'read', 'View office-wide presence history'),
  ('Manage Presence History', 'manage-presence-history', 'presence-history', 'update', 'Manage office-wide presence history')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-presence-history', 'manage-presence-history')
ON CONFLICT DO NOTHING;

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
  FROM admin_menu_items existing
  WHERE existing.path = '/admin/presence/history'
);

UPDATE admin_menu_items
SET title = COALESCE(NULLIF(title, ''), 'Presence History'),
    required_permissions = ARRAY['view-presence', 'view-presence-history', 'manage-presence-history']::text[],
    icon = 'FaHistory',
    updated_at = NOW()
WHERE path = '/admin/presence/history';

UPDATE admin_menu_items
SET path = '/admin/presence',
    icon = 'FaUser',
    updated_at = NOW()
WHERE parent_id IS NULL
  AND title = 'Presence'
  AND path IS NULL;
