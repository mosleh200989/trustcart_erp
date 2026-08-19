-- ============================================================
-- Natural Glowra — free 75ml coconut oil trial-pack funnel
-- Template: 'natural'  |  Slug: 'natural-glowra-coconut-oil'
-- Served at https://naturalglowra.com/ via the Next.js middleware
-- domain map + nginx/naturalglowra.conf.
--
-- Run after create_landing_pages.sql and the landing-page style
-- migrations (this file is idempotent — re-running updates the row).
-- ============================================================

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS template VARCHAR(50) NOT NULL DEFAULT 'classic';

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS hero_background_image_url VARCHAR(500);

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS btn_bg_color VARCHAR(50) NOT NULL DEFAULT '#2d6a4f',
  ADD COLUMN IF NOT EXISTS btn_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS btn_border_color VARCHAR(50) NOT NULL DEFAULT 'transparent',
  ADD COLUMN IF NOT EXISTS btn_border_radius INTEGER NOT NULL DEFAULT 16;

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS floating_whatsapp_color VARCHAR(50) DEFAULT '#25D366',
  ADD COLUMN IF NOT EXISTS floating_phone_color VARCHAR(50) DEFAULT '#FF7B00';

INSERT INTO landing_pages (
    title,
    slug,
    description,
    template,
    hero_layout,
    hero_subtitle_position,
    hero_image_url,
    hero_background_image_url,
    hero_title,
    hero_subtitle,
    hero_button_text,
    primary_color,
    secondary_color,
    background_color,
    btn_bg_color,
    btn_text_color,
    btn_border_color,
    btn_border_radius,
    order_form_bg_color,
    order_form_card_bg_color,
    order_form_title_color,
    order_form_text_color,
    order_form_accent_color,
    order_form_border_color,
    footer_bg_color,
    footer_text_color,
    footer_link_bg_color,
    footer_link_text_color,
    footer_border_color,
    floating_whatsapp_color,
    floating_phone_color,
    meta_title,
    meta_description,
    og_image_url,
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
    'Natural Glowra',
    'natural-glowra-coconut-oil',
    'ন্যাচারাল গ্লোরার খাঁটি কোল্ড-প্রেসড ভার্জিন নারিকেল তেলের ৭৫ মি.লি. ট্রায়াল প্যাক একদম ফ্রি — শুধু ডেলিভারি চার্জ দিন।',
    'natural',
    'banner',
    'above-image',
    '/images/naturalglowra/banner.jpg',
    NULL,
    'খাঁটি কোল্ড-প্রেসড<br />ভার্জিন নারিকেল তেল',
    'চুলে, ত্বকে ও রান্নায় — এমনকি সরাসরি কাঁচা খাওয়ার উপযোগী। কোনো কেমিক্যাল নেই, কোনো ভেজাল নেই। সরাসরি প্রকৃতি থেকে আপনার ঘরে।',
    'অর্ডার করুন',
    '#18562B',
    '#15AD70',
    '#FFFDF7',
    '#18562B',
    '#FFFFFF',
    'transparent',
    8,
    '#F2F8F3',
    '#FFFFFF',
    '#14301E',
    '#4A5A50',
    '#15AD70',
    '#DCE6DD',
    '#14301E',
    '#D9E4DC',
    '#15AD70',
    '#FFFFFF',
    '#1E4630',
    '#25D366',
    '#18562B',
    'Natural Glowra | ৭৫ মি.লি. নারিকেল তেলের ট্রায়াল প্যাক একদম ফ্রি',
    '৭৫ মি.লি. এক্সট্রা ভার্জিন নারিকেল তেলের ট্রায়াল প্যাক সম্পূর্ণ ফ্রি — পণ্যের কোনো মূল্য নেই, শুধু ডেলিভারি চার্জ প্রযোজ্য। সারাদেশে হোম ডেলিভারি।',
    '/images/naturalglowra/banner.jpg',
    $$[
  {
    "id": "natural-hero-badges",
    "type": "benefits",
    "title": "",
    "items": [
      {
        "icon": "◉",
        "text": "কোল্ড-প্রেসড"
      },
      {
        "icon": "◉",
        "text": "শতভাগ প্রাকৃতিক"
      },
      {
        "icon": "◉",
        "text": "১০০% খাঁটি"
      }
    ],
    "order": 1,
    "is_visible": false
  },
  {
    "id": "natural-packages",
    "type": "packages",
    "title": "ফ্রি ট্রায়াল প্যাক নিন",
    "content": "৭৫ মি.লি. ট্রায়াল প্যাকের কোনো মূল্য নেই — শুধু ডেলিভারি চার্জ দিন। ভালো লাগলে নিচের বড় প্যাকেজ থেকে বেছে নিতে পারেন।",
    "backgroundColor": "#E8F6EC",
    "textColor": "#38493F",
    "order": 2,
    "is_visible": true
  },
  {
    "id": "natural-why",
    "type": "images",
    "title": "",
    "images": [
      "/images/naturalglowra/why.jpg"
    ],
    "backgroundColor": "#EEF9FD",
    "buttonText": "ফ্রি ট্রায়াল প্যাক নিন",
    "paddingY": 40,
    "order": 3,
    "is_visible": true
  },
  {
    "id": "natural-uses",
    "type": "images",
    "title": "",
    "images": [
      "/images/naturalglowra/uses.jpg"
    ],
    "backgroundColor": "#FFFFFF",
    "paddingY": 40,
    "order": 4,
    "is_visible": true
  },
  {
    "id": "natural-gallery",
    "type": "images",
    "title": "প্রকৃতি থেকে সরাসরি আপনার ঘরে",
    "images": [
      "https://images.unsplash.com/photo-1597636319015-1fce74db8798?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1596911647169-7085321c81b8?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1589810353876-0497a89e5ad1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1564141696939-9eb6e957ccfc?auto=format&fit=crop&w=900&q=80"
    ],
    "backgroundColor": "#F2F8F3",
    "paddingY": 56,
    "order": 5,
    "is_visible": false
  },
  {
    "id": "natural-process",
    "type": "custom-html",
    "title": "কীভাবে তৈরি হয় আমাদের তেল?",
    "content": "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px\"><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"font-size:26px;line-height:1;margin-bottom:10px\">🥥</div><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">১. বাছাই</div><div style=\"color:#4A5A50\">পরিণত, রোদে-শুকানো নারিকেল হাতে বাছাই করা হয়।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"font-size:26px;line-height:1;margin-bottom:10px\">⚙️</div><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">২. কোল্ড-প্রেসিং</div><div style=\"color:#4A5A50\">৪৫°সে.-এর নিচে ধীর গতিতে প্রেস করা হয়, কোনো তাপ প্রয়োগ ছাড়াই।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"font-size:26px;line-height:1;margin-bottom:10px\">💧</div><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">৩. প্রাকৃতিক ফিল্টারিং</div><div style=\"color:#4A5A50\">কোনো রাসায়নিক ছাড়াই স্তরে স্তরে ছেঁকে স্বচ্ছ করা হয়।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"font-size:26px;line-height:1;margin-bottom:10px\">🔒</div><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">৪. সিল প্যাকেজিং</div><div style=\"color:#4A5A50\">ব্যাচ ও মেয়াদসহ UV-প্রটেকটেড বোতলে সিল করে পাঠানো হয়।</div></div></div><p style=\"margin-top:18px;color:#4A5A50\">দীর্ঘদিন ভালো রাখার জন্য আমরা কোনো প্রকার কেমিক্যাল বা প্রিজারভেটিভ ব্যবহার করি না — এটি সম্পূর্ণ ন্যাচারাল। ২২°সে.-এর নিচে তেল সাদা ও জমাট হয়ে যেতে পারে, এটি খাঁটি নারিকেল তেলের স্বাভাবিক বৈশিষ্ট্য।</p>",
    "backgroundColor": "#E8F6EC",
    "paddingY": 56,
    "order": 6,
    "is_visible": true
  },
  {
    "id": "natural-reviews",
    "type": "custom-html",
    "title": "ক্রেতাদের অভিজ্ঞতা",
    "content": "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px\"><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"color:#F0A500;margin-bottom:8px\">★★★★★</div><div style=\"color:#33443A\">“ট্রায়াল প্যাক নিয়ে দেখেছিলাম, ঘ্রাণটা একদম কাঁচা নারিকেলের মতো। এখন ৫০০ মি.লি. নিয়মিত নিচ্ছি।”</div><div style=\"margin-top:12px;font-weight:700;color:#18562B\">সুমাইয়া আক্তার</div><div style=\"font-size:13px;color:#6B7A70\">মিরপুর, ঢাকা</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"color:#F0A500;margin-bottom:8px\">★★★★★</div><div style=\"color:#33443A\">“বাচ্চার গায়ে ম্যাসাজ করি, কোনো র‌যাশ হয়নি। রান্নাতেও ব্যবহার করছি — এক তেলেই দুই কাজ।”</div><div style=\"margin-top:12px;font-weight:700;color:#18562B\">নাফিসা রহমান</div><div style=\"font-size:13px;color:#6B7A70\">চট্টগ্রাম</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"color:#F0A500;margin-bottom:8px\">★★★★★</div><div style=\"color:#33443A\">“শুধু ডেলিভারি চার্জেই ট্রায়াল প্যাক পেয়েছি, ২ দিনে ডেলিভারি। প্যাকেজিং একদম নিখুঁত।”</div><div style=\"margin-top:12px;font-weight:700;color:#18562B\">তানভীর হাসান</div><div style=\"font-size:13px;color:#6B7A70\">রাজশাহী</div></div></div>",
    "backgroundColor": "#FFFDF7",
    "paddingY": 56,
    "order": 7,
    "is_visible": true
  },
  {
    "id": "natural-faq",
    "type": "custom-html",
    "title": "সাধারণ জিজ্ঞাসা",
    "content": "<div style=\"display:grid;gap:14px;max-width:760px;margin:0 auto\"><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">ট্রায়াল প্যাকের জন্য কত টাকা দিতে হবে?</div><div style=\"color:#4A5A50\">পণ্যের কোনো মূল্য নেই। আপনি শুধু ডেলিভারি চার্জ দেবেন — ঢাকার ভিতরে ৬০৳, ঢাকার বাইরে ১১০৳। পণ্য হাতে পেয়ে পরিশোধ করবেন।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">তেল জমে সাদা হয়ে গেলে কি নষ্ট হয়ে গেছে?</div><div style=\"color:#4A5A50\">না। ২২°সে.-এর নিচে খাঁটি নারিকেল তেল স্বাভাবিকভাবেই জমাট বাঁধে। হালকা গরম পানিতে বোতল রাখলেই আবার তরল হয়ে যাবে।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">এটি কি সরাসরি খাওয়া যাবে?</div><div style=\"color:#4A5A50\">হ্যাঁ। এটি ফুড-গ্রেড এক্সট্রা ভার্জিন কোকোনাট অয়েল — রিফাইন বা ব্লিচ করা হয়নি। প্রতিদিন সকালে ১ চা-চামচ খাওয়া যায়।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">মেয়াদ কতদিন?</div><div style=\"color:#4A5A50\">উৎপাদনের তারিখ থেকে ১৮ মাস। সরাসরি রোদ এড়িয়ে ঘরের স্বাভাবিক তাপমাত্রায় রাখুন।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">ডেলিভারি পেতে কতদিন লাগে?</div><div style=\"color:#4A5A50\">ঢাকার ভিতরে ১–২ কর্মদিবস, ঢাকার বাইরে ২–৪ কর্মদিবস। পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন।</div></div></div>",
    "backgroundColor": "#F2F8F3",
    "paddingY": 56,
    "order": 8,
    "is_visible": true
  },
  {
    "id": "natural-cta",
    "type": "cta",
    "title": "আজই ফ্রি ট্রায়াল প্যাক অর্ডার করুন",
    "content": "পণ্যের কোনো মূল্য নেই — শুধু ডেলিভারি চার্জ। সারাদেশে হোম ডেলিভারি, পণ্য হাতে পেয়ে পরিশোধ করুন।",
    "buttonText": "ফ্রি ট্রায়াল প্যাক নিন",
    "backgroundColor": "#FFFDF7",
    "paddingY": 48,
    "order": 9,
    "is_visible": true
  },
  {
    "id": "natural-phone",
    "type": "phone-cta",
    "title": "কল করে অর্ডার করতে চাইলে",
    "order": 10,
    "is_visible": true
  }
]$$::jsonb,
    $$[
  {
    "id": "ng-coconut-trial-75",
    "name": "নারিকেল তেল ট্রায়াল প্যাক — ৭৫ মি.লি.",
    "description": "পণ্যের কোনো মূল্য নেই — শুধু ডেলিভারি চার্জ দিয়ে বুঝে নিন।",
    "image_url": "",
    "price": 0,
    "compare_price": 250,
    "product_id": 514,
    "is_default": true,
    "allow_quantity_selector": false,
    "is_featured": true,
    "featured_label": "🎁 একদম ফ্রি"
  },
  {
    "id": "ng-coconut-250",
    "name": "নারিকেল তেল — ২৫০ মি.লি.",
    "description": "নিয়মিত ব্যবহার শুরু করার জন্য আদর্শ।",
    "image_url": "https://images.unsplash.com/photo-1592343530102-bb0f284c6d3b?auto=format&fit=crop&w=800&q=80",
    "price": 540,
    "compare_price": 690,
    "is_default": false,
    "allow_quantity_selector": true
  },
  {
    "id": "ng-coconut-500",
    "name": "নারিকেল তেল — ৫০০ মি.লি.",
    "description": "পরিবারের নিয়মিত ব্যবহারের জন্য পারফেক্ট।",
    "image_url": "https://images.unsplash.com/photo-1690228987673-f6e104fa653c?auto=format&fit=crop&w=800&q=80",
    "price": 960,
    "compare_price": 1250,
    "is_default": false,
    "allow_quantity_selector": true
  },
  {
    "id": "ng-coconut-1000",
    "name": "নারিকেল তেল — ১ লিটার",
    "description": "সবচেয়ে সাশ্রয়ী — প্রতি মি.লি.-তে সর্বোচ্চ ছাড়।",
    "image_url": "https://images.unsplash.com/photo-1588413333412-82148535db53?auto=format&fit=crop&w=800&q=80",
    "price": 1750,
    "compare_price": 2400,
    "is_default": false,
    "allow_quantity_selector": true
  }
]$$::jsonb,
    '01805-561699',
    '+8801805561699',
    true,
    true,
    false,
    60,
    110,
    'ট্রায়াল প্যাকের কোনো মূল্য নেই — শুধু ডেলিভারি চার্জ প্রযোজ্য। ঢাকার ভিতরে ১–২ কর্মদিবস, ঢাকার বাইরে ২–৪ কর্মদিবসের মধ্যে ডেলিভারি।',
    true
)
ON CONFLICT (slug) DO UPDATE SET
    title                     = EXCLUDED.title,
    description               = EXCLUDED.description,
    template                  = EXCLUDED.template,
    hero_layout               = EXCLUDED.hero_layout,
    hero_subtitle_position    = EXCLUDED.hero_subtitle_position,
    hero_image_url            = EXCLUDED.hero_image_url,
    hero_background_image_url = EXCLUDED.hero_background_image_url,
    hero_title                = EXCLUDED.hero_title,
    hero_subtitle             = EXCLUDED.hero_subtitle,
    hero_button_text          = EXCLUDED.hero_button_text,
    primary_color             = EXCLUDED.primary_color,
    secondary_color           = EXCLUDED.secondary_color,
    background_color          = EXCLUDED.background_color,
    btn_bg_color              = EXCLUDED.btn_bg_color,
    btn_text_color            = EXCLUDED.btn_text_color,
    btn_border_color          = EXCLUDED.btn_border_color,
    btn_border_radius         = EXCLUDED.btn_border_radius,
    order_form_bg_color       = EXCLUDED.order_form_bg_color,
    order_form_card_bg_color  = EXCLUDED.order_form_card_bg_color,
    order_form_title_color    = EXCLUDED.order_form_title_color,
    order_form_text_color     = EXCLUDED.order_form_text_color,
    order_form_accent_color   = EXCLUDED.order_form_accent_color,
    order_form_border_color   = EXCLUDED.order_form_border_color,
    footer_bg_color           = EXCLUDED.footer_bg_color,
    footer_text_color         = EXCLUDED.footer_text_color,
    footer_link_bg_color      = EXCLUDED.footer_link_bg_color,
    footer_link_text_color    = EXCLUDED.footer_link_text_color,
    footer_border_color       = EXCLUDED.footer_border_color,
    floating_whatsapp_color   = EXCLUDED.floating_whatsapp_color,
    floating_phone_color      = EXCLUDED.floating_phone_color,
    meta_title                = EXCLUDED.meta_title,
    meta_description          = EXCLUDED.meta_description,
    og_image_url              = EXCLUDED.og_image_url,
    sections                  = EXCLUDED.sections,
    products                  = EXCLUDED.products,
    phone_number              = EXCLUDED.phone_number,
    whatsapp_number           = EXCLUDED.whatsapp_number,
    show_order_form           = EXCLUDED.show_order_form,
    cash_on_delivery          = EXCLUDED.cash_on_delivery,
    free_delivery             = EXCLUDED.free_delivery,
    delivery_charge           = EXCLUDED.delivery_charge,
    delivery_charge_outside   = EXCLUDED.delivery_charge_outside,
    delivery_note             = EXCLUDED.delivery_note,
    is_active                 = EXCLUDED.is_active,
    updated_at                = NOW();
