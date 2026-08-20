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
    delivery_charge,
    delivery_charge_outside,
    delivery_note,
    is_active
) VALUES (
    'প্রিমিয়াম সিড মিক্স',
    'seed-mix',
    'চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা, তুলসীদানা দিয়ে তৈরি প্রিমিয়াম সিড মিক্স। ৩ বয়ামে ১ কেজি সিড মিক্স + ৫০০ গ্রাম আখের লাল চিনি + ৫০০ গ্রাম মধু গিফট!',
    '/seed-mix.jpg',
    'প্রিমিয়াম সিড মিক্স',
    'চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা, তুলসীদানা — ৩ বয়ামে ১ কেজি সিড মিক্স। সাথে ৫০০ গ্রাম আখের লাল চিনি ও ৫০০ গ্রাম মধু সম্পূর্ণ ফ্রি!',
    'এখনই অর্ডার করুন',
    '#2d6a4f',
    '#FFFFFF',
    '#2d6a4f',
    '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "প্রিমিয়াম সিড মিক্স",
            "content": "চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা, তুলসীদানা — সম্পূর্ণ প্রাকৃতিক ও ভেজালমুক্ত সিড মিক্স",
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
            "id": "ingredients-1",
            "type": "benefits",
            "title": "সিড মিক্সে কি কি আছে?",
            "items": [
                {"icon": "🌱", "text": "চিয়া সিড — ওমেগা-৩ ও ফাইবার সমৃদ্ধ"},
                {"icon": "🌿", "text": "ইসবগুল — হজম শক্তি বৃদ্ধিকারী"},
                {"icon": "🫘", "text": "তোকমা — ত্বক ও চুলের যত্নে অনন্য"},
                {"icon": "🌾", "text": "হালিমদানা — আয়রন ও প্রোটিন সমৃদ্ধ"},
                {"icon": "🌻", "text": "তুলসীদানা — রোগ প্রতিরোধ ক্ষমতা ও ত্বকে অনন্য"}
            ],
            "backgroundColor": "#edf7ef",
            "textColor": "#1a1a2e",
            "order": 3,
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
            "order": 4,
            "is_visible": true
        },
        {
            "id": "cta-1",
            "type": "cta",
            "title": "🎁 সাথে পাচ্ছেন সম্পূর্ণ ফ্রি!",
            "content": "৫০০ গ্রাম আখের লাল চিনি + ৫০০ গ্রাম মধু — হোম ডেলিভেরি চার্জও সম্পূর্ণ ফ্রি! সীমিত সময়ের অফার।",
            "buttonText": "এখনই অর্ডার করুন",
            "backgroundColor": "#2d6a4f",
            "textColor": "#FFFFFF",
            "order": 5,
            "is_visible": true
        }
    ]'::jsonb,
    '[
        {
            "id": "prod-1",
            "name": "সিড মিক্স প্যাকেজ (৩ বয়াম ১ কেজি) + আখের লাল চিনি ৫০০গ্রাম + মধু ৫০০গ্রাম ফ্রি",
            "description": "চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা — ৩ বয়ামে মোট ১ কেজি। সাথে আখের লাল চিনি ও মধু গিফট!",
            "image_url": "/seed-mix.jpg",
            "price": 1390,
            "compare_price": 1590,
            "is_default": true
        },
        {
            "id": "prod-2",
            "name": "2x কম্বো প্যাকেজ (৬ বয়াম ২ কেজি) + আখের লাল চিনি ১ কেজি + মধু ১ কেজি ফ্রি",
            "description": "ডাবল প্যাকেজে সাশ্রয়! ২ সেট সিড মিক্স + ডাবল গিফট!",
            "image_url": "/seed-mix.jpg",
            "price": 2700,
            "compare_price": 3180,
            "is_default": false
        }
    ]'::jsonb,
    '09647248283',
    true,
    true,
    true,
    80,
    130,
    'সারা বাংলাদেশে ফ্রি হোম ডেলিভারি',
    true
) ON CONFLICT (slug) DO NOTHING;



-- Add delivery charge columns to landing_pages table
-- Run this migration to add configurable delivery charges

-- Add delivery_charge column (Inside Dhaka)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Add delivery_charge_outside column (Outside Dhaka)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS delivery_charge_outside DECIMAL(10, 2) DEFAULT 0;

-- Update seed-mix page with delivery charges
UPDATE landing_pages
SET delivery_charge = 80,
    delivery_charge_outside = 130
WHERE slug = 'seed-mix';
