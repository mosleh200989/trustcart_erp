-- Migration: Add granular landing page permissions
-- Previously all landing page endpoints used 'manage-system-settings'.
-- This creates dedicated permissions under the 'landing-pages' module
-- so they appear as their own section in the Role Permissions page.
--
-- SAFE FOR PRODUCTION: Uses ON CONFLICT DO NOTHING everywhere.
-- - Will NOT overwrite existing permissions or role assignments.
-- - Only inserts new permission rows if they don't already exist.
-- - Only grants to super-admin/admin if the grant doesn't already exist.

-- 1. Insert landing page permissions (skip if already present)
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Landing Pages', 'view-landing-pages', 'landing-pages', 'read', 'View landing pages list, details and statistics'),
('Manage Landing Pages', 'manage-landing-pages', 'landing-pages', 'update', 'Create, edit, duplicate and toggle landing pages'),
('Delete Landing Pages', 'delete-landing-pages', 'landing-pages', 'delete', 'Delete landing pages')
ON CONFLICT (slug) DO NOTHING;

-- 2. Grant all landing page permissions to super-admin and admin roles only.
--    ON CONFLICT DO NOTHING ensures we never touch existing role_permissions rows.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
AND p.slug IN (
  'view-landing-pages',
  'manage-landing-pages',
  'delete-landing-pages'
)
ON CONFLICT DO NOTHING;
