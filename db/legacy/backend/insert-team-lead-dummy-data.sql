-- =====================================================
-- TEAM-BASED LEAD MANAGEMENT - DUMMY DATA
-- =====================================================
-- This file contains sample data for testing the system
-- DELETE THIS DATA BEFORE PRODUCTION!
-- =====================================================

-- =====================================================
-- 1. INSERT SAMPLE SESSIONS
-- =====================================================

INSERT INTO customer_sessions (session_id, customer_id, source_details, campaign_id, utm_source, utm_medium, utm_campaign, device_type, browser, os, ip_address, country, session_start, total_session_time, pages_visited) VALUES
('sess_001', 1, 'Google', 'WINTER2024', 'google', 'cpc', 'winter_sale', 'mobile', 'Chrome', 'Android', '103.92.xxx.xxx', 'Bangladesh', NOW() - INTERVAL '2 days', 480, 8),
('sess_002', 2, 'Facebook', 'FB_RETARGET', 'facebook', 'social', 'retargeting', 'desktop', 'Firefox', 'Windows', '103.93.xxx.xxx', 'Bangladesh', NOW() - INTERVAL '1 day', 720, 12),
('sess_003', 3, 'Direct', NULL, 'direct', 'none', NULL, 'mobile', 'Safari', 'iOS', '103.94.xxx.xxx', 'Bangladesh', NOW() - INTERVAL '5 hours', 320, 6),
('sess_004', NULL, 'Instagram', 'INSTA_SUMMER', 'instagram', 'social', 'summer_collection', 'mobile', 'Chrome', 'Android', '103.95.xxx.xxx', 'Bangladesh', NOW() - INTERVAL '3 hours', 180, 4),
('sess_005', 4, 'Google', 'GOOGLE_SEARCH', 'google', 'organic', NULL, 'desktop', 'Edge', 'Windows', '103.96.xxx.xxx', 'Bangladesh', NOW() - INTERVAL '1 hour', 240, 5);

-- =====================================================
-- 2. INSERT SAMPLE PAGE VISITS
-- =====================================================

INSERT INTO customer_page_visits (session_id, customer_id, page_url, page_title, page_category, time_spent_seconds, product_id, visited_at) VALUES
('sess_001', 1, '/products/laptop', 'Gaming Laptop', 'product', 120, 101, NOW() - INTERVAL '2 days'),
('sess_001', 1, '/products/mouse', 'Wireless Mouse', 'product', 80, 102, NOW() - INTERVAL '2 days'),
('sess_002', 2, '/category/fashion', 'Fashion Category', 'category', 200, NULL, NOW() - INTERVAL '1 day'),
('sess_002', 2, '/products/tshirt', 'Premium T-Shirt', 'product', 150, 103, NOW() - INTERVAL '1 day'),
('sess_003', 3, '/checkout', 'Checkout', 'checkout', 60, NULL, NOW() - INTERVAL '5 hours');

-- =====================================================
-- 3. INSERT SAMPLE INCOMPLETE ORDERS
-- =====================================================

INSERT INTO incomplete_orders (customer_id, session_id, email, phone, name, cart_data, total_amount, abandoned_stage, recovery_email_sent, recovery_sms_sent, recovered) VALUES
(1, 'sess_001', 'customer1@example.com', '01712345001', 'Ahmed Hassan', '{"items":[{"id":101,"name":"Gaming Laptop","price":55000,"qty":1}]}', 55000.00, 'checkout_payment', false, false, false),
(2, 'sess_002', 'customer2@example.com', '01712345002', 'Fatima Khan', '{"items":[{"id":103,"name":"Premium T-Shirt","price":1200,"qty":2}]}', 2400.00, 'checkout_info', false, false, false),
(NULL, 'sess_004', 'guest@example.com', '01712345003', 'Guest User', '{"items":[{"id":104,"name":"Smart Watch","price":8500,"qty":1}]}', 8500.00, 'cart', false, false, false);

-- =====================================================
-- 4. UPDATE CUSTOMERS AS LEADS
-- =====================================================

UPDATE customers SET 
    is_lead = true,
    lead_status = 'unassigned',
    lead_source = 'Google',
    lead_score = 8,
    can_login_with_mobile = true,
    can_login_with_email = true
WHERE id = 1;

UPDATE customers SET 
    is_lead = true,
    lead_status = 'unassigned',
    lead_source = 'Facebook',
    lead_score = 7,
    can_login_with_mobile = true,
    can_login_with_email = true
WHERE id = 2;

