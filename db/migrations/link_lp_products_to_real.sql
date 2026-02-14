-- Link landing page products to real product IDs
-- Run on production: PGPASSWORD='c0mm0n' psql -U postgres -d trustcart_erp -f db/migrations/link_lp_products_to_real.sql

-- Update the seed-mix landing page: add product_id=396 to all products in the JSONB array
UPDATE landing_pages
SET products = (
    SELECT jsonb_agg(
        elem || '{"product_id": 396}'::jsonb
    )
    FROM jsonb_array_elements(products) AS elem
)
WHERE slug = 'seed-mix'
  AND products IS NOT NULL
  AND jsonb_array_length(products) > 0;

-- Also ensure the product_image column exists on sales_order_items
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS product_image VARCHAR(1000);

SELECT 'Landing page products linked to product #396 successfully!' AS result;
