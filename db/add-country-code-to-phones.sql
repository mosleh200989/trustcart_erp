-- ============================================================
-- Add +88 country code to all phone numbers in the database
-- Safe to run multiple times (idempotent)
-- Skips numbers that already start with '+'
-- Automatically merges duplicate customers before updating
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 0: Merge duplicate customers
-- Where both '01...' and '+8801...' versions of the same phone exist,
-- keep the +88 version (keeper) and move all related data from
-- the non-+88 version (duplicate) to the keeper, then delete duplicate.
-- ============================================================

-- Reassign all foreign key references from duplicate → keeper
-- (duplicate = no +88, keeper = has +88)

UPDATE sales_orders SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND sales_orders.customer_id = dup.id;

UPDATE customer_addresses SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_addresses.customer_id = dup.id;

UPDATE customer_family_members SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_family_members.customer_id = dup.id;

UPDATE customer_interactions SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_interactions.customer_id = dup.id;

UPDATE customer_behavior SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_behavior.customer_id = dup.id;

UPDATE customer_dropoff_tracking SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_dropoff_tracking.customer_id = dup.id;

UPDATE activities SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND activities.customer_id = dup.id;

UPDATE agent_commissions SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND agent_commissions.customer_id = dup.id;

UPDATE deals SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND deals.customer_id = dup.id;

UPDATE email_tracking SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND email_tracking.customer_id = dup.id;

UPDATE tasks SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND tasks.customer_id = dup.id;

UPDATE quotes SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND quotes.customer_id = dup.id;

UPDATE meetings SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND meetings.customer_id = dup.id;

UPDATE segment_members SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND segment_members.customer_id = dup.id
  AND NOT EXISTS (
    SELECT 1 FROM segment_members sm2
    WHERE sm2.customer_id = keeper.id AND sm2.segment_id = segment_members.segment_id
  );

-- Delete conflicting segment_members for duplicates (already exist for keeper)
DELETE FROM segment_members
USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND segment_members.customer_id = dup.id;

UPDATE customer_tag_assignments SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_tag_assignments.customer_id = dup.id
  AND NOT EXISTS (
    SELECT 1 FROM customer_tag_assignments cta2
    WHERE cta2.customer_id = keeper.id AND cta2.tag_id = customer_tag_assignments.tag_id
  );

-- Delete conflicting tag assignments for duplicates
DELETE FROM customer_tag_assignments
USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_tag_assignments.customer_id = dup.id;

UPDATE support_tickets SET customer_id = keeper.id::text
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND support_tickets.customer_id = dup.id::text;

UPDATE incomplete_orders SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND incomplete_orders.customer_id = dup.id;

UPDATE customer_sessions SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_sessions.customer_id = dup.id;

UPDATE customer_points SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_points.customer_id = dup.id;

UPDATE customer_wallets SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_wallets.customer_id = dup.id;

UPDATE point_transactions SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND point_transactions.customer_id = dup.id;

UPDATE customer_product_reminders SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_product_reminders.customer_id = dup.id;

UPDATE monthly_grocery_lists SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND monthly_grocery_lists.customer_id = dup.id;

UPDATE customer_memberships SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_memberships.customer_id = dup.id;

UPDATE wallet_withdrawal_requests SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND wallet_withdrawal_requests.customer_id = dup.id;

UPDATE offer_codes SET assigned_customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND offer_codes.assigned_customer_id = dup.id;

UPDATE offer_usage SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND offer_usage.customer_id = dup.id;

UPDATE customer_referrals SET referrer_customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_referrals.referrer_customer_id = dup.id;

UPDATE customer_referrals SET referred_customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_referrals.referred_customer_id = dup.id;

UPDATE customers SET referred_by_customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customers.referred_by_customer_id = dup.id;

UPDATE crm_call_tasks SET customer_id = keeper.id::text
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND crm_call_tasks.customer_id = dup.id::text;

UPDATE customer_engagement_history SET customer_id = keeper.id::text
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND customer_engagement_history.customer_id = dup.id::text;

-- Handle unique-constrained team tables: delete duplicate's row if keeper already has one
DELETE FROM team_a_data USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_a_data.customer_id = dup.id
  AND EXISTS (SELECT 1 FROM team_a_data t2 WHERE t2.customer_id = keeper.id);

UPDATE team_a_data SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_a_data.customer_id = dup.id;

DELETE FROM team_b_data USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_b_data.customer_id = dup.id
  AND EXISTS (SELECT 1 FROM team_b_data t2 WHERE t2.customer_id = keeper.id);

UPDATE team_b_data SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_b_data.customer_id = dup.id;

DELETE FROM team_c_data USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_c_data.customer_id = dup.id
  AND EXISTS (SELECT 1 FROM team_c_data t2 WHERE t2.customer_id = keeper.id);

UPDATE team_c_data SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_c_data.customer_id = dup.id;