UPDATE customers SET 
    is_lead = true,
    lead_status = 'unassigned',
    lead_source = 'Direct',
    lead_score = 6,
    can_login_with_mobile = true,
    can_login_with_email = true
WHERE id = 3;

UPDATE customers SET 
    is_lead = true,
    lead_status = 'unassigned',
    lead_source = 'Instagram',
    lead_score = 9,
    can_login_with_mobile = true,
    can_login_with_email = true
WHERE id = 4;

UPDATE customers SET 
    is_lead = true,
    lead_status = 'unassigned',
    lead_source = 'Google',
    lead_score = 5,
    can_login_with_mobile = true,
    can_login_with_email = true
WHERE id = 5;

-- =====================================================
-- 5. INSERT TEAM LEADER TEAMS MAPPING
-- =====================================================
-- Assuming user ID 1 is a team leader managing all 5 teams

INSERT INTO team_leader_teams (team_leader_id, team_type, team_name, is_active) VALUES
(1, 'A', 'Demographics Team', true),
(1, 'B', 'Special Events Team', true),
(1, 'C', 'Family Data Team', true),
(1, 'D', 'Loyalty Programs Team', true),
(1, 'E', 'VIP Membership Team', true)
ON CONFLICT (team_leader_id, team_type) DO NOTHING;

-- =====================================================
-- 6. INSERT TEAM MEMBERS
-- =====================================================
-- Assuming user IDs 2-11 are team members (2 members per team)

