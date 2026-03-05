-- Migration: Add 'admin_cancelled' to order_status_enum
-- This value was missing from the enum but used in the codebase
-- (order-management.service.ts, sales.service.ts, etc.)
-- Caused: "invalid input value for enum order_status_enum: admin_cancelled"

ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'admin_cancelled';
