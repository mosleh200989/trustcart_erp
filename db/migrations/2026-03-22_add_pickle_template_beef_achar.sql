-- =====================================================================
-- Migration: Add Pickle template & Beef Achar landing page
-- Date: 2026-03-22
-- Description:
--   1. Adds the "Pickle" template support (no schema change needed,
--      the template column already accepts any VARCHAR(50) value).
--   2. Inserts a new Beef Achar (বিফ আচার) landing page using
--      the "pickle" template.
-- =====================================================================

-- Insert Beef Achar landing page
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
    template,
    sections,
    products,
    phone_number,
    whatsapp_number,
    show_order_form,
    cash_on_delivery,
    free_delivery,
    delivery_charge,
    delivery_charge_outside,
    delivery_note,
    is_active,
    meta_title,
    meta_description
) VALUES (
    'TrustCart বিফ আচার',
    'beef-achar',
    'ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি খাঁটি বিফ আচার। নিট ওজন 400 গ্রাম। কোনো কেমিক্যাল বা প্রিজারভেটিভ নেই — সম্পূর্ণ প্রাকৃতিক ও হালাল।',
    '/beef-achar-white.jpg',
    'খাঁটি বিফ আচার',
    'ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি — 100% প্রাকৃতিক মশলা ও সরিষার তেলে রান্না। নিট ওজন: 400 গ্রাম।',
    'এখনই অর্ডার করুন',
    '#B22222',
    '#FFFFFF',
    '#3D1308',
    'pickle',
    '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "খাঁটি বিফ আচার — TrustCart",
            "content": "ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি বিফ আচার। সরিষার তেল, কাঁচা মরিচ ও প্রাকৃতিক মশলায় ভরপুর স্বাদ।",
            "buttonText": "এখনই অর্ডার করুন",
            "backgroundColor": "#B22222",
            "textColor": "#FFFFFF",
            "order": 1,
            "is_visible": true
        },
        {
            "id": "benefits-1",
            "type": "benefits",
            "title": "কেন TrustCart বিফ আচার?",
            "items": [
                {"icon": "🥩", "text": "প্রিমিয়াম কোয়ালিটি বিফ — ফ্রেশ ও হালাল"},
                {"icon": "🌶️", "text": "ঐতিহ্যবাহী বাংলাদেশি মশলার মিশ্রণ"},
                {"icon": "🫙", "text": "সরিষার তেলে রান্না — আচারের আসল স্বাদ"},
                {"icon": "🚫", "text": "কোনো কেমিক্যাল বা প্রিজারভেটিভ নেই"},
                {"icon": "⚖️", "text": "নিট ওজন 400 গ্রাম — ভ্যালু ফর মানি"},
                {"icon": "🏠", "text": "ঘরোয়া রেসিপি — ঠিক মায়ের হাতের স্বাদ"}
            ],
            "backgroundColor": "#FFF8F5",
            "textColor": "#3D1308",
            "order": 2,
            "is_visible": true
        },
        {
            "id": "ingredients-1",
            "type": "benefits",
            "title": "আচারের উপকরণ",
            "items": [
                {"icon": "🥩", "text": "তাজা গরুর মাংস — হালাল ও প্রিমিয়াম কাট"},
                {"icon": "🌿", "text": "খাঁটি সরিষার তেল — ঐতিহ্যবাহী স্বাদ"},
                {"icon": "🌶️", "text": "কাঁচা মরিচ ও শুকনো মরিচ — ঝাল ও সুগন্ধি"},
                {"icon": "🧄", "text": "আদা, রসুন ও পেঁয়াজ — প্রাকৃতিক ফ্লেভার"},
                {"icon": "🫚", "text": "হলুদ, জিরা, ধনিয়া — বিশুদ্ধ মশলা"},
                {"icon": "🍋", "text": "ভিনেগার ও লেবুর রস — প্রাকৃতিক প্রিজারভেশন"}
            ],
            "backgroundColor": "#FFE8DE",
            "textColor": "#3D1308",
            "order": 3,
            "is_visible": true
        },
        {
            "id": "trust-1",
            "type": "trust",
            "title": "আমাদের উপর কেন আস্থা রাখবেন?",
            "items": [
                {"icon": "✅", "text": "100% হালাল ও ঘরোয়া রেসিপিতে তৈরি"},
                {"icon": "✅", "text": "কোনো আর্টিফিশিয়াল কালার বা ফ্লেভার নেই"},
                {"icon": "✅", "text": "প্রোডাক্ট হাতে পেয়ে পেমেন্ট করার সুবিধা"},
                {"icon": "✅", "text": "পছন্দ না হলে রিটার্ন দিতে পারবেন"},
                {"icon": "✅", "text": "সারা বাংলাদেশে হোম ডেলিভারি"},
                {"icon": "✅", "text": "TrustCart — বিশ্বস্ত মানের নিশ্চয়তা"}
            ],
            "backgroundColor": "#FFF0E8",
            "textColor": "#3D1308",
            "order": 4,
            "is_visible": true
        },
        {
            "id": "cta-1",
            "type": "cta",
            "title": "🔥 ঘরে বসে অর্ডার করুন!",
            "content": "ঐতিহ্যবাহী রেসিপিতে তৈরি খাঁটি বিফ আচার — ক্যাশ অন ডেলিভারি। সীমিত স্টক!",
            "buttonText": "এখনই অর্ডার করুন",
            "backgroundColor": "#B22222",
            "textColor": "#FFFFFF",
            "order": 5,
            "is_visible": true
        }
    ]'::jsonb,
    '[
        {
            "id": "prod-1",
            "name": "বিফ আচার (400 গ্রাম)",
            "description": "TrustCart খাঁটি বিফ আচার — ঐতিহ্যবাহী ঘরোয়া রেসিপি, সরিষার তেলে রান্না। নিট ওজন 400 গ্রাম।",
            "image_url": "/beef-achar-white.jpg",
            "price": 550,
            "compare_price": 650,
            "product_id": null,
            "is_default": true
        },
        {
            "id": "prod-2",
            "name": "2x বিফ আচার কম্বো (800 গ্রাম)",
            "description": "2 বয়াম বিফ আচার — মোট 800 গ্রাম। কম্বোতে বেশি সাশ্রয়!",
            "image_url": "/beef-achar-kitchen.jpg",
            "price": 999,
            "compare_price": 1300,
            "product_id": null,
            "is_default": false
        }
    ]'::jsonb,
    '09647248283',
    '8809647248283',
    true,
    true,
    false,
    80,
    130,
    'ঢাকায় 80 টাকা, ঢাকার বাইরে 130 টাকা ডেলিভারি চার্জ',
    true,
    'TrustCart বিফ আচার — খাঁটি ঘরোয়া রেসিপি | অর্ডার করুন',
    'ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি খাঁটি বিফ আচার। 100% প্রাকৃতিক মশলা, সরিষার তেলে রান্না। ক্যাশ অন ডেলিভারি। TrustCart।'
) ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- Fix existing data if already inserted with Bengali numerals
-- =====================================================================
UPDATE landing_pages
SET
    description = 'ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি খাঁটি বিফ আচার। নিট ওজন 400 গ্রাম। কোনো কেমিক্যাল বা প্রিজারভেটিভ নেই — সম্পূর্ণ প্রাকৃতিক ও হালাল।',
    hero_subtitle = 'ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি — 100% প্রাকৃতিক মশলা ও সরিষার তেলে রান্না। নিট ওজন: 400 গ্রাম।',
    delivery_note = 'ঢাকায় 80 টাকা, ঢাকার বাইরে 130 টাকা ডেলিভারি চার্জ',
    meta_description = 'ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি খাঁটি বিফ আচার। 100% প্রাকৃতিক মশলা, সরিষার তেলে রান্না। ক্যাশ অন ডেলিভারি। TrustCart।',
    sections = '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "খাঁটি বিফ আচার — TrustCart",
            "content": "ঐতিহ্যবাহী ঘরোয়া রেসিপিতে তৈরি বিফ আচার। সরিষার তেল, কাঁচা মরিচ ও প্রাকৃতিক মশলায় ভরপুর স্বাদ।",
            "buttonText": "এখনই অর্ডার করুন",
            "backgroundColor": "#B22222",
            "textColor": "#FFFFFF",
            "order": 1,
            "is_visible": true
        },
        {
            "id": "benefits-1",
            "type": "benefits",
            "title": "কেন TrustCart বিফ আচার?",
            "items": [
                {"icon": "🥩", "text": "প্রিমিয়াম কোয়ালিটি বিফ — ফ্রেশ ও হালাল"},
                {"icon": "🌶️", "text": "ঐতিহ্যবাহী বাংলাদেশি মশলার মিশ্রণ"},
                {"icon": "🫙", "text": "সরিষার তেলে রান্না — আচারের আসল স্বাদ"},
                {"icon": "🚫", "text": "কোনো কেমিক্যাল বা প্রিজারভেটিভ নেই"},
                {"icon": "⚖️", "text": "নিট ওজন 400 গ্রাম — ভ্যালু ফর মানি"},
                {"icon": "🏠", "text": "ঘরোয়া রেসিপি — ঠিক মায়ের হাতের স্বাদ"}
            ],
            "backgroundColor": "#FFF8F5",
            "textColor": "#3D1308",
            "order": 2,
            "is_visible": true
        },
        {
            "id": "ingredients-1",
            "type": "benefits",
            "title": "আচারের উপকরণ",
            "items": [
                {"icon": "🥩", "text": "তাজা গরুর মাংস — হালাল ও প্রিমিয়াম কাট"},
                {"icon": "🌿", "text": "খাঁটি সরিষার তেল — ঐতিহ্যবাহী স্বাদ"},
                {"icon": "🌶️", "text": "কাঁচা মরিচ ও শুকনো মরিচ — ঝাল ও সুগন্ধি"},
                {"icon": "🧄", "text": "আদা, রসুন ও পেঁয়াজ — প্রাকৃতিক ফ্লেভার"},
                {"icon": "🫚", "text": "হলুদ, জিরা, ধনিয়া — বিশুদ্ধ মশলা"},
                {"icon": "🍋", "text": "ভিনেগার ও লেবুর রস — প্রাকৃতিক প্রিজারভেশন"}
            ],
            "backgroundColor": "#FFE8DE",
            "textColor": "#3D1308",
            "order": 3,
            "is_visible": true
        },
        {
            "id": "trust-1",
            "type": "trust",
            "title": "আমাদের উপর কেন আস্থা রাখবেন?",
            "items": [
                {"icon": "✅", "text": "100% হালাল ও ঘরোয়া রেসিপিতে তৈরি"},
                {"icon": "✅", "text": "কোনো আর্টিফিশিয়াল কালার বা ফ্লেভার নেই"},
                {"icon": "✅", "text": "প্রোডাক্ট হাতে পেয়ে পেমেন্ট করার সুবিধা"},
                {"icon": "✅", "text": "পছন্দ না হলে রিটার্ন দিতে পারবেন"},
                {"icon": "✅", "text": "সারা বাংলাদেশে হোম ডেলিভারি"},
                {"icon": "✅", "text": "TrustCart — বিশ্বস্ত মানের নিশ্চয়তা"}
            ],
            "backgroundColor": "#FFF0E8",
            "textColor": "#3D1308",
            "order": 4,
            "is_visible": true
        },
        {
            "id": "cta-1",
            "type": "cta",
            "title": "🔥 ঘরে বসে অর্ডার করুন!",
            "content": "ঐতিহ্যবাহী রেসিপিতে তৈরি খাঁটি বিফ আচার — ক্যাশ অন ডেলিভারি। সীমিত স্টক!",
            "buttonText": "এখনই অর্ডার করুন",
            "backgroundColor": "#B22222",
            "textColor": "#FFFFFF",
            "order": 5,
            "is_visible": true
        }
    ]'::jsonb,
    products = '[
        {
            "id": "prod-1",
            "name": "বিফ আচার (400 গ্রাম)",
            "description": "TrustCart খাঁটি বিফ আচার — ঐতিহ্যবাহী ঘরোয়া রেসিপি, সরিষার তেলে রান্না। নিট ওজন 400 গ্রাম।",
            "image_url": "/beef-achar-white.jpg",
            "price": 550,
            "compare_price": 650,
            "product_id": null,
            "is_default": true
        },
        {
            "id": "prod-2",
            "name": "2x বিফ আচার কম্বো (800 গ্রাম)",
            "description": "2 বয়াম বিফ আচার — মোট 800 গ্রাম। কম্বোতে বেশি সাশ্রয়!",
            "image_url": "/beef-achar-kitchen.jpg",
            "price": 999,
            "compare_price": 1300,
            "product_id": null,
            "is_default": false
        }
    ]'::jsonb
WHERE slug = 'beef-achar';
