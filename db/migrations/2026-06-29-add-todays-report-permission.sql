-- Add a dedicated permission for the Today's Report page.
-- Safe for production: only inserts missing rows and grants to protected admin roles.

INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Today''s Report', 'view-todays-report', 'reports', 'read', 'View the dedicated Today''s Report page and daily report API')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'view-todays-report'
WHERE r.slug IN ('super-admin', 'admin')
ON CONFLICT DO NOTHING;
