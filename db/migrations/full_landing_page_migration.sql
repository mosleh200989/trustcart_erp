-- ============================================================
-- COMBINED MIGRATION: Landing Pages + Sales Columns + LP Product Links
-- Run on production:
--   PGPASSWORD='c0mm0n' psql -U postgres -d trustcart_erp -f db/migrations/full_landing_page_migration.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. CREATE LANDING PAGES TABLE (from create_landing_pages.sql)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS landing_pages (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    hero_image_url VARCHAR(500),
    hero_title VARCHAR(255),
    hero_subtitle TEXT,
    hero_button_text VARCHAR(100),
    primary_color VARCHAR(50) DEFAULT '#FF6B35',
    secondary_color VARCHAR(50) DEFAULT '#FFFFFF',
    background_color VARCHAR(50) DEFAULT '#1a1a2e',
    meta_title VARCHAR(500),
    meta_description TEXT,
    og_image_url VARCHAR(500),
    sections JSONB DEFAULT '[]'::jsonb,
    products JSONB DEFAULT '[]'::jsonb,
    phone_number VARCHAR(20),
    whatsapp_number VARCHAR(255),
    show_order_form BOOLEAN DEFAULT true,
    cash_on_delivery BOOLEAN DEFAULT true,
    free_delivery BOOLEAN DEFAULT false,
    delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_charge_outside DECIMAL(10, 2) DEFAULT 0,
    delivery_note TEXT,
    is_active BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    order_count INT DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_active ON landing_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_landing_pages_dates ON landing_pages(start_date, end_date);

-- Seed data for the Seed Mix landing page
INSERT INTO landing_pages (
    title, slug, description, hero_image_url, hero_title, hero_subtitle,
    hero_button_text, primary_color, secondary_color, background_color,
    sections, products, phone_number, show_order_form, cash_on_delivery,
    free_delivery, delivery_charge, delivery_charge_outside, delivery_note, is_active
) VALUES (
    'প্রিমিয়াম সিড মিক্স',
    'seed-mix',
    'চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা, তুলসীদানা দিয়ে তৈরি প্রিমিয়াম সিড মিক্স। ৩ বয়ামে ১ কেজি সিড মিক্স + ৫০০ গ্রাম আখের লাল চিনি + ৫০০ গ্রাম মধু গিফট!',
    '/seed-mix.jpg',
    'প্রিমিয়াম সিড মিক্স',
    'চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা, তুলসীদানা — ৩ বয়ামে ১ কেজি সিড মিক্স। সাথে ৫০০ গ্রাম আখের লাল চিনি ও ৫০০ গ্রাম মধু সম্পূর্ণ ফ্রি!',
    'এখনই অর্ডার করুন',
    '#2d6a4f', '#FFFFFF', '#2d6a4f',
    '[
        {"id":"hero-1","type":"hero","title":"প্রিমিয়াম সিড মিক্স","content":"চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা, তুলসীদানা — সম্পূর্ণ প্রাকৃতিক ও ভেজালমুক্ত সিড মিক্স","buttonText":"এখনই অর্ডার করুন","backgroundColor":"#2d6a4f","textColor":"#FFFFFF","order":1,"is_visible":true},
        {"id":"benefits-1","type":"benefits","title":"সিড মিক্স খাওয়ার উপকারিতা","items":[{"icon":"💪","text":"প্রোটিন সমৃদ্ধ – পেশী গঠনে সহায়ক"},{"icon":"❤️","text":"হৃদযন্ত্রের জন্য উপকারী – ওমেগা-৩ ফ্যাটি এসিড সমৃদ্ধ"},{"icon":"🧠","text":"মস্তিষ্কের কার্যক্ষমতা বাড়ায়"},{"icon":"🦴","text":"হাড় মজবুত করে – ক্যালসিয়াম ও ম্যাগনেসিয়াম সরবরাহ করে"},{"icon":"⚡","text":"শক্তি বৃদ্ধি করে – আয়রন ও জিংক সমৃদ্ধ"},{"icon":"🛡️","text":"রোগ প্রতিরোধ ক্ষমতা বাড়ায়"}],"backgroundColor":"#FFFFFF","textColor":"#1a1a2e","order":2,"is_visible":true},
        {"id":"ingredients-1","type":"benefits","title":"সিড মিক্সে কি কি আছে?","items":[{"icon":"🌱","text":"চিয়া সিড — ওমেগা-৩ ও ফাইবার সমৃদ্ধ"},{"icon":"🌿","text":"ইসবগুল — হজম শক্তি বৃদ্ধিকারী"},{"icon":"🫘","text":"তোকমা — ত্বক ও চুলের যত্নে অনন্য"},{"icon":"🌾","text":"হালিমদানা — আয়রন ও প্রোটিন সমৃদ্ধ"},{"icon":"🌻","text":"তুলসীদানা — রোগ প্রতিরোধ ক্ষমতা ও ত্বকে অনন্য"}],"backgroundColor":"#edf7ef","textColor":"#1a1a2e","order":3,"is_visible":true},
        {"id":"trust-1","type":"trust","title":"আমাদের উপর কেন আস্থা রাখবেন?","items":[{"icon":"✅","text":"১০০% প্রাকৃতিক ও ভেজালমুক্ত"},{"icon":"✅","text":"কোনো কেমিক্যাল বা প্রিজারভেটিভ নেই"},{"icon":"✅","text":"প্রোডাক্ট হাতে পেয়ে পেমেন্ট করার সুবিধা"},{"icon":"✅","text":"পছন্দ না হলে রিটার্ন দিতে পারবেন"},{"icon":"✅","text":"সারা বাংলাদেশে হোম ডেলিভারি"}],"backgroundColor":"#f8f9fa","textColor":"#1a1a2e","order":4,"is_visible":true},
        {"id":"cta-1","type":"cta","title":"🎁 সাথে পাচ্ছেন সম্পূর্ণ ফ্রি!","content":"৫০০ গ্রাম আখের লাল চিনি + ৫০০ গ্রাম মধু — হোম ডেলিভেরি চার্জও সম্পূর্ণ ফ্রি! সীমিত সময়ের অফার।","buttonText":"এখনই অর্ডার করুন","backgroundColor":"#2d6a4f","textColor":"#FFFFFF","order":5,"is_visible":true}
    ]'::jsonb,
    '[
        {"id":"prod-1","name":"সিড মিক্স প্যাকেজ (৩ বয়াম ১ কেজি) + আখের লাল চিনি ৫০০গ্রাম + মধু ৫০০গ্রাম ফ্রি","description":"চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা — ৩ বয়ামে মোট ১ কেজি। সাথে আখের লাল চিনি ও মধু গিফট!","image_url":"/seed-mix.jpg","price":1390,"compare_price":1590,"product_id":396,"is_default":true},
        {"id":"prod-2","name":"2x কম্বো প্যাকেজ (৬ বয়াম ২ কেজি) + আখের লাল চিনি ১ কেজি + মধু ১ কেজি ফ্রি","description":"ডাবল প্যাকেজে সাশ্রয়! ২ সেট সিড মিক্স + ডাবল গিফট!","image_url":"/seed-mix.jpg","price":2700,"compare_price":3180,"product_id":396,"is_default":false}
    ]'::jsonb,
    '09647248283',
    true, true, true,
    80, 130,
    'সারা বাংলাদেশে ফ্রি হোম ডেলিভারি',
    true
) ON CONFLICT (slug) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- 2. SYNC SALES COLUMNS (from sync_sales_columns.sql)
-- ══════════════════════════════════════════════════════════════

