-- Landing Pages Module Migration
-- Run this to create the landing_pages table

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
    delivery_note TEXT,
    is_active BOOLEAN DEFAULT true,
    view_count INT DEFAULT 0,
    order_count INT DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_active ON landing_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_landing_pages_dates ON landing_pages(start_date, end_date);

-- Insert seed data for the Seed Mix landing page
INSERT INTO landing_pages (
    title,
    slug,
    description,
    hero_image_url,
    hero_title,
    hero_subtitle,
    hero_button_text,
    primary_color,
    secondary_color,
    background_color,
    sections,
    products,
    phone_number,
    show_order_form,
    cash_on_delivery,
    free_delivery,
    delivery_note,
    is_active
) VALUES (
    'Premium Seed Mix - Healthy Snacking',
    'seed-mix',
    'Premium quality seed mix for healthy snacking. A perfect blend of sunflower seeds, pumpkin seeds, flax seeds, chia seeds, and more.',
    '/seed-mix.jpg',
    'প্রিমিয়াম সিড মিক্স - স্বাস্থ্যকর স্ন্যাকিং',
    'সূর্যমুখী, কুমড়া, তিসি, চিয়া সহ বিভিন্ন বীজের অসাধারণ মিশ্রণ। প্রতিদিনের পুষ্টির চাহিদা পূরণ করুন!',
    'অর্ডার করুন',
    '#2d6a4f',
    '#FFFFFF',
    '#f0f4f0',
    '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "প্রিমিয়াম সিড মিক্স",
            "content": "সম্পূর্ণ প্রাকৃতিক, ভেজালমুক্ত বীজ মিশ্রণ যা আপনাকে দেবে সুস্থ জীবনের পথ",
            "buttonText": "এখনই অর্ডার করুন",
            "backgroundColor": "#2d6a4f",
            "textColor": "#FFFFFF",
            "order": 1,
            "is_visible": true
        },
        {
            "id": "benefits-1",
            "type": "benefits",
            "title": "সিড মিক্স খাওয়ার উপকারিতা",
            "items": [
                {"icon": "💪", "text": "প্রোটিন সমৃদ্ধ – পেশী গঠনে সহায়ক"},
                {"icon": "❤️", "text": "হৃদযন্ত্রের জন্য উপকারী – ওমেগা-৩ ফ্যাটি এসিড সমৃদ্ধ"},
                {"icon": "🧠", "text": "মস্তিষ্কের কার্যক্ষমতা বাড়ায়"},
                {"icon": "🦴", "text": "হাড় মজবুত করে – ক্যালসিয়াম ও ম্যাগনেসিয়াম সরবরাহ করে"},
                {"icon": "⚡", "text": "শক্তি বৃদ্ধি করে – আয়রন ও জিংক সমৃদ্ধ"},
                {"icon": "🛡️", "text": "রোগ প্রতিরোধ ক্ষমতা বাড়ায়"}
            ],
            "backgroundColor": "#FFFFFF",
            "textColor": "#1a1a2e",
            "order": 2,
            "is_visible": true
        },
        {
            "id": "trust-1",
            "type": "trust",
            "title": "আমাদের উপর কেন আস্থা রাখবেন?",
            "items": [
                {"icon": "✅", "text": "১০০% প্রাকৃতিক ও ভেজালমুক্ত"},
                {"icon": "✅", "text": "কোনো কেমিক্যাল বা প্রিজারভেটিভ নেই"},
                {"icon": "✅", "text": "প্রোডাক্ট হাতে পেয়ে পেমেন্ট করার সুবিধা"},
                {"icon": "✅", "text": "পছন্দ না হলে রিটার্ন দিতে পারবেন"},
                {"icon": "✅", "text": "সারা বাংলাদেশে হোম ডেলিভারি"}
            ],
            "backgroundColor": "#f8f9fa",
            "textColor": "#1a1a2e",
            "order": 3,
            "is_visible": true
        },
        {
            "id": "cta-1",
            "type": "cta",
            "title": "হোম ডেলিভেরি চার্জ সম্পূর্ণ ফ্রি",
            "content": "সীমিত সময়ের অফার! এখনই অর্ডার করুন।",
            "buttonText": "অর্ডার করতে চাই",
            "backgroundColor": "#2d6a4f",
            "textColor": "#FFFFFF",
            "order": 4,
            "is_visible": true
        }
    ]'::jsonb,
    '[
        {
            "id": "prod-1",
            "name": "সিড মিক্স - ২৫০ গ্রাম",
            "description": "সূর্যমুখী, কুমড়া, তিসি, চিয়া বীজের মিশ্রণ",
            "image_url": "/seed-mix.jpg",
            "price": 450,
            "compare_price": 550,
            "is_default": true
        },
        {
            "id": "prod-2",
            "name": "সিড মিক্স - ৫০০ গ্রাম",
            "description": "সূর্যমুখী, কুমড়া, তিসি, চিয়া বীজের মিশ্রণ",
            "image_url": "/seed-mix.jpg",
            "price": 799,
            "compare_price": 999,
            "is_default": false
        }
    ]'::jsonb,
    '01609133209',
    true,
    true,
    true,
    'সারা বাংলাদেশে ফ্রি হোম ডেলিভারি',
    true
) ON CONFLICT (slug) DO NOTHING;



-- Landing Page Orders Migration
-- Run this to create the landing_page_orders table

-- Create the order status enum
DO $$ BEGIN
    CREATE TYPE landing_page_order_status AS ENUM (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS landing_page_orders (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    landing_page_id INT NOT NULL,
    landing_page_title VARCHAR(255),
    landing_page_slug VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    district VARCHAR(100) DEFAULT 'Dhaka',
    note TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cod',
    status landing_page_order_status DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lp_orders_landing_page_id ON landing_page_orders(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lp_orders_status ON landing_page_orders(status);
CREATE INDEX IF NOT EXISTS idx_lp_orders_customer_phone ON landing_page_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_lp_orders_created_at ON landing_page_orders(created_at DESC);

-- Add foreign key (optional, only if landing_pages table exists)
-- ALTER TABLE landing_page_orders ADD CONSTRAINT fk_lp_orders_landing_page
--     FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE SET NULL;
