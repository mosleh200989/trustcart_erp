-- Banner System Migration (PostgreSQL)
-- Creates tables for managing homepage banners (carousel and side banners)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM type for banner_type
DO $$ BEGIN
  CREATE TYPE banner_type_enum AS ENUM ('carousel', 'side', 'promotional');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main Carousel Banners Table
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::VARCHAR,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  button_text VARCHAR(100),
  button_link VARCHAR(500),
  image_url VARCHAR(500) NOT NULL,
  background_color VARCHAR(50) DEFAULT '#FF6B35',
  text_color VARCHAR(50) DEFAULT '#FFFFFF',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  banner_type banner_type_enum DEFAULT 'carousel',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_banner_type ON banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_display_order ON banners(display_order);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample carousel banners with real product themes
INSERT INTO banners (uuid, title, subtitle, description, button_text, button_link, image_url, background_color, text_color, display_order, is_active, banner_type) VALUES
(uuid_generate_v4()::VARCHAR, 'Premium Organic Products', 'Fresh & Natural', 'Get up to 50% OFF on selected organic items. Limited time offer!', 'Shop Now', '/products?category=organic', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=600&fit=crop', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', '#FFFFFF', 1, TRUE, 'carousel'),
(uuid_generate_v4()::VARCHAR, 'Spices Collection', 'Authentic Indian Spices', 'Discover our premium range of authentic spices and masalas', 'Explore Spices', '/products?category=spices', 'https://images.unsplash.com/photo-1596040033229-a0b44d4c6de1?w=1200&h=600&fit=crop', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', '#FFFFFF', 2, TRUE, 'carousel'),
(uuid_generate_v4()::VARCHAR, 'Fresh Dairy Products', '100% Pure & Natural', 'Farm-fresh dairy delivered to your doorstep daily', 'Order Now', '/products?category=dairy', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1200&h=600&fit=crop', 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', '#FFFFFF', 3, TRUE, 'carousel'),
(uuid_generate_v4()::VARCHAR, 'Premium Oils & Ghee', 'Cold Pressed & Pure', 'Traditionally made oils and ghee for healthy cooking', 'View Products', '/products?category=oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&h=600&fit=crop', 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', '#FFFFFF', 4, TRUE, 'carousel');

-- Insert side banners
INSERT INTO banners (uuid, title, subtitle, description, button_text, button_link, image_url, background_color, text_color, display_order, is_active, banner_type) VALUES
(uuid_generate_v4()::VARCHAR, 'Dry Fruits & Nuts', 'Premium Quality', 'Get 30% OFF on all dry fruits. Healthy snacking made affordable!', 'Shop Dry Fruits', '/products?category=dry-fruits', 'https://images.unsplash.com/photo-1599599810694-b5c1b8c8e485?w=600&h=300&fit=crop', 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', '#FFFFFF', 1, TRUE, 'side'),
(uuid_generate_v4()::VARCHAR, 'Organic Honey', '100% Pure', 'Natural honey from the best bee farms. Limited stock!', 'Buy Now', '/products?category=honey', 'https://images.unsplash.com/photo-1587049352846-4a222e784443?w=600&h=300&fit=crop', 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', '#333333', 2, TRUE, 'side');

-- Update existing products with more realistic data
UPDATE products SET 
  name_en = 'Premium Organic Turmeric Powder',
  name_bn = 'প্রিমিয়াম অর্গানিক হলুদ গুঁড়া',
  description_en = 'Pure organic turmeric powder sourced from certified farms. Rich in curcumin with anti-inflammatory properties. Perfect for cooking and health remedies.',
  description_bn = 'প্রত্যয়িত খামার থেকে সংগৃহীত খাঁটি অর্গানিক হলুদ গুঁড়া। কারকিউমিন সমৃদ্ধ এবং প্রদাহ বিরোধী বৈশিষ্ট্য সহ।',
  brand = 'Nature''s Best',
  image_url = 'https://images.unsplash.com/photo-1615485500834-bc10199bc727?w=400&h=400&fit=crop',
  unit_of_measure = '500g'
WHERE id = 1 AND name_en LIKE '%Turmeric%';

UPDATE products SET 
  name_en = 'Cold Pressed Coconut Oil',
  name_bn = 'কোল্ড প্রেসড নারকেল তেল',
  description_en = 'Extra virgin coconut oil extracted using traditional cold press method. Rich in MCT and lauric acid. Ideal for cooking, skincare, and hair care.',
  description_bn = 'ঐতিহ্যবাহী কোল্ড প্রেস পদ্ধতি ব্যবহার করে নিষ্কাশিত এক্সট্রা ভার্জিন নারকেল তেল।',
  brand = 'PureOils',
  image_url = 'https://images.unsplash.com/photo-1608181078686-683578edd3d4?w=400&h=400&fit=crop',
  unit_of_measure = '1L'
WHERE id = 2 AND name_en LIKE '%Coconut Oil%';

-- Drop existing categories table if it has wrong schema, then recreate
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name_en VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  parent_id INT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Create trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert categories
INSERT INTO categories (name_en, name_bn, slug, description, image_url, display_order, is_active) VALUES
('Spices & Masalas', 'মসলা', 'spices', 'Authentic Indian spices and masala blends', 'https://images.unsplash.com/photo-1596040033229-a0b44d4c6de1?w=400', 1, TRUE),
('Dry Fruits & Nuts', 'শুকনো ফল ও বাদাম', 'dry-fruits', 'Premium quality dry fruits and nuts', 'https://images.unsplash.com/photo-1599599810694-b5c1b8c8e485?w=400', 2, TRUE),
('Dairy Products', 'দুগ্ধজাত পণ্য', 'dairy', 'Fresh dairy products from trusted farms', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', 3, TRUE),
('Beverages', 'পানীয়', 'beverages', 'Tea, coffee and healthy beverages', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400', 4, TRUE),
('Honey & Sweeteners', 'মধু ও মিষ্টি', 'honey', 'Natural honey and healthy sweeteners', 'https://images.unsplash.com/photo-1587049352846-4a222e784443?w=400', 5, TRUE),
('Cooking Oils', 'রান্নার তেল', 'oils', 'Pure and cold-pressed cooking oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', 6, TRUE);

-- Add more real products
INSERT INTO products (uuid, sku, product_code, slug, name_en, name_bn, description_en, description_bn, category_id, base_price, wholesale_price, brand, unit_of_measure, image_url, stock_quantity, display_position, status, discount_type, discount_value, sale_price) VALUES
(uuid_generate_v4(), 'SP-001', 'SPICE001', 'premium-red-chili-powder', 'Premium Red Chili Powder', 'প্রিমিয়াম মরিচ গুঁড়া', 'Authentic Indian red chili powder with perfect heat and color. Sourced from Guntur region.', 'গুন্টুর অঞ্চল থেকে সংগৃহীত খাঁটি ভারতীয় লাল মরিচ গুঁড়া।', 1, 180.00, 150.00, 'Spice King', '250g', 'https://images.unsplash.com/photo-1583206937003-a00149e87f86?w=400&h=400&fit=crop', 500, 1, 'active', 'percentage', 15.00, 153.00),
(uuid_generate_v4(), 'DR-002', 'DRYFR002', 'premium-cashew-nuts', 'Premium Cashew Nuts', 'প্রিমিয়াম কাজু বাদাম', 'Whole cashew nuts, naturally processed without any additives. Rich source of healthy fats and proteins.', 'কোনো সংযোজক ছাড়াই প্রাকৃতিকভাবে প্রক্রিয়াজাত সম্পূর্ণ কাজু বাদাম।', 2, 850.00, 780.00, 'Nutty Delight', '500g', 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=400&h=400&fit=crop', 200, 2, 'active', 'flat', 100.00, 750.00),
(uuid_generate_v4(), 'DA-003', 'DAIRY003', 'pure-cow-ghee', 'Pure Cow Ghee', 'খাঁটি গরুর ঘি', 'Traditional pure cow ghee made from grass-fed cow milk. Rich aroma and authentic taste.', 'ঘাস খাওয়ানো গরুর দুধ থেকে তৈরি ঐতিহ্যবাহী খাঁটি গরুর ঘি।', 3, 1200.00, 1100.00, 'Dairy Fresh', '1kg', 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=400&fit=crop', 150, 3, 'active', NULL, NULL, NULL),
(uuid_generate_v4(), 'BV-004', 'BEV004', 'organic-green-tea', 'Organic Green Tea', 'অর্গানিক সবুজ চা', 'Premium organic green tea leaves from Darjeeling. Rich in antioxidants and natural flavor.', 'দার্জিলিং থেকে প্রিমিয়াম অর্গানিক সবুজ চা পাতা।', 4, 450.00, 400.00, 'Tea Garden', '200g', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop', 300, 4, 'active', 'percentage', 20.00, 360.00),
(uuid_generate_v4(), 'HN-005', 'HONEY005', 'raw-forest-honey', 'Raw Forest Honey', 'কাঁচা বন মধু', 'Unprocessed raw honey collected from deep forests. Contains natural enzymes and nutrients.', 'গভীর বন থেকে সংগৃহীত অপ্রক্রিয়াজাত কাঁচা মধু।', 5, 650.00, 600.00, 'Honey House', '500g', 'https://images.unsplash.com/photo-1587049352846-4a222e784443?w=400&h=400&fit=crop', 180, 5, 'active', 'percentage', 10.00, 585.00),
(uuid_generate_v4(), 'SP-006', 'SPICE006', 'garam-masala-powder', 'Garam Masala Powder', 'গরম মসলা গুঁড়া', 'Authentic blend of roasted spices. Perfect for North Indian cuisine.', 'ভাজা মসলার খাঁটি মিশ্রণ। উত্তর ভারতীয় রান্নার জন্য নিখুঁত।', 1, 220.00, 190.00, 'Spice King', '200g', 'https://images.unsplash.com/photo-1596040033229-a0b44d4c6de1?w=400&h=400&fit=crop', 400, 6, 'active', NULL, NULL, NULL),
(uuid_generate_v4(), 'OL-007', 'OIL007', 'mustard-oil-cold-pressed', 'Mustard Oil (Cold Pressed)', 'সরিষার তেল (কোল্ড প্রেসড)', 'Pure mustard oil extracted using traditional cold press method. Strong aroma and authentic taste.', 'ঐতিহ্যবাহী কোল্ড প্রেস পদ্ধতি ব্যবহার করে নিষ্কাশিত খাঁটি সরিষার তেল।', 6, 380.00, 350.00, 'PureOils', '1L', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop', 250, 7, 'active', 'percentage', 12.00, 334.40),
(uuid_generate_v4(), 'DR-008', 'DRYFR008', 'almonds-premium', 'Premium Almonds', 'প্রিমিয়াম বাদাম', 'California almonds, rich in vitamin E and healthy fats. Perfect for snacking.', 'ক্যালিফোর্নিয়া বাদাম, ভিটামিন ই এবং স্বাস্থ্যকর চর্বি সমৃদ্ধ।', 2, 950.00, 900.00, 'Nutty Delight', '500g', 'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=400&fit=crop', 180, 8, 'active', 'flat', 80.00, 870.00),
(uuid_generate_v4(), 'SP-009', 'SPICE009', 'coriander-powder', 'Coriander Powder', 'ধনিয়া গুঁড়া', 'Freshly ground coriander powder with natural aroma. Essential for Indian cooking.', 'প্রাকৃতিক সুগন্ধ সহ তাজা ধনিয়া গুঁড়া।', 1, 120.00, 100.00, 'Spice King', '250g', 'https://images.unsplash.com/photo-1599909533084-1d929978b5f3?w=400&h=400&fit=crop', 600, 9, 'active', NULL, NULL, NULL),
(uuid_generate_v4(), 'DA-010', 'DAIRY010', 'paneer-fresh', 'Fresh Paneer', 'তাজা পনির', 'Farm-fresh paneer made from pure cow milk. High in protein and calcium.', 'খাঁটি গরুর দুধ থেকে তৈরি খামারের তাজা পনির।', 3, 280.00, 250.00, 'Dairy Fresh', '500g', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop', 100, 10, 'active', 'percentage', 15.00, 238.00),
(uuid_generate_v4(), 'BV-011', 'BEV011', 'masala-chai-premix', 'Masala Chai Premix', 'মসলা চা প্রিমিক্স', 'Ready to use masala chai mix with authentic Indian spices.', 'খাঁটি ভারতীয় মসলা সহ ব্যবহারের জন্য প্রস্তুত মসলা চা মিশ্রণ।', 4, 350.00, 320.00, 'Tea Garden', '250g', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=400&fit=crop', 200, 11, 'active', 'percentage', 25.00, 262.50),
(uuid_generate_v4(), 'HN-012', 'HONEY012', 'manuka-honey', 'Manuka Honey', 'মানুকা মধু', 'Premium Manuka honey with high MGO content. Known for medicinal properties.', 'উচ্চ MGO কন্টেন্ট সহ প্রিমিয়াম মানুকা মধু।', 5, 1800.00, 1700.00, 'Honey House', '250g', 'https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=400&h=400&fit=crop', 50, 12, 'active', NULL, NULL, NULL),
(uuid_generate_v4(), 'DR-013', 'DRYFR013', 'walnuts-premium', 'Premium Walnuts', 'প্রিমিয়াম আখরোট', 'Fresh walnuts, rich in omega-3 fatty acids. Brain-boosting superfood.', 'তাজা আখরোট, ওমেগা-৩ ফ্যাটি অ্যাসিড সমৃদ্ধ।', 2, 1100.00, 1050.00, 'Nutty Delight', '500g', 'https://images.unsplash.com/photo-1622484211018-f1fa2f8d9cda?w=400&h=400&fit=crop', 120, 13, 'active', 'percentage', 10.00, 990.00),
(uuid_generate_v4(), 'SP-014', 'SPICE014', 'cumin-seeds', 'Cumin Seeds', 'জিরা', 'Whole cumin seeds with strong aroma. Essential spice for tempering.', 'শক্তিশালী সুগন্ধ সহ সম্পূর্ণ জিরা।', 1, 250.00, 220.00, 'Spice King', '250g', 'https://images.unsplash.com/photo-1596547609441-4c7d4c1b2605?w=400&h=400&fit=crop', 500, 14, 'active', NULL, NULL, NULL),
(uuid_generate_v4(), 'OL-015', 'OIL015', 'sesame-oil-cold-pressed', 'Sesame Oil (Cold Pressed)', 'তিলের তেল (কোল্ড প্রেসড)', 'Pure cold-pressed sesame oil. Rich nutty flavor, perfect for cooking and massage.', 'খাঁটি কোল্ড-প্রেসড তিলের তেল। সমৃদ্ধ বাদামের স্বাদ।', 6, 420.00, 390.00, 'PureOils', '500ml', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop', 200, 15, 'active', 'percentage', 15.00, 357.00);

COMMIT;
