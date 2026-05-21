INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Order Guard', 'view-order-guard', 'settings', 'read', 'View duplicate order guard settings'),
  ('Manage Order Guard', 'manage-order-guard', 'settings', 'update', 'Update duplicate order guard window and customer-facing note')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, pog.id
FROM role_permissions rp
INNER JOIN permissions ps ON ps.id = rp.permission_id
INNER JOIN permissions pog ON pog.slug IN ('view-order-guard', 'manage-order-guard')
WHERE ps.slug = 'manage-system-settings'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, pog.id
FROM role_permissions rp
INNER JOIN permissions ps ON ps.id = rp.permission_id
INNER JOIN permissions pog ON pog.slug = 'view-order-guard'
WHERE ps.slug = 'view-system-settings'
ON CONFLICT DO NOTHING;
