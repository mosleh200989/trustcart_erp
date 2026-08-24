-- Migration: Storefront suite — Domains, Experiments, Media Library,
-- LP Templates, Testimonials (+ Performance uses existing sales data).
--
-- SAFE FOR PRODUCTION: IF NOT EXISTS / ON CONFLICT DO NOTHING everywhere.

-- 1. Domains ------------------------------------------------------------
-- Replaces the hardcoded domain maps in frontend/src/middleware.ts.
-- The middleware fetches /storefront-domains/public/map (cached 60s) and
-- falls back to its built-in constants if this table is unreachable.
CREATE TABLE IF NOT EXISTS storefront_domains (
    id              SERIAL PRIMARY KEY,
    domain          VARCHAR(255) NOT NULL UNIQUE,
    target_type     VARCHAR(20)  NOT NULL CHECK (target_type IN ('storefront', 'landing_page')),
    storefront_id   INTEGER REFERENCES storefronts(id)   ON DELETE CASCADE,
    landing_page_id INTEGER REFERENCES landing_pages(id) ON DELETE CASCADE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. A/B experiments ----------------------------------------------------
-- Variant A's slug is the public URL; running experiments split traffic
-- between A and B client-side (sticky via localStorage). Views are
-- experiment-scoped counters; orders/revenue are computed from
-- sales_orders by utm_source within the experiment window.
CREATE TABLE IF NOT EXISTS lp_experiments (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'running', 'completed')),
    variant_a_page_id  INTEGER NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    variant_b_page_id  INTEGER NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    traffic_split      INTEGER NOT NULL DEFAULT 50,   -- % of traffic to variant A
    a_views            INTEGER NOT NULL DEFAULT 0,
    b_views            INTEGER NOT NULL DEFAULT 0,
    winner_page_id     INTEGER REFERENCES landing_pages(id) ON DELETE SET NULL,
    started_at         TIMESTAMP,
    ended_at           TIMESTAMP,
    notes              TEXT,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Media library --------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id          SERIAL PRIMARY KEY,
    url         TEXT NOT NULL,
    filename    VARCHAR(500),
    mime        VARCHAR(100),
    size_bytes  INTEGER,
    uploaded_by INTEGER,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_assets_created ON media_assets (created_at DESC);

