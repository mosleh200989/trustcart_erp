-- Allow purchase orders to be created before a supplier is selected.
-- Existing supplier references and foreign-key behavior are preserved.

ALTER TABLE purchase_orders
  ALTER COLUMN supplier_id DROP NOT NULL;
