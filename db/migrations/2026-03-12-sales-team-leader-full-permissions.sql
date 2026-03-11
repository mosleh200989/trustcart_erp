-- Migration: Grant commission-related permissions to Sales Team Leader EXCEPT approve-commissions
-- This migration is purely ADDITIVE - it only adds missing permissions, never removes existing ones.
-- Safe to re-run multiple times (uses ON CONFLICT DO NOTHING).

-- Grant commission permissions to sales-team-leader EXCEPT approve-commissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'sales-team-leader'),
  p.id
FROM permissions p
WHERE p.slug IN ('view-commission-reports', 'manage-commission-settings')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 
  'Sales Team Leader commission permissions after migration:' as info,
  COUNT(*) as total_permissions
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
WHERE r.slug = 'sales-team-leader';