INSERT INTO team_members (user_id, team_leader_id, team_type, is_active, assigned_leads_count, completed_leads_count) VALUES
(2, 1, 'A', true, 0, 0),
(3, 1, 'A', true, 0, 0),
(4, 1, 'B', true, 0, 0),
(5, 1, 'B', true, 0, 0),
(6, 1, 'C', true, 0, 0),
(7, 1, 'C', true, 0, 0),
(8, 1, 'D', true, 0, 0),
(9, 1, 'D', true, 0, 0),
(10, 1, 'E', true, 0, 0),
(11, 1, 'E', true, 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 7. INSERT SAMPLE TEAM ASSIGNMENTS
-- =====================================================
-- Assign some customers to different teams

INSERT INTO team_assignments (customer_id, team_type, assigned_by_id, assigned_to_id, status, assigned_at, notes) VALUES
(6, 'A', 1, 2, 'pending', NOW() - INTERVAL '2 hours', 'High-value customer from Google Ads'),
(7, 'B', 1, 4, 'pending', NOW() - INTERVAL '1 hour', 'Birthday coming up next month'),
(8, 'C', 1, 6, 'in_progress', NOW() - INTERVAL '3 hours', 'Collect family member information'),
(9, 'D', 1, 8, 'completed', NOW() - INTERVAL '1 day', 'Membership card issued'),
(10, 'E', 1, 10, 'completed', NOW() - INTERVAL '2 days', 'VIP membership activated');

-- Update assigned customers
UPDATE customers SET lead_status = 'assigned', assigned_team_member_id = 2, assigned_at = NOW() WHERE id = 6;
UPDATE customers SET lead_status = 'assigned', assigned_team_member_id = 4, assigned_at = NOW() WHERE id = 7;
UPDATE customers SET lead_status = 'assigned', assigned_team_member_id = 6, assigned_at = NOW() WHERE id = 8;
UPDATE customers SET lead_status = 'converted', assigned_team_member_id = 8, assigned_at = NOW() WHERE id = 9;
UPDATE customers SET lead_status = 'converted', assigned_team_member_id = 10, assigned_at = NOW() WHERE id = 10;

-- =====================================================
-- 8. INSERT TEAM A DATA (Gender, Profession, Product Interest)
-- =====================================================

INSERT INTO team_a_data (customer_id, gender, profession, product_interest, order_product_details, notes, collected_by_id, collected_at) VALUES
(9, 'male', 'Software Engineer', ARRAY['Electronics', 'Gadgets', 'Books'], '{"preferred_brands": ["Samsung", "Apple"], "budget_range": "high"}', 'Tech enthusiast, prefers premium products', 8, NOW() - INTERVAL '1 day'),
(10, 'female', 'Doctor', ARRAY['Fashion', 'Health', 'Books'], '{"preferred_brands": ["Gucci", "Prada"], "budget_range": "premium"}', 'High-income professional', 2, NOW() - INTERVAL '2 days');

-- =====================================================
-- 9. INSERT TEAM B DATA (DOB, Marriage Day, Product Interest)
-- =====================================================

INSERT INTO team_b_data (customer_id, date_of_birth, marriage_day, product_interest, order_product_details, notes, collected_by_id, collected_at) VALUES
(9, '1990-05-15', '2015-12-20', ARRAY['Electronics', 'Gadgets'], '{"anniversary_preferences": "Tech gifts"}', 'Send anniversary offers in December', 4, NOW() - INTERVAL '1 day'),
(10, '1988-08-22', '2012-06-10', ARRAY['Fashion', 'Jewelry'], '{"birthday_preferences": "Luxury items"}', 'Birthday in August, anniversary in June', 4, NOW() - INTERVAL '2 days');

-- =====================================================
-- 10. INSERT TEAM C DATA (Family Members collected separately)
-- =====================================================

INSERT INTO team_c_data (customer_id, product_interest, order_product_details, notes, collected_by_id, collected_at) VALUES
(9, ARRAY['Electronics', 'Toys', 'Education'], '{"family_buying_pattern": "Tech for dad, toys for kids"}', 'Family of 4, 2 children', 6, NOW() - INTERVAL '1 day'),
(10, ARRAY['Fashion', 'Beauty', 'Home'], '{"family_buying_pattern": "Fashion for all family members"}', 'Close-knit family, shops together', 6, NOW() - INTERVAL '2 days');

-- Add family members via customer_family_members table (if exists from CDM migration)
INSERT INTO customer_family_members (customer_id, name, phone, relationship, date_of_birth, gender, profession, created_at) VALUES
(9, 'Ayesha Hassan', '01712345101', 'spouse', '1992-03-10', 'female', 'Teacher', NOW()),
(9, 'Rafi Hassan', '01712345102', 'child', '2015-07-20', 'male', 'Student', NOW()),
(10, 'Dr. Karim', '01712345103', 'spouse', '1985-11-05', 'male', 'Engineer', NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. INSERT TEAM D DATA (Health Card, Membership, Coupon)
-- =====================================================

INSERT INTO team_d_data (customer_id, health_card_number, health_card_expiry, membership_card_number, membership_card_type, membership_expiry, coupon_codes, product_interest, order_product_details, notes, collected_by_id, collected_at) VALUES
(9, 'HC123456', '2026-12-31', 'MEM789012', 'Gold', '2025-12-31', ARRAY['SAVE10', 'FREESHIP'], ARRAY['Electronics', 'Gadgets'], '{"loyalty_status": "active"}', 'Gold member since 2023', 8, NOW() - INTERVAL '1 day'),
(10, 'HC654321', '2027-06-30', 'MEM345678', 'Platinum', '2026-06-30', ARRAY['VIP20', 'PREMIUM'], ARRAY['Fashion', 'Luxury'], '{"loyalty_status": "vip"}', 'Platinum member, very loyal', 8, NOW() - INTERVAL '2 days');

-- =====================================================
-- 12. INSERT TEAM E DATA (Permanent Membership)
-- =====================================================

INSERT INTO team_e_data (customer_id, permanent_membership_number, membership_tier, membership_start_date, membership_benefits, lifetime_value, notes, collected_by_id, collected_at) VALUES
(10, 'PERM-VIP-001', 'vip', '2023-01-15', '{"benefits": ["Free shipping", "Priority support", "Exclusive access", "20% discount"]}', 250000.00, 'VIP customer since 2023, high lifetime value', 10, NOW() - INTERVAL '2 days'),
(9, 'PERM-PLAT-002', 'platinum', '2023-06-20', '{"benefits": ["Free shipping", "15% discount", "Early access"]}', 150000.00, 'Platinum member, regular purchases', 10, NOW() - INTERVAL '1 day');

-- =====================================================
-- 13. INSERT CUSTOMER TIERS
-- =====================================================

INSERT INTO customer_tiers (customer_id, is_active, tier, tier_assigned_at, tier_assigned_by_id, auto_assigned, last_activity_date, days_inactive, total_purchases, total_spent, engagement_score, notes) VALUES
(1, true, 'silver', NOW() - INTERVAL '7 days', 1, false, NOW() - INTERVAL '1 day', 1, 3, 15000.00, 65, 'New customer, good potential'),
(2, true, 'gold', NOW() - INTERVAL '14 days', 1, false, NOW() - INTERVAL '2 days', 2, 8, 45000.00, 78, 'Regular customer, high engagement'),
(3, false, 'silver', NOW() - INTERVAL '30 days', 1, false, NOW() - INTERVAL '45 days', 45, 2, 8000.00, 25, 'Inactive for 45 days, need reactivation'),
(4, true, 'gold', NOW() - INTERVAL '5 days', 1, false, NOW(), 0, 6, 32000.00, 85, 'Active customer, recently purchased'),
(5, true, 'silver', NOW() - INTERVAL '10 days', 1, false, NOW() - INTERVAL '3 days', 3, 4, 18000.00, 60, 'Moderate engagement'),
(9, true, 'platinum', NOW() - INTERVAL '60 days', 1, false, NOW() - INTERVAL '1 day', 1, 15, 150000.00, 92, 'Platinum member, very loyal'),
(10, true, 'vip', NOW() - INTERVAL '90 days', 1, false, NOW(), 0, 25, 250000.00, 98, 'VIP customer, highest tier');

-- =====================================================
-- 14. INSERT TIER CHANGE HISTORY
-- =====================================================

INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, old_status, new_status, changed_by_id, change_reason, changed_at) VALUES
(2, 'silver', 'gold', true, true, 1, 'Upgraded due to increased purchase frequency', NOW() - INTERVAL '14 days'),
(9, 'gold', 'platinum', true, true, 1, 'Reached lifetime value threshold', NOW() - INTERVAL '60 days'),
(10, 'platinum', 'vip', true, true, 1, 'Top customer, exceptional loyalty', NOW() - INTERVAL '90 days'),
(3, 'silver', 'silver', true, false, 1, 'Marked inactive due to no activity for 45 days', NOW() - INTERVAL '15 days');

-- =====================================================
-- 15. UPDATE TEAM MEMBER STATS
-- =====================================================

UPDATE team_members SET assigned_leads_count = 1, completed_leads_count = 0 WHERE user_id = 2;
UPDATE team_members SET assigned_leads_count = 1, completed_leads_count = 0 WHERE user_id = 4;
UPDATE team_members SET assigned_leads_count = 1, completed_leads_count = 0 WHERE user_id = 6;
UPDATE team_members SET assigned_leads_count = 1, completed_leads_count = 1 WHERE user_id = 8;
UPDATE team_members SET assigned_leads_count = 1, completed_leads_count = 1 WHERE user_id = 10;

-- =====================================================
-- SUMMARY OF DUMMY DATA
-- =====================================================
-- 
-- ✅ 5 Customer Sessions (different sources: Google, Facebook, Instagram, Direct)
-- ✅ 5 Page Visits
-- ✅ 3 Incomplete Orders (different abandonment stages)
-- ✅ 5 Unassigned Leads (customers 1-5)
-- ✅ 5 Teams (A, B, C, D, E)
-- ✅ 10 Team Members (2 per team)
-- ✅ 5 Team Assignments (different statuses)
-- ✅ 2 Team A Data entries
-- ✅ 2 Team B Data entries
-- ✅ 2 Team C Data entries
-- ✅ 3 Family Members
-- ✅ 2 Team D Data entries
-- ✅ 2 Team E Data entries
-- ✅ 7 Customer Tiers (Silver, Gold, Platinum, VIP)
-- ✅ 4 Tier Change History records
--
-- =====================================================
-- TO DELETE THIS DATA BEFORE PRODUCTION:
-- =====================================================
--
-- DELETE FROM customer_tier_history WHERE changed_at >= NOW() - INTERVAL '100 days';
-- DELETE FROM customer_tiers WHERE customer_id IN (1,2,3,4,5,9,10);
-- DELETE FROM team_e_data WHERE customer_id IN (9,10);
-- DELETE FROM team_d_data WHERE customer_id IN (9,10);
-- DELETE FROM team_c_data WHERE customer_id IN (9,10);
-- DELETE FROM team_b_data WHERE customer_id IN (9,10);
-- DELETE FROM team_a_data WHERE customer_id IN (9,10);
-- DELETE FROM team_assignments WHERE assigned_at >= NOW() - INTERVAL '3 days';
-- DELETE FROM team_members WHERE team_leader_id = 1;
-- DELETE FROM team_leader_teams WHERE team_leader_id = 1;
-- DELETE FROM incomplete_orders WHERE created_at >= NOW() - INTERVAL '3 days';
-- DELETE FROM customer_page_visits WHERE visited_at >= NOW() - INTERVAL '3 days';
-- DELETE FROM customer_sessions WHERE session_start >= NOW() - INTERVAL '3 days';
-- UPDATE customers SET is_lead = false, lead_status = NULL WHERE id IN (1,2,3,4,5,6,7,8,9,10);
--
-- =====================================================
