-- Seed data for the Booster Free Offer landing page

INSERT INTO landing_pages (
    title,
    slug,
    description,
    template,
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
    'ন্যাচারাল নাইট পাওয়ার - ফ্রী স্যাম্পল',
    'booster-free-offer',
    'আগে এক মাস খাবেন উপকার পেলে ফুল কোর্স অর্ডার করবেন! ফ্রী স্যাম্পল পেতে নাম মাত্র মুল্যে অর্ডার করুন।',
    'free-offer',
    '/products/night-power-booster.png',
    'আগে এক মাস খাবেন উপকার পেলে ফুল কোর্স অর্ডার করবেন!',
    'ফ্রী স্যাম্পল পেতে নাম মাত্র মুল্যে অর্ডার করুন।',
    'এখনই অর্ডার করুন',
    '#DC2626', -- Red theme for urgency
    '#F5D76E', -- Gold/Yellow for text
    '#0B0C10', -- Dark background
    '[
        {
            "id": "hero-1",
            "type": "hero",
            "title": "আপনার জীবনকে আরও আনন্দময় করতে ন্যাচারাল নাইট পাওয়ার",
            "content": "আমাদের এই ফর্মুলা সম্পূর্ণ প্রাকৃতিক উপাদান দিয়ে তৈরি, যা আপনার এনার্জি লেভেল বাড়িয়ে দেয় এবং দীর্ঘস্থায়ী পারফরম্যান্স নিশ্চিত করে। আগে এক মাস খাবেন উপকার পেলে ফুল কোর্স অর্ডার করবেন!",
            "backgroundColor": "#1a1a2e",
            "textColor": "#F5D76E",
            "order": 1,
            "is_visible": true
        },
        {
            "id": "benefits-1",
            "type": "benefits",
            "title": "ন্যাচারাল নাইট পাওয়ার এর উপকারিতা",
            "items": [
                {"icon": "⚡", "text": "দ্রুত বী*র্যপাত বন্ধ করবে"},
                {"icon": "🩸", "text": "শুক্রানো উৎপাদন করে"},
                {"icon": "💧", "text": "বীর্য পাতলাকে গাড় করবে"},
                {"icon": "⏳", "text": "মিলনের সময় বাড়ায় ২৫-৩০ মিনিট পর্যন্ত"},
                {"icon": "❤️", "text": "প্রথম বার সহ-বাস করার পর দ্বিতীয় বার সহবাস করার মত ভাল ফিলিংস আসবে"},
                {"icon": "🌙", "text": "রাতে ২-৩ বার সহবাস করতে পারবেন"},
                {"icon": "💪", "text": "যৌনশক্তি ভেতর থেকে জাগ্রত করে"},
                {"icon": "🧠", "text": "মানসিক চাপ কমাবে"},
                {"icon": "🔋", "text": "শরীরকে সতেজ রাখবে ক্লান্তহিন সারা রাত"}
            ],
            "backgroundColor": "transparent",
            "textColor": "#E2E2E2",
            "order": 2,
            "is_visible": true
        },
        {
            "id": "images-1",
            "type": "images",
            "title": "১০০% প্রাকৃতিক উপাদানে তৈরি",
            "images": [
                "/products/night-power-booster.png",
                "/products/night-power-booster.png"
            ],
            "backgroundColor": "#15161C",
            "textColor": "#F5D76E",
            "order": 3,
            "is_visible": true
        },
        {
            "id": "trust-1",
            "type": "trust",
            "title": "আমাদের থেকেই কেন অর্ডার করবেন?",
            "items": [
                {"icon": "✅", "text": "এটি বাংলাদেশ সাইন্সল্যাব পরিক্ষিত এবং অনুমদিত।"},
                {"icon": "✅", "text": "আমাদের প্রোডাক্ট টি শতভাগ ক্যামিকেল মুক্ত প্রাকৃতিক প্রোডাক্ট।"},
                {"icon": "✅", "text": "আমরা কাস্টমার থেকে অগ্রিম কোনো পেমেন্ট নেইনা, আপনি প্রোডাক্ট হাতে পাওয়ার পর চেক করে পেমেন্ট করবেন।"},
                {"icon": "✅", "text": "আমাদের আছে রিফান্ড পলিসি: আপনি যদি ৭৫% প্রোডাক্ট সেবন করার পর ও রেজাল্ট না পান, তাহলে অবশিষ্ট ২৫% প্রোডাক্ট ফেরত দিয়ে ৬০% টাকা রিফান্ড নিতে পারবেন।"}
            ],
            "backgroundColor": "transparent",
            "textColor": "#E2E2E2",
            "order": 4,
            "is_visible": true
        },
        {
            "id": "cta-1",
            "type": "cta",
            "title": "প্রতি রাতে মিলনের ২০-২৫ পুর্বে ভরা পেটে একটি বড়ি খাবেন।",
            "content": "আমাদের হাজারো সন্তুষ্ট কাস্টমারদের মত আপনিও উপকৃত হবেন। ফ্রী নাম মাত্র মুল্যে অর্ডার করতে নিচের বাটনে ক্লিক করুন।",
            "buttonText": "অর্ডার করতে চাই",
            "backgroundColor": "#1a1a2e",
            "textColor": "#F5D76E",
            "order": 5,
            "is_visible": true
        }
    ]'::jsonb,
    '[
        {
            "id": "prod-440",
            "name": "ন্যাচারাল নাইট পাওয়ার (ফ্রী স্যাম্পল)",
            "description": "১ মাসের কোর্স - শুধুমাত্র ডেলিভারি চার্জ দিয়ে বুঝে নিন",
            "image_url": "/products/night-power-booster.png",
            "price": 0,
            "compare_price": 1500,
            "product_id": 440,
            "is_default": true,
            "is_featured": true,
            "featured_label": "🔥 ফ্রী স্যাম্পল"
        }
    ]'::jsonb,
    '01XXXXXXXXX',
    true,
    true,
    false,
    80,
    130,
    'ঢাকার ভিতরে ৳80 | ঢাকার বাইরে ৳130',
    true
) ON CONFLICT (slug) DO UPDATE 
SET template = EXCLUDED.template,
    sections = EXCLUDED.sections,
    products = EXCLUDED.products,
    hero_title = EXCLUDED.hero_title,
    hero_subtitle = EXCLUDED.hero_subtitle,
    hero_button_text = EXCLUDED.hero_button_text,
    delivery_charge = EXCLUDED.delivery_charge,
    delivery_charge_outside = EXCLUDED.delivery_charge_outside,
    delivery_note = EXCLUDED.delivery_note;
