-- Dedicated product history/audit trail for the Products module.

CREATE TABLE IF NOT EXISTS product_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NULL,
  product_name VARCHAR(255) NULL,
  product_sku VARCHAR(255) NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  action VARCHAR(80) NOT NULL,
  summary TEXT NOT NULL,
  changed_fields JSONB NULL,
  old_values JSONB NULL,
  new_values JSONB NULL,
  metadata JSONB NULL,
  performed_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  performed_by_name VARCHAR(255) NULL,
  ip_address VARCHAR(100) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_history_action ON product_history(action);
CREATE INDEX IF NOT EXISTS idx_product_history_entity_type ON product_history(entity_type);
CREATE INDEX IF NOT EXISTS idx_product_history_performed_by ON product_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_product_history_created_at ON product_history(created_at DESC);

INSERT INTO permissions (name, slug, module, action, description)
VALUES ('View Product History', 'view-product-history', 'products', 'read', 'View product change history and audit trail')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, ph.id
FROM role_permissions rp
INNER JOIN permissions vp ON vp.id = rp.permission_id AND vp.slug = 'view-products'
INNER JOIN permissions ph ON ph.slug = 'view-product-history'
ON CONFLICT DO NOTHING;

INSERT INTO admin_menu_items (
  title,
  icon,
  path,
  sort_order,
  is_active,
  required_permissions,
  parent_id,
  created_at,
  updated_at
)
SELECT
  'Product History',
  'FaHistory',
  '/admin/products/history',
  8,
  true,
  ARRAY['view-product-history','view-products']::text[],
  parent.id,
  NOW(),
  NOW()
FROM admin_menu_items parent
WHERE parent.title = 'Products'
  AND parent.path IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_menu_items existing WHERE existing.path = '/admin/products/history'
  )
LIMIT 1;

UPDATE admin_menu_items
SET
  title = 'Product History',
  icon = 'FaHistory',
  required_permissions = ARRAY['view-product-history','view-products']::text[],
  updated_at = NOW()
WHERE path = '/admin/products/history';
