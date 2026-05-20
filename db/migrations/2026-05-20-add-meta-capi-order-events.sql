-- Meta Conversions API order lifecycle integration.
-- Captures browser attribution at order submission time and records outbound CAPI events idempotently.

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS meta_fbp VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meta_fbc VARCHAR(255),
  ADD COLUMN IF NOT EXISTS meta_fbclid TEXT,
  ADD COLUMN IF NOT EXISTS meta_event_source_url TEXT,
  ADD COLUMN IF NOT EXISTS meta_landing_url TEXT,
  ADD COLUMN IF NOT EXISTS meta_attribution JSONB;

CREATE TABLE IF NOT EXISTS meta_capi_events (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  event_name VARCHAR(80) NOT NULL,
  status_trigger VARCHAR(80) NOT NULL,
  event_id VARCHAR(120) NOT NULL,
  pixel_id VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_meta_capi_events_order_event_status
  ON meta_capi_events(order_id, event_name, status_trigger);

CREATE INDEX IF NOT EXISTS idx_meta_capi_events_order_id
  ON meta_capi_events(order_id);

CREATE INDEX IF NOT EXISTS idx_meta_capi_events_status
  ON meta_capi_events(status);

COMMENT ON COLUMN sales_orders.meta_fbp IS 'Meta _fbp browser identifier captured at order submission time.';
COMMENT ON COLUMN sales_orders.meta_fbc IS 'Meta _fbc click identifier captured at order submission time.';
COMMENT ON COLUMN sales_orders.meta_fbclid IS 'Facebook click ID captured from URL when present.';
COMMENT ON COLUMN sales_orders.meta_event_source_url IS 'Best source URL to use for server-side Meta events.';
COMMENT ON COLUMN sales_orders.meta_landing_url IS 'Landing/current URL captured during order submission.';
COMMENT ON COLUMN sales_orders.meta_attribution IS 'Raw non-secret attribution context captured for server-side marketing events.';
COMMENT ON TABLE meta_capi_events IS 'Idempotent audit log for Meta Conversions API events emitted from ERP order lifecycle changes.';
