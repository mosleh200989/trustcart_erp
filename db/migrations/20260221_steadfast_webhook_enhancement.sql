-- ============================================================
-- Migration: Steadfast Webhook Enhancement
-- Date: 2026-02-21
-- Description: Adds columns to support full Steadfast webhook
--              payload storage (COD, delivery charge, tracking
--              messages, raw payload audit trail).
-- ============================================================

BEGIN;

-- ── 1. courier_tracking_history: new columns for webhook data ──

ALTER TABLE courier_tracking_history
  ADD COLUMN IF NOT EXISTS notification_type  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tracking_message   TEXT,
  ADD COLUMN IF NOT EXISTS cod_amount         DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS delivery_charge    DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS consignment_id     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS raw_payload        JSONB;

COMMENT ON COLUMN courier_tracking_history.notification_type IS 'Steadfast notification type: delivery_status or tracking_update';
COMMENT ON COLUMN courier_tracking_history.tracking_message  IS 'Human-readable tracking message from courier webhook';
COMMENT ON COLUMN courier_tracking_history.cod_amount        IS 'Cash on delivery amount reported by courier';
COMMENT ON COLUMN courier_tracking_history.delivery_charge   IS 'Delivery charge reported by courier';
COMMENT ON COLUMN courier_tracking_history.consignment_id    IS 'Courier consignment ID for cross-referencing';
COMMENT ON COLUMN courier_tracking_history.raw_payload       IS 'Full raw JSON payload from webhook for audit / debugging';

-- ── 2. sales_orders: COD amount and delivery charge from courier ──

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS cod_amount       DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS delivery_charge  DECIMAL(12, 2);

COMMENT ON COLUMN sales_orders.cod_amount      IS 'COD amount confirmed by courier webhook';
COMMENT ON COLUMN sales_orders.delivery_charge IS 'Delivery charge confirmed by courier webhook';

-- ── 3. Index for faster webhook order lookup ──

CREATE INDEX IF NOT EXISTS idx_sales_orders_courier_order_id
  ON sales_orders (courier_order_id)
  WHERE courier_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_tracking_id
  ON sales_orders (tracking_id)
  WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_courier_company_status
  ON sales_orders (courier_company, status)
  WHERE courier_company IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courier_tracking_consignment
  ON courier_tracking_history (consignment_id)
  WHERE consignment_id IS NOT NULL;

COMMIT;
