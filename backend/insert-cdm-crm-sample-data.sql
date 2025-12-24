-- CDM & CRM Sample Data
-- Inserts sample users, customers, family members, interactions, and CRM data

-- ============================================
-- 1. INSERT SAMPLE USERS (Team Leads & Agents)
-- ============================================

-- Note: Password is hashed 'password123' using bcrypt
INSERT INTO users (first_name, last_name, email, password_hash, role_id, status) VALUES
('Karim', 'Ahmed', 'karim.ahmed@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Fatima', 'Rahman', 'fatima.rahman@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Rahim', 'Miah', 'rahim.miah@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Ayesha', 'Begum', 'ayesha.begum@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Mahmud', 'Hasan', 'mahmud.hasan@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Nusrat', 'Jahan', 'nusrat.jahan@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. INSERT SAMPLE CUSTOMERS (CDM)
-- ============================================

INSERT INTO customers (first_name, last_name, email, phone, mobile, address, district, city, gender, date_of_birth, anniversary_date, priority, customer_type, lifecycle_stage, status) VALUES
-- Hot Customers (VIP)
('John', 'Doe', 'john.doe@example.com', '01712345678', '01712345678', 'House 10, Road 5, Dhanmondi', 'Dhaka', 'Dhaka', 'male', '1985-03-15', '2010-12-20', 'hot', 'vip', 'active', 'active'),
('Sarah', 'Khan', 'sarah.khan@example.com', '01798765432', '01798765432', 'Flat 3B, Gulshan 2', 'Dhaka', 'Dhaka', 'female', '1990-07-22', '2015-02-14', 'hot', 'vip', 'active', 'active'),
('Ahmed', 'Ali', 'ahmed.ali@example.com', '01611223344', '01611223344', 'House 25, Banani DOHS', 'Dhaka', 'Dhaka', 'male', '1988-11-08', NULL, 'hot', 'vip', 'active', 'active'),

-- Warm Customers (Repeat)
('Fatima', 'Begum', 'fatima.begum@example.com', '01755667788', '01755667788', 'House 15, Mohammadpur', 'Dhaka', 'Dhaka', 'female', '1992-05-12', '2018-06-10', 'warm', 'repeat', 'active', 'active'),
('Karim', 'Hossain', 'karim.hossain@example.com', '01899887766', '01899887766', 'Mirpur 10, Block C', 'Dhaka', 'Dhaka', 'male', '1995-09-30', NULL, 'warm', 'repeat', 'active', 'active'),
('Ayesha', 'Siddique', 'ayesha.siddique@example.com', '01677889900', '01677889900', 'Uttara Sector 7', 'Dhaka', 'Dhaka', 'female', '1993-12-25', '2019-11-15', 'warm', 'repeat', 'active', 'active'),

-- Cold Customers (At-Risk)
('Rahim', 'Sheikh', 'rahim.sheikh@example.com', '01522334455', '01522334455', 'Chittagong City', 'Chittagong', 'Chittagong', 'male', '1987-04-18', NULL, 'cold', 'repeat', 'at_risk', 'active'),
('Nusrat', 'Akter', 'nusrat.akter@example.com', '01733445566', '01733445566', 'Khulna Sadar', 'Khulna', 'Khulna', 'female', '1991-08-05', '2017-03-22', 'cold', 'repeat', 'at_risk', 'active'),

-- New Customers
('Mahmud', 'Rahman', 'mahmud.rahman@example.com', '01644556677', '01644556677', 'Sylhet City', 'Sylhet', 'Sylhet', 'male', '1994-02-14', NULL, 'warm', 'new', 'new', 'active'),
('Rubina', 'Islam', 'rubina.islam@example.com', '01788990011', '01788990011', 'Rajshahi City', 'Rajshahi', 'Rajshahi', 'female', '1996-06-20', NULL, 'warm', 'new', 'new', 'active'),

-- Inactive Customers
('Habib', 'Khan', 'habib.khan@example.com', '01511223344', '01511223344', 'Narayanganj', 'Narayanganj', 'Narayanganj', 'male', '1989-10-10', NULL, 'cold', 'repeat', 'churned', 'inactive'),
('Farhana', 'Yeasmin', 'farhana.yeasmin@example.com', '01822334455', '01822334455', 'Gazipur City', 'Gazipur', 'Gazipur', 'female', '1990-01-28', '2016-09-08', 'cold', 'inactive', 'churned', 'inactive')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. INSERT FAMILY MEMBERS
-- ============================================

INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth, phone, address, notes)
SELECT 
  c.id,
  'Jane Doe',
  'spouse',
  '1987-06-20'::date,
  '01712345679',
  'House 10, Road 5, Dhanmondi',
  'Wife of John, prefers organic products'
