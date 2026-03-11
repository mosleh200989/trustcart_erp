-- Migration: Add payment preference columns to users table
-- Date: 2026-03-11
-- Description: Adds payment method preference fields (bKash, Nagad, Rocket, Bank Transfer)

ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch_name VARCHAR(100) DEFAULT NULL;
