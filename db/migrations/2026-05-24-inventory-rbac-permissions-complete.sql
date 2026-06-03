-- Inventory RBAC completion
-- Purpose:
--   1. Ensure every permission used by Inventory, Warehouse, Supplier, and Purchase controllers exists.
--   2. Normalize module grouping so the Role Permission page presents a professional permission matrix.
--   3. Add safe default grants for built-in roles without removing any existing custom assignments.

BEGIN;

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Inventory', 'view-inventory', 'inventory', 'read', 'View inventory dashboard, alerts, rules, counts, adjustments, transfers, forecasts, and audit trail'),
  ('Manage Stock', 'manage-stock', 'inventory', 'update', 'Manage stock rules, counts, imports, forecasts, reservations, packaging, and operational inventory updates'),
  ('View Stock Levels', 'view-stock-levels', 'inventory', 'read', 'View product and warehouse stock levels'),
  ('Manage Stock Levels', 'manage-stock-levels', 'inventory', 'update', 'Manage stock level records and related stock settings'),
  ('View Stock Movements', 'view-stock-movements', 'inventory', 'read', 'View stock movement history and movement detail'),
  ('Manage Stock Movements', 'manage-stock-movements', 'inventory', 'create', 'Record stock movements'),
  ('View Stock Batches', 'view-stock-batches', 'inventory', 'read', 'View stock batches, batch detail, and expiring batches'),
  ('Manage Stock Batches', 'manage-stock-batches', 'inventory', 'update', 'Manage batch information and batch lifecycle'),
  ('Stock Adjustment', 'stock-adjustment', 'inventory', 'create', 'Create, update, and submit stock adjustments'),
  ('Approve Stock Adjustment', 'approve-stock-adjustment', 'inventory', 'approve', 'Approve or reject stock adjustments, transfers, and counts'),
  ('Stock Transfer', 'stock-transfer', 'inventory', 'create', 'Create, update, ship, receive, and cancel stock transfers'),
  ('View Stock Reports', 'view-stock-reports', 'inventory', 'read', 'View inventory reports, valuation, movement log, and stock analytics'),
  ('Batch Tracking', 'batch-tracking', 'inventory', 'read', 'View batch and expiry tracking information'),
  ('Create GRN', 'create-grn', 'inventory', 'create', 'Create goods receive notes from inventory workflows'),
  ('Receive Goods', 'receive-goods', 'inventory', 'create', 'Receive goods into stock from purchase workflows'),

  ('View Warehouses', 'view-warehouses', 'warehouse', 'read', 'View warehouse, zone, and location records'),
  ('Manage Warehouses', 'manage-warehouses', 'warehouse', 'update', 'Create, update, and remove warehouse, zone, and location records'),

  ('View Suppliers', 'view-suppliers', 'supplier', 'read', 'View supplier list, supplier detail, and supplier products'),
  ('Manage Suppliers', 'manage-suppliers', 'supplier', 'update', 'Create, update, and remove suppliers and supplier products'),
  ('Supplier Self Service', 'supplier-self-service', 'supplier', 'read', 'Access supplier self-service portal features'),

  ('View Purchase Orders', 'view-purchase-orders', 'purchase', 'read', 'View purchase order list and detail'),
  ('Create Purchase Orders', 'create-purchase-orders', 'purchase', 'create', 'Create purchase orders'),
  ('Edit Purchase Orders', 'edit-purchase-orders', 'purchase', 'update', 'Edit purchase orders'),
  ('Delete Purchase Orders', 'delete-purchase-orders', 'purchase', 'delete', 'Delete purchase orders'),
  ('Approve Purchase Orders', 'approve-purchase-orders', 'purchase', 'approve', 'Approve purchase orders')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

-- Full operational access for admin roles.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = ANY (ARRAY[
  'view-inventory', 'manage-stock', 'view-stock-levels', 'manage-stock-levels',
  'view-stock-movements', 'manage-stock-movements', 'view-stock-batches',
  'manage-stock-batches', 'stock-adjustment', 'approve-stock-adjustment',
  'stock-transfer', 'view-stock-reports', 'batch-tracking', 'create-grn',
  'receive-goods', 'view-warehouses', 'manage-warehouses', 'view-suppliers',
  'manage-suppliers', 'supplier-self-service', 'view-purchase-orders',
  'create-purchase-orders', 'edit-purchase-orders', 'delete-purchase-orders',
  'approve-purchase-orders'
])
WHERE r.slug IN ('super-admin', 'admin')
ON CONFLICT DO NOTHING;

-- Inventory manager can operate inventory end-to-end and load all supporting lookups.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = ANY (ARRAY[
  'view-products', 'view-inventory', 'manage-stock', 'view-stock-levels',
  'manage-stock-levels', 'view-stock-movements', 'manage-stock-movements',
  'view-stock-batches', 'manage-stock-batches', 'stock-adjustment',
  'approve-stock-adjustment', 'stock-transfer', 'view-stock-reports',
  'batch-tracking', 'create-grn', 'receive-goods', 'view-warehouses',
  'manage-warehouses', 'view-suppliers', 'view-purchase-orders'
])
WHERE r.slug = 'inventory-manager'
ON CONFLICT DO NOTHING;

