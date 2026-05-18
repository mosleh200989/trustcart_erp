CREATE TABLE IF NOT EXISTS order_guard_settings (
  id integer PRIMARY KEY DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  window_minutes integer NOT NULL DEFAULT 10,
  block_note_html text NOT NULL DEFAULT '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT order_guard_settings_singleton CHECK (id = 1),
  CONSTRAINT order_guard_settings_window_positive CHECK (window_minutes > 0)
);

INSERT INTO order_guard_settings (id, is_active, window_minutes, block_note_html, created_at, updated_at)
VALUES (
  1,
  true,
  10,
  '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Order Guard', 'view-order-guard', 'settings', 'read', 'View duplicate order guard settings'),
  ('Manage Order Guard', 'manage-order-guard', 'settings', 'update', 'Update duplicate order guard window and customer-facing note')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-order-guard', 'manage-order-guard')
ON CONFLICT DO NOTHING;

WITH settings_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Settings'
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
  'Order Guard',
  'FaShieldAlt',
  '/admin/settings/order-guard',
  settings_parent.id,
  4,
  true,
  ARRAY['view-order-guard','manage-order-guard']::text[],
  NOW(),
  NOW()
FROM settings_parent
WHERE NOT EXISTS (
  SELECT 1 FROM admin_menu_items WHERE path = '/admin/settings/order-guard'
);

UPDATE admin_menu_items
SET required_permissions = ARRAY['manage-system-settings','view-system-settings','view-order-guard','manage-order-guard']::text[],
    updated_at = NOW()
WHERE parent_id IS NULL
  AND title = 'Settings';

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-order-guard','manage-order-guard']::text[],
    icon = 'FaShieldAlt',
    updated_at = NOW()
WHERE path = '/admin/settings/order-guard';
