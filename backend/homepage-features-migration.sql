-- Homepage Features Migration
-- Adds support for Deal of Day, Popular Products, New Arrivals, Featured Products, 
-- Combo Deals, Customer Reviews, Email Subscribers, and Product View Tracking

-- 1. Add product feature flags to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_deal_of_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deal_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS deal_expires_at TIMESTAMP;

-- Create indexes for product flags
CREATE INDEX IF NOT EXISTS idx_products_deal_of_day ON products(is_deal_of_day) WHERE is_deal_of_day = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_popular ON products(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(is_new_arrival) WHERE is_new_arrival = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;

-- 2. Create combo_deals table
CREATE TABLE IF NOT EXISTS combo_deals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) NOT NULL,
  combo_price DECIMAL(10,2),
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create combo_deal_products junction table
CREATE TABLE IF NOT EXISTS combo_deal_products (
  combo_deal_id INTEGER REFERENCES combo_deals(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  PRIMARY KEY (combo_deal_id, product_id)
);

-- 4. Create customer_reviews table
CREATE TABLE IF NOT EXISTS customer_reviews (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(100),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  video_url VARCHAR(255),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_product ON customer_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_featured ON customer_reviews(is_featured) WHERE is_featured = TRUE;

-- 5. Create email_subscribers table
CREATE TABLE IF NOT EXISTS email_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);

-- 6. Create user_product_views table (for Recently Viewed Products)
CREATE TABLE IF NOT EXISTS user_product_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_product_views_user ON user_product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_views_session ON user_product_views(session_id);
CREATE INDEX IF NOT EXISTS idx_user_product_views_product ON user_product_views(product_id);

-- 7. Insert sample data for Deal of Day (update existing products)
UPDATE products SET 
  is_deal_of_day = TRUE,
  deal_price = base_price * 0.70,
  deal_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
WHERE id IN (
  SELECT id FROM products 
  ORDER BY RANDOM() 
  LIMIT 5
);

-- 8. Mark some products as Popular
UPDATE products SET is_popular = TRUE
WHERE id IN (
  SELECT id FROM products 
  ORDER BY RANDOM() 
  LIMIT 8
);

-- 9. Mark some products as New Arrivals
UPDATE products SET is_new_arrival = TRUE
WHERE id IN (
  SELECT id FROM products 
  ORDER BY created_at DESC 
  LIMIT 8
);

-- 10. Mark some products as Featured
UPDATE products SET is_featured = TRUE
WHERE id IN (
  SELECT id FROM products 
  ORDER BY RANDOM() 
  LIMIT 8
);

-- 11. Insert sample combo deals
INSERT INTO combo_deals (name, slug, description, discount_percentage, combo_price, image_url, is_active, expires_at) VALUES
(
  'Immunity Booster Combo',
  'immunity-booster-combo',
  'Complete immunity package with Honey, Turmeric, and Ginger. Save 25% on this powerful combination!',
  25.00,
  1200.00,
  '/combos/immunity-combo.jpg',
  TRUE,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
),
(
  'Energy Essentials Pack',
  'energy-essentials-pack',
  'Get your daily energy boost with our curated selection of natural products. 20% off!',
  20.00,
  1500.00,
  '/combos/energy-pack.jpg',
  TRUE,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
),
(
  'Heart Health Bundle',
  'heart-health-bundle',
  'Support your cardiovascular health with this specially selected bundle. Save 30%!',
  30.00,
  1800.00,
  '/combos/heart-bundle.jpg',
  TRUE,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
),
(
  'Weight Management Kit',
  'weight-management-kit',
  'Everything you need for healthy weight management. 25% discount!',
  25.00,
  2000.00,
  '/combos/weight-kit.jpg',
  TRUE,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
);

-- 12. Link products to combo deals (assuming product IDs 1-20 exist)
-- Immunity Booster Combo (3 products)
INSERT INTO combo_deal_products (combo_deal_id, product_id, quantity)
SELECT cd.id, p.id, 1 
FROM combo_deals cd
CROSS JOIN LATERAL (
  SELECT id FROM products ORDER BY RANDOM() LIMIT 3
) p
WHERE cd.slug = 'immunity-booster-combo'
ON CONFLICT DO NOTHING;

-- Energy Essentials Pack (4 products)
INSERT INTO combo_deal_products (combo_deal_id, product_id, quantity)
SELECT cd.id, p.id, 1 
FROM combo_deals cd
CROSS JOIN LATERAL (
  SELECT id FROM products ORDER BY RANDOM() LIMIT 4
) p
WHERE cd.slug = 'energy-essentials-pack'
ON CONFLICT DO NOTHING;

-- Heart Health Bundle (3 products)
INSERT INTO combo_deal_products (combo_deal_id, product_id, quantity)
SELECT cd.id, p.id, 1 
FROM combo_deals cd
CROSS JOIN LATERAL (
  SELECT id FROM products ORDER BY RANDOM() LIMIT 3
) p
WHERE cd.slug = 'heart-health-bundle'
ON CONFLICT DO NOTHING;

-- Weight Management Kit (4 products)
INSERT INTO combo_deal_products (combo_deal_id, product_id, quantity)
SELECT cd.id, p.id, 1 
FROM combo_deals cd
CROSS JOIN LATERAL (
  SELECT id FROM products ORDER BY RANDOM() LIMIT 4
) p
WHERE cd.slug = 'weight-management-kit'
ON CONFLICT DO NOTHING;

-- 13. Insert sample customer reviews
-- First, get some existing product IDs
DO $$
DECLARE
  product_ids INTEGER[];
BEGIN
  -- Get array of existing product IDs
  SELECT ARRAY_AGG(id) INTO product_ids FROM (SELECT id FROM products LIMIT 6) sub;
  
  -- Insert reviews with existing product IDs
  INSERT INTO customer_reviews (customer_name, customer_email, rating, review_text, video_url, product_id, is_featured, is_approved) 
  VALUES
  (
    'Fatima Rahman',
    'fatima@example.com',
    5,
    'খুবই ভালো পণ্য! আমার পরিবারের সবাই এই মধু খুব পছন্দ করে। সত্যিকারের অরগানিক এবং খাঁটি মধু।',
    'https://www.youtube.com/watch?v=sample1',
    product_ids[1],
    TRUE,
    TRUE
  ),
  (
    'Karim Hossain',
    'karim@example.com',
    5,
    'Excellent quality honey! I have been using it for 3 months and noticed great improvement in my health.',
    NULL,
    product_ids[1],
    TRUE,
    TRUE
  ),
  (
    'Ayesha Begum',
    'ayesha@example.com',
    4,
    'পণ্যটি ভালো তবে দাম একটু বেশি মনে হয়েছে। তবুও গুণমান চমৎকার।',
    NULL,
    product_ids[2],
    FALSE,
    TRUE
  ),
  (
    'Mahmud Ali',
    'mahmud@example.com',
    5,
    'Amazing product! Fast delivery and excellent packaging. Highly recommended!',
    'https://www.youtube.com/watch?v=sample2',
    product_ids[3],
    TRUE,
    TRUE
  ),
  (
    'Nusrat Jahan',
    'nusrat@example.com',
    5,
    'দ্রুত ডেলিভারি এবং দারুণ মানের পণ্য। TrustCart থেকে কেনাকাটা সবসময়ই ভালো অভিজ্ঞতা।',
    NULL,
    product_ids[2],
    FALSE,
    TRUE
  ),
  (
    'Rahim Sheikh',
    'rahim@example.com',
    4,
    'Good product, will order again. পণ্যের মান ভালো এবং মূল্য সাশ্রয়ী।',
    NULL,
    product_ids[4],
    FALSE,
    TRUE
  );
END $$;

-- 14. Insert sample email subscribers
INSERT INTO email_subscribers (email, status) VALUES
('subscriber1@example.com', 'active'),
('subscriber2@example.com', 'active'),
('subscriber3@example.com', 'active')
ON CONFLICT (email) DO NOTHING;

-- Verify the migration
SELECT 'Deal of Day Products:', COUNT(*) FROM products WHERE is_deal_of_day = TRUE;
SELECT 'Popular Products:', COUNT(*) FROM products WHERE is_popular = TRUE;
SELECT 'New Arrival Products:', COUNT(*) FROM products WHERE is_new_arrival = TRUE;
SELECT 'Featured Products:', COUNT(*) FROM products WHERE is_featured = TRUE;
SELECT 'Combo Deals:', COUNT(*) FROM combo_deals;
SELECT 'Customer Reviews:', COUNT(*) FROM customer_reviews;
SELECT 'Email Subscribers:', COUNT(*) FROM email_subscribers;

-- Show sample data
SELECT id, name, is_deal_of_day, deal_price, is_popular, is_new_arrival, is_featured FROM products LIMIT 10;
SELECT id, name, discount_percentage, combo_price FROM combo_deals;
SELECT id, customer_name, rating, product_id, is_featured FROM customer_reviews;
