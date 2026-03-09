-- Migration: Add 'change-order-status' permission for manual order status updates
-- This permission controls who can manually change order status from the order details modal

INSERT INTO permissions (name, slug, module, action, description) VALUES
('Change Order Status', 'change-order-status', 'sales', 'update', 'Manually change order status from order details modal')
ON CONFLICT (slug) DO NOTHING;

-- Assign to Super Admin and Admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin') AND p.slug = 'change-order-status'
ON CONFLICT DO NOTHING;
