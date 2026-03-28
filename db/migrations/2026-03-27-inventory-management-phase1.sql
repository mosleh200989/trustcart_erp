-- ============================================================================
-- Inventory Management System — Phase 1: Foundation Tables
-- Date: 2026-03-27
-- Description: Creates core IMS tables: warehouses, zones, locations,
--              suppliers, supplier_products, stock_levels, stock_batches,
--              stock_movements, stock_reservations, stock_alerts,
--              stock_transfers, stock_transfer_items, stock_adjustments,
--              stock_adjustment_items, inventory_counts, inventory_count_items,
--              reorder_rules, purchase_orders, purchase_order_items,
--              goods_received_notes, grn_items
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────
-- DROP old tables (reverse dependency order) so we
-- can recreate them cleanly.  CASCADE handles FKs.
-- ──────────────────────────────────────────────────
DROP TABLE IF EXISTS grn_items                CASCADE;
DROP TABLE IF EXISTS goods_received_notes     CASCADE;
DROP TABLE IF EXISTS purchase_order_items     CASCADE;
DROP TABLE IF EXISTS purchase_orders          CASCADE;
DROP TABLE IF EXISTS inventory_count_items    CASCADE;
DROP TABLE IF EXISTS inventory_counts         CASCADE;
DROP TABLE IF EXISTS reorder_rules            CASCADE;
DROP TABLE IF EXISTS stock_adjustment_items   CASCADE;
DROP TABLE IF EXISTS stock_adjustments        CASCADE;
DROP TABLE IF EXISTS stock_transfer_items     CASCADE;
DROP TABLE IF EXISTS stock_transfers          CASCADE;
DROP TABLE IF EXISTS stock_alerts             CASCADE;
DROP TABLE IF EXISTS stock_reservations       CASCADE;
DROP TABLE IF EXISTS stock_movements          CASCADE;
DROP TABLE IF EXISTS stock_levels             CASCADE;
DROP TABLE IF EXISTS stock_batches            CASCADE;
DROP TABLE IF EXISTS supplier_products        CASCADE;
DROP TABLE IF EXISTS suppliers                CASCADE;
DROP TABLE IF EXISTS warehouse_locations      CASCADE;
DROP TABLE IF EXISTS warehouse_zones          CASCADE;
DROP TABLE IF EXISTS warehouses               CASCADE;

-- ──────────────────────────────────────────────────
-- 1. warehouses
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL UNIQUE,
    name            VARCHAR(150) NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'main',
    address         TEXT,
    city            VARCHAR(100),
    district        VARCHAR(100),
    country         VARCHAR(50)  DEFAULT 'Bangladesh',
    phone           VARCHAR(30),
    email           VARCHAR(255),
    manager_id      INT REFERENCES users(id) ON DELETE SET NULL,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    total_area_sqft DECIMAL(10,2),
    is_active       BOOLEAN DEFAULT true,
    is_default      BOOLEAN DEFAULT false,
    operating_hours JSONB,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active);