-- 4. LP Maker templates ----------------------------------------------------
CREATE TABLE IF NOT EXISTS lp_templates (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    thumbnail_url TEXT,
    blocks        JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Testimonials ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storefront_testimonials (
    id            SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    location      VARCHAR(255),
    rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    text          TEXT NOT NULL,
    image_url     TEXT,
    source        VARCHAR(30) NOT NULL DEFAULT 'other',
    product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
    is_approved   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Permissions -----------------------------------------------------------------
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Media Library',   'view-media-library',   'media-library', 'read',   'Browse the shared media library'),
('Manage Media Library', 'manage-media-library', 'media-library', 'update', 'Upload and delete media library files'),
('View Testimonials',    'view-testimonials',    'testimonials',  'read',   'View customer testimonials'),
('Manage Testimonials',  'manage-testimonials',  'testimonials',  'update', 'Create, edit and delete testimonials')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
AND p.slug IN ('view-media-library', 'manage-media-library', 'view-testimonials', 'manage-testimonials')
ON CONFLICT DO NOTHING;

-- 7. Seed: migrate the hardcoded middleware domain maps into the Domains table --
-- Landing-page domains (root URL serves the mapped landing page)
INSERT INTO storefront_domains (domain, target_type, landing_page_id, notes)
SELECT d.domain, 'landing_page', lp.id, 'Migrated from hardcoded middleware map'
FROM (VALUES
    ('herbolin.com',          'Harbora-kosthogut'),
    ('www.herbolin.com',      'Harbora-kosthogut'),
    ('arabiankhalta.com',     'arabiankhalta'),
    ('www.arabiankhalta.com', 'arabiankhalta'),
    ('veshoj.site',           'veshoj'),
    ('www.veshoj.site',       'veshoj'),
    ('kasrioil.com',          'id-25'),
    ('www.kasrioil.com',      'id-25'),
    ('naturalglowra.com',     'natural-glowra-coconut-oil'),
    ('www.naturalglowra.com', 'natural-glowra-coconut-oil')
) AS d(domain, lp_slug)
JOIN landing_pages lp ON lp.slug = d.lp_slug
ON CONFLICT (domain) DO NOTHING;

-- Storefront domains (whole page tree)
INSERT INTO storefront_domains (domain, target_type, storefront_id, notes)
SELECT d.domain, 'storefront', s.id, 'Migrated from hardcoded middleware map'
FROM (VALUES
    ('handsomemanbd.com'),
    ('www.handsomemanbd.com')
) AS d(domain)
JOIN storefronts s ON s.slug = 'handsomeman'
ON CONFLICT (domain) DO NOTHING;

-- 8. Seed: two starter LP Maker templates --------------------------------------
INSERT INTO lp_templates (name, description, blocks)
SELECT 'Classic Product Funnel',
       'Hero, benefits, testimonials and order form — the standard single-product page.',
       '[
    {"id":"t1_hero","type":"hero","props":{"title":"পণ্যের নাম এখানে","subtitle":"এক লাইনে বলুন কেন এটি দরকার","background_image":"","background_color":"#1a1a2e","overlay_opacity":45,"text_color":"#ffffff","button_text":"অর্ডার করুন","button_bg":"#16a34a","button_color":"#ffffff","height":"medium","align":"center"}},
    {"id":"t1_ben","type":"benefits","props":{"items":[{"icon":"✅","text":"১০০% অরিজিনাল পণ্য"},{"icon":"🚚","text":"সারাদেশে ক্যাশ অন ডেলিভারি"},{"icon":"📞","text":"ফোনে অর্ডার কনফার্ম করা হয়"}],"columns":1,"background":"#f0fdf4","color":"#166534","radius":12}},
    {"id":"t1_txt","type":"text","props":{"text":"পণ্যের বিস্তারিত বর্ণনা এখানে লিখুন…","size":"md","align":"left","color":"#374151"}},
    {"id":"t1_tst","type":"testimonials","props":{"heading":"ক্রেতারা যা বলছেন","items":[],"columns":2,"background":"#f9fafb","card_background":"#ffffff","text_color":"#374151","star_color":"#f59e0b","radius":12}},
    {"id":"t1_of","type":"order-form","props":{"heading":"অর্ডার করতে ফর্মটি পূরণ করুন","products":[],"button_text":"অর্ডার কনফার্ম করুন","background":"#ffffff","card_background":"#f9fafb","accent":"#16a34a","text_color":"#1f2937","button_bg":"#16a34a","button_color":"#ffffff","radius":14,"show_quantity":true}}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM lp_templates WHERE name = 'Classic Product Funnel');

INSERT INTO lp_templates (name, description, blocks)
SELECT 'Flash Offer Funnel',
       'Countdown-driven offer page with urgency and a tight order form.',
       '[
    {"id":"t2_hero","type":"hero","props":{"title":"সীমিত সময়ের অফার!","subtitle":"অফার শেষ হওয়ার আগে অর্ডার করুন","background_image":"","background_color":"#7f1d1d","overlay_opacity":45,"text_color":"#ffffff","button_text":"এখনই অর্ডার করুন","button_bg":"#f59e0b","button_color":"#111827","height":"medium","align":"center"}},
    {"id":"t2_cd","type":"countdown","props":{"label":"অফার শেষ হতে বাকি","ends_at":"","background":"#7f1d1d","color":"#ffffff"}},
    {"id":"t2_ben","type":"benefits","props":{"items":[{"icon":"🔥","text":"বিশেষ ছাড়ের মূল্য শুধু আজকের জন্য"},{"icon":"🚚","text":"ক্যাশ অন ডেলিভারি"}],"columns":1,"background":"#fef2f2","color":"#7f1d1d","radius":12}},
    {"id":"t2_of","type":"order-form","props":{"heading":"অফার মূল্যে অর্ডার করুন","products":[],"button_text":"অর্ডার কনফার্ম করুন","background":"#ffffff","card_background":"#fef2f2","accent":"#dc2626","text_color":"#1f2937","button_bg":"#dc2626","button_color":"#ffffff","radius":14,"show_quantity":true}}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM lp_templates WHERE name = 'Flash Offer Funnel');
