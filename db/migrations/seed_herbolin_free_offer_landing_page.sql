-- ============================================================
-- Seed data for the Herbolin Harbora Free Offer Landing Page
-- Product: Harbora (কোষ্ঠগাট) – Natural Constipation Solution
-- Template: free-offer (herbal botanical green theme)
-- Brand: Herbolin (www.herbolin.com)
-- ============================================================

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
    meta_title,
    meta_description,
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
    is_active
) VALUES (
    -- ── Title & Slug ──────────────────────────────────────────
    'হারবোরা (কোষ্ঠগাট) - ফ্রী ট্রায়াল অফার | Herbolin',
    'herbolin-harbora-free-offer',
    'কোষ্ঠকাঠিন্যের প্রাকৃতিক সমাধান। আগে ট্রায়াল করুন, উপকার পেলে ফুল কোর্স নিন! ফ্রী ট্রায়াল প্যাক পেতে শুধুমাত্র ডেলিভারি চার্জ দিয়ে অর্ডার করুন।',

    -- ── Template ───────────────────────────────────────────────
    'free-offer',

    -- ── Hero Image ─────────────────────────────────────────────
    '/products/herbolin-harbora.png',

    -- ── Hero Title & Subtitle ──────────────────────────────────
    'কোষ্ঠকাঠিন্যের যন্ত্রণা থেকে মুক্তি পান – সম্পূর্ণ প্রাকৃতিক উপায়ে!',
    'আগে ট্রায়াল করুন, উপকার পেলে ফুল কোর্স অর্ডার করবেন! <br/>🎁 <strong>ফ্রী ট্রায়াল প্যাক</strong> পেতে নামমাত্র মূল্যে অর্ডার করুন।',
    'ফ্রী ট্রায়াল প্যাক নিন',

    -- ── Colors (Herbolin brand: forest green + warm cream) ──────
    '#1a6b3c',   -- Primary: Deep herbal green
    '#E8D5B7',   -- Secondary: Warm cream/ivory
    '#0a1f12',   -- Background: Deep forest green

    -- ── SEO Meta ───────────────────────────────────────────────
    'হারবোরা (কোষ্ঠগাট) - কোষ্ঠকাঠিন্যের প্রাকৃতিক সমাধান | ফ্রী ট্রায়াল | Herbolin',
    'কোষ্ঠকাঠিন্য, পেট ফাঁপা, রক্তক্ষরণসহ পায়খানার সমস্যা থেকে মাত্র ৭-১০ দিনে মুক্তি পান। ১০০% প্রাকৃতিক হারবোরা এখন ফ্রী ট্রায়ালে! শুধু ডেলিভারি চার্জ দিয়ে ট্রায়াল করুন।',

    -- ══════════════════════════════════════════════════════════
    -- SECTIONS (JSONB)
    -- ══════════════════════════════════════════════════════════
    '[
        {
            "id": "hero-main",
            "type": "hero",
            "title": "কোষ্ঠকাঠিন্যের যন্ত্রণা থেকে মুক্তি দিন – প্রাকৃতিক ভাবে, কোনো সাইড ইফেক্ট ছাড়াই!",
            "content": "হারবোরা (কোষ্ঠগাট) সম্পূর্ণ প্রাকৃতিক ভেষজ উপাদানে তৈরি, যা আপনার হজমশক্তি বৃদ্ধি করে, পেটের ব্যথা ও ফাঁপা দূর করে এবং নিয়মিত পায়খানা নিশ্চিত করে। মাত্র ৭-১০ দিনে উল্লেখযোগ্য ফলাফল পাবেন!",
            "buttonText": "ফ্রী ট্রায়াল নিতে চাই",
            "backgroundColor": "#132a1a",
            "textColor": "#E8D5B7",
            "order": 1,
            "is_visible": true
        },
        {
            "id": "benefits-1",
            "type": "benefits",
            "title": "হারবোরা (কোষ্ঠগাট) এর উপকারিতা",
            "items": [
                {"icon": "🩹", "text": "কোষ্ঠকাঠিন্য থেকে মাত্র ৭-১০ দিনে মুক্তি দেয়"},
                {"icon": "🔥", "text": "পেটের ব্যথা, জ্বালাপোড়া ও ফাঁপা দূর করে"},
                {"icon": "🩸", "text": "পায়খানার সময় রক্তক্ষরণ বন্ধ করে"},
                {"icon": "💪", "text": "হজমশক্তি ও পরিপাকতন্ত্র শক্তিশালী করে"},
                {"icon": "🌿", "text": "প্রাকৃতিক উপাদান — কোনো কেমিক্যাল বা সাইড ইফেক্ট নেই"},
                {"icon": "🧘", "text": "স্বাভাবিক ও আরামদায়ক মলত্যাগ নিশ্চিত করে"},
                {"icon": "⚡", "text": "শরীরের টক্সিন বের করে সতেজতা আনে"},
                {"icon": "❤️", "text": "অন্ত্রের স্বাস্থ্য ভালো রাখে ও গ্যাস্ট্রিক সমস্যা কমায়"}
            ],
            "backgroundColor": "transparent",
            "textColor": "#d4e7d0",
            "order": 2,
            "is_visible": true
        },
        {
            "id": "ingredients-1",
            "type": "benefits",
            "title": "হারবোরা (কোষ্ঠগাট) এ কি কি আছে?",
            "items": [
                {"icon": "🌱", "text": "মেথি (Fenugreek) — হজমশক্তি বৃদ্ধি করে ও পেটের প্রদাহ কমায়"},
                {"icon": "🍃", "text": "সোনাপাতা (Senna Leaves) — প্রাকৃতিক ল্যাক্সেটিভ, কোষ্ঠকাঠিন্য দূরীকরণে কার্যকর"},
                {"icon": "🌿", "text": "হরতকি (Haritaki) — আয়ুর্বেদিক ত্রিফলার অংশ, পরিপাকতন্ত্র পরিষ্কার করে"},
                {"icon": "🍏", "text": "আমলকি (Amla) — ভিটামিন সি সমৃদ্ধ, রোগ প্রতিরোধ ক্ষমতা বাড়ায়"},
                {"icon": "🥬", "text": "সাজনা পাতা (Moringa) — পুষ্টিগুণে ভরপুর, শরীরের ডিটক্স করে"},
                {"icon": "🌾", "text": "আমরুল (Indian Sorrel) — পেটের গ্যাস ও অ্যাসিডিটি কমায়"},
                {"icon": "🌸", "text": "শিমুল (Silk Cotton) — অন্ত্রের প্রদাহ কমাতে সাহায্য করে"},
                {"icon": "🪴", "text": "দাউদমূল — ত্বক ও অন্ত্রের ব্যাকটেরিয়ারোধী উপাদান"}
            ],
            "backgroundColor": "#132a1a",
            "textColor": "#d4e7d0",
            "order": 3,
            "is_visible": true
        },
        {
            "id": "images-1",
            "type": "images",
            "title": "১০০% প্রাকৃতিক ভেষজ উপাদানে তৈরি",
            "images": [
                "/products/herbolin-harbora.png",
                "/products/herbolin-harbora-ingredients.png"
            ],
            "backgroundColor": "#1a3322",
            "textColor": "#E8D5B7",
            "order": 4,
            "is_visible": true
        },
        {
            "id": "usage-1",
            "type": "cta",
            "title": "কিভাবে সেবন করবেন?",
            "content": "আধা গ্লাস পানিতে এক চামচ হারবোরা গুলিয়ে সকালে খালি পেটে ও রাতে ঘুমানোর আগে খালি পেটে পান করুন। নিয়মিত ৭-১০ দিন সেবনে উল্লেখযোগ্য ফলাফল পাবেন।",
            "buttonText": "ফ্রী ট্রায়াল নিতে চাই",
            "backgroundColor": "#1a3322",
            "textColor": "#E8D5B7",
            "order": 5,
            "is_visible": true
        },
        {
            "id": "trust-1",
            "type": "trust",
            "title": "আমাদের থেকেই কেন অর্ডার করবেন?",
            "items": [
                {"icon": "✅", "text": "এটি সম্পূর্ণ প্রাকৃতিক ও ভেষজ প্রোডাক্ট — কোনো কেমিক্যাল বা সাইড ইফেক্ট নেই।"},
                {"icon": "✅", "text": "Herbolin হলো একটি বিশ্বস্ত ব্র্যান্ড — দীর্ঘ ৫ বছরের অভিজ্ঞতা এবং হাজারো সন্তুষ্ট কাস্টমার।"},
                {"icon": "✅", "text": "আমরা কাস্টমার থেকে অগ্রিম কোনো পেমেন্ট নেই না — প্রোডাক্ট হাতে পাওয়ার পর চেক করে পেমেন্ট করবেন।"},
                {"icon": "✅", "text": "আমাদের আছে রিফান্ড পলিসি: ৭৫% প্রোডাক্ট সেবন করার পর ও রেজাল্ট না পেলে, অবশিষ্ট ২৫% ফেরত দিয়ে ৬০% টাকা রিফান্ড নিতে পারবেন।"},
                {"icon": "✅", "text": "আমরা রোগ নিরাময়ে গ্যারান্টি দেই না, কারণ সুস্থতা আল্লাহর হাতে — তবে আমাদের অভিজ্ঞতায় অনেকের মতো আপনিও ভালো ফলাফল পাবেন ইনশাআল্লাহ।"},
                {"icon": "✅", "text": "সম্পূর্ণ গোপনীয়তা রক্ষা করে ডেলিভারি দেওয়া হয় — প্যাকেটের গায়ে প্রোডাক্টের নাম লেখা থাকে না।"}
            ],
            "backgroundColor": "transparent",
            "textColor": "#d4e7d0",
            "order": 6,
            "is_visible": true
        },
        {
            "id": "reviews-1",
            "type": "hero",
            "title": "সম্মানিত কাস্টমারদের রিভিউ",
            "content": "আমাদের হাজারো কাস্টমার কোষ্ঠকাঠিন্য থেকে মুক্তি পেয়েছেন। নিচে কয়েকজনের অভিজ্ঞতা দেখুন:",
            "backgroundColor": "#132a1a",
            "textColor": "#E8D5B7",
            "order": 7,
            "is_visible": true
        },
        {
            "id": "review-testimonials",
            "type": "benefits",
            "title": "",
            "items": [
                {"icon": "⭐", "text": "\"প্রায় ৩ বছর ধরে কোষ্ঠকাঠিন্যে ভুগছিলাম। অনেক ওষুধ খেয়েছি কিন্তু স্থায়ী সমাধান পাইনি। হারবোরা মাত্র ১০ দিন খাওয়ার পর এখন নিয়মিত পায়খানা হচ্ছে। আলহামদুলিল্লাহ!\" — রহিমা, ঢাকা"},
                {"icon": "⭐", "text": "\"আমার বাবার বয়স ৬৫, দীর্ঘদিন ধরে পাইলস ও কোষ্ঠকাঠিন্যের সমস্যায় ভুগছিলেন। হারবোরা খাওয়ার ২ সপ্তাহ পর থেকে অনেক আরাম পাচ্ছেন।\" — সাইফুল, চট্টগ্রাম"},
                {"icon": "⭐", "text": "\"প্রেগন্যান্সির পর থেকে কোষ্ঠকাঠিন্যের সমস্যা ছিলো। হারবোরা প্রাকৃতিক হওয়ায় নিশ্চিন্তে খেতে পারছি এবং ভালো ফলাফল পাচ্ছি।\" — তানিয়া, সিলেট"},
                {"icon": "⭐", "text": "\"ফ্রী ট্রায়াল দিয়ে শুরু করেছিলাম, ৭ দিনেই ফলাফল পেলাম। এখন ফুল কোর্স নিয়েছি। দারুণ প্রোডাক্ট!\" — জসিম, রাজশাহী"}
            ],
            "backgroundColor": "transparent",
            "textColor": "#d4e7d0",
            "order": 8,
            "is_visible": true
        },
        {
            "id": "cta-final",
            "type": "cta",
            "title": "কোষ্ঠকাঠিন্যের যন্ত্রণা থেকে মুক্তি পেতে আজই ফ্রী ট্রায়াল নিন!",
            "content": "আমাদের হাজারো সন্তুষ্ট কাস্টমারদের মতো আপনিও উপকৃত হবেন ইনশাআল্লাহ। ফ্রী ট্রায়াল প্যাক পেতে শুধুমাত্র ডেলিভারি চার্জ দিয়ে নিচে অর্ডার করুন। কোনো ঝুঁকি নেই!",
            "buttonText": "ফ্রী ট্রায়াল অর্ডার করুন",
            "backgroundColor": "#132a1a",
            "textColor": "#E8D5B7",
            "order": 9,
            "is_visible": true
        }
    ]'::jsonb,

    -- ══════════════════════════════════════════════════════════
    -- PRODUCTS (JSONB)
    -- ══════════════════════════════════════════════════════════
    '[
        {
            "id": "harbora-free-trial",
            "name": "হারবোরা ফ্রী ট্রায়াল প্যাক (৭ দিনের কোর্স)",
            "description": "ফ্রী ট্রায়াল — শুধুমাত্র ডেলিভারি চার্জ দিয়ে বুঝে নিন। উপকার পেলে ফুল কোর্স অর্ডার করবেন!",
            "image_url": "/products/herbolin-harbora.png",
            "price": 0,
            "compare_price": 500,
            "product_id": null,
            "is_default": true,
            "is_featured": true,
            "featured_label": "🎁 ফ্রী ট্রায়াল"
        },
        {
            "id": "harbora-1-pack",
            "name": "হারবোরা ১ প্যাক (১ মাসের কোর্স)",
            "description": "১ মাসের সম্পূর্ণ কোর্স — কোষ্ঠকাঠিন্য থেকে দীর্ঘস্থায়ী মুক্তি",
            "image_url": "/products/herbolin-harbora.png",
            "price": 890,
            "compare_price": 1000,
            "product_id": null,
            "is_default": false,
            "is_featured": false,
            "featured_label": ""
        },
        {
            "id": "harbora-2-pack",
            "name": "হারবোরা ফুল কোর্স (২ প্যাক) — সবচেয়ে জনপ্রিয়",
            "description": "২ মাসের ফুল কোর্স — সর্বোচ্চ ফলাফলের জন্য। ১৭% ছাড়!",
            "image_url": "/products/herbolin-harbora.png",
            "price": 1490,
            "compare_price": 1800,
            "product_id": null,
            "is_default": false,
            "is_featured": true,
            "featured_label": "🔥 সবচেয়ে জনপ্রিয়"
        }
    ]'::jsonb,

    -- ── Contact ────────────────────────────────────────────────
    '01345948571',
    '01345948571',

    -- ── Order Form & Delivery Config ──────────────────────────
    true,     -- show_order_form
    true,     -- cash_on_delivery
    false,    -- free_delivery (customer pays delivery for free trial)
    60,       -- delivery_charge (inside Dhaka)
    110,      -- delivery_charge_outside
    'ঢাকার ভিতরে ৳60 | ঢাকার বাইরে ৳110',

    -- ── Active ─────────────────────────────────────────────────
    true
)
ON CONFLICT (slug) DO UPDATE
SET
    title                 = EXCLUDED.title,
    description           = EXCLUDED.description,
    template              = EXCLUDED.template,
    hero_image_url        = EXCLUDED.hero_image_url,
    hero_title            = EXCLUDED.hero_title,
    hero_subtitle         = EXCLUDED.hero_subtitle,
    hero_button_text      = EXCLUDED.hero_button_text,
    primary_color         = EXCLUDED.primary_color,
    secondary_color       = EXCLUDED.secondary_color,
    background_color      = EXCLUDED.background_color,
    meta_title            = EXCLUDED.meta_title,
    meta_description      = EXCLUDED.meta_description,
    sections              = EXCLUDED.sections,
    products              = EXCLUDED.products,
    phone_number          = EXCLUDED.phone_number,
    whatsapp_number       = EXCLUDED.whatsapp_number,
    delivery_charge       = EXCLUDED.delivery_charge,
    delivery_charge_outside = EXCLUDED.delivery_charge_outside,
    delivery_note         = EXCLUDED.delivery_note,
    updated_at            = CURRENT_TIMESTAMP;
