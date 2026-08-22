-- Migration: Storefronts (multi-brand sites on shared inventory/orders)
-- Creates: storefronts, storefront_categories, storefront_products
-- Seeds:   Handsome Man storefront + admin permissions
--
-- Design decisions (agreed 2026-08-22):
--  * No changes to any existing table. Orders reuse sales_orders.order_source
--    (set to the storefront slug, e.g. 'handsomeman').
--  * No per-storefront price override — storefronts show TrustCart prices.
--  * Categories are per-storefront (storefront_categories), never shared
--    with the main `categories` table.
--
-- SAFE FOR PRODUCTION: IF NOT EXISTS / ON CONFLICT DO NOTHING everywhere.

-- 1. Storefronts ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storefronts (
    id                        SERIAL PRIMARY KEY,
    name                      VARCHAR(255) NOT NULL,
    slug                      VARCHAR(100) NOT NULL UNIQUE,
    domain                    VARCHAR(255),
    extra_domains             JSONB NOT NULL DEFAULT '[]'::jsonb,
    template                  VARCHAR(100) NOT NULL DEFAULT 'handsomeman',
    logo_url                  TEXT,
    favicon_url               TEXT,
    theme                     JSONB NOT NULL DEFAULT '{}'::jsonb,
    tagline                   VARCHAR(255),
    description               TEXT,
    contact_phone             VARCHAR(50),
    contact_email             VARCHAR(255),
    contact_address           TEXT,
    social_links              JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta_pixel_id             VARCHAR(100),
    meta_capi_access_token    TEXT,
    meta_test_event_code      VARCHAR(100),
    seo_title                 VARCHAR(255),
    seo_description           TEXT,
    delivery_charge_inside    DECIMAL(10,2) NOT NULL DEFAULT 60,
    delivery_charge_outside   DECIMAL(10,2) NOT NULL DEFAULT 110,
    free_delivery_threshold   DECIMAL(10,2),
    is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Storefront categories ---------------------------------------------------
CREATE TABLE IF NOT EXISTS storefront_categories (
    id             SERIAL PRIMARY KEY,
    storefront_id  INTEGER NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    slug           VARCHAR(255) NOT NULL,
    description    TEXT,
    image_url      TEXT,
    parent_id      INTEGER,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_storefront_category_slug UNIQUE (storefront_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_storefront_categories_storefront
    ON storefront_categories (storefront_id);

-- 3. Storefront product listings ----------------------------------------------
CREATE TABLE IF NOT EXISTS storefront_products (
    id                      SERIAL PRIMARY KEY,
    storefront_id           INTEGER NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
    product_id              INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storefront_category_id  INTEGER REFERENCES storefront_categories(id) ON DELETE SET NULL,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    is_published            BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_storefront_product UNIQUE (storefront_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_storefront_products_storefront
    ON storefront_products (storefront_id);
CREATE INDEX IF NOT EXISTS idx_storefront_products_category
    ON storefront_products (storefront_category_id);

-- 4. Permissions ---------------------------------------------------------------
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Storefronts',   'view-storefronts',   'storefronts', 'read',   'View storefronts, their products and categories'),
('Manage Storefronts', 'manage-storefronts', 'storefronts', 'update', 'Create and edit storefronts, pick products, manage categories'),
('Delete Storefronts', 'delete-storefronts', 'storefronts', 'delete', 'Delete storefronts')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
AND p.slug IN ('view-storefronts', 'manage-storefronts', 'delete-storefronts')
ON CONFLICT DO NOTHING;

-- 5. Seed: Handsome Man ----------------------------------------------------------
INSERT INTO storefronts (
    name, slug, domain, extra_domains, template, tagline, description,
    theme, seo_title, seo_description, is_active
) VALUES (
    'Handsome Man',
    'handsomeman',
    'handsomemanbd.com',
    '["www.handsomemanbd.com"]'::jsonb,
    'handsomeman',
    'Gear Up. Look Sharp.',
    'Premium essentials for the modern Bangladeshi man — grooming, style and everyday carry.',
    '{
        "primary_color":    "#0c0c0e",
        "secondary_color":  "#16161a",
        "accent_color":     "#c8a24a",
        "background_color": "#0c0c0e",
        "text_color":       "#f2f0eb",
        "font_display":     "Oswald",
        "font_body":        "Manrope"
    }'::jsonb,
    'Handsome Man — Premium Men''s Essentials in Bangladesh',
    'Grooming, style and everyday essentials for men. Cash on delivery across Bangladesh.',
    TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- 6. Seed a starter category set for Handsome Man --------------------------------
INSERT INTO storefront_categories (storefront_id, name, slug, sort_order)
SELECT s.id, c.name, c.slug, c.sort_order
FROM storefronts s
CROSS JOIN (VALUES
    ('Grooming',       'grooming',       1),
    ('Fragrance',      'fragrance',      2),
    ('Style & Wear',   'style-wear',     3),
    ('Accessories',    'accessories',    4),
    ('Fitness',        'fitness',        5)
) AS c(name, slug, sort_order)
WHERE s.slug = 'handsomeman'
ON CONFLICT (storefront_id, slug) DO NOTHING;
