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
    'প্রিমিয়াম সিড মিক্স',
    'seed-mix',
    'চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা দিয়ে তৈরি প্রিমিয়াম সিড মিক্স। ৩ বয়ামে ১ কেজি সিড মিক্স + ৫০০ গ্রাম আখের লাল চিনি + ৫০০ গ্রাম মধু গিফট!',
    '/seed-mix.jpg',
    'প্রিমিয়াম সিড মিক্স',
    'চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা — ৩ বয়ামে ১ কেজি সিড মিক্স। সাথে ৫০০ গ্রাম আখের লাল চিনি ও ৫০০ গ্রাম মধু সম্পূর্ণ ফ্রি!',
    'এখনই অর্ডার করুন',
    '#2d6a4f',
    '#FFFFFF',
    '#2d6a4f',
    '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "প্রিমিয়াম সিড মিক্স",
            "content": "চিয়া সিড, ইসবগুল, তোকমা, হালিমদানা — সম্পূর্ণ প্রাকৃতিক ও ভেজালমুক্ত সিড মিক্স",
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
                {"icon": "🌾", "text": "হালিমদানা — আয়রন ও প্রোটিন সমৃদ্ধ"}
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
    '01609133209',
    true,
    true,
    true,
    'সারা বাংলাদেশে ফ্রি হোম ডেলিভারি',
    true
) ON CONFLICT (slug) DO NOTHING;


-- Update seed-mix landing page with correct data
-- Run: $env:PGPASSWORD='123456'; $env:PGCLIENTENCODING='UTF8'; psql -U postgres -d trustcart_erp -f db\migrations\update_seed_mix.sql

SET client_encoding TO 'UTF8';