-- sales_orders: Customer contact info
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);

-- sales_orders: Enhanced order management
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS rider_instructions TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelled_by INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- sales_orders: Discount / Offer
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS offer_id INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50);

-- sales_orders: Order Source Tracking
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS user_ip VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS geo_location JSONB;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS browser_info VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS operating_system VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- sales_orders: Courier Integration
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_company VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_order_id VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_status VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS thank_you_offer_accepted BOOLEAN DEFAULT false;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- sales_order_items: Product name & image for LP orders (no real product_id)
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(500);
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS product_image VARCHAR(1000);
ALTER TABLE sales_order_items ALTER COLUMN product_id DROP NOT NULL;

-- landing_pages: Delivery charge columns (safe IF NOT EXISTS for existing tables)
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS delivery_charge_outside DECIMAL(10,2) DEFAULT 0;


-- ══════════════════════════════════════════════════════════════
-- 3. LINK LP PRODUCTS TO REAL PRODUCT (from link_lp_products_to_real.sql)
-- ══════════════════════════════════════════════════════════════

-- Add product_id=396 to all products in the seed-mix landing page JSONB
UPDATE landing_pages
SET products = (
    SELECT jsonb_agg(
        CASE
            WHEN NOT (elem ? 'product_id') THEN elem || '{"product_id": 396}'::jsonb
            ELSE elem
        END
    )
    FROM jsonb_array_elements(products) AS elem
)
WHERE slug = 'seed-mix'
  AND products IS NOT NULL
  AND jsonb_array_length(products) > 0;


COMMIT;

SELECT 'Full landing page migration completed successfully!' AS result;
