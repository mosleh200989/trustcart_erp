-- Migration: Add floating button colors to landing_pages
-- Date: 2026-05-04

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS floating_whatsapp_color VARCHAR(50) DEFAULT '#25D366';

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS floating_phone_color VARCHAR(50) DEFAULT '#FF6B35';

-- Verify
-- SELECT id, title, floating_whatsapp_color, floating_phone_color FROM landing_pages;