-- Purchase manager can work purchase flows and load inventory/warehouse/supplier context.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = ANY (ARRAY[
  'view-products', 'view-purchase-orders', 'create-purchase-orders',
  'edit-purchase-orders', 'delete-purchase-orders', 'approve-purchase-orders',
  'view-suppliers', 'manage-suppliers', 'view-warehouses', 'view-inventory',
  'view-stock-levels', 'view-stock-batches', 'view-stock-reports',
  'create-grn', 'receive-goods'
])
WHERE r.slug = 'purchase-manager'
ON CONFLICT DO NOTHING;

-- Viewer receives read-only visibility so dashboards and reports load without write access.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = ANY (ARRAY[
  'view-products', 'view-inventory', 'view-stock-levels',
  'view-stock-movements', 'view-stock-batches', 'view-stock-reports',
  'batch-tracking', 'view-warehouses', 'view-suppliers',
  'view-purchase-orders'
])
WHERE r.slug = 'viewer'
ON CONFLICT DO NOTHING;

-- Sales users often need read-only stock visibility while taking orders.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = ANY (ARRAY[
  'view-inventory', 'view-stock-levels'
])
WHERE r.slug IN ('sales-executive', 'sales-team-leader')
ON CONFLICT DO NOTHING;

-- Supplier portal account gets only supplier self-service capability.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'supplier-self-service'
WHERE r.slug = 'supplier-account'
ON CONFLICT DO NOTHING;

-- Keep existing database-backed admin menu rows aligned with the corrected permission model.
DO $$
DECLARE
  inventory_menu_id integer;
BEGIN
  IF to_regclass('public.admin_menu_items') IS NOT NULL THEN
    UPDATE admin_menu_items
    SET path = NULL,
        icon = 'FaWarehouse',
        required_permissions = ARRAY['view-inventory', 'view-stock-levels', 'view-stock-reports', 'view-warehouses', 'view-suppliers'],
        updated_at = CURRENT_TIMESTAMP
    WHERE title = 'Inventory' AND parent_id IS NULL;

    SELECT id INTO inventory_menu_id
    FROM admin_menu_items
    WHERE title = 'Inventory' AND parent_id IS NULL
    ORDER BY id
    LIMIT 1;

    DELETE FROM admin_menu_items
    WHERE path IN (
      '/admin/inventory/transfers',
      '/admin/inventory/warehouse-map',
      '/admin/inventory/forecasts',
      '/admin/inventory/import',
      '/admin/inventory/barcode'
    );

    IF inventory_menu_id IS NOT NULL THEN
      DELETE FROM admin_menu_items WHERE parent_id = inventory_menu_id;
    END IF;

    UPDATE admin_menu_items
    SET required_permissions = ARRAY['view-inventory', 'view-stock-levels', 'view-stock-reports', 'view-warehouses', 'view-suppliers'],
        updated_at = CURRENT_TIMESTAMP
    WHERE title = 'Inventory' AND parent_id IS NULL;

    UPDATE admin_menu_items
    SET required_permissions = ARRAY['view-stock-reports', 'view-inventory'],
        updated_at = CURRENT_TIMESTAMP
    WHERE path = '/admin/reports?tab=inventory'
       OR path = '/admin/inventory/reports';

    UPDATE admin_menu_items
    SET required_permissions = ARRAY['view-inventory', 'view-warehouses'],
        updated_at = CURRENT_TIMESTAMP
    WHERE path = '/admin/inventory/warehouses';

    UPDATE admin_menu_items
    SET required_permissions = ARRAY['view-inventory', 'view-suppliers'],
        updated_at = CURRENT_TIMESTAMP
    WHERE path = '/admin/inventory/suppliers';

    UPDATE admin_menu_items
    SET required_permissions = ARRAY['view-inventory'],
        updated_at = CURRENT_TIMESTAMP
    WHERE path IN (
      '/admin/inventory',
      '/admin/inventory/alerts',
      '/admin/inventory/adjustments',
      '/admin/inventory/counts',
      '/admin/inventory/audit-trail',
      '/admin/inventory/available-products',
      '/admin/inventory/repacking',
      '/admin/inventory/packaging-conf'
    );

    IF inventory_menu_id IS NOT NULL THEN
      INSERT INTO admin_menu_items (title, icon, path, sort_order, is_active, required_permissions, parent_id, created_at, updated_at)
      VALUES
        ('Dashboard', 'FaTachometerAlt', '/admin/inventory', 0, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Available Products', 'FaBoxes', '/admin/inventory/available-products', 1, true, ARRAY['view-inventory', 'view-stock-levels'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Report', 'FaChartBar', '/admin/inventory/reports', 2, true, ARRAY['view-inventory', 'view-stock-reports'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Alerts', 'FaBell', '/admin/inventory/alerts', 3, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Inventory Count', 'FaClipboardCheck', '/admin/inventory/counts', 4, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Adjustments', 'FaSlidersH', '/admin/inventory/adjustments', 5, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Warehouse', 'FaWarehouse', '/admin/inventory/warehouses', 6, true, ARRAY['view-inventory', 'view-warehouses'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Supplier', 'FaTruck', '/admin/inventory/suppliers', 7, true, ARRAY['view-inventory', 'view-suppliers'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Repacking', 'FaRecycle', '/admin/inventory/repacking', 8, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Packaging Conf', 'FaBoxes', '/admin/inventory/packaging-conf', 9, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('Audit Trail', 'FaSearch', '/admin/inventory/audit-trail', 10, true, ARRAY['view-inventory'], inventory_menu_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
