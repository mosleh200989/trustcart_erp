-- Add 'printing' status to order_status_enum
-- This status is set when an order is sent to a courier (Steadfast/Pathao)
-- The order moves from 'printing' to 'shipped' automatically once all 3 actions are completed:
--   1. Marked as packed
--   2. Invoice printed
--   3. Sticker printed
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'printing';
