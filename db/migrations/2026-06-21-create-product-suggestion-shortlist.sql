-- Product Suggestion Shortlist
-- Controls which products/variants appear in AdminSalesOrdersModal's Product Suggestion dropdown.

CREATE TABLE IF NOT EXISTS product_suggestion_shortlist (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NULL,
  variant_key TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT product_suggestion_shortlist_unique_entry UNIQUE (product_id, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_product_suggestion_shortlist_active_order
  ON product_suggestion_shortlist (is_active, display_order, created_at);

CREATE INDEX IF NOT EXISTS idx_product_suggestion_shortlist_product
  ON product_suggestion_shortlist (product_id);

INSERT INTO permissions (name, slug, module, action, description) VALUES
('Manage Product Suggestion Shortlist', 'manage-product-suggestion-shortlist', 'crm', 'update', 'Manage the product and variant shortlist used in order modal product suggestions')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug = 'manage-product-suggestion-shortlist'
ON CONFLICT DO NOTHING;

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-leads','view-customers','view-crm-reports','receive-new-leads','manage-product-suggestion-shortlist','update-order-product-suggestion']::text[],
    updated_at = NOW()
WHERE title = 'CRM' AND parent_id IS NULL;

INSERT INTO admin_menu_items (title, icon, path, sort_order, is_active, required_permissions, parent_id, created_at, updated_at)
SELECT
  'Product Suggestion Shortlist',
  'FaTags',
  '/admin/crm/product-suggestion-shortlist',
  COALESCE((SELECT MAX(sort_order) + 1 FROM admin_menu_items WHERE parent_id = crm.id), 0),
  TRUE,
  ARRAY['manage-product-suggestion-shortlist','update-order-product-suggestion']::text[],
  crm.id,
  NOW(),
  NOW()
FROM admin_menu_items crm
WHERE crm.title = 'CRM'
  AND crm.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_menu_items existing
    WHERE existing.path = '/admin/crm/product-suggestion-shortlist'
  );

UPDATE admin_menu_items
SET title = 'Product Suggestion Shortlist',
    icon = 'FaTags',
    required_permissions = ARRAY['manage-product-suggestion-shortlist','update-order-product-suggestion']::text[],
    updated_at = NOW()
WHERE path = '/admin/crm/product-suggestion-shortlist';
