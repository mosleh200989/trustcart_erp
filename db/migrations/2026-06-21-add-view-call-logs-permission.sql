-- Add a dedicated permission for viewing call-log history.
-- Call-log creation remains controlled by existing page/action access.

INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Call Logs', 'view-call-logs', 'crm', 'read', 'View customer, telephony, and PBX call-log history')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

-- Keep administrators operational immediately. Other roles can be granted this from Role Permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug = 'view-call-logs'
ON CONFLICT DO NOTHING;

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-call-logs']::text[],
    updated_at = NOW()
WHERE path = '/admin/telephony/calls';