FROM customers c WHERE c.email = 'john.doe@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth, phone, address, notes)
SELECT 
  c.id,
  'Emily Doe',
  'child',
  '2015-03-10'::date,
  NULL,
  'House 10, Road 5, Dhanmondi',
  'Daughter, allergic to nuts'
FROM customers c WHERE c.email = 'john.doe@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth, phone, address, notes)
SELECT 
  c.id,
  'Khaled Khan',
  'spouse',
  '1988-05-15'::date,
  '01798765433',
  'Flat 3B, Gulshan 2',
  'Husband of Sarah'
FROM customers c WHERE c.email = 'sarah.khan@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth, phone, address, notes)
SELECT 
  c.id,
  'Aisha Khan',
  'child',
  '2018-11-20'::date,
  NULL,
  'Flat 3B, Gulshan 2',
  'Daughter'
FROM customers c WHERE c.email = 'sarah.khan@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth, phone, address, notes)
SELECT 
  c.id,
  'Zainab Hossain',
  'spouse',
  '1994-02-18'::date,
  '01899887767',
  'Mirpur 10, Block C',
  'Wife of Karim'
FROM customers c WHERE c.email = 'karim.hossain@example.com'
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. INSERT CUSTOMER INTERACTIONS (CDM)
-- ============================================

INSERT INTO customer_interactions (customer_id, interaction_type, interaction_direction, subject, description, outcome, agent_id, follow_up_required, follow_up_date)
SELECT 
  c.id,
  'call',
  'outbound',
  'Welcome call - first order',
  'Thanked customer for first order. Customer very satisfied with product quality. Offered 10% discount on next order.',
  'successful',
  (SELECT id FROM users WHERE email = 'rahim.miah@trustcart.com'),
  true,
  CURRENT_DATE + INTERVAL '15 days'
FROM customers c WHERE c.email = 'mahmud.rahman@example.com';

INSERT INTO customer_interactions (customer_id, interaction_type, interaction_direction, subject, description, outcome, agent_id, follow_up_required, follow_up_date)
SELECT 
  c.id,
  'whatsapp',
  'outbound',
  'Bulk order inquiry follow-up',
  'Sent product catalog and pricing for 5kg honey order. Customer interested, will decide by weekend.',
  'follow_up_needed',
  (SELECT id FROM users WHERE email = 'ayesha.begum@trustcart.com'),
  true,
  CURRENT_DATE + INTERVAL '2 days'
FROM customers c WHERE c.email = 'john.doe@example.com';

INSERT INTO customer_interactions (customer_id, interaction_type, interaction_direction, subject, description, outcome, agent_id, follow_up_required, follow_up_date)
SELECT 
  c.id,
  'call',
  'inbound',
  'Product quality inquiry',
  'Customer called to ask about honey purity certificate. Sent certificate via WhatsApp. Very satisfied.',
  'successful',
  (SELECT id FROM users WHERE email = 'nusrat.jahan@trustcart.com'),
  false,
  NULL
FROM customers c WHERE c.email = 'sarah.khan@example.com';

INSERT INTO customer_interactions (customer_id, interaction_type, interaction_direction, subject, description, outcome, agent_id, follow_up_required, follow_up_date)
SELECT 
  c.id,
  'call',
  'outbound',
  'At-risk customer recovery',
  'Called to check why no recent orders. Customer mentioned delivery delay issue last time. Offered 20% discount to win back.',
  'follow_up_needed',
  (SELECT id FROM users WHERE email = 'mahmud.hasan@trustcart.com'),
  true,
  CURRENT_DATE + INTERVAL '7 days'
FROM customers c WHERE c.email = 'nusrat.akter@example.com';

INSERT INTO customer_interactions (customer_id, interaction_type, interaction_direction, subject, description, outcome, agent_id, follow_up_required, follow_up_date)
SELECT 
  c.id,
  'whatsapp',
  'outbound',
  'Monthly grocery subscription offer',
  'Explained monthly grocery list feature. Customer very interested, wants to try next month.',
  'successful',
  (SELECT id FROM users WHERE email = 'rahim.miah@trustcart.com'),
  true,
  CURRENT_DATE + INTERVAL '18 days'
