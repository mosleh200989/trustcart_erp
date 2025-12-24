-- Insert 50 products with correct category_ids (1-10)
INSERT INTO products (sku, product_code, name_en, name_bn, description_en, description_bn, category_id, base_price, created_at, status) VALUES
('ROZELA001', 'PROD001', 'Rozela Tea', 'রোজেলা চা', 'Premium Rozela Tea, 100% organic', 'প্রিমিয়াম রোজেলা চা, ১০০% অর্গানিক', 5, 600.00, NOW(), 'active'),
('OLIVE001', 'PROD002', 'Olive Oil', 'জয়তুন তেল', 'Pure Olive Oil, Virgin Grade', 'বিশুদ্ধ জয়তুন তেল, ভার্জিন গ্রেড', 2, 650.00, NOW(), 'active'),
('MASALA001', 'PROD003', 'Gura Masala Combo', 'গুঁড়া মশলা কম্বো', 'Mixed spice blend, 5 types', 'মশলার মিশ্রণ, ৫ প্রকার', 1, 1050.00, NOW(), 'active'),
('GHEE001', 'PROD004', 'Gawa Ghee', 'খাঁটি গাওয়া ঘি', 'Pure cow ghee, authentic', 'দেশি গরুর খাঁটি ঘি', 2, 700.00, NOW(), 'active'),
('MORINGA001', 'PROD005', 'Moringa Powder', 'সজনে পাতার গুড়া', 'Moringa leaf powder', 'সজনের পাতার পাউডার', 1, 650.00, NOW(), 'active'),
('CHIA001', 'PROD006', 'Chia Seeds', 'চিয়া সিড', 'Organic chia seeds', 'অর্গানিক চিয়া বীজ', 9, 400.00, NOW(), 'active'),
('BEET001', 'PROD007', 'Beetroot Powder', 'বিটরুট পাউডার', 'Fresh beet powder', 'তাজা বিটের গুড়া', 1, 650.00, NOW(), 'active'),
('CHILI001', 'PROD008', 'Chili Powder', 'মরিচের গুঁড়া', 'Pure red chili powder', 'খাঁটি লাল মরিচের গুড়া', 1, 600.00, NOW(), 'active'),
('TURMERIC001', 'PROD009', 'Turmeric Powder', 'হলুদের গুড়া', 'Pure turmeric powder', 'বিশুদ্ধ হলুদের গুড়া', 1, 600.00, NOW(), 'active'),
('COCONUT001', 'PROD010', 'Coconut Oil', 'নারকেল তেল', 'Virgin coconut oil', 'ভার্জিন কোকোনাট অয়েল', 2, 450.00, NOW(), 'active'),
('CUMIN001', 'PROD011', 'Black Cumin', 'কালো জিরা', 'Fragrant black cumin', 'সুগন্ধি কালো জিরা', 1, 350.00, NOW(), 'active'),
('CORIANDER001', 'PROD012', 'Coriander Seeds', 'ধনিয়ার বীজ', 'Pure coriander seeds', 'খাঁটি ধনিয়ার বীজ', 1, 300.00, NOW(), 'active'),
('HONEY001', 'PROD013', 'Honey', 'মধু', '100% pure honey', '১০০% বিশুদ্ধ মধু', 5, 850.00, NOW(), 'active'),
('BROWNRICE001', 'PROD014', 'Brown Rice Flour', 'বাদামী চালের গুড়া', 'Organic brown rice flour', 'অর্গানিক বাদামী চালের ফ্লোর', 6, 400.00, NOW(), 'active'),
('WHEAT001', 'PROD015', 'Wheat Flour', 'গমের ফ্লোর', 'Whole wheat flour', 'সম্পূর্ণ গম থেকে তৈরি', 6, 350.00, NOW(), 'active'),
('CHOCO001', 'PROD016', 'Dark Chocolate', 'ডার্ক চকলেট', 'Dark chocolate 72%', 'কালো চকলেট, ডার্ক 72%', 3, 500.00, NOW(), 'active'),
('COFFEE001', 'PROD017', 'Coffee Beans', 'কফি বিন', 'Arabica coffee beans', 'আরাবিকা কফি বিন', 4, 1200.00, NOW(), 'active'),
('CASHEW001', 'PROD018', 'Cashew Nuts', 'কাজু বাদাম', 'Delicious cashew nuts', 'কাজু বাদাম, সুস্বাদু', 3, 800.00, NOW(), 'active'),
('RAISIN001', 'PROD019', 'Raisins', 'কিসমিস', 'Sweet raisins, imported', 'মিষ্টি কিসমিস, আফগানিস্তান থেকে', 3, 600.00, NOW(), 'active'),
('DATE001', 'PROD020', 'Dates', 'খেজুর', 'Mazaffel dates', 'মজাফফল খেজুর', 3, 700.00, NOW(), 'active'),
('OLIVEJUICE001', 'PROD021', 'Olive Juice', 'জাইতুনের জুস', 'Fresh olive juice', 'তাজা জাইতুনের রস', 4, 650.00, NOW(), 'active'),
('GRAPEJUICE001', 'PROD022', 'Grape Juice', 'আঙুরের জুস', 'Natural grape juice', 'প্রাকৃতিক আঙুরের রস', 4, 550.00, NOW(), 'active'),
('AMLA001', 'PROD023', 'Amla Powder', 'আমলা গুড়া', 'Vitamin-rich amla powder', 'ভিটামিন সমৃদ্ধ আমলা গুড়া', 1, 450.00, NOW(), 'active'),
('BROCCOLI001', 'PROD024', 'Broccoli Powder', 'ব্রোকলি গুড়া', 'Green broccoli powder', 'সবুজ ব্রোকলি গুড়া', 1, 550.00, NOW(), 'active'),
('ONION001', 'PROD025', 'Onion Powder', 'পেঁয়াজ গুড়া', 'Dried onion powder', 'শুকনো পেঁয়াজের গুড়া', 1, 350.00, NOW(), 'active'),
('GARLIC001', 'PROD026', 'Garlic Powder', 'রসুন গুড়া', 'Fragrant garlic powder', 'সুগন্ধি রসুনের গুড়া', 1, 400.00, NOW(), 'active'),
('FENUGREEK001', 'PROD027', 'Fenugreek Seeds', 'মেথি দানা', 'Pure fenugreek seeds', 'খাঁটি মেথির বীজ', 9, 300.00, NOW(), 'active'),
('CUMMIN001', 'PROD028', 'Cumin Powder', 'জিরা গুড়া', 'White cumin powder', 'সাদা জিরার গুড়া', 1, 350.00, NOW(), 'active'),
('AJWAIN001', 'PROD029', 'Ajwain', 'আজওয়াইন', 'Pure ajwain seeds', 'খাঁটি আজওয়াইন', 1, 400.00, NOW(), 'active'),
('PSYLLIUM001', 'PROD030', 'Psyllium Husk', 'ইসবগুলের ভুসি', 'Psyllium husk fiber', 'ইসবগুলের কাষ্ঠবল্ক', 9, 450.00, NOW(), 'active'),
('FLAX001', 'PROD031', 'Flax Seeds', 'লিনসিড', 'Flax seeds', 'আলসির বীজ', 9, 350.00, NOW(), 'active'),
('SUNFLOWER001', 'PROD032', 'Sunflower Seeds', 'সূর্যমুখী বীজ', 'Sunflower seeds', 'সূর্যমুখীর দানা', 9, 300.00, NOW(), 'active'),
('PUMPKIN001', 'PROD033', 'Pumpkin Seeds', 'কুমড়োর বীজ', 'Healthy pumpkin seeds', 'কুমড়ার বীজ, স্বাস্থ্যকর', 9, 400.00, NOW(), 'active'),
('COCONUTCREME001', 'PROD034', 'Coconut Creme', 'নারকেল কিমা', 'Dried coconut creme', 'শুকনো নারকেল কিমা', 3, 550.00, NOW(), 'active'),
('PICKLEMIX001', 'PROD035', 'Pickle Mix', 'আচার মসলা', 'Pickle making spice', 'আচার তৈরির মশলা', 1, 450.00, NOW(), 'active'),
('GARAM001', 'PROD036', 'Garam Masala', 'গরম মশলা', 'Traditional garam masala', 'ঐতিহ্যবাহী গরম মশলা', 1, 500.00, NOW(), 'active'),
('TEA001', 'PROD037', 'Tea Mix Spice', 'চায়ের মশলা', 'Tea making spice', 'চা বানানোর মশলা', 1, 400.00, NOW(), 'active'),
('DALMIX001', 'PROD038', 'Dal Mix', 'দাল মশলা', 'Dal cooking spice', 'দাল রান্নার মশলা', 1, 350.00, NOW(), 'active'),
('BIRYANI001', 'PROD039', 'Biryani Spice', 'বিরিয়ানি মশলা', 'Biryani special spice', 'বিরিয়ানির বিশেষ মশলা', 1, 600.00, NOW(), 'active'),
('SOUPMIX001', 'PROD040', 'Soup Mix', 'স্যুপ মসলা', 'Soup making spice', 'স্যুপের জন্য মশলা', 1, 400.00, NOW(), 'active'),
('YOGURT001', 'PROD041', 'Yogurt', 'দই', 'Fresh yogurt, traditional', 'ঐতিহ্যবাহী দই, তাজা', 7, 200.00, NOW(), 'active'),
('BUTTERMILK001', 'PROD042', 'Buttermilk', 'ঘোল', 'Buttermilk from curd', 'মাঠার তৈরি ঘোল', 7, 150.00, NOW(), 'active'),
('PANEER001', 'PROD043', 'Paneer', 'ছানা', 'Fresh paneer from yogurt', 'তাজা দই থেকে তৈরি ছানা', 7, 300.00, NOW(), 'active'),
('KHEER001', 'PROD044', 'Kheer Pak', 'খীর পাকের মাল', 'Kheer pak ingredient', 'খীর পাক বানানোর উপাদান', 8, 550.00, NOW(), 'active'),
('PITHA001', 'PROD045', 'Pitha Flour', 'পিঠার মাল', 'Pitha making flour', 'পিঠা বানানোর আটা', 6, 350.00, NOW(), 'active'),
('SINGARA001', 'PROD046', 'Singara', 'সিঙ্গাড়া', 'Fresh singara', 'তাজা সিঙ্গাড়া', 8, 250.00, NOW(), 'active'),
('LUCHI001', 'PROD047', 'Luchi Flour', 'লুচি-ফুলকা', 'Luchi making flour', 'মাইদা থেকে তৈরি লুচি', 6, 400.00, NOW(), 'active'),
('KHICHURI001', 'PROD048', 'Khichuri Mix', 'খিচুড়ি মাল', 'Khichuri ingredient set', 'খিচুড়ির উপাদান সেট', 6, 600.00, NOW(), 'active'),
('SEEDMIX001', 'PROD049', 'Seed Mix', 'সবজির বীজ মিশ্রণ', 'Vegetable seed mix', 'বাগান করার জন্য বীজ', 9, 800.00, NOW(), 'active'),
('SANITIZER001', 'PROD050', 'Hand Sanitizer', 'স্যানিটাইজার', 'Hand sanitizer', 'হাতের জন্য স্যানিটাইজার', 10, 150.00, NOW(), 'active');

-- Verify final counts
SELECT 'Categories' as table_name, COUNT(*) as total FROM categories
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM ecommerce_orders;