UPDATE landing_pages SET
    title = E'\u09aa\u09cd\u09b0\u09bf\u09ae\u09bf\u09af\u09bc\u09be\u09ae \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8',
    hero_title = E'\u09aa\u09cd\u09b0\u09bf\u09ae\u09bf\u09af\u09bc\u09be\u09ae \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8',
    hero_subtitle = E'\u099a\u09bf\u09af\u09bc\u09be \u09b8\u09bf\u09a1, \u0987\u09b8\u09ac\u0997\u09c1\u09b2, \u09a4\u09cb\u0995\u09ae\u09be, \u09b9\u09be\u09b2\u09bf\u09ae\u09a6\u09be\u09a8\u09be \u2014 \u09e9 \u09ac\u09af\u09bc\u09be\u09ae\u09c7 \u09e7 \u0995\u09c7\u099c\u09bf \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8\u0964 \u09b8\u09be\u09a5\u09c7 \u09eb\u09e6\u09e6 \u0997\u09cd\u09b0\u09be\u09ae \u0986\u0996\u09c7\u09b0 \u09b2\u09be\u09b2 \u099a\u09bf\u09a8\u09bf \u0993 \u09eb\u09e6\u09e6 \u0997\u09cd\u09b0\u09be\u09ae \u09ae\u09a7\u09c1 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09ab\u09cd\u09b0\u09bf!',
    hero_button_text = E'\u098f\u0996\u09a8\u0987 \u0985\u09b0\u09cd\u09a1\u09be\u09b0 \u0995\u09b0\u09c1\u09a8',
    description = E'\u099a\u09bf\u09af\u09bc\u09be \u09b8\u09bf\u09a1, \u0987\u09b8\u09ac\u0997\u09c1\u09b2, \u09a4\u09cb\u0995\u09ae\u09be, \u09b9\u09be\u09b2\u09bf\u09ae\u09a6\u09be\u09a8\u09be \u09a6\u09bf\u09af\u09bc\u09c7 \u09a4\u09c8\u09b0\u09bf \u09aa\u09cd\u09b0\u09bf\u09ae\u09bf\u09af\u09bc\u09be\u09ae \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8\u0964 \u09e9 \u09ac\u09af\u09bc\u09be\u09ae\u09c7 \u09e7 \u0995\u09c7\u099c\u09bf \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8 + \u09eb\u09e6\u09e6 \u0997\u09cd\u09b0\u09be\u09ae \u0986\u0996\u09c7\u09b0 \u09b2\u09be\u09b2 \u099a\u09bf\u09a8\u09bf + \u09eb\u09e6\u09e6 \u0997\u09cd\u09b0\u09be\u09ae \u09ae\u09a7\u09c1 \u0997\u09bf\u09ab\u099f!',
    primary_color = '#4ca863',
    background_color = '#4ca863',
    sections = '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "\u09aa\u09cd\u09b0\u09bf\u09ae\u09bf\u09af\u09bc\u09be\u09ae \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8",
            "content": "\u099a\u09bf\u09af\u09bc\u09be \u09b8\u09bf\u09a1, \u0987\u09b8\u09ac\u0997\u09c1\u09b2, \u09a4\u09cb\u0995\u09ae\u09be, \u09b9\u09be\u09b2\u09bf\u09ae\u09a6\u09be\u09a8\u09be \u2014 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09aa\u09cd\u09b0\u09be\u0995\u09c3\u09a4\u09bf\u0995 \u0993 \u09ad\u09c7\u099c\u09be\u09b2\u09ae\u09c1\u0995\u09cd\u09a4 \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8",
            "buttonText": "\u098f\u0996\u09a8\u0987 \u0985\u09b0\u09cd\u09a1\u09be\u09b0 \u0995\u09b0\u09c1\u09a8",
            "backgroundColor": "#4ca863",
            "textColor": "#FFFFFF",
            "order": 1,
            "is_visible": true
        },
        {
            "id": "benefits-1",
            "type": "benefits",
            "title": "\u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8 \u0996\u09be\u0993\u09af\u09bc\u09be\u09b0 \u0989\u09aa\u0995\u09be\u09b0\u09bf\u09a4\u09be",
            "items": [
                {"icon": "\ud83d\udcaa", "text": "\u09aa\u09cd\u09b0\u09cb\u099f\u09bf\u09a8 \u09b8\u09ae\u09c3\u09a6\u09cd\u09a7 \u2013 \u09aa\u09c7\u09b6\u09c0 \u0997\u09a0\u09a8\u09c7 \u09b8\u09b9\u09be\u09af\u09bc\u0995"},
                {"icon": "\u2764\ufe0f", "text": "\u09b9\u09c3\u09a6\u09af\u09a8\u09cd\u09a4\u09cd\u09b0\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0989\u09aa\u0995\u09be\u09b0\u09c0 \u2013 \u0993\u09ae\u09c7\u0997\u09be-\u09e9 \u09ab\u09cd\u09af\u09be\u099f\u09bf \u098f\u09b8\u09bf\u09a1 \u09b8\u09ae\u09c3\u09a6\u09cd\u09a7"},
                {"icon": "\ud83e\udde0", "text": "\u09ae\u09b8\u09cd\u09a4\u09bf\u09b7\u09cd\u0995\u09c7\u09b0 \u0995\u09be\u09b0\u09cd\u09af\u0995\u09cd\u09b7\u09ae\u09a4\u09be \u09ac\u09be\u09a1\u09bc\u09be\u09af\u09bc"},
                {"icon": "\ud83e\uddb4", "text": "\u09b9\u09be\u09a1\u09bc \u09ae\u099c\u09ac\u09c1\u09a4 \u0995\u09b0\u09c7 \u2013 \u0995\u09cd\u09af\u09be\u09b2\u09b8\u09bf\u09af\u09bc\u09be\u09ae \u0993 \u09ae\u09cd\u09af\u09be\u0997\u09a8\u09c7\u09b8\u09bf\u09af\u09bc\u09be\u09ae \u09b8\u09b0\u09ac\u09b0\u09be\u09b9 \u0995\u09b0\u09c7"},
                {"icon": "\u26a1", "text": "\u09b6\u0995\u09cd\u09a4\u09bf \u09ac\u09c3\u09a6\u09cd\u09a7\u09bf \u0995\u09b0\u09c7 \u2013 \u0986\u09af\u09bc\u09b0\u09a8 \u0993 \u099c\u09bf\u0982\u0995 \u09b8\u09ae\u09c3\u09a6\u09cd\u09a7"},
                {"icon": "\ud83d\udee1\ufe0f", "text": "\u09b0\u09cb\u0997 \u09aa\u09cd\u09b0\u09a4\u09bf\u09b0\u09cb\u09a7 \u0995\u09cd\u09b7\u09ae\u09a4\u09be \u09ac\u09be\u09a1\u09bc\u09be\u09af\u09bc"}
            ],
            "backgroundColor": "#FFFFFF",
            "textColor": "#1a1a2e",
            "order": 2,
            "is_visible": true
        },
        {
            "id": "ingredients-1",
            "type": "benefits",
            "title": "\u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8\u09c7 \u0995\u09bf \u0995\u09bf \u0986\u099b\u09c7?",
            "items": [
                {"icon": "\ud83c\udf31", "text": "\u099a\u09bf\u09af\u09bc\u09be \u09b8\u09bf\u09a1 \u2014 \u0993\u09ae\u09c7\u0997\u09be-\u09e9 \u0993 \u09ab\u09be\u0987\u09ac\u09be\u09b0 \u09b8\u09ae\u09c3\u09a6\u09cd\u09a7"},
                {"icon": "\ud83c\udf3f", "text": "\u0987\u09b8\u09ac\u0997\u09c1\u09b2 \u2014 \u09b9\u099c\u09ae \u09b6\u0995\u09cd\u09a4\u09bf \u09ac\u09c3\u09a6\u09cd\u09a7\u09bf\u0995\u09be\u09b0\u09c0"},
                {"icon": "\ud83e\uded8", "text": "\u09a4\u09cb\u0995\u09ae\u09be \u2014 \u09a4\u09cd\u09ac\u0995 \u0993 \u099a\u09c1\u09b2\u09c7\u09b0 \u09af\u09a4\u09cd\u09a8\u09c7 \u0985\u09a8\u09a8\u09cd\u09af"},
                {"icon": "\ud83c\udf3e", "text": "\u09b9\u09be\u09b2\u09bf\u09ae\u09a6\u09be\u09a8\u09be \u2014 \u0986\u09af\u09bc\u09b0\u09a8 \u0993 \u09aa\u09cd\u09b0\u09cb\u099f\u09bf\u09a8 \u09b8\u09ae\u09c3\u09a6\u09cd\u09a7"}
            ],
            "backgroundColor": "#edf7ef",
            "textColor": "#1a1a2e",
            "order": 3,
            "is_visible": true
        },
        {
            "id": "trust-1",
            "type": "trust",
            "title": "\u0986\u09ae\u09be\u09a6\u09c7\u09b0 \u0989\u09aa\u09b0 \u0995\u09c7\u09a8 \u0986\u09b8\u09cd\u09a5\u09be \u09b0\u09be\u0996\u09ac\u09c7\u09a8?",
            "items": [
                {"icon": "\u2705", "text": "\u09e7\u09e6\u09e6% \u09aa\u09cd\u09b0\u09be\u0995\u09c3\u09a4\u09bf\u0995 \u0993 \u09ad\u09c7\u099c\u09be\u09b2\u09ae\u09c1\u0995\u09cd\u09a4"},
                {"icon": "\u2705", "text": "\u0995\u09cb\u09a8\u09cb \u0995\u09c7\u09ae\u09bf\u0995\u09cd\u09af\u09be\u09b2 \u09ac\u09be \u09aa\u09cd\u09b0\u09bf\u099c\u09be\u09b0\u09cd\u09ad\u09c7\u099f\u09bf\u09ad \u09a8\u09c7\u0987"},
                {"icon": "\u2705", "text": "\u09aa\u09cd\u09b0\u09cb\u09a1\u09be\u0995\u09cd\u099f \u09b9\u09be\u09a4\u09c7 \u09aa\u09c7\u09af\u09bc\u09c7 \u09aa\u09c7\u09ae\u09c7\u09a8\u09cd\u099f \u0995\u09b0\u09be\u09b0 \u09b8\u09c1\u09ac\u09bf\u09a7\u09be"},
                {"icon": "\u2705", "text": "\u09aa\u099b\u09a8\u09cd\u09a6 \u09a8\u09be \u09b9\u09b2\u09c7 \u09b0\u09bf\u099f\u09be\u09b0\u09cd\u09a8 \u09a6\u09bf\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8"},
                {"icon": "\u2705", "text": "\u09b8\u09be\u09b0\u09be \u09ac\u09be\u0982\u09b2\u09be\u09a6\u09c7\u09b6\u09c7 \u09b9\u09cb\u09ae \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf"}
            ],
            "backgroundColor": "#f8f9fa",
            "textColor": "#1a1a2e",
            "order": 4,
            "is_visible": true
        },
        {
            "id": "cta-1",
            "type": "cta",
            "title": "\ud83c\udf81 \u09b8\u09be\u09a5\u09c7 \u09aa\u09be\u099a\u09cd\u099b\u09c7\u09a8 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09ab\u09cd\u09b0\u09bf!",
            "content": "\u09eb\u09e6\u09e6 \u0997\u09cd\u09b0\u09be\u09ae \u0986\u0996\u09c7\u09b0 \u09b2\u09be\u09b2 \u099a\u09bf\u09a8\u09bf + \u09eb\u09e6\u09e6 \u0997\u09cd\u09b0\u09be\u09ae \u09ae\u09a7\u09c1 \u2014 \u09b9\u09cb\u09ae \u09a1\u09c7\u09b2\u09bf\u09ad\u09c7\u09b0\u09bf \u099a\u09be\u09b0\u09cd\u099c\u0993 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09ab\u09cd\u09b0\u09bf! \u09b8\u09c0\u09ae\u09bf\u09a4 \u09b8\u09ae\u09af\u09bc\u09c7\u09b0 \u0985\u09ab\u09be\u09b0\u0964",
            "buttonText": "\u098f\u0996\u09a8\u0987 \u0985\u09b0\u09cd\u09a1\u09be\u09b0 \u0995\u09b0\u09c1\u09a8",
            "backgroundColor": "#4ca863",
            "textColor": "#FFFFFF",
            "order": 5,
            "is_visible": true
        }
    ]'::jsonb,
    products = '[
        {
            "id": "prod-1",
            "name": "\u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8 \u09aa\u09cd\u09af\u09be\u0995\u09c7\u099c (\u09e9 \u09ac\u09af\u09bc\u09be\u09ae \u09e7 \u0995\u09c7\u099c\u09bf) + \u0986\u0996\u09c7\u09b0 \u09b2\u09be\u09b2 \u099a\u09bf\u09a8\u09bf \u09eb\u09e6\u09e6\u0997\u09cd\u09b0\u09be\u09ae + \u09ae\u09a7\u09c1 \u09eb\u09e6\u09e6\u0997\u09cd\u09b0\u09be\u09ae \u09ab\u09cd\u09b0\u09bf",
            "description": "\u099a\u09bf\u09af\u09bc\u09be \u09b8\u09bf\u09a1, \u0987\u09b8\u09ac\u0997\u09c1\u09b2, \u09a4\u09cb\u0995\u09ae\u09be, \u09b9\u09be\u09b2\u09bf\u09ae\u09a6\u09be\u09a8\u09be \u2014 \u09e9 \u09ac\u09af\u09bc\u09be\u09ae\u09c7 \u09ae\u09cb\u099f \u09e7 \u0995\u09c7\u099c\u09bf\u0964 \u09b8\u09be\u09a5\u09c7 \u0986\u0996\u09c7\u09b0 \u09b2\u09be\u09b2 \u099a\u09bf\u09a8\u09bf \u0993 \u09ae\u09a7\u09c1 \u0997\u09bf\u09ab\u099f!",
            "image_url": "/seed-mix.jpg",
            "price": 1390,
            "compare_price": 1590,
            "is_default": true
        },
        {
            "id": "prod-2",
            "name": "2x \u0995\u09ae\u09cd\u09ac\u09cb \u09aa\u09cd\u09af\u09be\u0995\u09c7\u099c (\u09ec \u09ac\u09af\u09bc\u09be\u09ae \u09e8 \u0995\u09c7\u099c\u09bf) + \u0986\u0996\u09c7\u09b0 \u09b2\u09be\u09b2 \u099a\u09bf\u09a8\u09bf \u09e7 \u0995\u09c7\u099c\u09bf + \u09ae\u09a7\u09c1 \u09e7 \u0995\u09c7\u099c\u09bf \u09ab\u09cd\u09b0\u09bf",
            "description": "\u09a1\u09be\u09ac\u09b2 \u09aa\u09cd\u09af\u09be\u0995\u09c7\u099c\u09c7 \u09b8\u09be\u09b6\u09cd\u09b0\u09af\u09bc! \u09e8 \u09b8\u09c7\u099f \u09b8\u09bf\u09a1 \u09ae\u09bf\u0995\u09cd\u09b8 + \u09a1\u09be\u09ac\u09b2 \u0997\u09bf\u09ab\u099f!",
            "image_url": "/seed-mix.jpg",
            "price": 2700,
            "compare_price": 3180,
            "is_default": false
        }
    ]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'seed-mix';