FROM customers c WHERE c.email = 'karim.hossain@example.com';

INSERT INTO customer_interactions (customer_id, interaction_type, interaction_direction, subject, description, outcome, agent_id, follow_up_required, follow_up_date)
SELECT 
  c.id,
  'call',
  'outbound',
  'Churned customer recovery attempt',
  'No answer. Will try again tomorrow.',
  'no_answer',
  (SELECT id FROM users WHERE email = 'ayesha.begum@trustcart.com'),
  true,
  CURRENT_DATE + INTERVAL '1 day'
FROM customers c WHERE c.email = 'habib.khan@example.com';

-- ============================================
-- 5. INSERT CUSTOMER BEHAVIOR DATA
-- ============================================

INSERT INTO customer_behavior (customer_id, behavior_type, product_id, metadata)
SELECT 
  c.id,
  'product_view',
  NULL,
  '{"categories": ["Honey", "Organic Foods"], "frequency": "high"}'::jsonb
FROM customers c WHERE c.email = 'john.doe@example.com';

INSERT INTO customer_behavior (customer_id, behavior_type, product_id, metadata)
SELECT 
  c.id,
  'add_to_cart',
  NULL,
  '{"categories": ["Honey", "Spices"], "frequency": "medium"}'::jsonb
FROM customers c WHERE c.email = 'sarah.khan@example.com';

INSERT INTO customer_behavior (customer_id, behavior_type, product_id, metadata)
SELECT 
  c.id,
  'product_view',
  NULL,
  '{"categories": ["Grocery Items"], "frequency": "high"}'::jsonb
FROM customers c WHERE c.email = 'karim.hossain@example.com';

INSERT INTO customer_behavior (customer_id, behavior_type, product_id, metadata)
SELECT 
  c.id,
  'wishlist',
  NULL,
  '{"categories": ["Herbal Products"], "frequency": "low"}'::jsonb
FROM customers c WHERE c.email = 'fatima.begum@example.com';

-- ============================================
-- 6. INSERT CUSTOMER DROPOFF TRACKING
-- ============================================

INSERT INTO customer_dropoff_tracking (customer_id, stage, cart_value, reason, recovered)
SELECT 
  c.id,
  'abandoned',
  1500.00,
  'No recent orders, possible price sensitivity',
  false
FROM customers c WHERE c.email = 'rahim.sheikh@example.com';

INSERT INTO customer_dropoff_tracking (customer_id, stage, cart_value, reason, recovered)
SELECT 
  c.id,
  'checkout_initiated',
  2200.00,
  'Delivery delay complaint, dissatisfied',
  false
FROM customers c WHERE c.email = 'nusrat.akter@example.com';

INSERT INTO customer_dropoff_tracking (customer_id, stage, cart_value, reason, recovered)
SELECT 
  c.id,
  'abandoned',
  800.00,
  'Multiple no-response, likely churned',
  false
FROM customers c WHERE c.email = 'habib.khan@example.com';

-- ============================================
-- 7. INSERT CRM CALL TASKS
-- ============================================

INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status, notes)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'rahim.miah@trustcart.com'),
  'Welcome call for new customer',
  'warm',
  CURRENT_DATE,
  'pending',
  'Follow up on first order satisfaction'
FROM customers c WHERE c.email = 'rubina.islam@example.com';

INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status, notes)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'ayesha.begum@trustcart.com'),
  'Follow-up on bulk order inquiry - VIP customer',
  'hot',
  CURRENT_DATE,
  'pending',
  'Customer interested in 5kg honey order'
FROM customers c WHERE c.email = 'john.doe@example.com';

INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status, notes)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'mahmud.hasan@trustcart.com'),
  'Recovery call - 65 days inactive',
  'warm',
  CURRENT_DATE,
  'pending',
  'Offer discount to win back customer'
FROM customers c WHERE c.email = 'rahim.sheikh@example.com';

INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status, notes)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'nusrat.jahan@trustcart.com'),
  'Birthday wishes and special offer',
  'hot',
  CURRENT_DATE,
  'pending',
  'Send birthday discount code'
