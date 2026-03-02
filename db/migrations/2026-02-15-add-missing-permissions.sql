-- Migration: Add missing permissions for Commission, Team Management, Telephony, and granular Sales sub-modules
-- These permissions are used in backend controllers and frontend nav but were missing from the main seed

-- Commission permissions (used in commission.controller.ts)
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Manage Commission Settings', 'manage-commission-settings', 'crm', 'update', 'Create, update, delete commission settings'),
('View Commission Reports', 'view-commission-reports', 'crm', 'read', 'View commission reports and agent earnings'),
('Approve Commissions', 'approve-commissions', 'crm', 'update', 'Approve or reject pending commissions')
ON CONFLICT (slug) DO NOTHING;

-- Team management permission (used in crm-team.controller.ts)
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Manage Team Members', 'manage-team-members', 'crm', 'update', 'Manage team member configurations and dashboard settings')
ON CONFLICT (slug) DO NOTHING;

-- Telephony permissions (used in AdminLayout nav)
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Telephony', 'view-telephony', 'telephony', 'read', 'View telephony tasks, call logs, and follow-ups'),
('Manage Telephony', 'manage-telephony', 'telephony', 'update', 'Manage telephony tasks and PBX configuration')
ON CONFLICT (slug) DO NOTHING;

-- Granular Sales sub-module permissions
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Printing', 'view-printing', 'sales', 'read', 'View printing page and print invoices/stickers'),
('Manage Printing', 'manage-printing', 'sales', 'update', 'Mark invoices/stickers as printed, pack orders'),
('View Late Delivery', 'view-late-delivery', 'sales', 'read', 'View late delivery orders list'),
('Manage Late Delivery', 'manage-late-delivery', 'sales', 'update', 'Update status of late delivery orders'),
('View Sent Courier Orders', 'view-sent-courier-orders', 'sales', 'read', 'View sent courier orders list'),
('Manage Sent Courier Orders', 'manage-sent-courier-orders', 'sales', 'update', 'Update status of sent courier orders'),
('View Courier Returns', 'view-courier-returns', 'sales', 'read', 'View courier return orders'),
('Manage Courier Returns', 'manage-courier-returns', 'sales', 'update', 'Mark orders as courier returned'),
('View Incomplete Orders', 'view-incomplete-orders', 'sales', 'read', 'View incomplete/abandoned orders')
ON CONFLICT (slug) DO NOTHING;

-- Grant all new permissions to super-admin and admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
AND p.slug IN (
  'manage-commission-settings',
  'view-commission-reports',
  'approve-commissions',
  'manage-team-members',
  'view-telephony',
  'manage-telephony',
  'view-printing',
  'manage-printing',
  'view-late-delivery',
  'manage-late-delivery',
  'view-sent-courier-orders',
  'manage-sent-courier-orders',
  'view-courier-returns',
  'manage-courier-returns',
  'view-incomplete-orders'
)
ON CONFLICT DO NOTHING;

-- Grant relevant permissions to sales-team-leader
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'sales-team-leader'
AND p.slug IN (
  'view-commission-reports',
  'manage-team-members',
  'view-telephony',
  'view-printing',
  'manage-printing',
  'view-late-delivery',
  'manage-late-delivery',
  'view-sent-courier-orders',
  'manage-sent-courier-orders',
  'view-courier-returns',
  'manage-courier-returns',
  'view-incomplete-orders'
)
ON CONFLICT DO NOTHING;

-- Grant relevant permissions to sales-executive
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'sales-executive'
AND p.slug IN (
  'view-printing',
  'view-late-delivery',
  'view-sent-courier-orders',
  'view-courier-returns',
  'view-incomplete-orders'
)
ON CONFLICT DO NOTHING;
