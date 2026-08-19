-- ============================================================
-- Natural Glowra — cold-pressed virgin coconut oil landing page
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
    'ন্যাচারাল গ্লোরার খাঁটি কোল্ড-প্রেসড ভার্জিন নারিকেল তেল — চুল, ত্বক ও রান্নার জন্য। কোনো কেমিক্যাল নেই, কোনো ভেজাল নেই।',
    'natural',
    'image-first',
    'above-image',
    'https://images.unsplash.com/photo-1690228987673-f6e104fa653c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1537191072641-5e19cc173c6a?auto=format&fit=crop&w=1920&q=80',
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
    'Natural Glowra | খাঁটি কোল্ড-প্রেসড ভার্জিন নারিকেল তেল',
    'ন্যাচারাল গ্লোরার কোল্ড-প্রেসড ভার্জিন নারিকেল তেল — চুল, ত্বক ও রান্নার জন্য ১০০% খাঁটি। ক্যাশ অন ডেলিভারিতে সারাদেশে অর্ডার করুন।',
    'https://images.unsplash.com/photo-1690228987673-f6e104fa653c?auto=format&fit=crop&w=1200&q=80',
    $$[
      {
        "id": "natural-hero-badges",
        "type": "benefits",
        "title": "",
        "items": [
          { "icon": "◉", "text": "কোল্ড-প্রেসড" },
          { "icon": "◉", "text": "শতভাগ প্রাকৃতিক" },
          { "icon": "◉", "text": "১০০% খাঁটি" }
        ],
        "order": 1,
        "is_visible": true
      },
      {
        "id": "natural-packages",
        "type": "custom-html",
        "title": "আমাদের প্যাকেজ সমূহ",
        "content": "আপনার প্রয়োজন অনুযায়ী প্যাকেজ বেছে নিন — যত বড় বোতল, তত বেশি সাশ্রয়।",
        "backgroundColor": "#E8F6EC",
        "textColor": "#38493F",
        "order": 2,
        "is_visible": true
      },
      {
        "id": "natural-why",
        "type": "trust",
        "title": "কেন ন্যাচারাল গ্লোরা নারিকেল তেল সেরা?",
        "items": [
          { "text": "কোল্ড-প্রেসড প্রক্রিয়া — তাপ ছাড়া ভাঙানো হয়, তাই পুষ্টিগুণ, ভিটামিন-ই ও প্রাকৃতিক ঘ্রাণ সম্পূর্ণ অক্ষুণ্ণ থাকে" },
          { "text": "ভার্জিন গ্রেড — বাছাই করা পরিণত নারিকেলের প্রথম প্রেসিং থেকেই তৈরি" },
          { "text": "কোনো প্রিজারভেটিভ, রং বা সুগন্ধি নেই — ১০০% প্রাকৃতিক ও বিশুদ্ধ" },
          { "text": "রিফাইন করা হয় না, ব্লিচ করা হয় না — তাই খাওয়ার উপযোগী এবং সংবেদনশীল ত্বকেও নিরাপদ" },
          { "text": "হাইজিনিক প্যাকেজিং — খাদ্য-গ্রেড UV-প্রটেকটেড বোতলে সিল করা" },
          { "text": "প্রতিটি ব্যাচ ল্যাব-পরীক্ষিত, বোতলের গায়ে ব্যাচ ও মেয়াদ উল্লেখ করা থাকে" }
        ],
        "backgroundColor": "#FFFDF7",
        "buttonText": "অর্ডার করুন",
        "paddingY": 56,
        "order": 3,
        "is_visible": true
      },
      {
        "id": "natural-uses",
        "type": "benefits",
        "title": "একটি বোতল, অসংখ্য ব্যবহার",
        "items": [
          { "icon": "💇‍♀️", "text": "চুলের যত্নে — গোসলের আগে স্ক্যাল্পে ম্যাসাজ করলে চুল পড়া কমে, খুশকি নিয়ন্ত্রণে আসে ও চুল হয় ঝলমলে" },
          { "icon": "✨", "text": "ত্বকের যত্নে — প্রাকৃতিক ময়েশ্চারাইজার হিসেবে শুষ্কতা দূর করে, ত্বক রাখে কোমল ও উজ্জ্বল" },
          { "icon": "🍳", "text": "রান্নায় — উচ্চ তাপেও স্থিতিশীল, ভাজা-রান্নার জন্য স্বাস্থ্যকর বিকল্প" },
          { "icon": "🥄", "text": "সরাসরি সেবনে — প্রতিদিন সকালে ১ চা-চামচ কাঁচা খেলে পাওয়া যায় প্রাকৃতিক MCT-এর উপকারিতা" },
          { "icon": "👶", "text": "শিশুর যত্নে — কোমল ত্বকে ম্যাসাজের জন্য নিরাপদ ও কেমিক্যালমুক্ত" },
          { "icon": "💅", "text": "ঠোঁট, হাত ও পায়ের ফাটা যত্নে — শীতকালে প্রাকৃতিক সমাধান" }
        ],
        "backgroundColor": "#FFFFFF",
        "paddingY": 56,
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
        "is_visible": true
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
        "content": "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px\"><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"color:#F0A500;margin-bottom:8px\">★★★★★</div><div style=\"color:#33443A\">“দুই মাস ধরে ব্যবহার করছি। চুল পড়া অনেকটাই কমেছে আর ঘ্রাণটা একদম কাঁচা নারিকেলের মতো — বাজারের তেলের সাথে তুলনাই চলে না।”</div><div style=\"margin-top:12px;font-weight:700;color:#18562B\">সুমাইয়া আক্তার</div><div style=\"font-size:13px;color:#6B7A70\">মিরপুর, ঢাকা</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"color:#F0A500;margin-bottom:8px\">★★★★★</div><div style=\"color:#33443A\">“বাচ্চার গায়ে ম্যাসাজ করি, কোনো র‍্যাশ হয়নি। রান্নাতেও ব্যবহার করছি — এক তেলেই দুই কাজ।”</div><div style=\"margin-top:12px;font-weight:700;color:#18562B\">নাফিসা রহমান</div><div style=\"font-size:13px;color:#6B7A70\">চট্টগ্রাম</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:14px;padding:20px\"><div style=\"color:#F0A500;margin-bottom:8px\">★★★★★</div><div style=\"color:#33443A\">“১ লিটারের বোতলটা নিয়েছিলাম, দাম হিসেবে সবচেয়ে সাশ্রয়ী। ডেলিভারিও পেয়েছি ২ দিনে, প্যাকেজিং একদম নিখুঁত।”</div><div style=\"margin-top:12px;font-weight:700;color:#18562B\">তানভীর হাসান</div><div style=\"font-size:13px;color:#6B7A70\">রাজশাহী</div></div></div>",
        "backgroundColor": "#FFFDF7",
        "paddingY": 56,
        "order": 7,
        "is_visible": true
      },
      {
        "id": "natural-faq",
        "type": "custom-html",
        "title": "সাধারণ জিজ্ঞাসা",
        "content": "<div style=\"display:grid;gap:14px;max-width:760px;margin:0 auto\"><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">তেল জমে সাদা হয়ে গেলে কি নষ্ট হয়ে গেছে?</div><div style=\"color:#4A5A50\">না। ২২°সে.-এর নিচে খাঁটি নারিকেল তেল স্বাভাবিকভাবেই জমাট বাঁধে। হালকা গরম পানিতে বোতল রাখলেই আবার তরল হয়ে যাবে।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">এটি কি সরাসরি খাওয়া যাবে?</div><div style=\"color:#4A5A50\">হ্যাঁ। এটি ফুড-গ্রেড ভার্জিন কোকোনাট অয়েল — রিফাইন বা ব্লিচ করা হয়নি। প্রতিদিন সকালে ১ চা-চামচ খাওয়া যায়।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">মেয়াদ কতদিন?</div><div style=\"color:#4A5A50\">উৎপাদনের তারিখ থেকে ১৮ মাস। সরাসরি রোদ এড়িয়ে ঘরের স্বাভাবিক তাপমাত্রায় রাখুন।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">ডেলিভারি পেতে কতদিন লাগে?</div><div style=\"color:#4A5A50\">ঢাকার ভিতরে ১–২ কর্মদিবস, ঢাকার বাইরে ২–৪ কর্মদিবস। পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন।</div></div><div style=\"background:#ffffff;border:1px solid #DCE6DD;border-radius:12px;padding:18px\"><div style=\"font-weight:700;color:#18562B;margin-bottom:6px\">পণ্য পছন্দ না হলে?</div><div style=\"color:#4A5A50\">সিল অক্ষত থাকলে ডেলিভারির ৭ দিনের মধ্যে ফেরত বা বদলে নেওয়া যাবে।</div></div></div>",
        "backgroundColor": "#F2F8F3",
        "paddingY": 56,
        "order": 8,
        "is_visible": true
      },
      {
        "id": "natural-cta",
        "type": "cta",
        "title": "আজই অর্ডার করুন — ক্যাশ অন ডেলিভারিতে",
        "content": "সারাদেশে হোম ডেলিভারি। পণ্য হাতে পেয়ে, দেখে-শুনে তারপর মূল্য পরিশোধ করুন।",
        "buttonText": "অর্ডার করুন",
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
        "id": "ng-coconut-250",
        "name": "নারিকেল তেল — ২৫০ মি.লি.",
        "description": "প্রথমবার ব্যবহার করে দেখার জন্য আদর্শ।",
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
        "is_default": true,
        "allow_quantity_selector": true,
        "is_featured": true,
        "featured_label": "🔥 বেস্ট সেলার"
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
    'ঢাকার ভিতরে ১–২ কর্মদিবস, ঢাকার বাইরে ২–৪ কর্মদিবসের মধ্যে ডেলিভারি।',
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