FROM customers c WHERE c.date_of_birth IS NOT NULL AND EXTRACT(MONTH FROM c.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) 
LIMIT 1;

INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status, call_outcome, notes, completed_at)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'ayesha.begum@trustcart.com'),
  'Monthly grocery subscription signed up',
  'hot',
  CURRENT_DATE - INTERVAL '2 days',
  'completed',
  'successful - customer placed order',
  'Customer signed up for monthly grocery subscription',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM customers c WHERE c.email = 'karim.hossain@example.com';

-- ============================================
-- 8. INSERT CUSTOMER ENGAGEMENT HISTORY
-- ============================================

INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, message_content, status, response_received)
SELECT 
  c.id,
  'whatsapp',
  'whatsapp',
  'Special 15% discount on bulk honey orders. Valid for 7 days.',
  'delivered',
  true
FROM customers c WHERE c.email = 'john.doe@example.com';

INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, message_content, status, response_received)
SELECT 
  c.id,
  'sms',
  'sms',
  'Your monthly grocery delivery is due in 3 days. Reply CONFIRM to proceed.',
  'delivered',
  true
FROM customers c WHERE c.email = 'karim.hossain@example.com';

INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, message_content, status, response_received)
SELECT 
  c.id,
  'whatsapp',
  'whatsapp',
  'We miss you! Come back with 20% OFF. Use code: COMEBACK20',
  'delivered',
  false
FROM customers c WHERE c.email = 'nusrat.akter@example.com';

INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, message_content, status, response_received)
SELECT 
  c.id,
  'email',
  'email',
  'Welcome to TrustCart! Here is your 10% discount code: WELCOME10',
  'delivered',
  true
FROM customers c WHERE c.email = 'mahmud.rahman@example.com';

-- ============================================
-- 9. INSERT PRODUCT RECOMMENDATION RULES
-- ============================================

INSERT INTO product_recommendation_rules (rule_name, trigger_category_id, recommended_category_id, min_days_passed, max_days_passed, priority, is_active)
VALUES
('VIP Customer - Premium Honey', NULL, NULL, 7, 30, 'high', true),
('New Customer - Welcome Offer', NULL, NULL, 0, 7, 'high', true),
('Repeat Customer - Loyalty Discount', NULL, NULL, 14, 60, 'medium', true),
('At-Risk Recovery - Deep Discount', NULL, NULL, 60, 120, 'high', true);

-- ============================================
-- 10. INSERT MARKETING CAMPAIGNS (Skip - table structure needs to be defined)
-- ============================================
-- Note: Marketing campaigns table structure is not yet defined in entities

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 'Sample Data Inserted Successfully!' as status;

SELECT 'Users Created:' as metric, COUNT(*) as count FROM users WHERE email LIKE '%trustcart.com';
SELECT 'Customers Created:' as metric, COUNT(*) as count FROM customers WHERE email LIKE '%@example.com';
SELECT 'Family Members:' as metric, COUNT(*) as count FROM customer_family_members;
SELECT 'Interactions Logged:' as metric, COUNT(*) as count FROM customer_interactions;
SELECT 'Behavior Records:' as metric, COUNT(*) as count FROM customer_behavior;
SELECT 'Dropoff Tracking:' as metric, COUNT(*) as count FROM customer_dropoff_tracking;
SELECT 'Call Tasks Created:' as metric, COUNT(*) as count FROM crm_call_tasks;
SELECT 'Engagement History:' as metric, COUNT(*) as count FROM customer_engagement_history;
SELECT 'Recommendation Rules:' as metric, COUNT(*) as count FROM product_recommendation_rules;

-- Show sample data summary
SELECT 
  'Customer Distribution' as category,
  customer_type,
  priority as temperature,
  COUNT(*) as count
FROM customers
WHERE email LIKE '%@example.com'
GROUP BY customer_type, priority
ORDER BY customer_type, priority;

SELECT 
  'Today Call Tasks by Agent' as category,
  u.first_name || ' ' || u.last_name as agent_name,
  COUNT(*) as pending_tasks
FROM crm_call_tasks ct
JOIN users u ON ct.assigned_agent_id = u.id
WHERE ct.task_date = CURRENT_DATE AND ct.status = 'pending'
GROUP BY u.first_name, u.last_name
ORDER BY pending_tasks DESC;
