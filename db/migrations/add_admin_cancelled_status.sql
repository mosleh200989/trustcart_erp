-- Migration: Add 'admin_cancelled' to landing_page_order_status enum
-- This distinguishes admin-initiated cancellations from courier/customer cancellations
-- Run: psql -U postgres -d trustcart_erp -f db/migrations/add_admin_cancelled_status.sql

ALTER TYPE landing_page_order_status ADD VALUE IF NOT EXISTS 'admin_cancelled' AFTER 'cancelled';
