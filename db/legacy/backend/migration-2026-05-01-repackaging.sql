-- =============================================================
-- TrustCart ERP — Migration 2026-05-01
-- Repackaging / Bulk-to-Retail Feature + supporting fixes
-- =============================================================
-- Safe to run multiple times (idempotent):
--   * Tables use CREATE TABLE IF NOT EXISTS
--   * Indexes use CREATE INDEX IF NOT EXISTS
--   * Permission inserts use ON CONFLICT DO NOTHING
-- =============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. demand_forecasts
--    (inventory demand forecasting — engine was built earlier
--     but the table was never created on the VPS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demand_forecasts (
    id                   SERIAL PRIMARY KEY,
    product_id           INTEGER NOT NULL,
    warehouse_id         INTEGER,
    forecast_period      INTEGER NOT NULL DEFAULT 3,   -- months: 3, 6, 12
    moving_average_qty   INTEGER NOT NULL DEFAULT 0,
    historical_std_dev   INTEGER NOT NULL DEFAULT 0,
    suggested_reorder_qty INTEGER NOT NULL DEFAULT 0,
    velocity             VARCHAR(20) NOT NULL DEFAULT 'normal',  -- fast / normal / slow / dead
    forecasted_date      DATE NOT NULL,
    effective_from       DATE NOT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_product    ON demand_forecasts (product_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_warehouse  ON demand_forecasts (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_period     ON demand_forecasts (forecast_period);


-- ─────────────────────────────────────────────────────────────
-- 2. packaging_configs
--    Defines how a bulk product breaks down into retail units.
--    Example: 10 kg honey barrel → 20 × 500 g bottles
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS packaging_configs (
    id                  SERIAL PRIMARY KEY,
    source_product_id   INTEGER NOT NULL,
    source_variant_key  VARCHAR(255),
    source_qty          NUMERIC(10, 3) NOT NULL DEFAULT 1,
    output_product_id   INTEGER NOT NULL,
    output_variant_key  VARCHAR(255),
    output_qty          INTEGER NOT NULL,
    waste_percentage    NUMERIC(5, 2) NOT NULL DEFAULT 0,
    description         VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          INTEGER,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packaging_configs_source ON packaging_configs (source_product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_configs_output ON packaging_configs (output_product_id);
CREATE INDEX IF NOT EXISTS idx_packaging_configs_active ON packaging_configs (is_active);


-- ─────────────────────────────────────────────────────────────
-- 3. repack_orders
--    Individual repackaging jobs: consumes bulk stock,
--    produces retail packaged stock.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS repack_orders (
    id                    SERIAL PRIMARY KEY,
    repack_number         VARCHAR(50) NOT NULL UNIQUE,
    warehouse_id          INTEGER NOT NULL,
    config_id             INTEGER REFERENCES packaging_configs(id) ON DELETE SET NULL,
    source_product_id     INTEGER NOT NULL,
    source_variant_key    VARCHAR(255),
    source_batch_id       INTEGER,
    source_qty_to_consume NUMERIC(10, 3) NOT NULL,
    source_qty_consumed   NUMERIC(10, 3),
    output_product_id     INTEGER NOT NULL,
    output_variant_key    VARCHAR(255),
    output_qty_expected   INTEGER NOT NULL,
    output_qty_actual     INTEGER,
    output_batch_number   VARCHAR(100),
    waste_qty             NUMERIC(10, 3) NOT NULL DEFAULT 0,
    notes                 TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | in_progress | completed | cancelled
    created_by            INTEGER,
    completed_by          INTEGER,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repack_orders_status          ON repack_orders (status);
CREATE INDEX IF NOT EXISTS idx_repack_orders_warehouse        ON repack_orders (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_repack_orders_source_product  ON repack_orders (source_product_id);
CREATE INDEX IF NOT EXISTS idx_repack_orders_output_product  ON repack_orders (output_product_id);
CREATE INDEX IF NOT EXISTS idx_repack_orders_number          ON repack_orders (repack_number);


-- ─────────────────────────────────────────────────────────────
-- 4. supplier-self-service permission
--    The supplier portal controller requires this permission
--    slug. Without it, every supplier API call returns 403.
-- ─────────────────────────────────────────────────────────────

-- Insert the permission (no-op if it already exists)
INSERT INTO permissions (name, slug, module, action, description)
VALUES (
    'Supplier Self Service',
    'supplier-self-service',
    'supplier',
    'self-service',
    'Allows supplier accounts to access the supplier self-service portal (view POs, update catalog, submit invoices)'
)
ON CONFLICT (slug) DO NOTHING;

-- Grant it to the supplier-account role (no-op if already granted)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
JOIN   permissions p ON p.slug = 'supplier-self-service'
WHERE  r.slug = 'supplier-account'
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 5. Verification — prints row counts for quick sanity check
-- ─────────────────────────────────────────────────────────────

SELECT 'demand_forecasts table'   AS check_item, COUNT(*) AS row_count FROM demand_forecasts;
SELECT 'packaging_configs table'  AS check_item, COUNT(*) AS row_count FROM packaging_configs;
SELECT 'repack_orders table'      AS check_item, COUNT(*) AS row_count FROM repack_orders;
SELECT 'supplier-self-service permission' AS check_item,
       COUNT(*) AS row_count
FROM   permissions
WHERE  slug = 'supplier-self-service';

COMMIT;
