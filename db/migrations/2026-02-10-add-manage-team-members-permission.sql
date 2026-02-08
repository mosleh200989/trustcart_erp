-- Migration: Add manage-team-members permission for Team Leaders
-- This permission allows Team Leaders to edit dashboard configurations

-- 1. Add the manage-team-members permission
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Manage Team Members', 'manage-team-members', 'crm', 'update', 'Manage team member configurations and dashboard settings')
ON CONFLICT (slug) DO NOTHING;

-- 2. Assign this permission to sales-team-leader role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'sales-team-leader'),
  (SELECT id FROM permissions WHERE slug = 'manage-team-members')
WHERE EXISTS (SELECT 1 FROM roles WHERE slug = 'sales-team-leader')
  AND EXISTS (SELECT 1 FROM permissions WHERE slug = 'manage-team-members')
ON CONFLICT DO NOTHING;

-- 3. Also assign to team-leader role if it exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'team-leader'),
  (SELECT id FROM permissions WHERE slug = 'manage-team-members')
WHERE EXISTS (SELECT 1 FROM roles WHERE slug = 'team-leader')
  AND EXISTS (SELECT 1 FROM permissions WHERE slug = 'manage-team-members')
ON CONFLICT DO NOTHING;

-- 4. Also assign to crm-team-leader role if it exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'crm-team-leader'),
  (SELECT id FROM permissions WHERE slug = 'manage-team-members')
WHERE EXISTS (SELECT 1 FROM roles WHERE slug = 'crm-team-leader')
  AND EXISTS (SELECT 1 FROM permissions WHERE slug = 'manage-team-members')
ON CONFLICT DO NOTHING;
