-- Add permission for editing product suggestions from the order details modal.
-- Users without this permission can still view the suggestion but cannot update it.

INSERT INTO permissions (name, slug, module, action, description) VALUES
('Update Order Product Suggestion', 'update-order-product-suggestion', 'sales', 'update', 'Update product suggestion in the admin order details modal')
ON CONFLICT (slug) DO NOTHING;

-- Keep admins operational immediately. Data Analyst access can be assigned from Role Permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug = 'update-order-product-suggestion'
ON CONFLICT DO NOTHING;
