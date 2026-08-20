-- =====================================================
-- DELETE ALL DUMMY DATA BEFORE PRODUCTION
-- =====================================================
-- Run this script to remove all test data
-- =====================================================

BEGIN;

-- Delete tier change history
DELETE FROM customer_tier_history WHERE changed_at >= NOW() - INTERVAL '100 days';

-- Delete customer tiers
DELETE FROM customer_tiers WHERE customer_id IN (1,2,3,4,5,6,7,8,9,10);

-- Delete team E data
DELETE FROM team_e_data WHERE customer_id IN (9,10);

-- Delete team D data
DELETE FROM team_d_data WHERE customer_id IN (9,10);

-- Delete team C data
DELETE FROM team_c_data WHERE customer_id IN (9,10);

-- Delete team B data
DELETE FROM team_b_data WHERE customer_id IN (9,10);

-- Delete team A data
DELETE FROM team_a_data WHERE customer_id IN (9,10);

-- Delete team assignments
DELETE FROM team_assignments WHERE assigned_at >= NOW() - INTERVAL '3 days';

-- Delete team members
DELETE FROM team_members WHERE team_leader_id = 1;

-- Delete team leader teams
DELETE FROM team_leader_teams WHERE team_leader_id = 1;

-- Delete incomplete orders
DELETE FROM incomplete_orders WHERE created_at >= NOW() - INTERVAL '3 days';

-- Delete page visits
DELETE FROM customer_page_visits WHERE visited_at >= NOW() - INTERVAL '3 days';

-- Delete sessions
DELETE FROM customer_sessions WHERE session_start >= NOW() - INTERVAL '3 days';

-- Delete family members (if added by dummy data)
DELETE FROM customer_family_members WHERE created_at >= NOW() - INTERVAL '3 days';

-- Reset customer lead status
UPDATE customers SET 
    is_lead = false, 
    lead_status = NULL,
    assigned_team_member_id = NULL,
    assigned_at = NULL,
    lead_source = NULL,
    lead_score = 0
WHERE id IN (1,2,3,4,5,6,7,8,9,10);

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these to verify data was deleted:

SELECT COUNT(*) as remaining_sessions FROM customer_sessions;
SELECT COUNT(*) as remaining_incomplete_orders FROM incomplete_orders;
SELECT COUNT(*) as remaining_team_assignments FROM team_assignments;
SELECT COUNT(*) as remaining_team_members FROM team_members;
SELECT COUNT(*) as remaining_customer_tiers FROM customer_tiers;
SELECT COUNT(*) as remaining_leads FROM customers WHERE is_lead = true;

-- =====================================================
