-- Seed data for the Veshoj landing page clone.
-- Run after create_landing_pages.sql and the landing-page style migrations.

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
  ADD COLUMN IF NOT EXISTS order_form_bg_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS order_form_card_bg_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS order_form_title_color VARCHAR(50) NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS order_form_text_color VARCHAR(50) NOT NULL DEFAULT '#374151',
  ADD COLUMN IF NOT EXISTS order_form_accent_color VARCHAR(50) NOT NULL DEFAULT '#B53389',
  ADD COLUMN IF NOT EXISTS order_form_border_color VARCHAR(50) NOT NULL DEFAULT '#e5e7eb';

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS footer_bg_color VARCHAR(50) NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS footer_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS footer_link_bg_color VARCHAR(50) NOT NULL DEFAULT '#FF7B00',
  ADD COLUMN IF NOT EXISTS footer_link_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS footer_border_color VARCHAR(50) NOT NULL DEFAULT '#1f2937';

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS floating_whatsapp_color VARCHAR(50) DEFAULT '#25D366',
  ADD COLUMN IF NOT EXISTS floating_phone_color VARCHAR(50) DEFAULT '#FF7B00';

INSERT INTO landing_pages (
    title,
    slug,
    description,
    template,
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
    'ভেষজ হেলথ কেয়ার',
    'veshoj',
    'মাত্র ৭ দিন সেবনে সাদা স্রা-ব, দুর্গন্ধ ও চুলকানি নিয়ন্ত্রণে আসবে ইনশাল্লাহ।',
    'veshoj',
    'https://veshoj.site/wp-content/uploads/2025/04/veshoj-logo-new-scaled.png',
    'https://veshoj.site/wp-content/uploads/2025/05/facebook-cover-veshoj-5.jpg-2.jpeg',
    'মাত্র ৭ দিন<br />সেবনে সাদা স্রা-ব, দুর্গন্ধ ও চুলকানি নিয়ন্ত্রণে আসবে ইনশাল্লাহ!',
    'আলহামদুলিল্লাহ! ১ লক্ষ+ মা-বোন ইতোমধ্যে উপকার পেয়েছেন।',
    'অর্ডার করুন',
    '#B53389',
    '#FFFFFF',
    '#FFFFFF',
    '#FF7B00',
    '#FFFFFF',
    'transparent',
    10,
    '#FFFFFF',
    '#FFFFFF',
    '#111827',
    '#374151',
    '#B53389',
    '#e5e7eb',
    '#111827',
    '#FFFFFF',
    '#FF7B00',
    '#FFFFFF',
    '#1f2937',
    '#25D366',
    '#FF7B00',
    'ভেষজ হেলথ কেয়ার | লিউকোন গার্ড',
    'মাত্র ৭ দিন সেবনে সাদা স্রা-ব, দুর্গন্ধ ও চুলকানি নিয়ন্ত্রণে আসবে ইনশাল্লাহ। অর্ডার করুন ক্যাশ অন ডেলিভারিতে।',
    'https://veshoj.site/wp-content/uploads/2025/05/facebook-cover-veshoj-5.jpg-2.jpeg',
    $$[
      {
        "id": "veshoj-symptoms",
        "type": "trust",
        "title": "এই লক্ষণগুলো কি আপনাকেও ভুগাচ্ছে?",
        "content": "এই লক্ষণগুলো অবহেলা করলে সাদা স্রা-ব বাড়তে পারে এবং জরায়ুর জটিল রোগের ঝুঁকি তৈরি হতে পারে।",
        "items": [],
        "order": 1,
        "is_visible": true
      },
      {
        "id": "veshoj-benefit-images",
        "type": "images",
        "title": "লিউকোন সেবনে যেসব সমস্যা দূর হবেঃ",
        "images": [
          "https://veshoj.site/wp-content/uploads/2025/05/for-web-infographic-1.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/for-web-infographic-2.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/for-web-infographic-3.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/for-web-infographic-4.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/for-web-infographic-5.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/for-web-infographic-6.jpg"
        ],
        "order": 2,
        "is_visible": true
      },
      {
        "id": "veshoj-video",
        "type": "custom-html",
        "title": "",
        "content": "",
        "images": [
          "https://veshoj.site/wp-content/uploads/2025/05/183.jpg-3-1024x543.jpeg"
        ],
        "order": 3,
        "is_visible": true
      },
      {
        "id": "veshoj-usage",
        "type": "custom-html",
        "title": "খাওয়ার নিয়ম ও সময়",
        "content": "<p><strong>প্রতিদিন -</strong></p><p>সকাল, দুপুর এবং রাতের খাবারের ৩০ মিনিট পর ২ টা করে  বড়ি সেবন করতে হবে।</p><p><strong>বি. দ্র:</strong> ঠান্ডা পানি, অতিরিক্ত ঝাল-মিষ্টি ও তেলযুক্ত খাবার খাওয়া থেকে বিরত থাকতে হবে।</p>",
        "order": 4,
        "is_visible": true
      },
      {
        "id": "veshoj-comments",
        "type": "images",
        "title": "সম্মানিত গ্রাহকের মন্তব্য",
        "content": "সম্মানিত কাস্টমারদের মতামত",
        "images": [
          "https://veshoj.site/wp-content/uploads/2025/05/5.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/6.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/7-1024x1024.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/8-1024x1024.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/9.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/10-1024x1024.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/11-1-1024x1024.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/12-1024x1024.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/13-1024x1024.jpg",
          "https://veshoj.site/wp-content/uploads/2025/05/14-1024x1024.jpg"
        ],
        "order": 5,
        "is_visible": true
      },
      {
        "id": "veshoj-phone",
        "type": "phone-cta",
        "title": "কল করে অর্ডার করতে চাই",
        "buttonText": "01973-298146",
        "order": 6,
        "is_visible": true
      }
    ]$$::jsonb,
    $$[
      {
        "id": "veshoj-single",
        "name": "লিউকোন গার্ড এর সাথে রুচিলতা ফ্রী (1pcs)",
        "description": "লিউকোন গার্ড এর সাথে রুচিলতা ফ্রী।",
        "image_url": "https://veshoj.site/wp-content/uploads/2025/04/vesoj-web2.jpg-300x300.jpeg",
        "price": 1050,
        "compare_price": 0,
        "qty": 1,
        "product_id": null,
        "is_default": true,
        "allow_quantity_selector": true,
        "is_featured": false,
        "featured_label": ""
      },
      {
        "id": "veshoj-double",
        "name": "২টি লিউকোন গার্ড এর সাথে রুচিলতা ও ইন্টিমেট সাবান ফ্রী",
        "description": "২টি লিউকোন গার্ড এর সাথে রুচিলতা ও ইন্টিমেট সাবান ফ্রী।",
        "image_url": "https://veshoj.site/wp-content/uploads/2025/04/vesoj-web.jpg-300x300.jpeg",
        "price": 1590,
        "compare_price": 0,
        "qty": 1,
        "product_id": null,
        "is_default": false,
        "allow_quantity_selector": true,
        "is_featured": true,
        "featured_label": "বেস্ট অফার"
      }
    ]$$::jsonb,
    '01973-298146',
    '8801973298146',
    true,
    true,
    true,
    0,
    0,
    'ডেলিভারি চার্জ একদম ফ্রি!',
    true
)
ON CONFLICT (slug) DO UPDATE
SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    template = EXCLUDED.template,
    hero_image_url = EXCLUDED.hero_image_url,
    hero_background_image_url = EXCLUDED.hero_background_image_url,
    hero_title = EXCLUDED.hero_title,
    hero_subtitle = EXCLUDED.hero_subtitle,
    hero_button_text = EXCLUDED.hero_button_text,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    background_color = EXCLUDED.background_color,
    btn_bg_color = EXCLUDED.btn_bg_color,
    btn_text_color = EXCLUDED.btn_text_color,
    btn_border_color = EXCLUDED.btn_border_color,
    btn_border_radius = EXCLUDED.btn_border_radius,
    order_form_bg_color = EXCLUDED.order_form_bg_color,
    order_form_card_bg_color = EXCLUDED.order_form_card_bg_color,
    order_form_title_color = EXCLUDED.order_form_title_color,
    order_form_text_color = EXCLUDED.order_form_text_color,
    order_form_accent_color = EXCLUDED.order_form_accent_color,
    order_form_border_color = EXCLUDED.order_form_border_color,
    footer_bg_color = EXCLUDED.footer_bg_color,
    footer_text_color = EXCLUDED.footer_text_color,
    footer_link_bg_color = EXCLUDED.footer_link_bg_color,
    footer_link_text_color = EXCLUDED.footer_link_text_color,
    footer_border_color = EXCLUDED.footer_border_color,
    floating_whatsapp_color = EXCLUDED.floating_whatsapp_color,
    floating_phone_color = EXCLUDED.floating_phone_color,
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
    updated_at = CURRENT_TIMESTAMP;
