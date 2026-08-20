-- ═══════════════════════════════════════════════════════════════════
-- Naga Morich Pickle Challenge - Special Event Landing Page Seed Data
-- Run this in the trustcart_erp database
-- Uses INSERT ... ON CONFLICT to upsert (update if slug exists)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO landing_pages (
  uuid,
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
  is_active,
  view_count,
  order_count,
  start_date,
  end_date,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'নাগা মরিচের আচার চ্যালেঞ্জ - TrustCart Special Event',
  'naga-morich-challenge',
  'সাহস থাকলে তবেই খাবেন! নাগা মরিচের আচার খান, ৩ মিনিট পানি ছাড়া টিকে থাকুন, পুরস্কার জিতুন!',
  '/bombai-morich.jpg',
  'পারবেন না! বাজি ধরে বলছি!
মাত্র ৩ মিনিট — পানি ছাড়া!',
  'এটা বাংলাদেশের <b>সবচেয়ে ভয়ংকর ঝাল আচার!</b> একবার খেলে মুখ জ্বলবে আগুনের মতো — <b>৩ মিনিট পানি না খেয়ে টিকতে পারলেই পুরষ্কার আপনার!</b><br/><small>হাজারো মানুষ ট্রাই করেছে — বেশিরভাগই ১ মিনিটেই হেরে গেছে। আপনি কি পারবেন?</small>',
  'আমি পারবো! চ্যালেঞ্জ নিচ্ছি!',
  '#DC2626',
  '#FFFFFF',
  '#0F0A05',
  'special-event',
  'পারবেন না! নাগা মরিচ চ্যালেঞ্জ | TrustCart Special Event',
  'পারবেন না! বাজি ধরে বলছি! TrustCart নাগা মরিচের আচার চ্যালেঞ্জ — মাত্র ৩ মিনিট পানি ছাড়া টিকতে পারলেই পুরষ্কার! হাজারো মানুষ হেরে গেছে।',
  '/bombai-morich.jpg',
  '[
    {
      "id": "evt-rules-001",
      "type": "event-rules",
      "title": "চ্যালেঞ্জের নিয়মাবলী",
      "items": [
        { "icon": "1", "text": "TrustCart এর নাগা মরিচের আচার অবশ্যই কিনতে হবে — অন্য কোনো আচার গ্রহণযোগ্য নয়" },
        { "icon": "2", "text": "আচার খাওয়ার পর ঠিক ৩ মিনিট (১৮০ সেকেন্ড) পানি, দুধ, জুস বা অন্য কোনো পানীয় বা খাবার গ্রহণ করা যাবে না" },
        { "icon": "3", "text": "পুরো ৩ মিনিট ক্লিয়ার ভিডিওতে রেকর্ড করতে হবে — শুরু থেকে শেষ পর্যন্ত কাট ছাড়া" },
        { "icon": "4", "text": "ভিডিওতে আপনার মুখ এবং সময় (টাইমার/ঘড়ি) স্পষ্ট দেখা যেতে হবে" },
        { "icon": "5", "text": "ভিডিওটি TrustCart এর অফিসিয়াল WhatsApp গ্রুপে পোস্ট করতে হবে" },
        { "icon": "6", "text": "TrustCart টিম ভিডিও ভেরিফাই করবে — কোনো এডিট বা কাটছাঁট গ্রহণযোগ্য নয়" },
        { "icon": "!", "text": "চ্যালেঞ্জে অংশ নেওয়া সম্পূর্ণ স্বেচ্ছায় — TrustCart কোনো স্বাস্থ্যগত দায়িত্ব বহন করবে না" }
      ],
      "backgroundColor": "#1A0A00",
      "textColor": "#FFFFFF",
      "order": 1,
      "is_visible": true
    },
    {
      "id": "evt-howto-001",
      "type": "event-how-to",
      "title": "কিভাবে অংশ নেবেন?",
      "items": [
        { "icon": "1", "text": "এই পেজ থেকে নাগা মরিচের আচার অর্ডার করুন এবং ডেলিভেরি নিন" },
        { "icon": "2", "text": "ভিডিও রেকর্ডিং শুরু করুন — ফোনে টাইমার দেখান এবং আচার খান" },
        { "icon": "3", "text": "৩ মিনিট পানি বা অন্য কিছু ছাড়া টিকে থাকুন — পুরো ৩ মিনিট ভিডিওতে থাকতে হবে" },
        { "icon": "4", "text": "সফল হলে ভিডিওটি TrustCart WhatsApp গ্রুপে পোস্ট করুন" },
        { "icon": "5", "text": "TrustCart টিম ভেরিফাই করে আপনাকে পুরস্কার দেবে!" }
      ],
      "backgroundColor": "#120700",
      "textColor": "#FFFFFF",
      "order": 2,
      "is_visible": true
    },
    {
      "id": "evt-prizes-001",
      "type": "event-prizes",
      "title": "চ্যালেঞ্জ জিতলে কী পাবেন?",
      "items": [
        { "icon": "", "text": "TrustCart থেকে বিশেষ পুরস্কার ও সার্টিফিকেট" },
        { "icon": "", "text": "TrustCart এর যেকোনো প্রোডাক্টে বিশেষ ডিসকাউন্ট ভাউচার" },
        { "icon": "", "text": "আপনার ভিডিও TrustCart এর অফিসিয়াল সোশ্যাল মিডিয়ায় ফিচার করা হবে" },
        { "icon": "", "text": "TrustCart Spice Champion ব্যাজ — আমাদের ওয়েবসাইটে আপনার নাম থাকবে" },
        { "icon": "", "text": "প্রতি সপ্তাহের সেরা চ্যালেঞ্জারকে বিশেষ গ্র্যান্ড প্রাইজ!" },
        { "icon": "", "text": "চ্যালেঞ্জে সফল প্রত্যেককে ক্যাশব্যাক বা ফ্রি প্রোডাক্ট" }
      ],
      "backgroundColor": "#150800",
      "textColor": "#FFFFFF",
      "order": 3,
      "is_visible": true
    },
    {
      "id": "evt-benefits-001",
      "type": "benefits",
      "title": "আমাদের নাগা মরিচের আচার কেন বিশেষ?",
      "items": [
        { "icon": "", "text": "১০০% খাঁটি নাগা মরিচ দিয়ে তৈরি — কোনো আর্টিফিশিয়াল ফ্লেভার নেই" },
        { "icon": "", "text": "সম্পূর্ণ ঘরোয়া পদ্ধতিতে তৈরি — পরিষ্কার-পরিচ্ছন্ন পরিবেশে" },
        { "icon": "", "text": "বাংলাদেশের সবচেয়ে ঝাল আচার — সাহসীদের জন্য" },
        { "icon": "", "text": "৮০০ গ্রাম কাচের জারে প্যাকেজিং — দীর্ঘদিন সংরক্ষণযোগ্য" },
        { "icon": "", "text": "কোনো প্রিজারভেটিভ বা কেমিক্যাল ব্যবহার করা হয় না" },
        { "icon": "", "text": "সারাদেশে ক্যাশ অন ডেলিভেরি — ঘরে বসেই পান" }
      ],
      "backgroundColor": "#1A0A00",
      "textColor": "#FFFFFF",
      "order": 4,
      "is_visible": true
    },
    {
      "id": "evt-trust-001",
      "type": "trust",
      "title": "কেন TrustCart?",
      "items": [
        { "text": "১০০% খাঁটি ও জৈব পণ্যের নিশ্চয়তা" },
        { "text": "সারাদেশে দ্রুত হোম ডেলিভেরি" },
        { "text": "প্রোডাক্ট হাতে পেয়ে পেমেন্ট (ক্যাশ অন ডেলিভেরি)" },
        { "text": "১০,০০০+ সন্তুষ্ট কাস্টমার" },
        { "text": "প্রোডাক্টে সমস্যা হলে রিটার্ন/রিফান্ড সুবিধা" },
        { "text": "সব সময় কাস্টমার সাপোর্ট — ফোন ও WhatsApp" }
      ],
      "backgroundColor": "#150800",
      "textColor": "#FFFFFF",
      "order": 5,
      "is_visible": true
    },
    {
      "id": "evt-cta-001",
      "type": "cta",
      "title": "সাহস আছে? তাহলে দেরি কেন?",
      "content": "এখনই নাগা মরিচের আচার অর্ডার করুন এবং চ্যালেঞ্জে অংশ নিন! সীমিত সময়ের জন্য বিশেষ মূল্যে পাচ্ছেন।",
      "buttonText": "এখনই অর্ডার করুন",
      "backgroundColor": "#DC2626",
      "textColor": "#FFFFFF",
      "order": 6,
      "is_visible": true
    }
  ]'::jsonb,
  '[
    {
      "id": "prod-naga-001",
      "name": "নাগা মরিচের আচার (৮০০ গ্রাম)",
      "description": "TrustCart স্পেশাল — ১০০% খাঁটি নাগা মরিচ দিয়ে তৈরি ঘরোয়া আচার",
      "image_url": "/bombai-morich.jpg",
      "price": 650,
      "compare_price": 800,
      "is_default": true,
      "is_featured": true,
      "featured_label": "চ্যালেঞ্জ স্পেশাল"
    },
    {
      "id": "prod-naga-002",
      "name": "নাগা মরিচের আচার (৪০০ গ্রাম)",
      "description": "ছোট জার — প্রথমবার ট্রাই করতে চাইলে",
      "image_url": "/bombai-morich.jpg",
      "price": 380,
      "compare_price": 450,
      "is_default": false,
      "is_featured": false
    }
  ]'::jsonb,
  '',
  '',
  true,
  true,
  false,
  80.00,
  130.00,
  'ঢাকার ভিতরে ৮০ টাকা, ঢাকার বাইরে ১৩০ টাকা ডেলিভেরি চার্জ',
  true,
  0,
  0,
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  hero_image_url = EXCLUDED.hero_image_url,
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  hero_button_text = EXCLUDED.hero_button_text,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  background_color = EXCLUDED.background_color,
  template = EXCLUDED.template,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  og_image_url = EXCLUDED.og_image_url,
  sections = EXCLUDED.sections,
  products = EXCLUDED.products,
  phone_number = EXCLUDED.phone_number,
  whatsapp_number = EXCLUDED.whatsapp_number,
  show_order_form = EXCLUDED.show_order_form,
  cash_on_delivery = EXCLUDED.cash_on_delivery,
  free_delivery = EXCLUDED.free_delivery,
  delivery_charge = EXCLUDED.delivery_charge,
  delivery_charge_outside = EXCLUDED.delivery_charge_outside,
  delivery_note = EXCLUDED.delivery_note,
  is_active = EXCLUDED.is_active,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  updated_at = NOW();