-- ──────────────────────────────────────────────────
-- 2. warehouse_zones
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_zones (
    id              SERIAL PRIMARY KEY,
    warehouse_id    INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'ambient',
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    humidity_min    DECIMAL(5,2),
    humidity_max    DECIMAL(5,2),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_zones_warehouse_id ON warehouse_zones(warehouse_id);

-- ──────────────────────────────────────────────────
-- 3. warehouse_locations
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id              SERIAL PRIMARY KEY,
    warehouse_id    INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone_id         INT REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    code            VARCHAR(30)  NOT NULL,
    aisle           VARCHAR(10),
    rack            VARCHAR(10),
    shelf           VARCHAR(10),
    bin             VARCHAR(10),
    location_type   VARCHAR(30)  DEFAULT 'storage',
    max_weight_kg   DECIMAL(10,2),
    max_volume_m3   DECIMAL(10,4),
    is_active       BOOLEAN DEFAULT true,
    barcode         VARCHAR(50) UNIQUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_wh_locations_warehouse ON warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_locations_code ON warehouse_locations(code);
CREATE INDEX IF NOT EXISTS idx_wh_locations_barcode ON warehouse_locations(barcode);

-- ──────────────────────────────────────────────────
-- 4. suppliers
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id                  SERIAL PRIMARY KEY,
    code                VARCHAR(20)  NOT NULL UNIQUE,
    company_name        VARCHAR(200) NOT NULL,
    company_name_bn     VARCHAR(200),
    contact_person      VARCHAR(150),
    email               VARCHAR(255),
    phone               VARCHAR(30),
    alt_phone           VARCHAR(30),
    address             TEXT,
    city                VARCHAR(100),
    district            VARCHAR(100),
    country             VARCHAR(50)  DEFAULT 'Bangladesh',
    tax_id              VARCHAR(50),
    trade_license       VARCHAR(50),
    bank_name           VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_branch         VARCHAR(100),
    payment_terms       VARCHAR(50)  DEFAULT 'net_30',
    credit_limit        DECIMAL(12,2),
    lead_time_days      INT DEFAULT 3,
    rating              DECIMAL(3,2),
    total_orders        INT DEFAULT 0,
    total_amount        DECIMAL(15,2) DEFAULT 0,
    category            VARCHAR(50),
    certifications      JSONB DEFAULT '[]',
    notes               TEXT,
    status              VARCHAR(20)  DEFAULT 'active',
    is_active           BOOLEAN DEFAULT true,
    user_id             INT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON suppliers(company_name);

-- ──────────────────────────────────────────────────
-- 5. supplier_products
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_products (
    id                  SERIAL PRIMARY KEY,
    supplier_id         INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id          INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key         VARCHAR(100),
    supplier_sku        VARCHAR(50),
    unit_price          DECIMAL(10,2) NOT NULL,
    min_order_quantity  INT DEFAULT 1,
    lead_time_days      INT,
    is_preferred        BOOLEAN DEFAULT false,
    is_active           BOOLEAN DEFAULT true,
    last_supplied_at    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_product_variant
    ON supplier_products (supplier_id, product_id, COALESCE(variant_key, ''));

-- ──────────────────────────────────────────────────
-- 6. stock_batches
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_batches (
    id                  SERIAL PRIMARY KEY,
    batch_number        VARCHAR(50)  NOT NULL,
    lot_number          VARCHAR(50),
    product_id          INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key         VARCHAR(100),
    supplier_id         INT REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_order_id   INT,
    grn_id              INT,
    warehouse_id        INT REFERENCES warehouses(id) ON DELETE SET NULL,
    manufacturing_date  DATE,
    expiry_date         DATE,
    received_date       DATE NOT NULL,
    initial_quantity    INT NOT NULL,
    remaining_quantity  INT NOT NULL,
    cost_price          DECIMAL(10,2) NOT NULL,
    status              VARCHAR(20)  DEFAULT 'available',
    quality_status      VARCHAR(20)  DEFAULT 'accepted',
    quality_notes       TEXT,
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(batch_number, product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_product ON stock_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batch_expiry ON stock_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batch_status ON stock_batches(status);
CREATE INDEX IF NOT EXISTS idx_batch_number ON stock_batches(batch_number);

-- ──────────────────────────────────────────────────
-- 7. stock_levels
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_levels (
    id                  SERIAL PRIMARY KEY,
    product_id          INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key         VARCHAR(100),
    warehouse_id        INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id         INT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    batch_id            INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    quantity            INT NOT NULL DEFAULT 0,
    reserved_quantity   INT DEFAULT 0,
    available_quantity  INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    damaged_quantity    INT DEFAULT 0,
    cost_price          DECIMAL(10,2),
    last_counted_at     TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_level_unique
    ON stock_levels (product_id, COALESCE(variant_key, ''), warehouse_id, COALESCE(location_id, 0), COALESCE(batch_id, 0));

CREATE INDEX IF NOT EXISTS idx_stock_product_warehouse ON stock_levels(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_batch ON stock_levels(batch_id);

-- ──────────────────────────────────────────────────
-- 8. stock_movements
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
    id                       SERIAL PRIMARY KEY,
    reference_number         VARCHAR(50)  NOT NULL UNIQUE,
    movement_type            VARCHAR(30)  NOT NULL,
    product_id               INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key              VARCHAR(100),
    batch_id                 INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    source_warehouse_id      INT REFERENCES warehouses(id) ON DELETE SET NULL,
    source_location_id       INT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    destination_warehouse_id INT REFERENCES warehouses(id) ON DELETE SET NULL,
    destination_location_id  INT REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    quantity                 INT NOT NULL,
    unit_cost                DECIMAL(10,2),
    total_cost               DECIMAL(12,2),
    balance_before           INT,
    balance_after            INT,
    reason                   VARCHAR(255),
    notes                    TEXT,
    related_document_type    VARCHAR(30),
    related_document_id      INT,
    performed_by             INT NOT NULL REFERENCES users(id),
    approved_by              INT REFERENCES users(id),
    created_at               TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movement_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movement_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movement_ref ON stock_movements(reference_number);
CREATE INDEX IF NOT EXISTS idx_movement_related_doc ON stock_movements(related_document_type, related_document_id);

-- ──────────────────────────────────────────────────
-- 9. stock_reservations
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_reservations (
    id              SERIAL PRIMARY KEY,
    product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key     VARCHAR(100),
    warehouse_id    INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    batch_id        INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    sales_order_id  INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    quantity        INT NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    reserved_at     TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP,
    fulfilled_at    TIMESTAMP,
    released_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservation_product_warehouse ON stock_reservations(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reservation_order ON stock_reservations(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_reservation_status ON stock_reservations(status);

-- ──────────────────────────────────────────────────
-- 10. stock_alerts
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_alerts (
    id              SERIAL PRIMARY KEY,
    alert_type      VARCHAR(30)  NOT NULL,
    product_id      INT REFERENCES products(id) ON DELETE CASCADE,
    variant_key     VARCHAR(100),
    warehouse_id    INT REFERENCES warehouses(id) ON DELETE SET NULL,
    batch_id        INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    message         TEXT NOT NULL,
    severity        VARCHAR(10)  NOT NULL,
    is_read         BOOLEAN DEFAULT false,
    is_resolved     BOOLEAN DEFAULT false,
    resolved_by     INT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMP,
    resolution_notes VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 11. stock_transfers
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_transfers (
    id                       SERIAL PRIMARY KEY,
    transfer_number          VARCHAR(50)  NOT NULL UNIQUE,
    source_warehouse_id      INT NOT NULL REFERENCES warehouses(id),
    destination_warehouse_id INT NOT NULL REFERENCES warehouses(id),
    status                   VARCHAR(20) DEFAULT 'draft',
    priority                 VARCHAR(10) DEFAULT 'normal',
    requested_by             INT NOT NULL REFERENCES users(id),
    requested_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_by              INT REFERENCES users(id),
    approved_at              TIMESTAMP,
    shipped_by               INT REFERENCES users(id),
    shipped_at               TIMESTAMP,
    received_by              INT REFERENCES users(id),
    received_at              TIMESTAMP,
    notes                    TEXT,
    created_at               TIMESTAMP DEFAULT NOW(),
    updated_at               TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 12. stock_transfer_items
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id                      SERIAL PRIMARY KEY,
    transfer_id             INT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id              INT NOT NULL REFERENCES products(id),
    variant_key             VARCHAR(100),
    batch_id                INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    quantity_requested      INT NOT NULL,
    quantity_shipped        INT DEFAULT 0,
    quantity_received       INT DEFAULT 0,
    source_location_id      INT REFERENCES warehouse_locations(id),
    destination_location_id INT REFERENCES warehouse_locations(id),
    notes                   VARCHAR(255),
    created_at              TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 13. stock_adjustments
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id                  SERIAL PRIMARY KEY,
    adjustment_number   VARCHAR(50)  NOT NULL UNIQUE,
    warehouse_id        INT NOT NULL REFERENCES warehouses(id),
    adjustment_type     VARCHAR(30)  NOT NULL,
    status              VARCHAR(20)  DEFAULT 'draft',
    reason              VARCHAR(255) NOT NULL,
    notes               TEXT,
    total_value_impact  DECIMAL(12,2) DEFAULT 0,
    created_by          INT NOT NULL REFERENCES users(id),
    approved_by         INT REFERENCES users(id),
    approved_at         TIMESTAMP,
    rejected_by         INT REFERENCES users(id),
    rejected_at         TIMESTAMP,
    rejection_reason    VARCHAR(255),
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 14. stock_adjustment_items
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id              SERIAL PRIMARY KEY,
    adjustment_id   INT NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    product_id      INT NOT NULL REFERENCES products(id),
    variant_key     VARCHAR(100),
    batch_id        INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    location_id     INT REFERENCES warehouse_locations(id),
    quantity_before INT NOT NULL,
    quantity_after  INT NOT NULL,
    quantity_change INT NOT NULL,
    unit_cost       DECIMAL(10,2),
    value_impact    DECIMAL(12,2),
    reason          VARCHAR(255)
);

-- ──────────────────────────────────────────────────
-- 15. inventory_counts
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_counts (
    id                      SERIAL PRIMARY KEY,
    count_number            VARCHAR(50)  NOT NULL UNIQUE,
    warehouse_id            INT NOT NULL REFERENCES warehouses(id),
    count_type              VARCHAR(20)  NOT NULL,
    scope_zone_id           INT REFERENCES warehouse_zones(id),
    scope_category_id       INT,
    status                  VARCHAR(20)  DEFAULT 'planned',
    started_by              INT REFERENCES users(id),
    started_at              TIMESTAMP,
    completed_at            TIMESTAMP,
    approved_by             INT REFERENCES users(id),
    approved_at             TIMESTAMP,
    total_items_counted     INT DEFAULT 0,
    total_variances         INT DEFAULT 0,
    total_variance_value    DECIMAL(12,2) DEFAULT 0,
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 16. inventory_count_items
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_count_items (
    id                  SERIAL PRIMARY KEY,
    count_id            INT NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
    product_id          INT NOT NULL REFERENCES products(id),
    variant_key         VARCHAR(100),
    location_id         INT REFERENCES warehouse_locations(id),
    batch_id            INT REFERENCES stock_batches(id) ON DELETE SET NULL,
    system_quantity     INT NOT NULL,
    counted_quantity    INT,
    variance            INT GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_value      DECIMAL(12,2),
    variance_reason     VARCHAR(255),
    counted_by          INT REFERENCES users(id),
    counted_at          TIMESTAMP,
    verified_by         INT REFERENCES users(id),
    verified_quantity   INT,
    status              VARCHAR(20) DEFAULT 'pending'
);

-- ──────────────────────────────────────────────────
-- 17. reorder_rules
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_rules (
    id                      SERIAL PRIMARY KEY,
    product_id              INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_key             VARCHAR(100),
    warehouse_id            INT REFERENCES warehouses(id) ON DELETE SET NULL,
    reorder_point           INT NOT NULL,
    reorder_quantity        INT NOT NULL,
    max_stock_level         INT,
    safety_stock            INT DEFAULT 0,
    lead_time_days          INT DEFAULT 3,
    preferred_supplier_id   INT REFERENCES suppliers(id) ON DELETE SET NULL,
    auto_reorder            BOOLEAN DEFAULT false,
    is_active               BOOLEAN DEFAULT true,
    last_triggered_at       TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reorder_rule_unique
    ON reorder_rules (product_id, COALESCE(variant_key, ''), COALESCE(warehouse_id, 0));

-- ──────────────────────────────────────────────────
-- 18. purchase_orders
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
    id                      SERIAL PRIMARY KEY,
    po_number               VARCHAR(50)  NOT NULL UNIQUE,
    supplier_id             INT NOT NULL REFERENCES suppliers(id),
    warehouse_id            INT NOT NULL REFERENCES warehouses(id),
    status                  VARCHAR(20)  NOT NULL DEFAULT 'draft',
    priority                VARCHAR(10)  DEFAULT 'normal',
    order_date              DATE NOT NULL,
    expected_delivery_date  DATE,
    actual_delivery_date    DATE,
    subtotal                DECIMAL(12,2) DEFAULT 0,
    tax_amount              DECIMAL(12,2) DEFAULT 0,
    shipping_cost           DECIMAL(10,2) DEFAULT 0,
    discount_amount         DECIMAL(10,2) DEFAULT 0,
    total_amount            DECIMAL(12,2) DEFAULT 0,
    payment_status          VARCHAR(20)  DEFAULT 'unpaid',
    payment_terms           VARCHAR(50),
    payment_due_date        DATE,
    currency                VARCHAR(3) DEFAULT 'BDT',
    notes                   TEXT,
    internal_notes          TEXT,
    terms_and_conditions    TEXT,
    created_by              INT NOT NULL REFERENCES users(id),
    approved_by             INT REFERENCES users(id),
    approved_at             TIMESTAMP,
    cancelled_by            INT REFERENCES users(id),
    cancelled_at            TIMESTAMP,
    cancel_reason           VARCHAR(255),
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 19. purchase_order_items
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id                      SERIAL PRIMARY KEY,
    purchase_order_id       INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id              INT NOT NULL REFERENCES products(id),
    variant_key             VARCHAR(100),
    description             VARCHAR(500),
    quantity_ordered        INT NOT NULL,
    quantity_received       INT DEFAULT 0,
    unit_price              DECIMAL(10,2) NOT NULL,
    tax_rate                DECIMAL(5,2) DEFAULT 0,
    tax_amount              DECIMAL(10,2) DEFAULT 0,
    discount_amount         DECIMAL(10,2) DEFAULT 0,
    line_total              DECIMAL(12,2) NOT NULL,
    expected_delivery_date  DATE,
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 20. goods_received_notes
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id                      SERIAL PRIMARY KEY,
    grn_number              VARCHAR(50)  NOT NULL UNIQUE,
    purchase_order_id       INT REFERENCES purchase_orders(id),
    supplier_id             INT NOT NULL REFERENCES suppliers(id),
    warehouse_id            INT NOT NULL REFERENCES warehouses(id),
    received_by             INT NOT NULL REFERENCES users(id),
    received_date           TIMESTAMP NOT NULL,
    status                  VARCHAR(20)  DEFAULT 'draft',
    invoice_number          VARCHAR(50),
    invoice_date            DATE,
    delivery_note_number    VARCHAR(50),
    vehicle_number          VARCHAR(30),
    driver_name             VARCHAR(100),
    notes                   TEXT,
    quality_check_required  BOOLEAN DEFAULT true,
    quality_checked_by      INT REFERENCES users(id),
    quality_checked_at      TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- 21. grn_items
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grn_items (
    id                      SERIAL PRIMARY KEY,
    grn_id                  INT NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
    po_item_id              INT REFERENCES purchase_order_items(id),
    product_id              INT NOT NULL REFERENCES products(id),
    variant_key             VARCHAR(100),
    quantity_expected       INT,
    quantity_received       INT NOT NULL,
    quantity_accepted       INT DEFAULT 0,
    quantity_rejected       INT DEFAULT 0,
    rejection_reason        VARCHAR(255),
    batch_number            VARCHAR(50),
    lot_number              VARCHAR(50),
    manufacturing_date      DATE,
    expiry_date             DATE,
    unit_cost               DECIMAL(10,2) NOT NULL,
    location_id             INT REFERENCES warehouse_locations(id),
    quality_status          VARCHAR(20) DEFAULT 'pending',
    quality_notes           TEXT,
    temperature_on_arrival  DECIMAL(5,2),
    created_at              TIMESTAMP DEFAULT NOW()
);

-- ──────────────────────────────────────────────────
-- IMS Permissions
-- ──────────────────────────────────────────────────
INSERT INTO permissions (slug, name, module, action, description, created_at) VALUES
    ('view-warehouses',       'View Warehouses',        'warehouse', 'read',   'View warehouse list and details',     NOW()),
    ('manage-warehouses',     'Manage Warehouses',      'warehouse', 'manage', 'Create, edit, and delete warehouses', NOW()),
    ('view-suppliers',        'View Suppliers',          'supplier',  'read',   'View supplier list and details',      NOW()),
    ('manage-suppliers',      'Manage Suppliers',        'supplier',  'manage', 'Create, edit, and delete suppliers',  NOW()),
    ('view-stock-levels',     'View Stock Levels',       'inventory', 'read',   'View current stock levels',           NOW()),
    ('manage-stock-levels',   'Manage Stock Levels',     'inventory', 'manage', 'Adjust stock levels manually',        NOW()),
    ('view-stock-movements',  'View Stock Movements',    'inventory', 'read',   'View stock movement history',         NOW()),
    ('manage-stock-movements','Manage Stock Movements',  'inventory', 'manage', 'Record stock movements',              NOW()),
    ('view-stock-batches',    'View Stock Batches',      'inventory', 'read',   'View batch/lot information',          NOW()),
    ('manage-stock-batches',  'Manage Stock Batches',    'inventory', 'manage', 'Create and update stock batches',     NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;
