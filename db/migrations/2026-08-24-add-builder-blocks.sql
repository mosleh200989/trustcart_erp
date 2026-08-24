-- Migration: LP Maker (drag-and-drop landing page builder)
-- Builder pages live in the existing landing_pages table with
-- template = 'builder'; their block tree is stored in builder_blocks.
-- Everything else (orders, counters, delivery charges, phone buttons)
-- reuses the columns landing pages already have.
--
-- SAFE FOR PRODUCTION: additive, idempotent.

ALTER TABLE landing_pages
    ADD COLUMN IF NOT EXISTS builder_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
