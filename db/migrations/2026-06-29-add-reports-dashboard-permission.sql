-- Add a dedicated permission for the Reports Dashboard page.
-- Safe for production: only inserts missing rows and grants to protected admin roles.

INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Reports Dashboard', 'view-reports-dashboard', 'reports', 'read', 'View the dedicated Reports Dashboard page and API')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'view-reports-dashboard'
WHERE r.slug IN ('super-admin', 'admin')
ON CONFLICT DO NOTHING;
