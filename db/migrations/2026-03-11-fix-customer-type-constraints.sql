-- Migration: Fix customer_type CHECK constraints
-- Date: 2026-03-11
-- Description: Drop stale CHECK constraints (check1/2/3) on customers.customer_type
--              that only allow (new, repeat, vip, inactive) and block tier values
--              like gold, silver, platinum. The correct constraint (customers_customer_type_check)
--              which allows all valid tiers remains intact.

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check1;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check2;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check3;
