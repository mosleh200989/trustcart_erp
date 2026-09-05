-- Migration: the products a page is mainly about.
--
-- "dam koto?" is the single most common message on the Kasri page, and it names
-- no product. The catalogue search finds nothing to match, so the reply engine
-- had no price it was allowed to state and correctly escalated — which sends
-- the most common question in the shop to a human every single time.
--
-- A page usually sells one thing. Naming those products here gives the engine
-- something true to answer with when the customer has not said which product
-- they mean, instead of guessing or giving up.
--
-- SAFE FOR PRODUCTION: one additive column with a default.

ALTER TABLE automation_channels
    ADD COLUMN IF NOT EXISTS featured_product_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN automation_channels.featured_product_ids IS
    'Products this page is mainly about. Used only when the customer''s message matches no product.';