DELETE FROM team_d_data USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_d_data.customer_id = dup.id
  AND EXISTS (SELECT 1 FROM team_d_data t2 WHERE t2.customer_id = keeper.id);

UPDATE team_d_data SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_d_data.customer_id = dup.id;

DELETE FROM team_e_data USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_e_data.customer_id = dup.id
  AND EXISTS (SELECT 1 FROM team_e_data t2 WHERE t2.customer_id = keeper.id);

UPDATE team_e_data SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND team_e_data.customer_id = dup.id;

DELETE FROM customer_tiers USING customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND customer_tiers.customer_id = dup.id
  AND EXISTS (SELECT 1 FROM customer_tiers t2 WHERE t2.customer_id = keeper.id);

UPDATE customer_tiers SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%' AND customer_tiers.customer_id = dup.id;

UPDATE team_assignments SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND team_assignments.customer_id = dup.id;

UPDATE price_locks SET customer_id = keeper.id
FROM customers dup
JOIN customers keeper ON keeper.phone = '+88' || dup.phone
WHERE dup.phone NOT LIKE '+%'
  AND price_locks.customer_id = dup.id;

-- Now delete the duplicate customer records (the ones without +88)
DELETE FROM customers
WHERE phone NOT LIKE '+%'
  AND EXISTS (
    SELECT 1 FROM customers keeper
    WHERE keeper.phone = '+88' || customers.phone
  );

-- ============================================================
-- STEP 1: Add +88 to all remaining phone numbers
-- ============================================================

-- 1. customers.phone
UPDATE customers
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 2. customers.mobile
UPDATE customers
SET mobile = '+88' || mobile
WHERE mobile IS NOT NULL AND mobile != '' AND mobile NOT LIKE '+%';

-- 3. users.phone
UPDATE users
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 4. customer_addresses.contact_phone
UPDATE customer_addresses
SET contact_phone = '+88' || contact_phone
WHERE contact_phone IS NOT NULL AND contact_phone != '' AND contact_phone NOT LIKE '+%';

-- 5. customer_family_members.phone
UPDATE customer_family_members
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 6. customer_referrals.referred_phone
UPDATE customer_referrals
SET referred_phone = '+88' || referred_phone
WHERE referred_phone IS NOT NULL AND referred_phone != '' AND referred_phone NOT LIKE '+%';

-- 7. sales_orders.customer_phone
UPDATE sales_orders
SET customer_phone = '+88' || customer_phone
WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_phone NOT LIKE '+%';

-- 8. landing_pages.phone_number
UPDATE landing_pages
SET phone_number = '+88' || phone_number
WHERE phone_number IS NOT NULL AND phone_number != '' AND phone_number NOT LIKE '+%';

-- 9. landing_page_orders.customer_phone
UPDATE landing_page_orders
SET customer_phone = '+88' || customer_phone
WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_phone NOT LIKE '+%';

-- 10. fraud_checks.phone_number
UPDATE fraud_checks
SET phone_number = '+88' || phone_number
WHERE phone_number IS NOT NULL AND phone_number != '' AND phone_number NOT LIKE '+%';

-- 11. telephony_calls.agent_phone
UPDATE telephony_calls
SET agent_phone = '+88' || agent_phone
WHERE agent_phone IS NOT NULL AND agent_phone != '' AND agent_phone NOT LIKE '+%';

-- 12. telephony_calls.customer_phone
UPDATE telephony_calls
SET customer_phone = '+88' || customer_phone
WHERE customer_phone IS NOT NULL AND customer_phone != '' AND customer_phone NOT LIKE '+%';

-- 13. incomplete_orders.phone
UPDATE incomplete_orders
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 14. job_applications.phone
UPDATE job_applications
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 15. hr_employees.phone
UPDATE hr_employees
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 16. hr_branches.phone
UPDATE hr_branches
SET phone = '+88' || phone
WHERE phone IS NOT NULL AND phone != '' AND phone NOT LIKE '+%';

-- 17. printer_settings.company_phone
UPDATE printer_settings
SET company_phone = '+88' || company_phone
WHERE company_phone IS NOT NULL AND company_phone != '' AND company_phone NOT LIKE '+%';

COMMIT;

-- ============================================================
-- STEP 2: Verify results
-- ============================================================
SELECT 'customers.phone' AS field, COUNT(*) AS total FROM customers WHERE phone LIKE '+88%'
UNION ALL SELECT 'customers.mobile', COUNT(*) FROM customers WHERE mobile LIKE '+88%'
UNION ALL SELECT 'users.phone', COUNT(*) FROM users WHERE phone LIKE '+88%'
UNION ALL SELECT 'sales_orders.customer_phone', COUNT(*) FROM sales_orders WHERE customer_phone LIKE '+88%'
UNION ALL SELECT 'customer_addresses.contact_phone', COUNT(*) FROM customer_addresses WHERE contact_phone LIKE '+88%'
ORDER BY field;
