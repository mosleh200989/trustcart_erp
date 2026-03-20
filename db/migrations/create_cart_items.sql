-- Cart Items: Server-side cart persistence
-- Supports both guest carts (session_id) and logged-in customer carts (customer_id)

CREATE TABLE IF NOT EXISTS cart_items (
  id            SERIAL PRIMARY KEY,
  session_id    VARCHAR(64)    NOT NULL,
  customer_id   INTEGER        NULL,
  product_id    INTEGER        NOT NULL,
  product_name  VARCHAR(500)   NULL,
  variant       VARCHAR(255)   NULL,
  unit_price    NUMERIC(12,2)  NOT NULL DEFAULT 0,
  quantity      INTEGER        NOT NULL DEFAULT 1,
  image_url     TEXT           NULL,
  category      VARCHAR(255)   NULL,
  created_at    TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_session_id  ON cart_items (session_id);
CREATE INDEX IF NOT EXISTS idx_cart_customer_id ON cart_items (customer_id);
