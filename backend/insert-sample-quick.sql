-- Quick Sample Data Insert

-- 1. Insert Users (CRM Agents)
INSERT INTO users (name, last_name, email, password_hash, role_id, status) VALUES
('Rahim', 'Miah', 'rahim.agent@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Ayesha', 'Begum', 'ayesha.agent@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active'),
('Mahmud', 'Hasan', 'mahmud.agent@trustcart.com', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 1, 'active')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Customers (minimal columns)
INSERT INTO customers (name, last_name, email, phone) 
SELECT 'John', 'Doe', 'john.doe@example.com', '01712345678'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'john.doe@example.com');

INSERT INTO customers (name, last_name, email, phone) 
SELECT 'Sarah', 'Khan', 'sarah.khan@example.com', '01798765432'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'sarah.khan@example.com');

INSERT INTO customers (name, last_name, email, phone) 
SELECT 'Ahmed', 'Ali', 'ahmed.ali@example.com', '01611223344'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'ahmed.ali@example.com');

INSERT INTO customers (name, last_name, email, phone) 
SELECT 'Karim', 'Hossain', 'karim.hossain@example.com', '01899887766'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'karim.hossain@example.com');

INSERT INTO customers (name, last_name, email, phone) 
SELECT 'Rubina', 'Islam', 'rubina.islam@example.com', '01788990011'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'rubina.islam@example.com');

-- 3. Insert Family Members
INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth)
SELECT c.id, 'Jane Doe', 'spouse', '1987-06-20'::date
FROM customers c WHERE c.email = 'john.doe@example.com' LIMIT 1;

INSERT INTO customer_family_members (customer_id, name, relationship, date_of_birth)
SELECT c.id, 'Aisha Khan', 'child', '2018-11-20'::date
FROM customers c WHERE c.email = 'sarah.khan@example.com' LIMIT 1;

-- 4. Insert Interactions
INSERT INTO customer_interactions (customer_id, interaction_type, subject, description)
SELECT c.id, 'call', 'Welcome call', 'Customer satisfied with first order'
FROM customers c WHERE c.email = 'john.doe@example.com' LIMIT 1;

INSERT INTO customer_interactions (customer_id, interaction_type, subject, description)
SELECT c.id, 'whatsapp', 'Bulk order inquiry', 'Interested in 5kg honey order'
FROM customers c WHERE c.email = 'sarah.khan@example.com' LIMIT 1;

-- 5. Insert Customer Behavior
INSERT INTO customer_behavior (customer_id, behavior_type, metadata)
SELECT c.id, 'product_view', '{"category": "Honey"}'::jsonb
FROM customers c WHERE c.email = 'john.doe@example.com' LIMIT 1;

INSERT INTO customer_behavior (customer_id, behavior_type, metadata)
SELECT c.id, 'add_to_cart', '{"category": "Spices"}'::jsonb
FROM customers c WHERE c.email = 'sarah.khan@example.com' LIMIT 1;

-- 6. Insert Dropoff Tracking
INSERT INTO customer_dropoff_tracking (customer_id, stage, reason)
SELECT c.id, 'abandoned', 'Price sensitivity'
FROM customers c WHERE c.email = 'ahmed.ali@example.com' LIMIT 1;

-- 7. Insert CRM Call Tasks
INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'rahim.agent@trustcart.com'),
  'Welcome call for new customer',
  'warm',
  CURRENT_DATE,
  'pending'
FROM customers c WHERE c.email = 'rubina.islam@example.com' LIMIT 1;

INSERT INTO crm_call_tasks (customer_id, assigned_agent_id, call_reason, priority, task_date, status)
SELECT 
  c.id,
  (SELECT id FROM users WHERE email = 'ayesha.agent@trustcart.com'),
  'Follow-up on bulk order',
  'hot',
  CURRENT_DATE,
  'pending'
FROM customers c WHERE c.email = 'john.doe@example.com' LIMIT 1;

-- 8. Insert Engagement History
INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, message_content, status)
SELECT c.id, 'whatsapp', 'whatsapp', 'Special 15% discount offer', 'delivered'
FROM customers c WHERE c.email = 'john.doe@example.com' LIMIT 1;

INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, message_content, status)
SELECT c.id, 'sms', 'sms', 'Monthly delivery reminder', 'delivered'
FROM customers c WHERE c.email = 'karim.hossain@example.com' LIMIT 1;

-- 9. Insert Recommendation Rules
INSERT INTO product_recommendation_rules (rule_name, min_days_passed, max_days_passed, priority, is_active)
VALUES
('VIP Customer Offer', 7, 30, 'high', true),
('New Customer Welcome', 0, 7, 'high', true),
('Repeat Customer Loyalty', 14, 60, 'medium', true);

-- Verification
SELECT 'Sample Data Inserted!' as status;
SELECT 'Users:' as metric, COUNT(*) as count FROM users WHERE email LIKE '%@trustcart.com';
SELECT 'Customers:' as metric, COUNT(*) as count FROM customers WHERE email LIKE '%@example.com';
SELECT 'Family Members:' as metric, COUNT(*) as count FROM customer_family_members;
SELECT 'Interactions:' as metric, COUNT(*) as count FROM customer_interactions;
SELECT 'Behaviors:' as metric, COUNT(*) as count FROM customer_behavior;
SELECT 'Call Tasks:' as metric, COUNT(*) as count FROM crm_call_tasks;
SELECT 'Engagements:' as metric, COUNT(*) as count FROM customer_engagement_history;
SELECT 'Rules:' as metric, COUNT(*) as count FROM product_recommendation_rules;
