--
-- PostgreSQL database dump
--

\restrict 7C3CPPujwXueYuWytnEatrU4XjMaO0AIrTrSZlo02Y4vzfiCwDzOtJU7eZ9ct5h

-- Dumped from database version 18.1 (Ubuntu 18.1-1.pgdg24.04+2)
-- Dumped by pg_dump version 18.1 (Ubuntu 18.1-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: activity_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.activity_type_enum AS ENUM (
    'call',
    'email',
    'meeting',
    'task',
    'note'
);


--
-- Name: banner_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.banner_type_enum AS ENUM (
    'carousel',
    'side',
    'promotional'
);


--
-- Name: cancel_reason_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cancel_reason_type AS ENUM (
    'customer_request',
    'out_of_stock',
    'wrong_address',
    'payment_issue',
    'duplicate_order',
    'fraud_detected',
    'customer_unreachable',
    'other'
);


--
-- Name: condition_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.condition_type_enum AS ENUM (
    'CART_TOTAL',
    'PRODUCT_QTY',
    'CATEGORY',
    'BRAND',
    'FIRST_ORDER',
    'USER_LEVEL',
    'USER_SEGMENT',
    'MIN_ITEMS'
);


--
-- Name: customer_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.customer_status_enum AS ENUM (
    'prospect',
    'active',
    'inactive',
    'vip',
    'blacklist'
);


--
-- Name: landing_page_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.landing_page_order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
    'pickup_failed'
);


--
-- Name: offer_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.offer_type_enum AS ENUM (
    'PERCENTAGE',
    'FLAT_DISCOUNT',
    'BOGO',
    'FREE_PRODUCT',
    'BUNDLE',
    'CATEGORY_DISCOUNT'
);


--
-- Name: order_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status_enum AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
    'approved',
    'hold',
    'printing',
    'sent',
    'completed',
    'in_review',
    'in_transit',
    'picked',
    'partial_delivered',
    'unknown',
    'admin_cancelled',
    'pickup_failed',
    'customer_hold',
    'courier_hold'
);


--
-- Name: order_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status_type AS ENUM (
    'pending',
    'approved',
    'hold',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'partially_paid',
    'unpaid'
);


--
-- Name: reward_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reward_type_enum AS ENUM (
    'DISCOUNT_PERCENT',
    'DISCOUNT_FLAT',
    'FREE_PRODUCT',
    'FREE_SHIPPING'
);


--
-- Name: ticket_priority_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: ticket_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_status_enum AS ENUM (
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed'
);


--
-- Name: traffic_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.traffic_source_type AS ENUM (
    'facebook_ads',
    'google_ads',
    'instagram_ads',
    'tiktok_ads',
    'youtube_ads',
    'direct',
    'organic_search',
    'referral',
    'email_campaign',
    'sms_campaign',
    'affiliate',
    'other'
);


--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_enum AS ENUM (
    'admin',
    'supervisor',
    'manager',
    'executive',
    'support',
    'viewer'
);


--
-- Name: user_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status_enum AS ENUM (
    'active',
    'inactive',
    'suspended',
    'deleted'
);


--
-- Name: assign_churn_risk_30d_tag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_churn_risk_30d_tag() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  churn_tag_id uuid;
  inserted_count integer := 0;
BEGIN
  SELECT id INTO churn_tag_id
  FROM customer_tags
  WHERE name = 'Churn Risk (30+ days inactive)'
  LIMIT 1;

  IF churn_tag_id IS NULL THEN
    RETURN 0;
  END IF;

  WITH last_orders AS (
    SELECT so.customer_id, MAX(so.order_date) AS last_order_date
    FROM sales_orders so
    WHERE so.customer_id IS NOT NULL
    GROUP BY so.customer_id
  ), at_risk AS (
    SELECT lo.customer_id
    FROM last_orders lo
    WHERE lo.last_order_date < (NOW() - INTERVAL '30 days')
  ), ins AS (
    INSERT INTO customer_tag_assignments (tag_id, customer_id, created_at)
    SELECT churn_tag_id, ar.customer_id, NOW()
    FROM at_risk ar
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins;

  RETURN inserted_count;
END;
$$;


--
-- Name: audit_customer_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_customer_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO audit_logs (module, action, entity_type, entity_id, description, old_values, new_values)
    VALUES ('customers', TG_OP, 'Customer', NEW.id::text, TG_OP || ' customer #' || NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
END;
$$;


--
-- Name: calculate_task_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_task_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.actual_hours IS NOT NULL AND NEW.estimated_hours IS NOT NULL AND NEW.estimated_hours > 0 THEN
        NEW.progress_percentage = LEAST(100, CAST(NEW.actual_hours * 100 / NEW.estimated_hours AS INTEGER));
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: convert_lead_to_customer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convert_lead_to_customer() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE customers 
    SET is_lead = false,
        lead_status = 'converted'
    WHERE id = NEW.customer_id AND is_lead = true;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION convert_lead_to_customer(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.convert_lead_to_customer() IS 'Convert lead to customer on first order';


--
-- Name: credit_referral_reward(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.credit_referral_reward() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_referrer_wallet_id INT;
  v_referred_wallet_id INT;
  v_referrer_id INT;
  v_referred_id INT;
  v_referrer_reward DECIMAL(10,2);
  v_referred_reward DECIMAL(10,2);
BEGIN
  v_referrer_id := NEW.referrer_customer_id;
  v_referred_id := NEW.referred_customer_id;
  v_referrer_reward := COALESCE(NEW.reward_amount, 0);
  v_referred_reward := COALESCE(NEW.referred_reward_amount, 0);

  -- First order placed transition
  IF NEW.referred_customer_id IS NOT NULL AND OLD.first_order_placed = false AND NEW.first_order_placed = true THEN

    -- Credit referrer (if not already credited)
    IF COALESCE(NEW.reward_credited, false) = false AND v_referrer_id IS NOT NULL AND v_referrer_reward > 0 THEN
      INSERT INTO customer_wallets (customer_id, balance, total_earned)
      VALUES (v_referrer_id, 0, 0)
      ON CONFLICT (customer_id) DO NOTHING;

      SELECT id INTO v_referrer_wallet_id FROM customer_wallets WHERE customer_id = v_referrer_id;

      UPDATE customer_wallets
      SET
        balance = balance + v_referrer_reward,
        total_earned = total_earned + v_referrer_reward,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = v_referrer_id;

      INSERT INTO wallet_transactions (
        wallet_id, customer_id, transaction_type, amount, source,
        reference_id, description, balance_after
      )
      VALUES (
        v_referrer_wallet_id, v_referrer_id, 'credit', v_referrer_reward, 'referral',
        NEW.id, 'Referral reward',
        (SELECT balance FROM customer_wallets WHERE customer_id = v_referrer_id)
      );

      NEW.reward_credited := true;
    END IF;

    -- Credit referred customer (if configured)
    IF COALESCE(NEW.referred_reward_credited, false) = false AND v_referred_id IS NOT NULL AND v_referred_reward > 0 THEN
      INSERT INTO customer_wallets (customer_id, balance, total_earned)
      VALUES (v_referred_id, 0, 0)
      ON CONFLICT (customer_id) DO NOTHING;

      SELECT id INTO v_referred_wallet_id FROM customer_wallets WHERE customer_id = v_referred_id;

      UPDATE customer_wallets
      SET
        balance = balance + v_referred_reward,
        total_earned = total_earned + v_referred_reward,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = v_referred_id;

      INSERT INTO wallet_transactions (
        wallet_id, customer_id, transaction_type, amount, source,
        reference_id, description, balance_after
      )
      VALUES (
        v_referred_wallet_id, v_referred_id, 'credit', v_referred_reward, 'referral',
        NEW.id, 'Referral welcome bonus',
        (SELECT balance FROM customer_wallets WHERE customer_id = v_referred_id)
      );

      NEW.referred_reward_credited := true;
    END IF;

    NEW.completed_at := CURRENT_TIMESTAMP;
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_daily_call_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_daily_call_tasks() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    customer_rec RECORD;
    task_priority VARCHAR(20);
    call_reason VARCHAR(255);
BEGIN
    -- Clear old pending tasks (older than 7 days)
    DELETE FROM crm_call_tasks 
    WHERE task_date < CURRENT_DATE - INTERVAL '7 days' 
    AND status = 'pending';
    
    -- Generate HOT customer tasks (purchased recently, high value)
    FOR customer_rec IN 
        SELECT ci.customer_id, ci.name, ci.last_purchase_date, ci.days_since_last_order, ci.avg_order_value
        FROM customer_intelligence ci
        WHERE ci.days_since_last_order BETWEEN 7 AND 15
        AND ci.avg_order_value > 800
        AND NOT EXISTS (
            SELECT 1 FROM crm_call_tasks 
            WHERE customer_id = ci.customer_id 
            AND task_date = CURRENT_DATE
        )
        LIMIT 20
    LOOP
        INSERT INTO crm_call_tasks (customer_id, priority, call_reason, task_date)
        VALUES (customer_rec.customer_id, 'hot', 'Upsell opportunity - Recent high-value customer', CURRENT_DATE);
    END LOOP;
    
    -- Generate WARM customer tasks (moderate activity)
    FOR customer_rec IN 
        SELECT ci.customer_id, ci.days_since_last_order
        FROM customer_intelligence ci
        WHERE ci.days_since_last_order BETWEEN 15 AND 30
        AND ci.total_orders >= 2
        AND NOT EXISTS (
            SELECT 1 FROM crm_call_tasks 
            WHERE customer_id = ci.customer_id 
            AND task_date = CURRENT_DATE
        )
        LIMIT 30
    LOOP
        INSERT INTO crm_call_tasks (customer_id, priority, call_reason, task_date)
        VALUES (customer_rec.customer_id, 'warm', 'Follow-up - Repeat customer', CURRENT_DATE);
    END LOOP;
    
    -- COLD customers get WhatsApp/SMS (no call task)
    -- They are handled by marketing automation
    
END;
$$;


--
-- Name: FUNCTION generate_daily_call_tasks(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_daily_call_tasks() IS 'Auto-generate call tasks every morning';


--
-- Name: generate_repeat_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_repeat_reminders() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO repeat_order_reminders (
        customer_id, 
        last_order_id, 
        last_order_date, 
        reminder_due_date,
        reminder_channel
    )
    SELECT 
        so.customer_id,
        so.id,
        so.order_date::date,
        (so.order_date + INTERVAL '28 days')::date,
        'whatsapp'
    FROM sales_orders so
    WHERE so.customer_id IS NOT NULL
      AND so.order_date::date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '25 days'
      AND NOT EXISTS (
          SELECT 1 FROM repeat_order_reminders ror 
          WHERE ror.last_order_id = so.id
      )
    ORDER BY so.order_date DESC;
END;
$$;


--
-- Name: FUNCTION generate_repeat_reminders(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_repeat_reminders() IS 'Generate auto-reminders for repeat purchases (run daily)';


--
-- Name: log_attendance_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_attendance_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO user_activity_logs (user_id, action, module, resource_type, resource_id, details)
    SELECT u.id, 'ATTENDANCE_' || NEW.status, 'HR', 'ATTENDANCE', NEW.id, 
           json_build_object('employee_id', NEW.employee_id, 'date', NEW.attendance_date)
    FROM users u 
    WHERE u.id IN (SELECT e.user_id FROM employees e WHERE e.id = NEW.employee_id);
    RETURN NEW;
END;
$$;


--
-- Name: refresh_churn_risk_30d_tag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_churn_risk_30d_tag() RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  churn_tag_id uuid;
  inserted_count integer := 0;
  removed_count integer := 0;
BEGIN
  SELECT id INTO churn_tag_id
  FROM customer_tags
  WHERE name = 'Churn Risk (30+ days inactive)'
  LIMIT 1;

  IF churn_tag_id IS NULL THEN
    RETURN jsonb_build_object('inserted', 0, 'removed', 0);
  END IF;

  WITH last_orders AS (
    SELECT
      so.customer_id,
      MAX(COALESCE(so.order_date, so.created_at)) AS last_order_date
    FROM sales_orders so
    WHERE so.customer_id IS NOT NULL
    GROUP BY so.customer_id
  ), at_risk AS (
    SELECT lo.customer_id
    FROM last_orders lo
    WHERE lo.last_order_date < (NOW() - INTERVAL '30 days')
  ), ins AS (
    INSERT INTO customer_tag_assignments (tag_id, customer_id, created_at)
    SELECT churn_tag_id, ar.customer_id, NOW()
    FROM at_risk ar
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins;

  WITH last_orders AS (
    SELECT
      so.customer_id,
      MAX(COALESCE(so.order_date, so.created_at)) AS last_order_date
    FROM sales_orders so
    WHERE so.customer_id IS NOT NULL
    GROUP BY so.customer_id
  ), not_at_risk AS (
    SELECT lo.customer_id
    FROM last_orders lo
    WHERE lo.last_order_date >= (NOW() - INTERVAL '30 days')
  ), del AS (
    DELETE FROM customer_tag_assignments a
    WHERE a.tag_id = churn_tag_id
      AND a.customer_id IN (SELECT customer_id FROM not_at_risk)
    RETURNING 1
  )
  SELECT COUNT(*) INTO removed_count FROM del;

  RETURN jsonb_build_object('inserted', inserted_count, 'removed', removed_count);
END;
$$;


--
-- Name: remove_churn_risk_30d_on_new_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_churn_risk_30d_on_new_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  churn_tag_id uuid;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO churn_tag_id
  FROM customer_tags
  WHERE name = 'Churn Risk (30+ days inactive)'
  LIMIT 1;

  IF churn_tag_id IS NULL THEN
    RETURN NEW;
  END IF;

  DELETE FROM customer_tag_assignments
  WHERE tag_id = churn_tag_id
    AND customer_id = NEW.customer_id;

  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_courier_configurations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_courier_configurations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;


--
-- Name: trigger_marketing_automation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_marketing_automation() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    campaign_rec RECORD;
    customer_rec RECORD;
BEGIN
    -- Loop through active campaigns
    FOR campaign_rec IN 
        SELECT * FROM marketing_campaigns WHERE is_active = true
    LOOP
        -- Missed Call Follow-up
        IF campaign_rec.campaign_type = 'retention' AND campaign_rec.trigger_condition->>'trigger' = 'call_missed' THEN
            FOR customer_rec IN
                SELECT DISTINCT ct.customer_id, c.phone
                FROM crm_call_tasks ct
                JOIN customers c ON ct.customer_id = c.id
                WHERE ct.status = 'failed' 
                AND ct.task_date = CURRENT_DATE
                AND NOT EXISTS (
                    SELECT 1 FROM customer_engagement_history 
                    WHERE customer_id = ct.customer_id 
                    AND engagement_type = 'whatsapp'
                    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
                )
            LOOP
                INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, status, message_content, campaign_id)
                VALUES (customer_rec.customer_id, 'whatsapp', 'whatsapp', 'sent', campaign_rec.message_template, campaign_rec.id);
                
                UPDATE marketing_campaigns SET success_count = success_count + 1 WHERE id = campaign_rec.id;
            END LOOP;
        END IF;
        
        -- Inactive Customer Reactivation
        IF campaign_rec.campaign_type = 'reactivation' THEN
            FOR customer_rec IN
                SELECT ci.customer_id, c.phone
                FROM customer_intelligence ci
                JOIN customers c ON ci.customer_id = c.id
                WHERE ci.days_since_last_order >= 30
                AND NOT EXISTS (
                    SELECT 1 FROM customer_engagement_history 
                    WHERE customer_id = ci.customer_id 
                    AND engagement_type = 'sms'
                    AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
                )
                LIMIT 50
            LOOP
                INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, status, message_content, campaign_id)
                VALUES (customer_rec.customer_id, 'sms', 'sms', 'sent', campaign_rec.message_template, campaign_rec.id);
                
                UPDATE marketing_campaigns SET success_count = success_count + 1 WHERE id = campaign_rec.id;
            END LOOP;
        END IF;
    END LOOP;
END;
$$;


--
-- Name: FUNCTION trigger_marketing_automation(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_marketing_automation() IS 'Execute behavior-based marketing campaigns';


--
-- Name: update_customer_lifecycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_customer_lifecycle() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update lifecycle stage based on orders
    IF NEW.id IS NOT NULL THEN
        UPDATE customers c
        SET lifecycle_stage = CASE 
            WHEN order_count = 0 THEN 'lead'
            WHEN order_count = 1 THEN 'first_buyer'
            WHEN order_count BETWEEN 2 AND 4 THEN 'repeat_buyer'
            WHEN order_count >= 5 THEN 'loyal'
            ELSE 'prospect'
        END,
        customer_type = CASE 
            WHEN lifetime_val > 50000 THEN 'vip'
            WHEN order_count >= 3 THEN 'repeat'
            WHEN last_order_days > 90 THEN 'inactive'
            ELSE 'new'
        END
        FROM (
            SELECT 
                so.customer_id,
                COUNT(*) as order_count,
                SUM(so.grand_total) as lifetime_val,
                COALESCE(CURRENT_DATE - MAX(so.order_date)::date, 999) as last_order_days
            FROM sales_orders so
            WHERE so.customer_id = NEW.customer_id
            GROUP BY so.customer_id
        ) stats
        WHERE c.id = stats.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_customer_lifecycle(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_customer_lifecycle() IS 'Auto-update customer lifecycle stage based on purchases';


--
-- Name: update_customer_lifetime_value(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_customer_lifetime_value() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE customers
    SET customer_lifetime_value = (
        SELECT COALESCE(SUM(grand_total), 0)
        FROM ecommerce_orders
        WHERE customer_id = NEW.customer_id
    )
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$;


--
-- Name: update_customers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_customers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_deal_of_the_day_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_deal_of_the_day_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_hot_deals_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_hot_deals_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_membership_tier(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_membership_tier() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Guest orders should not create/update membership records
    IF NEW.customer_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Create membership record if it doesn't exist
    INSERT INTO customer_memberships (customer_id)
    VALUES (NEW.customer_id)
    ON CONFLICT (customer_id) DO NOTHING;

    -- Calculate current month spend for the customer
    UPDATE customer_memberships cm
    SET 
        current_month_spend = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM sales_orders
            WHERE customer_id = NEW.customer_id
              AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        membership_tier = CASE 
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) > 5000 THEN 'gold'
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) >= 5000 THEN 'silver'
            ELSE 'none'
        END,
        discount_percentage = CASE 
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) > 5000 THEN 10
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) >= 5000 THEN 4
            ELSE 0
        END,
        free_delivery_count = CASE 
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) > 5000 THEN 1
            ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE cm.customer_id = NEW.customer_id;

    RETURN NEW;
END;
$$;


--
-- Name: update_order_items_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_items_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_order_total(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_order_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE sales_orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_orders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_payroll_deductions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_payroll_deductions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.total_deductions = COALESCE(NEW.provident_fund, 0) + 
                          COALESCE(NEW.income_tax, 0) + 
                          COALESCE(NEW.other_deductions, 0);
    NEW.net_salary = NEW.gross_salary - NEW.total_deductions;
    RETURN NEW;
END;
$$;


--
-- Name: update_project_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE projects
        SET status = 'completed'
        WHERE id = NEW.project_id
        AND NOT EXISTS (
            SELECT 1 FROM project_tasks 
            WHERE project_id = NEW.project_id 
            AND status != 'completed'
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_special_offers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_special_offers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_supplier_total_purchases(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_supplier_total_purchases() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE suppliers
    SET total_purchases = (
        SELECT COALESCE(SUM(grand_total), 0)
        FROM purchase_invoices
        WHERE supplier_id = NEW.supplier_id
    )
    WHERE id = NEW.supplier_id;
    RETURN NEW;
END;
$$;


--
-- Name: update_team_member_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_member_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE team_members 
        SET completed_leads_count = completed_leads_count + 1
        WHERE user_id = NEW.assigned_to_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_team_member_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_team_member_stats() IS 'Auto-update team member completion stats';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$;


--
-- Name: update_users_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_users_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: validate_leave_dates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_leave_dates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.to_date < NEW.from_date THEN
        RAISE EXCEPTION 'Leave end date must be after start date';
    END IF;
    NEW.total_days = (NEW.to_date - NEW.from_date)::INTEGER + 1;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _hold_split_backup_20260820; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._hold_split_backup_20260820 (
    id integer,
    old_status text,
    courier_company character varying(100),
    courier_order_id character varying(100),
    tracking_id character varying(100),
    shipped_at timestamp without time zone,
    backed_up_at timestamp with time zone
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    customer_type character varying(20),
    title character varying(10),
    name character varying(50) NOT NULL,
    last_name character varying(50),
    company_name character varying(100),
    email character varying(100),
    phone character varying(20),
    mobile character varying(20),
    website character varying(255),
    status public.customer_status_enum DEFAULT 'prospect'::public.customer_status_enum,
    segment_id integer,
    assigned_user_id integer,
    assigned_supervisor_id integer,
    source character varying(50),
    rating integer DEFAULT 3,
    total_spent numeric(15,2) DEFAULT 0,
    customer_lifetime_value numeric(15,2) DEFAULT 0,
    preferred_contact_method character varying(20),
    is_deleted boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_contact_date timestamp without time zone,
    assigned_to integer,
    priority character varying(20),
    is_escalated boolean DEFAULT false,
    escalated_at timestamp without time zone,
    next_follow_up timestamp without time zone,
    district character varying(100),
    city character varying(100),
    gender character varying(20),
    date_of_birth date,
    marital_status character varying(20),
    anniversary_date date,
    profession character varying(100),
    available_time character varying(50),
    lifecycle_stage character varying(20) DEFAULT 'lead'::character varying,
    address text,
    is_active boolean DEFAULT true,
    password character varying(255),
    is_lead boolean DEFAULT true,
    lead_status character varying(20) DEFAULT 'unassigned'::character varying,
    assigned_team_member_id integer,
    assigned_at timestamp without time zone,
    lead_source character varying(100),
    lead_score integer DEFAULT 0,
    can_login_with_mobile boolean DEFAULT true,
    can_login_with_email boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    mobile_verified boolean DEFAULT false,
    is_guest boolean DEFAULT true,
    referred_by_customer_id integer,
    referred_by_code character varying(50),
    referred_by_partner_id uuid,
    referred_channel character varying(30),
    referred_at timestamp without time zone,
    referral_campaign_id uuid,
    assigned_by integer,
    CONSTRAINT customers_customer_type_check CHECK (((customer_type IS NULL) OR ((customer_type)::text = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying, 'new'::character varying, 'repeat'::character varying, 'vip'::character varying, 'inactive'::character varying, 'normal'::character varying, 'silver'::character varying, 'gold'::character varying, 'platinum'::character varying, 'blacklist'::character varying, 'rejected'::character varying])::text[])))),
    CONSTRAINT customers_gender_check CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('other'::character varying)::text, ('prefer_not_to_say'::character varying)::text]))),
    CONSTRAINT customers_gender_check1 CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('other'::character varying)::text, ('prefer_not_to_say'::character varying)::text]))),
    CONSTRAINT customers_gender_check2 CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('other'::character varying)::text, ('prefer_not_to_say'::character varying)::text]))),
    CONSTRAINT customers_gender_check3 CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('other'::character varying)::text, ('prefer_not_to_say'::character varying)::text]))),
    CONSTRAINT customers_lead_status_check CHECK (((lead_status IS NULL) OR ((lead_status)::text = ANY ((ARRAY['unassigned'::character varying, 'assigned'::character varying, 'contacted'::character varying, 'qualified'::character varying, 'converted'::character varying, 'lost'::character varying, 'not_interested'::character varying, 'no_answer'::character varying, 'follow_up'::character varying, 'rejected'::character varying])::text[])))),
    CONSTRAINT customers_lifecycle_stage_check CHECK (((lifecycle_stage)::text = ANY (ARRAY[('lead'::character varying)::text, ('prospect'::character varying)::text, ('first_buyer'::character varying)::text, ('repeat_buyer'::character varying)::text, ('loyal'::character varying)::text, ('inactive'::character varying)::text]))),
    CONSTRAINT customers_lifecycle_stage_check1 CHECK (((lifecycle_stage)::text = ANY (ARRAY[('lead'::character varying)::text, ('prospect'::character varying)::text, ('first_buyer'::character varying)::text, ('repeat_buyer'::character varying)::text, ('loyal'::character varying)::text, ('inactive'::character varying)::text]))),
    CONSTRAINT customers_lifecycle_stage_check2 CHECK (((lifecycle_stage)::text = ANY (ARRAY[('lead'::character varying)::text, ('prospect'::character varying)::text, ('first_buyer'::character varying)::text, ('repeat_buyer'::character varying)::text, ('loyal'::character varying)::text, ('inactive'::character varying)::text]))),
    CONSTRAINT customers_lifecycle_stage_check3 CHECK (((lifecycle_stage)::text = ANY (ARRAY[('lead'::character varying)::text, ('prospect'::character varying)::text, ('first_buyer'::character varying)::text, ('repeat_buyer'::character varying)::text, ('loyal'::character varying)::text, ('inactive'::character varying)::text]))),
    CONSTRAINT customers_marital_status_check CHECK (((marital_status)::text = ANY (ARRAY[('single'::character varying)::text, ('married'::character varying)::text, ('divorced'::character varying)::text, ('widowed'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT customers_marital_status_check1 CHECK (((marital_status)::text = ANY (ARRAY[('single'::character varying)::text, ('married'::character varying)::text, ('divorced'::character varying)::text, ('widowed'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT customers_marital_status_check2 CHECK (((marital_status)::text = ANY (ARRAY[('single'::character varying)::text, ('married'::character varying)::text, ('divorced'::character varying)::text, ('widowed'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT customers_marital_status_check3 CHECK (((marital_status)::text = ANY (ARRAY[('single'::character varying)::text, ('married'::character varying)::text, ('divorced'::character varying)::text, ('widowed'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: COLUMN customers.customer_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.customer_type IS 'Customer classification: new, repeat, vip, inactive';


--
-- Name: COLUMN customers.district; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.district IS 'Customer district for regional targeting';


--
-- Name: COLUMN customers.available_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.available_time IS 'Best time to contact customer';


--
-- Name: COLUMN customers.lifecycle_stage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.lifecycle_stage IS 'Customer journey stage';


--
-- Name: COLUMN customers.lead_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.lead_status IS 'Lead qualification status: qualified, converted, not_interested, no_answer, follow_up, etc.';


--
-- Name: ecommerce_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ecommerce_orders (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    order_number character varying(50) NOT NULL,
    customer_id integer,
    guest_email character varying(100),
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(15,2),
    discount_amount numeric(15,2),
    tax_amount numeric(15,2),
    shipping_cost numeric(15,2),
    grand_total numeric(15,2),
    status public.order_status_enum DEFAULT 'pending'::public.order_status_enum,
    payment_status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum,
    shipping_address_id integer,
    billing_address_id integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: active_customers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_customers AS
 SELECT c.id,
    c.uuid,
    c.customer_type,
    c.title,
    c.name AS first_name,
    c.last_name,
    c.company_name,
    c.email,
    c.phone,
    c.mobile,
    c.website,
    c.status,
    c.segment_id,
    c.assigned_user_id,
    c.assigned_supervisor_id,
    c.source,
    c.rating,
    c.customer_lifetime_value,
    c.preferred_contact_method,
    c.notes,
    c.created_at,
    c.updated_at,
    c.last_contact_date,
    count(DISTINCT o.id) AS total_orders,
    sum(o.grand_total) AS total_spent
   FROM (public.customers c
     LEFT JOIN public.ecommerce_orders o ON ((c.id = o.customer_id)))
  WHERE ((c.status = 'active'::public.customer_status_enum) AND (c.is_deleted = false))
  GROUP BY c.id, c.uuid, c.customer_type, c.title, c.name, c.last_name, c.company_name, c.email, c.phone, c.mobile, c.website, c.status, c.segment_id, c.assigned_user_id, c.assigned_supervisor_id, c.source, c.rating, c.customer_lifetime_value, c.preferred_contact_method, c.notes, c.created_at, c.updated_at, c.last_contact_date;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    customer_id integer,
    deal_id integer,
    user_id integer,
    subject character varying(255),
    description text,
    duration integer,
    outcome character varying(100),
    notes text,
    scheduled_at timestamp without time zone,
    completed_at timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    recording_url text,
    sentiment character varying(20),
    follow_up_required boolean DEFAULT false,
    follow_up_date timestamp without time zone,
    tags jsonb DEFAULT '[]'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT activities_sentiment_check CHECK (((sentiment)::text = ANY (ARRAY[('very_positive'::character varying)::text, ('positive'::character varying)::text, ('neutral'::character varying)::text, ('negative'::character varying)::text, ('very_negative'::character varying)::text])))
);


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    role_slug character varying(50),
    module character varying(50),
    action character varying(50),
    resource_type character varying(50),
    resource_id integer,
    description text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: activity_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    activity_type character varying(50) NOT NULL,
    subject_template text,
    description_template text,
    duration integer,
    is_shared boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT activity_templates_activity_type_check CHECK (((activity_type)::text = ANY (ARRAY[('call'::character varying)::text, ('email'::character varying)::text, ('meeting'::character varying)::text, ('note'::character varying)::text, ('sms'::character varying)::text, ('whatsapp'::character varying)::text])))
);


--
-- Name: activity_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_templates_id_seq OWNED BY public.activity_templates.id;


--
-- Name: admin_menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_menu_items (
    id integer NOT NULL,
    title character varying(120) NOT NULL,
    icon character varying(80),
    path character varying(255),
    parent_id integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    required_permissions text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_menu_items_id_seq OWNED BY public.admin_menu_items.id;


--
-- Name: agent_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_commissions (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    customer_id integer NOT NULL,
    sales_order_id integer NOT NULL,
    order_amount numeric(12,2) NOT NULL,
    commission_rate numeric(5,2) DEFAULT 0,
    commission_amount numeric(12,2) NOT NULL,
    commission_type character varying(20) DEFAULT 'fixed'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    paid_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agent_commissions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('paid'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: TABLE agent_commissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agent_commissions IS 'Tracks commission earnings for each sale made by agents';


--
-- Name: agent_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_commissions_id_seq OWNED BY public.agent_commissions.id;


--
-- Name: crm_call_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_call_tasks (
    id integer NOT NULL,
    customer_id character varying(255) NOT NULL,
    assigned_agent_id integer,
    task_date date DEFAULT CURRENT_DATE NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    call_reason character varying(255),
    recommended_product_id integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    call_outcome character varying(100),
    notes text,
    scheduled_time time without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT crm_call_tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('hot'::character varying)::text, ('warm'::character varying)::text, ('cold'::character varying)::text]))),
    CONSTRAINT crm_call_tasks_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('skipped'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: TABLE crm_call_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_call_tasks IS 'Auto-generated daily call tasks for agents';


--
-- Name: agent_performance_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.agent_performance_dashboard AS
 SELECT assigned_agent_id AS agent_id,
    count(*) AS total_tasks,
    count(*) FILTER (WHERE ((status)::text = 'completed'::text)) AS completed_calls,
    count(*) FILTER (WHERE ((status)::text = 'pending'::text)) AS pending_calls,
    count(*) FILTER (WHERE ((priority)::text = 'hot'::text)) AS hot_leads,
    count(*) FILTER (WHERE ((priority)::text = 'warm'::text)) AS warm_leads,
    round((avg(
        CASE
            WHEN ((status)::text = 'completed'::text) THEN 1
            ELSE 0
        END) * (100)::numeric), 2) AS completion_rate,
    count(DISTINCT customer_id) AS unique_customers_contacted,
    max(completed_at) AS last_call_time
   FROM public.crm_call_tasks ct
  WHERE (task_date >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY assigned_agent_id;


--
-- Name: VIEW agent_performance_dashboard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.agent_performance_dashboard IS 'Agent productivity metrics';


--
-- Name: agent_tl_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_tl_history (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    team_leader_id integer NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_tl_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_tl_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_tl_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_tl_history_id_seq OWNED BY public.agent_tl_history.id;


--
-- Name: customer_360_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customer_360_view AS
SELECT
    NULL::integer AS customer_id,
    NULL::character varying(50) AS first_name,
    NULL::character varying(50) AS last_name,
    NULL::character varying(100) AS email,
    NULL::character varying(20) AS phone,
    NULL::character varying(20) AS mobile,
    NULL::character varying(100) AS district,
    NULL::character varying(100) AS city,
    NULL::character varying(20) AS gender,
    NULL::date AS date_of_birth,
    NULL::character varying(20) AS marital_status,
    NULL::date AS anniversary_date,
    NULL::character varying(100) AS profession,
    NULL::character varying(50) AS available_time,
    NULL::character varying(20) AS customer_type,
    NULL::character varying(20) AS lifecycle_stage,
    NULL::public.customer_status_enum AS status,
    NULL::character varying(20) AS priority,
    NULL::integer AS assigned_to,
    NULL::bigint AS total_orders,
    NULL::numeric AS lifetime_value,
    NULL::numeric AS avg_order_value,
    NULL::date AS last_order_date,
    NULL::date AS first_order_date,
    NULL::integer AS days_since_last_order,
    NULL::bigint AS total_interactions,
    NULL::bigint AS total_calls,
    NULL::bigint AS total_whatsapp,
    NULL::bigint AS total_emails,
    NULL::timestamp without time zone AS last_interaction_date,
    NULL::bigint AS total_behaviors,
    NULL::bigint AS products_viewed,
    NULL::bigint AS product_views_count,
    NULL::bigint AS family_members_count,
    NULL::text AS customer_temperature,
    NULL::timestamp without time zone AS customer_since,
    NULL::timestamp without time zone AS last_updated;


--
-- Name: VIEW customer_360_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.customer_360_view IS 'Complete 360° customer view with all data';


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    sku character varying(50) NOT NULL,
    product_code character varying(50),
    name_en character varying(255) NOT NULL,
    name_bn character varying(255),
    description_en text,
    description_bn text,
    category_id integer NOT NULL,
    brand character varying(100),
    unit_of_measure character varying(20),
    hsn_code character varying(20),
    tax_rate numeric(5,2),
    base_price numeric(12,2) NOT NULL,
    wholesale_price numeric(12,2),
    discount_allowed boolean DEFAULT true,
    is_organic boolean DEFAULT false,
    is_perishable boolean DEFAULT false,
    shelf_life_days integer,
    packaging_details jsonb,
    certifications jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    image_url text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    slug character varying(255) NOT NULL,
    is_deal_of_day boolean DEFAULT false,
    is_popular boolean DEFAULT false,
    is_new_arrival boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    deal_price numeric(10,2),
    deal_expires_at timestamp without time zone,
    stock_quantity integer,
    display_position integer,
    discount_type character varying(20),
    discount_value numeric(10,2),
    sale_price numeric(10,2),
    discount_start_date timestamp without time zone,
    discount_end_date timestamp without time zone,
    additional_info jsonb DEFAULT '{}'::jsonb,
    size_variants jsonb DEFAULT '[]'::jsonb,
    short_description text,
    is_combo boolean DEFAULT false NOT NULL,
    landing_page_delivery_charge numeric(10,2) DEFAULT 60.00,
    landing_page_delivery_charge_outside numeric(10,2) DEFAULT 110.00
);


--
-- Name: COLUMN products.stock_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.stock_quantity IS 'Current stock quantity of the product';


--
-- Name: COLUMN products.display_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.display_position IS 'Order position for displaying on homepage/products page';


--
-- Name: COLUMN products.discount_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.discount_type IS 'Type of discount: percentage, flat';


--
-- Name: COLUMN products.discount_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.discount_value IS 'Discount value: % for percentage, amount for flat';


--
-- Name: COLUMN products.sale_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.sale_price IS 'Final price after discount';


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_order_items (
    id integer NOT NULL,
    sales_order_id integer NOT NULL,
    product_id integer,
    quantity numeric(12,2) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_total numeric(15,2),
    batch_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    product_name character varying(500),
    product_image character varying(1000),
    variant_name character varying(255) DEFAULT NULL::character varying,
    custom_product_name character varying(500) DEFAULT NULL::character varying
);


--
-- Name: TABLE sales_order_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sales_order_items IS 'Items/products in each sales order';


--
-- Name: COLUMN sales_order_items.sales_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_order_items.sales_order_id IS 'Reference to sales_orders table';


--
-- Name: COLUMN sales_order_items.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_order_items.product_id IS 'Reference to products table';


--
-- Name: COLUMN sales_order_items.custom_product_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_order_items.custom_product_name IS 'Optional override for product display name. Used in invoices, stickers, courier. Does NOT modify actual product.';


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_orders (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    sales_order_number character varying(50) NOT NULL,
    customer_id integer,
    quotation_id integer,
    deal_id integer,
    order_date date NOT NULL,
    required_delivery_date date,
    status public.order_status_enum DEFAULT 'pending'::public.order_status_enum,
    payment_status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum,
    subtotal numeric(15,2),
    discount_percentage numeric(5,2),
    discount_amount numeric(15,2),
    tax_amount numeric(15,2),
    grand_total numeric(15,2),
    notes text,
    created_by integer NOT NULL,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    total_amount numeric(12,2) DEFAULT 0.00,
    shipping_address text,
    courier_notes text,
    rider_instructions text,
    internal_notes text,
    cancel_reason character varying(255),
    approved_by integer,
    approved_at timestamp without time zone,
    cancelled_by integer,
    cancelled_at timestamp without time zone,
    user_ip character varying(50),
    geo_location jsonb,
    browser_info character varying(255),
    device_type character varying(50),
    operating_system character varying(100),
    traffic_source character varying(100),
    referrer_url text,
    utm_source character varying(100),
    utm_medium character varying(100),
    utm_campaign character varying(100),
    courier_company character varying(100),
    courier_order_id character varying(100),
    tracking_id character varying(100),
    courier_status character varying(50),
    shipped_at timestamp without time zone,
    delivered_at timestamp without time zone,
    customer_name character varying(150),
    customer_email character varying(255),
    customer_phone character varying(30),
    thank_you_offer_accepted boolean DEFAULT false NOT NULL,
    offer_id integer,
    offer_code character varying(50),
    is_packed boolean DEFAULT false,
    packed_at timestamp without time zone,
    packed_by integer,
    invoice_printed boolean DEFAULT false,
    invoice_printed_at timestamp without time zone,
    sticker_printed boolean DEFAULT false,
    sticker_printed_at timestamp without time zone,
    order_source character varying(50) DEFAULT NULL::character varying,
    cod_amount numeric(12,2),
    delivery_charge numeric(12,2),
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    payment_transaction_id character varying(255),
    paid_amount numeric(12,2) DEFAULT 0,
    paid_at timestamp without time zone,
    coupon_code character varying(50),
    coupon_discount numeric(12,2) DEFAULT 0,
    late_delivery_note text,
    cancelled_order_note text,
    assigned_by integer,
    assigned_at timestamp without time zone,
    telephony_called_at timestamp without time zone,
    telephony_call_status character varying(30),
    telephony_outcome character varying(50),
    telephony_suggestion character varying(100),
    telephony_notes text,
    meta_fbp character varying(255),
    meta_fbc character varying(255),
    meta_fbclid text,
    meta_event_source_url text,
    meta_landing_url text,
    meta_attribution jsonb,
    district character varying(100),
    pathao_last_synced_at timestamp without time zone
);


--
-- Name: COLUMN sales_orders.total_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.total_amount IS 'Total amount of the sales order';


--
-- Name: COLUMN sales_orders.cod_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.cod_amount IS 'COD amount confirmed by courier webhook';


--
-- Name: COLUMN sales_orders.delivery_charge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.delivery_charge IS 'Delivery charge confirmed by courier webhook';


--
-- Name: COLUMN sales_orders.meta_fbp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.meta_fbp IS 'Meta _fbp browser identifier captured at order submission time.';


--
-- Name: COLUMN sales_orders.meta_fbc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.meta_fbc IS 'Meta _fbc click identifier captured at order submission time.';


--
-- Name: COLUMN sales_orders.meta_fbclid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.meta_fbclid IS 'Facebook click ID captured from URL when present.';


--
-- Name: COLUMN sales_orders.meta_event_source_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.meta_event_source_url IS 'Best source URL to use for server-side Meta events.';


--
-- Name: COLUMN sales_orders.meta_landing_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.meta_landing_url IS 'Landing/current URL captured during order submission.';


--
-- Name: COLUMN sales_orders.meta_attribution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_orders.meta_attribution IS 'Raw non-secret attribution context captured for server-side marketing events.';


--
-- Name: customer_intelligence; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customer_intelligence AS
 SELECT c.id AS customer_id,
    c.name AS first_name,
    c.last_name,
    (((c.name)::text || ' '::text) || (COALESCE(c.last_name, ''::character varying))::text) AS name,
    c.email,
    c.phone,
    count(DISTINCT so.id) AS total_orders,
    COALESCE(sum(so.grand_total), (0)::numeric) AS lifetime_value,
    COALESCE(avg(so.grand_total), (0)::numeric) AS avg_order_value,
    max(so.order_date) AS last_purchase_date,
    min(so.order_date) AS first_purchase_date,
    COALESCE((CURRENT_DATE - max(so.order_date)), 999) AS days_since_last_order,
    string_agg(DISTINCT (p.category_id)::text, ','::text) AS purchased_categories,
        CASE
            WHEN (max(so.order_date) > (CURRENT_DATE - '7 days'::interval)) THEN 'hot'::text
            WHEN (max(so.order_date) > (CURRENT_DATE - '30 days'::interval)) THEN 'warm'::text
            ELSE 'cold'::text
        END AS customer_temperature
   FROM (((public.customers c
     LEFT JOIN public.sales_orders so ON ((c.id = so.customer_id)))
     LEFT JOIN public.sales_order_items soi ON ((so.id = soi.sales_order_id)))
     LEFT JOIN public.products p ON ((soi.product_id = p.id)))
  GROUP BY c.id, c.name, c.last_name, c.email, c.phone;


--
-- Name: VIEW customer_intelligence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.customer_intelligence IS 'Real-time customer behavior analytics';


--
-- Name: product_recommendation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_recommendation_rules (
    id integer NOT NULL,
    rule_name character varying(255) NOT NULL,
    trigger_product_id integer,
    trigger_category_id integer,
    recommended_product_id integer,
    recommended_category_id integer,
    min_days_passed integer DEFAULT 7,
    max_days_passed integer DEFAULT 30,
    min_order_value numeric(10,2) DEFAULT 0,
    priority character varying(20) DEFAULT 'medium'::character varying,
    is_active boolean DEFAULT true,
    success_rate numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_recommendation_rules_priority_check CHECK (((priority)::text = ANY (ARRAY[('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text])))
);


--
-- Name: TABLE product_recommendation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_recommendation_rules IS 'AI-driven upsell/cross-sell rules';


--
-- Name: customer_product_recommendations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customer_product_recommendations AS
 SELECT c.id AS customer_id,
    (((c.name)::text || ' '::text) || (COALESCE(c.last_name, ''::character varying))::text) AS customer_name,
    c.phone,
    ci.last_purchase_date,
    ci.days_since_last_order,
    ci.avg_order_value,
    prr.rule_name,
    prr.recommended_product_id,
    p.name_en AS recommended_product_name,
    prr.priority,
    prr.min_days_passed,
    prr.max_days_passed
   FROM ((((((public.customers c
     JOIN public.customer_intelligence ci ON ((c.id = ci.customer_id)))
     JOIN public.sales_orders so ON ((c.id = so.customer_id)))
     JOIN public.sales_order_items soi ON ((so.id = soi.sales_order_id)))
     JOIN public.products purchased ON ((soi.product_id = purchased.id)))
     JOIN public.product_recommendation_rules prr ON ((((prr.trigger_product_id = purchased.id) OR (prr.trigger_category_id = purchased.category_id)) AND ((ci.days_since_last_order >= prr.min_days_passed) AND (ci.days_since_last_order <= prr.max_days_passed)) AND (ci.avg_order_value >= prr.min_order_value) AND (prr.is_active = true))))
     LEFT JOIN public.products p ON ((prr.recommended_product_id = p.id)))
  WHERE (ci.days_since_last_order <= 30)
  GROUP BY c.id, c.name, c.last_name, c.phone, ci.last_purchase_date, ci.days_since_last_order, ci.avg_order_value, prr.rule_name, prr.recommended_product_id, p.name_en, prr.priority, prr.min_days_passed, prr.max_days_passed;


--
-- Name: VIEW customer_product_recommendations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.customer_product_recommendations IS 'Real-time product recommendations per customer';


--
-- Name: ai_call_recommendations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ai_call_recommendations AS
 SELECT customer_id,
    (((first_name)::text || ' '::text) || (COALESCE(last_name, ''::character varying))::text) AS customer_name,
    phone,
    email,
    customer_type,
    lifecycle_stage,
    customer_temperature,
    available_time,
    days_since_last_order,
    lifetime_value,
    avg_order_value,
    total_orders,
    total_calls,
    products_viewed,
        CASE
            WHEN ((customer_temperature = 'hot'::text) AND (lifetime_value > (5000)::numeric)) THEN 10
            WHEN (customer_temperature = 'hot'::text) THEN 9
            WHEN ((customer_temperature = 'warm'::text) AND (total_orders >= 3)) THEN 8
            WHEN (customer_temperature = 'warm'::text) THEN 7
            WHEN ((days_since_last_order >= 30) AND (days_since_last_order <= 60)) THEN 6
            WHEN (((lifecycle_stage)::text = 'prospect'::text) AND (products_viewed > 5)) THEN 5
            ELSE 3
        END AS call_priority_score,
        CASE
            WHEN ((customer_temperature = 'hot'::text) AND ((lifecycle_stage)::text = 'loyal'::text)) THEN 'Premium product upsell'::text
            WHEN (customer_temperature = 'hot'::text) THEN 'Repeat purchase incentive'::text
            WHEN ((customer_temperature = 'warm'::text) AND (total_orders >= 2)) THEN 'Cross-sell related products'::text
            WHEN ((days_since_last_order >= 30) AND (days_since_last_order <= 60)) THEN 'Reactivation discount 20%'::text
            WHEN (days_since_last_order > 60) THEN 'Win-back offer 30%'::text
            WHEN ((lifecycle_stage)::text = 'prospect'::text) THEN 'First order discount 15%'::text
            ELSE 'General catalog offer'::text
        END AS offer_type,
        CASE
            WHEN (available_time IS NOT NULL) THEN available_time
            WHEN (total_calls > 0) THEN '10:00-12:00'::character varying
            ELSE '14:00-16:00'::character varying
        END AS best_call_time,
    ( SELECT string_agg((cpr.recommended_product_name)::text, ', '::text) AS string_agg
           FROM public.customer_product_recommendations cpr
          WHERE (cpr.customer_id = cv.customer_id)
         LIMIT 3) AS recommended_products,
        CASE
            WHEN ((customer_temperature = 'hot'::text) AND (days_since_last_order <= 7)) THEN 'URGENT: Call within 24 hours'::text
            WHEN (customer_temperature = 'hot'::text) THEN 'Call within 48 hours'::text
            WHEN (customer_temperature = 'warm'::text) THEN 'Schedule call this week'::text
            WHEN (days_since_last_order > 60) THEN 'Send SMS first, then call'::text
            ELSE 'Add to follow-up list'::text
        END AS next_action
   FROM public.customer_360_view cv
  WHERE (status = 'active'::public.customer_status_enum)
  ORDER BY
        CASE
            WHEN ((customer_temperature = 'hot'::text) AND (lifetime_value > (5000)::numeric)) THEN 10
            WHEN (customer_temperature = 'hot'::text) THEN 9
            WHEN ((customer_temperature = 'warm'::text) AND (total_orders >= 3)) THEN 8
            WHEN (customer_temperature = 'warm'::text) THEN 7
            WHEN ((days_since_last_order >= 30) AND (days_since_last_order <= 60)) THEN 6
            WHEN (((lifecycle_stage)::text = 'prospect'::text) AND (products_viewed > 5)) THEN 5
            ELSE 3
        END DESC, lifetime_value DESC;


--
-- Name: VIEW ai_call_recommendations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.ai_call_recommendations IS 'AI-driven recommendations for who/what/when to call';


--
-- Name: api_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    name character varying(100),
    last_used_at timestamp without time zone,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: api_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_tokens_id_seq OWNED BY public.api_tokens.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id bigint NOT NULL,
    employee_id integer NOT NULL,
    attendance_date date NOT NULL,
    check_in_time timestamp without time zone,
    check_out_time timestamp without time zone,
    status character varying(20),
    worked_hours numeric(5,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    module character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(255),
    description text NOT NULL,
    changed_fields jsonb,
    old_values jsonb,
    new_values jsonb,
    performed_by integer,
    performed_by_name character varying(255),
    endpoint character varying(500),
    http_method character varying(10),
    ip_address character varying(100),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: automatic_order_assignment_agent_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automatic_order_assignment_agent_preferences (
    id integer NOT NULL,
    team_leader_id integer CONSTRAINT automatic_order_assignment_agent_prefer_team_leader_id_not_null NOT NULL,
    agent_id integer NOT NULL,
    product_id integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() CONSTRAINT automatic_order_assignment_agent_preference_created_at_not_null NOT NULL,
    updated_at timestamp without time zone DEFAULT now() CONSTRAINT automatic_order_assignment_agent_preference_updated_at_not_null NOT NULL,
    assignment_order_direction character varying(4) DEFAULT 'asc'::character varying CONSTRAINT automatic_order_assignment__assignment_order_direction_not_null NOT NULL
);


--
-- Name: automatic_order_assignment_agent_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automatic_order_assignment_agent_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automatic_order_assignment_agent_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automatic_order_assignment_agent_preferences_id_seq OWNED BY public.automatic_order_assignment_agent_preferences.id;


--
-- Name: automatic_order_assignment_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automatic_order_assignment_logs (
    id integer NOT NULL,
    order_id integer,
    agent_id integer NOT NULL,
    team_leader_id integer NOT NULL,
    assigned_by integer,
    reason character varying(100) DEFAULT 'online_agent_auto_assignment'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    record_type character varying(30) DEFAULT 'sales_order'::character varying NOT NULL,
    incomplete_order_id integer
);


--
-- Name: automatic_order_assignment_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automatic_order_assignment_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automatic_order_assignment_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automatic_order_assignment_logs_id_seq OWNED BY public.automatic_order_assignment_logs.id;


--
-- Name: automatic_order_assignment_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automatic_order_assignment_settings (
    id integer NOT NULL,
    team_leader_id integer NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    max_active_orders integer DEFAULT 10 NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    max_daily_orders integer DEFAULT 100 NOT NULL
);


--
-- Name: automatic_order_assignment_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automatic_order_assignment_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automatic_order_assignment_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automatic_order_assignment_settings_id_seq OWNED BY public.automatic_order_assignment_settings.id;


--
-- Name: automatic_order_assignment_team_work_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automatic_order_assignment_team_work_types (
    id integer NOT NULL,
    team_leader_id integer CONSTRAINT automatic_order_assignment_team_work_ty_team_leader_id_not_null NOT NULL,
    team_id integer NOT NULL,
    work_type character varying(50) NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: automatic_order_assignment_team_work_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automatic_order_assignment_team_work_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automatic_order_assignment_team_work_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automatic_order_assignment_team_work_types_id_seq OWNED BY public.automatic_order_assignment_team_work_types.id;


--
-- Name: automation_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_workflows (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    trigger_type character varying(50) NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb,
    conditions jsonb DEFAULT '[]'::jsonb,
    actions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT false,
    execution_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_executed_at timestamp without time zone,
    CONSTRAINT automation_workflows_trigger_type_check CHECK (((trigger_type)::text = ANY (ARRAY[('deal_stage_changed'::character varying)::text, ('task_created'::character varying)::text, ('task_completed'::character varying)::text, ('lead_assigned'::character varying)::text, ('email_opened'::character varying)::text, ('email_clicked'::character varying)::text, ('meeting_scheduled'::character varying)::text, ('meeting_completed'::character varying)::text, ('time_based'::character varying)::text, ('inactivity'::character varying)::text, ('field_changed'::character varying)::text])))
);


--
-- Name: automation_workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.automation_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: automation_workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.automation_workflows_id_seq OWNED BY public.automation_workflows.id;


--
-- Name: backup_team_office_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_team_office_times (
    id integer NOT NULL,
    user_id integer NOT NULL,
    office_start_time character varying(5) NOT NULL,
    office_end_time character varying(5) NOT NULL,
    caution_minutes integer DEFAULT 0 NOT NULL,
    lunch_break_start_time character varying(5),
    lunch_break_end_time character varying(5),
    sort_order integer DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    weekdays text[] DEFAULT ARRAY[]::text[] NOT NULL,
    CONSTRAINT backup_team_office_times_caution_check CHECK (((caution_minutes >= 0) AND (caution_minutes <= 240))),
    CONSTRAINT backup_team_office_times_end_check CHECK (((office_end_time)::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text)),
    CONSTRAINT backup_team_office_times_lunch_end_check CHECK (((lunch_break_end_time IS NULL) OR ((lunch_break_end_time)::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text))),
    CONSTRAINT backup_team_office_times_lunch_start_check CHECK (((lunch_break_start_time IS NULL) OR ((lunch_break_start_time)::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text))),
    CONSTRAINT backup_team_office_times_start_check CHECK (((office_start_time)::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text))
);


--
-- Name: backup_team_office_times_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backup_team_office_times_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backup_team_office_times_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backup_team_office_times_id_seq OWNED BY public.backup_team_office_times.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    account_name character varying(100) NOT NULL,
    bank_name character varying(100) NOT NULL,
    account_number character varying(50) NOT NULL,
    account_type character varying(50),
    branch_code character varying(20),
    ifsc_code character varying(20),
    opening_balance numeric(15,2),
    current_balance numeric(15,2),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: bank_reconciliation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_reconciliation (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    bank_account_id integer NOT NULL,
    reconciliation_date date NOT NULL,
    bank_statement_balance numeric(15,2),
    system_balance numeric(15,2),
    difference numeric(15,2),
    status character varying(20) DEFAULT 'pending'::character varying,
    reconciled_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bank_reconciliation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_reconciliation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_reconciliation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_reconciliation_id_seq OWNED BY public.bank_reconciliation.id;


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id integer NOT NULL,
    uuid character varying(36) DEFAULT (public.uuid_generate_v4())::character varying NOT NULL,
    title character varying(255) NOT NULL,
    subtitle character varying(255),
    description text,
    button_text character varying(100),
    button_link character varying(500),
    image_url character varying(500) NOT NULL,
    background_color character varying(50) DEFAULT '#FF6B35'::character varying,
    text_color character varying(50) DEFAULT '#FFFFFF'::character varying,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    banner_type public.banner_type_enum DEFAULT 'carousel'::public.banner_type_enum,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: banners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.banners_id_seq OWNED BY public.banners.id;


--
-- Name: batch_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_tracking (
    id integer NOT NULL,
    product_id integer NOT NULL,
    batch_number character varying(50) NOT NULL,
    supplier_id integer,
    batch_date date NOT NULL,
    quantity_received numeric(12,2),
    quantity_available numeric(12,2),
    manufacturing_date date,
    expiry_date date,
    storage_location character varying(100),
    certifications jsonb,
    quality_check_status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: batch_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_tracking_id_seq OWNED BY public.batch_tracking.id;


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: blog_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_categories_id_seq OWNED BY public.blog_categories.id;


--
-- Name: blog_post_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_post_tags (
    blog_post_id integer NOT NULL,
    blog_tag_id integer NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    excerpt text,
    content text NOT NULL,
    featured_image character varying(255),
    category_id integer,
    author character varying(100),
    status character varying(20) DEFAULT 'published'::character varying,
    views integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: blog_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_posts_id_seq OWNED BY public.blog_posts.id;


--
-- Name: blog_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_tags (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    slug character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: blog_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_tags_id_seq OWNED BY public.blog_tags.id;


--
-- Name: call_log_visibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_log_visibility (
    log_key character varying(160) NOT NULL,
    customer_id character varying(255) NOT NULL,
    hidden_from_sales_agents boolean DEFAULT false NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: call_log_visibility_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_log_visibility_history (
    id bigint NOT NULL,
    log_key character varying(160) NOT NULL,
    customer_id character varying(255) NOT NULL,
    hidden_from_sales_agents boolean NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: call_log_visibility_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_log_visibility_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_log_visibility_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_log_visibility_history_id_seq OWNED BY public.call_log_visibility_history.id;


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_logs (
    id bigint NOT NULL,
    customer_id integer NOT NULL,
    called_by integer NOT NULL,
    call_start_time timestamp without time zone,
    call_end_time timestamp without time zone,
    call_duration_seconds integer,
    call_status character varying(20),
    recording_url text,
    transcript text,
    notes text,
    next_follow_up date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- Name: campaign_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_customers (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    customer_id integer,
    customer_phone character varying(30),
    customer_name character varying(150),
    times_used integer DEFAULT 0 NOT NULL,
    last_used_at timestamp without time zone,
    last_used_order_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: campaign_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_customers_id_seq OWNED BY public.campaign_customers.id;


--
-- Name: campaign_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_members (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    customer_id integer NOT NULL,
    email_sent boolean DEFAULT false,
    sms_sent boolean DEFAULT false,
    opened boolean DEFAULT false,
    clicked boolean DEFAULT false,
    converted boolean DEFAULT false,
    conversion_value numeric(15,2),
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: campaign_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_members_id_seq OWNED BY public.campaign_members.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    campaign_name character varying(255) NOT NULL,
    campaign_type character varying(50),
    description text,
    start_date date,
    end_date date,
    budget numeric(15,2),
    expected_roi numeric(5,2),
    actual_roi numeric(5,2),
    status character varying(20),
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    session_id character varying(64) NOT NULL,
    customer_id integer,
    product_id integer NOT NULL,
    product_name character varying(500),
    variant character varying(255),
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    image_url text,
    category character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name_en character varying(255) NOT NULL,
    name_bn character varying(255),
    slug character varying(255) NOT NULL,
    description text,
    image_url character varying(500),
    parent_id integer,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id integer NOT NULL,
    account_code character varying(50) NOT NULL,
    account_name character varying(100) NOT NULL,
    account_type character varying(50),
    account_subtype character varying(50),
    description text,
    balance numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chart_of_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chart_of_accounts_id_seq OWNED BY public.chart_of_accounts.id;


--
-- Name: combo_deal_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_deal_images (
    id integer NOT NULL,
    combo_deal_id integer NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: combo_deal_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combo_deal_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combo_deal_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combo_deal_images_id_seq OWNED BY public.combo_deal_images.id;


--
-- Name: combo_deal_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_deal_products (
    combo_deal_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1,
    id bigint NOT NULL,
    variant_name character varying(255),
    variant_price numeric(10,2),
    display_order integer DEFAULT 0
);


--
-- Name: TABLE combo_deal_products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.combo_deal_products IS 'Junction table linking combos to products';


--
-- Name: combo_deal_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combo_deal_products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combo_deal_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combo_deal_products_id_seq OWNED BY public.combo_deal_products.id;


--
-- Name: combo_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combo_deals (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    discount_percentage numeric(5,2) NOT NULL,
    combo_price numeric(10,2),
    image_url character varying(255),
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    display_position integer
);


--
-- Name: COLUMN combo_deals.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.combo_deals.image_url IS 'URL of combo image';


--
-- Name: COLUMN combo_deals.display_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.combo_deals.display_position IS 'Order position for displaying combos';


--
-- Name: combo_deals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combo_deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combo_deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combo_deals_id_seq OWNED BY public.combo_deals.id;


--
-- Name: commission_extra_partial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_extra_partial (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    month character varying(7) NOT NULL,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: commission_extra_partial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_extra_partial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_extra_partial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_extra_partial_id_seq OWNED BY public.commission_extra_partial.id;


--
-- Name: commission_payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_payment_requests (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    requested_amount numeric(12,2) NOT NULL,
    approved_amount numeric(12,2),
    payment_method character varying(50),
    payment_reference character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    admin_notes text,
    requested_by integer,
    approved_by integer,
    approved_at timestamp without time zone,
    paid_by integer,
    paid_at timestamp without time zone,
    rejected_by integer,
    rejected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    commission_month character varying(7) DEFAULT NULL::character varying
);


--
-- Name: COLUMN commission_payment_requests.commission_month; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.commission_payment_requests.commission_month IS 'The commission month this payment covers, in YYYY-MM format (e.g. 2026-04). Allows paying April commission in May without it affecting May balance.';


--
-- Name: commission_payment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_payment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_payment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_payment_requests_id_seq OWNED BY public.commission_payment_requests.id;


--
-- Name: commission_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_settings (
    id integer NOT NULL,
    setting_type character varying(20) DEFAULT 'global'::character varying NOT NULL,
    agent_id integer,
    commission_type character varying(20) DEFAULT 'fixed'::character varying NOT NULL,
    fixed_amount numeric(12,2) DEFAULT 0,
    percentage_rate numeric(5,2) DEFAULT 0,
    min_order_value numeric(12,2) DEFAULT 0,
    max_commission numeric(12,2),
    is_active boolean DEFAULT true,
    effective_from timestamp without time zone,
    effective_until timestamp without time zone,
    created_by integer,
    updated_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE commission_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.commission_settings IS 'Stores commission rate configurations for agents';


--
-- Name: commission_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_settings_id_seq OWNED BY public.commission_settings.id;


--
-- Name: commission_slabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_slabs (
    id integer NOT NULL,
    role_type character varying(20) DEFAULT 'agent'::character varying NOT NULL,
    agent_tier character varying(20) DEFAULT 'silver'::character varying NOT NULL,
    slab_type character varying(20) DEFAULT 'order'::character varying NOT NULL,
    min_order_count integer DEFAULT 0 NOT NULL,
    max_order_count integer,
    commission_amount numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: commission_slabs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_slabs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_slabs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_slabs_id_seq OWNED BY public.commission_slabs.id;


--
-- Name: coupon_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_campaigns (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(50),
    description text,
    trigger_product_id integer,
    discount_type character varying(20) DEFAULT 'fixed'::character varying NOT NULL,
    discount_value numeric(12,2) DEFAULT 0 NOT NULL,
    min_order_amount numeric(12,2) DEFAULT 0 NOT NULL,
    max_discount_amount numeric(12,2),
    max_uses integer,
    per_customer_limit integer DEFAULT 1 NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    expiry_days integer DEFAULT 30 NOT NULL,
    valid_from timestamp without time zone,
    valid_until timestamp without time zone,
    is_restricted boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: coupon_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coupon_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coupon_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coupon_campaigns_id_seq OWNED BY public.coupon_campaigns.id;


--
-- Name: courier_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_configurations (
    id integer NOT NULL,
    companyname character varying(255),
    username character varying(255),
    password character varying(255),
    api_key character varying(255),
    token text,
    refresh_token text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: courier_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courier_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courier_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courier_configurations_id_seq OWNED BY public.courier_configurations.id;


--
-- Name: courier_tracking_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_tracking_history (
    id integer NOT NULL,
    order_id integer NOT NULL,
    courier_company character varying(100) NOT NULL,
    tracking_id character varying(100) NOT NULL,
    status character varying(50) NOT NULL,
    location character varying(255),
    remarks text,
    updated_at timestamp without time zone DEFAULT now(),
    notification_type character varying(50),
    tracking_message text,
    cod_amount numeric(12,2),
    delivery_charge numeric(12,2),
    consignment_id character varying(50),
    raw_payload jsonb
);


--
-- Name: COLUMN courier_tracking_history.notification_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_tracking_history.notification_type IS 'Steadfast notification type: delivery_status or tracking_update';


--
-- Name: COLUMN courier_tracking_history.tracking_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_tracking_history.tracking_message IS 'Human-readable tracking message from courier webhook';


--
-- Name: COLUMN courier_tracking_history.cod_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_tracking_history.cod_amount IS 'Cash on delivery amount reported by courier';


--
-- Name: COLUMN courier_tracking_history.delivery_charge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_tracking_history.delivery_charge IS 'Delivery charge reported by courier';


--
-- Name: COLUMN courier_tracking_history.consignment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_tracking_history.consignment_id IS 'Courier consignment ID for cross-referencing';


--
-- Name: COLUMN courier_tracking_history.raw_payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.courier_tracking_history.raw_payload IS 'Full raw JSON payload from webhook for audit / debugging';


--
-- Name: courier_tracking_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courier_tracking_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courier_tracking_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courier_tracking_history_id_seq OWNED BY public.courier_tracking_history.id;


--
-- Name: crm_call_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_call_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_call_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_call_tasks_id_seq OWNED BY public.crm_call_tasks.id;


--
-- Name: crm_dashboard_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_dashboard_configs (
    id integer NOT NULL,
    team_leader_id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    value jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE crm_dashboard_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crm_dashboard_configs IS 'Stores customizable dashboard configuration and texts per team leader';


--
-- Name: COLUMN crm_dashboard_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_dashboard_configs.config_key IS 'Configuration key like scripts, trainingRolePlays, etc.';


--
-- Name: COLUMN crm_dashboard_configs.value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.crm_dashboard_configs.value IS 'JSON value containing the configuration data';


--
-- Name: crm_dashboard_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_dashboard_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_dashboard_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_dashboard_configs_id_seq OWNED BY public.crm_dashboard_configs.id;


--
-- Name: crm_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(60) NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crm_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_notifications_id_seq OWNED BY public.crm_notifications.id;


--
-- Name: custom_deal_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_deal_stages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(50) DEFAULT '#3B82F6'::character varying,
    "position" integer DEFAULT 0 NOT NULL,
    default_probability integer DEFAULT 50,
    is_active boolean DEFAULT true,
    is_system boolean DEFAULT false,
    pipeline_id integer DEFAULT 1,
    required_fields jsonb DEFAULT '[]'::jsonb,
    auto_move_after_days integer,
    stage_type character varying(50) DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT custom_deal_stages_default_probability_check CHECK (((default_probability >= 0) AND (default_probability <= 100))),
    CONSTRAINT custom_deal_stages_stage_type_check CHECK (((stage_type)::text = ANY (ARRAY[('open'::character varying)::text, ('won'::character varying)::text, ('lost'::character varying)::text])))
);


--
-- Name: custom_deal_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_deal_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_deal_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_deal_stages_id_seq OWNED BY public.custom_deal_stages.id;


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    address_type character varying(20),
    street_address character varying(255) NOT NULL,
    city character varying(50),
    state_province character varying(50),
    postal_code character varying(20),
    country character varying(50),
    is_primary boolean DEFAULT false,
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contact_phone character varying(200),
    district character varying(200)
);


--
-- Name: TABLE customer_addresses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_addresses IS 'Store multiple delivery addresses for customers';


--
-- Name: COLUMN customer_addresses.district; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_addresses.district IS 'District or sub-region within state/province';


--
-- Name: customer_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_addresses_id_seq OWNED BY public.customer_addresses.id;


--
-- Name: customer_behavior; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_behavior (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    behavior_type character varying(50) NOT NULL,
    product_id integer,
    category_id integer,
    metadata jsonb,
    session_id character varying(255),
    device_type character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_behavior_behavior_type_check CHECK (((behavior_type)::text = ANY (ARRAY[('product_view'::character varying)::text, ('add_to_cart'::character varying)::text, ('wishlist'::character varying)::text, ('search'::character varying)::text, ('page_visit'::character varying)::text, ('call_attempt'::character varying)::text, ('email_open'::character varying)::text, ('email_click'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: TABLE customer_behavior; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_behavior IS 'Customer browsing and interaction behavior';


--
-- Name: customer_behavior_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_behavior_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_behavior_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_behavior_id_seq OWNED BY public.customer_behavior.id;


--
-- Name: customer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_sessions (
    id integer NOT NULL,
    customer_id integer,
    session_id character varying(255) NOT NULL,
    source_details character varying(255),
    campaign_id character varying(100),
    utm_source character varying(100),
    utm_medium character varying(100),
    utm_campaign character varying(100),
    utm_term character varying(255),
    utm_content character varying(255),
    device_type character varying(50),
    browser character varying(100),
    os character varying(100),
    ip_address character varying(45),
    country character varying(100),
    session_start timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    session_end timestamp without time zone,
    total_session_time integer,
    pages_visited integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE customer_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_sessions IS 'Track customer session data including source, campaign, and time spent';


--
-- Name: customer_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_tiers (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    is_active boolean DEFAULT true,
    tier character varying(20) DEFAULT 'tier_3'::character varying,
    tier_assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tier_assigned_by_id integer,
    auto_assigned boolean DEFAULT false,
    last_activity_date timestamp without time zone,
    days_inactive integer DEFAULT 0,
    total_purchases integer DEFAULT 0,
    total_spent numeric(12,2) DEFAULT 0,
    engagement_score integer DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_tiers_tier_check CHECK (((tier)::text = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying, 'new'::character varying, 'repeat'::character varying, 'normal'::character varying, 'silver'::character varying, 'gold'::character varying, 'platinum'::character varying, 'vip'::character varying, 'blacklist'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT customer_tiers_tier_manual_check CHECK (((tier)::text = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: TABLE customer_tiers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_tiers IS 'Stores customer tier information for CRM tier management';


--
-- Name: team_a_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_a_data (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    gender character varying(20),
    profession character varying(100),
    product_interest text[],
    order_product_details jsonb,
    notes text,
    collected_by_id integer,
    collected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE team_a_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_a_data IS 'Team A collects: Gender, Profession, Product Interest, Order details';


--
-- Name: team_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_assignments (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    team_type character varying(10) NOT NULL,
    assigned_by_id integer NOT NULL,
    assigned_to_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    completed_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_assignments_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text]))),
    CONSTRAINT team_assignments_team_type_check CHECK (((team_type)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('D'::character varying)::text, ('E'::character varying)::text])))
);


--
-- Name: TABLE team_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_assignments IS 'Track which team is assigned to which customer/lead';


--
-- Name: team_b_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_b_data (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    date_of_birth date,
    marriage_day date,
    product_interest text[],
    order_product_details jsonb,
    notes text,
    collected_by_id integer,
    collected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE team_b_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_b_data IS 'Team B collects: Date of Birth, Marriage Day, Product Interest, Order details';


--
-- Name: team_c_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_c_data (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    product_interest text[],
    order_product_details jsonb,
    notes text,
    collected_by_id integer,
    collected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE team_c_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_c_data IS 'Team C collects: Family member info (uses customer_family_members table), Product Interest, Order details';


--
-- Name: team_d_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_d_data (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    health_card_number character varying(100),
    health_card_expiry date,
    membership_card_number character varying(100),
    membership_card_type character varying(50),
    membership_expiry date,
    coupon_codes text[],
    product_interest text[],
    order_product_details jsonb,
    notes text,
    collected_by_id integer,
    collected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE team_d_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_d_data IS 'Team D collects: Health Card, Membership Card, Coupon, Product Interest, Order details';


--
-- Name: team_e_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_e_data (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    permanent_membership_number character varying(100),
    membership_tier character varying(20),
    membership_start_date date,
    membership_benefits jsonb,
    lifetime_value numeric(12,2) DEFAULT 0,
    notes text,
    collected_by_id integer,
    collected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_e_data_membership_tier_check CHECK (((membership_tier)::text = ANY (ARRAY[('silver'::character varying)::text, ('gold'::character varying)::text, ('platinum'::character varying)::text, ('vip'::character varying)::text])))
);


--
-- Name: TABLE team_e_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_e_data IS 'Team E collects: Permanent Membership details';


--
-- Name: customer_complete_profile; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customer_complete_profile AS
 SELECT c.id,
    c.name AS first_name,
    c.last_name,
    c.email,
    c.phone,
    c.is_lead,
    c.lead_status,
    c.assigned_team_member_id,
    cs.source_details,
    cs.campaign_id,
    cs.total_session_time,
    ct.is_active,
    ct.tier,
    ct.total_purchases,
    ct.total_spent,
    ct.engagement_score,
    ta.team_type AS assigned_team,
    ta.status AS team_task_status,
        CASE
            WHEN (tea.id IS NOT NULL) THEN true
            ELSE false
        END AS team_a_completed,
        CASE
            WHEN (teb.id IS NOT NULL) THEN true
            ELSE false
        END AS team_b_completed,
        CASE
            WHEN (tec.id IS NOT NULL) THEN true
            ELSE false
        END AS team_c_completed,
        CASE
            WHEN (ted.id IS NOT NULL) THEN true
            ELSE false
        END AS team_d_completed,
        CASE
            WHEN (tee.id IS NOT NULL) THEN true
            ELSE false
        END AS team_e_completed
   FROM ((((((((public.customers c
     LEFT JOIN public.customer_sessions cs ON ((c.id = cs.customer_id)))
     LEFT JOIN public.customer_tiers ct ON ((c.id = ct.customer_id)))
     LEFT JOIN public.team_assignments ta ON ((c.id = ta.customer_id)))
     LEFT JOIN public.team_a_data tea ON ((c.id = tea.customer_id)))
     LEFT JOIN public.team_b_data teb ON ((c.id = teb.customer_id)))
     LEFT JOIN public.team_c_data tec ON ((c.id = tec.customer_id)))
     LEFT JOIN public.team_d_data ted ON ((c.id = ted.customer_id)))
     LEFT JOIN public.team_e_data tee ON ((c.id = tee.customer_id)));


--
-- Name: customer_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_contacts (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    contact_type character varying(20),
    contact_value character varying(100) NOT NULL,
    is_primary boolean DEFAULT false,
    verified boolean DEFAULT false,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_contacts_id_seq OWNED BY public.customer_contacts.id;


--
-- Name: customer_dropoff_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_dropoff_tracking (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    stage character varying(50) NOT NULL,
    product_id integer,
    cart_value numeric(10,2),
    reason character varying(255),
    recovered boolean DEFAULT false,
    recovered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_dropoff_tracking_stage_check CHECK (((stage)::text = ANY (ARRAY[('product_view'::character varying)::text, ('add_to_cart'::character varying)::text, ('checkout_initiated'::character varying)::text, ('payment_pending'::character varying)::text, ('payment_failed'::character varying)::text, ('abandoned'::character varying)::text])))
);


--
-- Name: TABLE customer_dropoff_tracking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_dropoff_tracking IS 'Track where customers drop off in purchase journey';


--
-- Name: customer_dropoff_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_dropoff_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_dropoff_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_dropoff_tracking_id_seq OWNED BY public.customer_dropoff_tracking.id;


--
-- Name: customer_engagement_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_engagement_history (
    id integer NOT NULL,
    customer_id character varying(255) NOT NULL,
    engagement_type character varying(50) NOT NULL,
    channel character varying(50),
    status character varying(50),
    message_content text,
    agent_id integer,
    campaign_id integer,
    response_received boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_engagement_history_engagement_type_check CHECK (((engagement_type)::text = ANY (ARRAY[('call'::character varying)::text, ('sms'::character varying)::text, ('whatsapp'::character varying)::text, ('email'::character varying)::text, ('website_visit'::character varying)::text, ('order'::character varying)::text]))),
    CONSTRAINT customer_engagement_history_status_check CHECK (((status)::text = ANY (ARRAY[('sent'::character varying)::text, ('delivered'::character varying)::text, ('read'::character varying)::text, ('responded'::character varying)::text, ('ignored'::character varying)::text, ('failed'::character varying)::text, ('completed'::character varying)::text])))
);


--
-- Name: TABLE customer_engagement_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_engagement_history IS 'Track all customer touchpoints';


--
-- Name: customer_engagement_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_engagement_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_engagement_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_engagement_history_id_seq OWNED BY public.customer_engagement_history.id;


--
-- Name: customer_family_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_family_members (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    email character varying(100),
    address text,
    district character varying(100),
    city character varying(100),
    gender character varying(20),
    date_of_birth date,
    marital_status character varying(20),
    anniversary_date date,
    profession character varying(100),
    relationship character varying(50),
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_family_members_gender_check CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('other'::character varying)::text, ('prefer_not_to_say'::character varying)::text]))),
    CONSTRAINT customer_family_members_marital_status_check CHECK (((marital_status)::text = ANY (ARRAY[('single'::character varying)::text, ('married'::character varying)::text, ('divorced'::character varying)::text, ('widowed'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT customer_family_members_relationship_check CHECK (((relationship)::text = ANY (ARRAY[('spouse'::character varying)::text, ('child'::character varying)::text, ('parent'::character varying)::text, ('sibling'::character varying)::text, ('grandparent'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: TABLE customer_family_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_family_members IS 'Customer family members for birthday/anniversary offers';


--
-- Name: customer_family_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_family_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_family_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_family_members_id_seq OWNED BY public.customer_family_members.id;


--
-- Name: customer_gifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_gifts (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    gift_type character varying(20),
    gift_name character varying(255),
    gift_value numeric(10,2),
    product_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_gifts_gift_type_check CHECK (((gift_type)::text = ANY (ARRAY[('birthday'::character varying)::text, ('eid'::character varying)::text, ('referral_milestone'::character varying)::text, ('membership_upgrade'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT customer_gifts_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text, ('delivered'::character varying)::text, ('expired'::character varying)::text])))
);


--
-- Name: TABLE customer_gifts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_gifts IS 'Birthday, Eid, and milestone gifts for customers';


--
-- Name: customer_gifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_gifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_gifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_gifts_id_seq OWNED BY public.customer_gifts.id;


--
-- Name: customer_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_interactions (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    interaction_type character varying(50) NOT NULL,
    interaction_direction character varying(20),
    subject character varying(255),
    description text,
    agent_id integer,
    duration_seconds integer,
    outcome character varying(100),
    follow_up_required boolean DEFAULT false,
    follow_up_date timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_interactions_interaction_direction_check CHECK (((interaction_direction)::text = ANY (ARRAY[('inbound'::character varying)::text, ('outbound'::character varying)::text]))),
    CONSTRAINT customer_interactions_interaction_type_check CHECK (((interaction_type)::text = ANY (ARRAY[('call'::character varying)::text, ('whatsapp'::character varying)::text, ('sms'::character varying)::text, ('email'::character varying)::text, ('facebook'::character varying)::text, ('instagram'::character varying)::text, ('website_visit'::character varying)::text, ('support_ticket'::character varying)::text, ('meeting'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: TABLE customer_interactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_interactions IS 'All customer touchpoints and interactions';


--
-- Name: customer_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_interactions_id_seq OWNED BY public.customer_interactions.id;


--
-- Name: customer_kyc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_kyc (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    id_type character varying(50),
    id_number character varying(100),
    id_expiry_date date,
    kyc_status character varying(20),
    verification_date timestamp without time zone,
    verified_by integer,
    documents jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_kyc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_kyc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_kyc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_kyc_id_seq OWNED BY public.customer_kyc.id;


--
-- Name: customer_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_memberships (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    membership_tier character varying(20) DEFAULT 'none'::character varying NOT NULL,
    discount_percentage numeric(5,2) DEFAULT 0,
    free_delivery_count integer DEFAULT 0,
    free_delivery_used integer DEFAULT 0,
    total_monthly_spend numeric(10,2) DEFAULT 0,
    current_month_spend numeric(10,2) DEFAULT 0,
    last_order_date date,
    price_lock_enabled boolean DEFAULT false,
    birthday_gift_sent boolean DEFAULT false,
    eid_gift_sent boolean DEFAULT false,
    tier_achieved_at timestamp without time zone,
    tier_expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    permanent_card_number character varying(50),
    CONSTRAINT customer_memberships_membership_tier_check CHECK (((membership_tier)::text = ANY (ARRAY[('none'::character varying)::text, ('silver'::character varying)::text, ('gold'::character varying)::text, ('permanent'::character varying)::text])))
);


--
-- Name: TABLE customer_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_memberships IS 'Customer membership tiers: Silver (5K/month), Gold (>5K/month)';


--
-- Name: customer_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_memberships_id_seq OWNED BY public.customer_memberships.id;


--
-- Name: customer_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_metrics (
    id bigint NOT NULL,
    metric_date date NOT NULL,
    total_customers integer DEFAULT 0,
    new_customers integer DEFAULT 0,
    active_customers integer DEFAULT 0,
    inactive_customers integer DEFAULT 0,
    total_revenue numeric(15,2),
    customer_lifetime_value numeric(15,2),
    churn_rate numeric(5,2),
    retention_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_metrics_id_seq OWNED BY public.customer_metrics.id;


--
-- Name: customer_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notes (
    id bigint NOT NULL,
    customer_id integer NOT NULL,
    created_by integer NOT NULL,
    title character varying(255),
    content text NOT NULL,
    note_type character varying(50),
    is_pinned boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_notes_id_seq OWNED BY public.customer_notes.id;


--
-- Name: customer_page_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_page_visits (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    customer_id integer,
    page_url text NOT NULL,
    page_title character varying(255),
    page_category character varying(100),
    time_spent_seconds integer DEFAULT 0,
    visited_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    left_at timestamp without time zone,
    product_id integer,
    category_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE customer_page_visits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_page_visits IS 'Track which pages customer visited and time spent';


--
-- Name: customer_page_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_page_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_page_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_page_visits_id_seq OWNED BY public.customer_page_visits.id;


--
-- Name: customer_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_points (
    id integer NOT NULL,
    customer_id integer,
    customer_uuid uuid,
    active_points integer DEFAULT 0 NOT NULL,
    lifetime_earned integer DEFAULT 0 NOT NULL,
    lifetime_redeemed integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_points_id_seq OWNED BY public.customer_points.id;


--
-- Name: customer_product_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_product_reminders (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    product_id integer NOT NULL,
    last_order_id integer,
    last_order_date date NOT NULL,
    reminder_due_date date NOT NULL,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp without time zone,
    reminder_channel character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_product_reminders_reminder_channel_check CHECK (((reminder_channel)::text = ANY (ARRAY[('whatsapp'::character varying)::text, ('sms'::character varying)::text, ('call'::character varying)::text, ('email'::character varying)::text])))
);


--
-- Name: TABLE customer_product_reminders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_product_reminders IS 'Per-product repeat purchase reminders (computed from last order + consumption profile)';


--
-- Name: customer_product_reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_product_reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_product_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_product_reminders_id_seq OWNED BY public.customer_product_reminders.id;


--
-- Name: customer_product_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_product_suggestions (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    product_id integer,
    suggestion text NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_product_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_product_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_product_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_product_suggestions_id_seq OWNED BY public.customer_product_suggestions.id;


--
-- Name: customer_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_referrals (
    id integer NOT NULL,
    referrer_customer_id integer NOT NULL,
    referred_customer_id integer,
    referred_email character varying(100),
    referred_phone character varying(20),
    referral_code character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    reward_amount numeric(10,2) DEFAULT 100,
    reward_credited boolean DEFAULT false,
    first_order_placed boolean DEFAULT false,
    first_order_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    share_code_used character varying(50),
    source_channel character varying(30),
    campaign_id uuid,
    partner_id uuid,
    referred_reward_amount numeric(10,2) DEFAULT 0 NOT NULL,
    referred_reward_credited boolean DEFAULT false NOT NULL,
    agent_user_id integer,
    qualifying_order_id integer,
    CONSTRAINT customer_referrals_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('registered'::character varying)::text, ('completed'::character varying)::text, ('expired'::character varying)::text])))
);


--
-- Name: TABLE customer_referrals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_referrals IS 'Customer referral tracking: 1 referral = 100à§³, 5 referrals = Free product';


--
-- Name: customer_referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_referrals_id_seq OWNED BY public.customer_referrals.id;


--
-- Name: customer_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_reviews (
    id integer NOT NULL,
    customer_name character varying(100) NOT NULL,
    customer_email character varying(100),
    rating integer,
    review_text text,
    video_url character varying(255),
    product_id integer,
    is_featured boolean DEFAULT false,
    is_approved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: customer_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_reviews_id_seq OWNED BY public.customer_reviews.id;


--
-- Name: customer_segmentation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.customer_segmentation AS
 SELECT c.id,
    c.name AS first_name,
    c.last_name,
    c.email,
    count(o.id) AS purchase_count,
    sum(o.grand_total) AS total_value,
    max(o.created_at) AS last_purchase_date,
        CASE
            WHEN ((count(o.id) >= 10) AND (sum(o.grand_total) > (100000)::numeric)) THEN 'VIP'::text
            WHEN ((count(o.id) >= 5) AND (sum(o.grand_total) > (50000)::numeric)) THEN 'Regular'::text
            ELSE 'Prospect'::text
        END AS customer_segment
   FROM (public.customers c
     LEFT JOIN public.ecommerce_orders o ON ((c.id = o.customer_id)))
  GROUP BY c.id, c.name, c.last_name, c.email;


--
-- Name: customer_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_segments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    segment_criteria jsonb,
    color_code character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    color character varying(50) DEFAULT '#3B82F6'::character varying,
    customer_count integer DEFAULT 0,
    last_calculated_at timestamp without time zone
);


--
-- Name: customer_segments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_segments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_segments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_segments_id_seq OWNED BY public.customer_segments.id;


--
-- Name: customer_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_sessions_id_seq OWNED BY public.customer_sessions.id;


--
-- Name: customer_tag_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_tag_assignments (
    tag_id uuid NOT NULL,
    customer_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(32),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_tier_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_tier_history (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    old_tier character varying(20),
    new_tier character varying(20),
    old_status boolean,
    new_status boolean,
    changed_by_id integer,
    change_reason text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE customer_tier_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_tier_history IS 'Track all tier and status changes for audit';


--
-- Name: customer_tier_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_tier_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_tier_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_tier_history_id_seq OWNED BY public.customer_tier_history.id;


--
-- Name: customer_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_tiers_id_seq OWNED BY public.customer_tiers.id;


--
-- Name: customer_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_wallets (
    id integer NOT NULL,
    customer_id integer,
    balance numeric(10,2) DEFAULT 0,
    total_earned numeric(10,2) DEFAULT 0,
    total_spent numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_uuid uuid
);


--
-- Name: TABLE customer_wallets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_wallets IS 'Customer wallet for referral earnings';


--
-- Name: customer_wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_wallets_id_seq OWNED BY public.customer_wallets.id;


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    employee_id integer NOT NULL,
    payroll_period character varying(20),
    salary_month date NOT NULL,
    base_salary numeric(15,2),
    gross_salary numeric(15,2),
    provident_fund numeric(15,2) DEFAULT 0,
    income_tax numeric(15,2) DEFAULT 0,
    other_deductions numeric(15,2) DEFAULT 0,
    total_deductions numeric(15,2) GENERATED ALWAYS AS (((COALESCE(provident_fund, (0)::numeric) + COALESCE(income_tax, (0)::numeric)) + COALESCE(other_deductions, (0)::numeric))) STORED,
    net_salary numeric(15,2) GENERATED ALWAYS AS ((gross_salary - ((COALESCE(provident_fund, (0)::numeric) + COALESCE(income_tax, (0)::numeric)) + COALESCE(other_deductions, (0)::numeric)))) STORED,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_date date,
    notes text,
    processed_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: daily_payroll_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_payroll_summary AS
 SELECT salary_month,
    count(id) AS total_employees,
    sum(gross_salary) AS total_gross,
    sum(total_deductions) AS total_deductions,
    sum(net_salary) AS total_net_salary,
    count(DISTINCT
        CASE
            WHEN ((payment_status)::text = 'paid'::text) THEN id
            ELSE NULL::integer
        END) AS paid_count,
    count(DISTINCT
        CASE
            WHEN ((payment_status)::text = 'pending'::text) THEN id
            ELSE NULL::integer
        END) AS pending_count
   FROM public.payroll py
  GROUP BY salary_month
  ORDER BY salary_month DESC;


--
-- Name: dashboard_widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_widgets (
    id integer NOT NULL,
    user_id integer,
    widget_type character varying(50),
    widget_config jsonb,
    "position" integer,
    is_visible boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dashboard_widgets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dashboard_widgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dashboard_widgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dashboard_widgets_id_seq OWNED BY public.dashboard_widgets.id;


--
-- Name: deal_of_the_day; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_of_the_day (
    id integer NOT NULL,
    product_id integer NOT NULL,
    start_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: deal_of_the_day_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deal_of_the_day_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deal_of_the_day_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deal_of_the_day_id_seq OWNED BY public.deal_of_the_day.id;


--
-- Name: deal_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_stages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    display_order integer NOT NULL,
    probability integer DEFAULT 50,
    is_closed boolean DEFAULT false,
    is_won boolean DEFAULT false,
    color character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: deal_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deal_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deal_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deal_stages_id_seq OWNED BY public.deal_stages.id;


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    customer_id integer,
    value numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'USD'::character varying,
    probability integer DEFAULT 50,
    expected_close_date date,
    actual_close_date date,
    stage character varying(50) DEFAULT 'new'::character varying,
    owner_id integer,
    status character varying(50) DEFAULT 'open'::character varying,
    lost_reason text,
    source character varying(100),
    campaign character varying(100),
    description text,
    tags text[],
    priority character varying(20) DEFAULT 'medium'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pipeline_id integer DEFAULT 1
);


--
-- Name: deals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deals_id_seq OWNED BY public.deals.id;


--
-- Name: demand_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_forecasts (
    id integer NOT NULL,
    product_id integer NOT NULL,
    warehouse_id integer,
    forecast_period integer DEFAULT 3 NOT NULL,
    moving_average_qty integer DEFAULT 0 NOT NULL,
    historical_std_dev integer DEFAULT 0 NOT NULL,
    suggested_reorder_qty integer DEFAULT 0 NOT NULL,
    velocity character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    forecasted_date date NOT NULL,
    effective_from date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: demand_forecasts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.demand_forecasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: demand_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.demand_forecasts_id_seq OWNED BY public.demand_forecasts.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    supervisor_id integer,
    parent_department_id integer,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: dollar_consumption_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dollar_consumption_calculations (
    id integer NOT NULL,
    title character varying(160) NOT NULL,
    calculation_date date DEFAULT CURRENT_DATE NOT NULL,
    vendor_name character varying(160),
    reference_no character varying(120),
    usd_amount numeric(15,4) DEFAULT 0 NOT NULL,
    exchange_rate numeric(15,4) DEFAULT 0 NOT NULL,
    bdt_amount numeric(15,2) DEFAULT 0 NOT NULL,
    bank_charge numeric(15,2) DEFAULT 0 NOT NULL,
    vat_amount numeric(15,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    other_cost numeric(15,2) DEFAULT 0 NOT NULL,
    total_bdt numeric(15,2) DEFAULT 0 NOT NULL,
    effective_rate numeric(15,4) DEFAULT 0 NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: dollar_consumption_calculations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dollar_consumption_calculations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dollar_consumption_calculations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dollar_consumption_calculations_id_seq OWNED BY public.dollar_consumption_calculations.id;


--
-- Name: ecommerce_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ecommerce_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ecommerce_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ecommerce_orders_id_seq OWNED BY public.ecommerce_orders.id;


--
-- Name: email_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_subscribers (
    id integer NOT NULL,
    email character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    subscribed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at timestamp without time zone
);


--
-- Name: email_subscribers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_subscribers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_subscribers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_subscribers_id_seq OWNED BY public.email_subscribers.id;


--
-- Name: email_template_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template_usage (
    id integer NOT NULL,
    template_id integer,
    used_by integer,
    customer_id integer,
    email_tracking_id integer,
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: email_template_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_template_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_template_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_template_usage_id_seq OWNED BY public.email_template_usage.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100),
    subject character varying(255),
    body text,
    variables jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50),
    is_shared boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    CONSTRAINT email_templates_category_check CHECK (((category)::text = ANY (ARRAY[('welcome'::character varying)::text, ('follow_up'::character varying)::text, ('quote'::character varying)::text, ('meeting'::character varying)::text, ('newsletter'::character varying)::text, ('promotional'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: email_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_tracking (
    id integer NOT NULL,
    customer_id integer,
    sent_by integer,
    subject character varying(255) NOT NULL,
    body text NOT NULL,
    to_address character varying(255) NOT NULL,
    cc_addresses text[],
    bcc_addresses text[],
    sent_at timestamp without time zone NOT NULL,
    opened boolean DEFAULT false,
    open_count integer DEFAULT 0,
    first_opened_at timestamp without time zone,
    last_opened_at timestamp without time zone,
    clicked boolean DEFAULT false,
    clicked_links jsonb,
    replied boolean DEFAULT false,
    replied_at timestamp without time zone,
    bounced boolean DEFAULT false,
    template_used character varying(100),
    attachments jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: email_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_tracking_id_seq OWNED BY public.email_tracking.id;


--
-- Name: emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emails (
    id bigint NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    from_user_id integer,
    to_email character varying(100) NOT NULL,
    cc_emails text,
    bcc_emails text,
    subject character varying(255),
    body text,
    email_template_id integer,
    customer_id integer,
    activity_id bigint,
    status character varying(20),
    sent_at timestamp without time zone,
    opened boolean DEFAULT false,
    opened_at timestamp without time zone,
    clicked boolean DEFAULT false,
    clicked_at timestamp without time zone,
    bounce_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emails_id_seq OWNED BY public.emails.id;


--
-- Name: employee_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_benefits (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    benefit_type character varying(50),
    benefit_amount numeric(15,2),
    provider character varying(100),
    effective_date date,
    expiry_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: employee_benefits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_benefits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_benefits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_benefits_id_seq OWNED BY public.employee_benefits.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    employee_code character varying(50) NOT NULL,
    user_id integer,
    first_name character varying(50) NOT NULL,
    last_name character varying(50),
    date_of_birth date,
    gender character varying(20),
    email character varying(100),
    phone character varying(20),
    emergency_contact character varying(100),
    emergency_phone character varying(20),
    job_title character varying(100),
    department_id integer,
    manager_id integer,
    hire_date date NOT NULL,
    employment_type character varying(20),
    employment_status character varying(20) DEFAULT 'active'::character varying,
    salary_currency character varying(10) DEFAULT 'BDT'::character varying,
    base_salary numeric(15,2),
    bank_account character varying(50),
    bank_name character varying(100),
    pan_number character varying(50),
    address text,
    city character varying(50),
    country character varying(50),
    is_deleted boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    expense_number character varying(50) NOT NULL,
    expense_date date NOT NULL,
    category character varying(50),
    amount numeric(15,2) NOT NULL,
    payment_method character varying(50),
    vendor character varying(100),
    description text,
    submitted_by integer NOT NULL,
    approved_by integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    receipt_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: expiry_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_dates (
    id integer NOT NULL,
    batch_id integer,
    product_id integer,
    expiry_date date NOT NULL,
    quantity_left numeric(12,2),
    alert_sent boolean DEFAULT false,
    alert_sent_at timestamp without time zone,
    status character varying(20),
    checked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: expiry_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expiry_dates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expiry_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expiry_dates_id_seq OWNED BY public.expiry_dates.id;


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faqs (
    id integer NOT NULL,
    question character varying(500) NOT NULL,
    answer text NOT NULL,
    category character varying(100),
    rank integer,
    is_active boolean DEFAULT true,
    views_count integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: faqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;


--
-- Name: follow_ups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_ups (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    activity_id bigint,
    assigned_to integer NOT NULL,
    follow_up_date date NOT NULL,
    follow_up_type character varying(50),
    description text,
    status character varying(20),
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: follow_ups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.follow_ups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: follow_ups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.follow_ups_id_seq OWNED BY public.follow_ups.id;


--
-- Name: fraud_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fraud_checks (
    id integer NOT NULL,
    order_id integer,
    phone_number character varying(20) NOT NULL,
    provider character varying(50) DEFAULT 'hoorin'::character varying NOT NULL,
    check_type character varying(50) NOT NULL,
    response jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    risk_level character varying(20),
    cancellation_rate numeric(5,2),
    total_parcels integer,
    total_delivered integer,
    total_canceled integer,
    checked_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE fraud_checks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fraud_checks IS 'Stores fraud check results from Hoorin API for orders';


--
-- Name: COLUMN fraud_checks.provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fraud_checks.provider IS 'The fraud check provider (e.g., hoorin)';


--
-- Name: COLUMN fraud_checks.check_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fraud_checks.check_type IS 'Type of check: courier_summary or total_summary';


--
-- Name: COLUMN fraud_checks.response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fraud_checks.response IS 'Full JSON response from the API';


--
-- Name: COLUMN fraud_checks.risk_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fraud_checks.risk_level IS 'Calculated risk level: low, medium, or high';


--
-- Name: COLUMN fraud_checks.cancellation_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fraud_checks.cancellation_rate IS 'Percentage of canceled orders';


--
-- Name: fraud_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fraud_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fraud_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fraud_checks_id_seq OWNED BY public.fraud_checks.id;


--
-- Name: goods_received_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_received_notes (
    id integer NOT NULL,
    grn_number character varying(50) NOT NULL,
    purchase_order_id integer,
    supplier_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    received_by integer NOT NULL,
    received_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    invoice_number character varying(50),
    invoice_date date,
    delivery_note_number character varying(50),
    vehicle_number character varying(30),
    driver_name character varying(100),
    notes text,
    quality_check_required boolean DEFAULT true,
    quality_checked_by integer,
    quality_checked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: goods_received_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_received_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_received_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_received_notes_id_seq OWNED BY public.goods_received_notes.id;


--
-- Name: grn_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grn_items (
    id integer NOT NULL,
    grn_id integer NOT NULL,
    po_item_id integer,
    product_id integer NOT NULL,
    variant_key character varying(100),
    quantity_expected integer,
    quantity_received integer NOT NULL,
    quantity_accepted integer DEFAULT 0,
    quantity_rejected integer DEFAULT 0,
    rejection_reason character varying(255),
    batch_number character varying(50),
    lot_number character varying(50),
    manufacturing_date date,
    expiry_date date,
    unit_cost numeric(10,2) NOT NULL,
    location_id integer,
    quality_status character varying(20) DEFAULT 'pending'::character varying,
    quality_notes text,
    temperature_on_arrival numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: grn_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grn_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grn_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grn_items_id_seq OWNED BY public.grn_items.id;


--
-- Name: grocery_list_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grocery_list_items (
    id integer NOT NULL,
    list_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1,
    last_purchase_price numeric(10,2),
    locked_price numeric(10,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE grocery_list_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.grocery_list_items IS 'Items in customer grocery lists';


--
-- Name: grocery_list_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grocery_list_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grocery_list_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grocery_list_items_id_seq OWNED BY public.grocery_list_items.id;


--
-- Name: hot_deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hot_deals (
    id integer NOT NULL,
    product_id integer NOT NULL,
    special_price numeric(10,2),
    discount_percent integer,
    display_order integer DEFAULT 0,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hot_deals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hot_deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hot_deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hot_deals_id_seq OWNED BY public.hot_deals.id;


--
-- Name: hr_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    announcement_date date,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_announcements_id_seq OWNED BY public.hr_announcements.id;


--
-- Name: hr_award_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_award_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_award_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_award_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_award_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_award_types_id_seq OWNED BY public.hr_award_types.id;


--
-- Name: hr_awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_awards (
    id integer NOT NULL,
    award_type_id integer,
    employee_id integer,
    title character varying(255) NOT NULL,
    description text,
    date_awarded date,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_awards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_awards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_awards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_awards_id_seq OWNED BY public.hr_awards.id;


--
-- Name: hr_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_branches (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    phone character varying(50),
    email character varying(255),
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_branches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_branches_id_seq OWNED BY public.hr_branches.id;


--
-- Name: hr_complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_complaints (
    id integer NOT NULL,
    employee_id integer,
    complaint_type character varying(100),
    complaint_date date,
    subject character varying(255),
    description text,
    status character varying(50) DEFAULT 'Open'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_complaints_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_complaints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_complaints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_complaints_id_seq OWNED BY public.hr_complaints.id;


--
-- Name: hr_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_departments (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    branch_id integer,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_departments_id_seq OWNED BY public.hr_departments.id;


--
-- Name: hr_designations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_designations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    department_id integer,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_designations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_designations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_designations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_designations_id_seq OWNED BY public.hr_designations.id;


--
-- Name: hr_document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_document_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_document_types_id_seq OWNED BY public.hr_document_types.id;


--
-- Name: hr_employee_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_documents (
    id integer NOT NULL,
    employee_id integer,
    document_type_id integer,
    document_url text,
    issue_date date,
    expiry_date date,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_employee_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_documents_id_seq OWNED BY public.hr_employee_documents.id;


--
-- Name: hr_employee_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_performance (
    id integer NOT NULL,
    employee_id integer,
    indicator_id integer,
    score integer,
    review_date date,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_employee_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_performance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_performance_id_seq OWNED BY public.hr_employee_performance.id;


--
-- Name: hr_employee_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_trainings (
    id integer NOT NULL,
    employee_id integer,
    training_session_id integer,
    completion_status character varying(50) DEFAULT 'Pending'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_employee_trainings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_trainings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_trainings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_trainings_id_seq OWNED BY public.hr_employee_trainings.id;


--
-- Name: hr_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employees (
    id integer NOT NULL,
    employee_code character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    email character varying(255) NOT NULL,
    phone character varying(50),
    branch_id integer,
    department_id integer,
    designation_id integer,
    date_of_joining date,
    date_of_birth date,
    gender character varying(20),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employees_id_seq OWNED BY public.hr_employees.id;


--
-- Name: hr_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_holidays (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    holiday_date date NOT NULL,
    description text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_holidays_id_seq OWNED BY public.hr_holidays.id;


--
-- Name: hr_performance_indicator_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_performance_indicator_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_performance_indicator_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_performance_indicator_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_performance_indicator_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_performance_indicator_categories_id_seq OWNED BY public.hr_performance_indicator_categories.id;


--
-- Name: hr_performance_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_performance_indicators (
    id integer NOT NULL,
    category_id integer,
    name character varying(255) NOT NULL,
    description text,
    max_score integer DEFAULT 10,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_performance_indicators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_performance_indicators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_performance_indicators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_performance_indicators_id_seq OWNED BY public.hr_performance_indicators.id;


--
-- Name: hr_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_promotions (
    id integer NOT NULL,
    employee_id integer,
    old_designation_id integer,
    new_designation_id integer,
    promotion_date date,
    remarks text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_promotions_id_seq OWNED BY public.hr_promotions.id;


--
-- Name: hr_resignations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_resignations (
    id integer NOT NULL,
    employee_id integer,
    resignation_date date NOT NULL,
    notice_date date,
    reason text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_resignations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_resignations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_resignations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_resignations_id_seq OWNED BY public.hr_resignations.id;


--
-- Name: hr_terminations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_terminations (
    id integer NOT NULL,
    employee_id integer,
    termination_date date NOT NULL,
    reason text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_terminations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_terminations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_terminations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_terminations_id_seq OWNED BY public.hr_terminations.id;


--
-- Name: hr_training_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_training_programs (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    training_type_id integer,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_training_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_training_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_training_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_training_programs_id_seq OWNED BY public.hr_training_programs.id;


--
-- Name: hr_training_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_training_sessions (
    id integer NOT NULL,
    training_program_id integer,
    session_title character varying(255) NOT NULL,
    session_date date,
    duration integer,
    trainer character varying(255),
    location character varying(255),
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_training_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_training_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_training_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_training_sessions_id_seq OWNED BY public.hr_training_sessions.id;


--
-- Name: hr_training_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_training_types (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_training_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_training_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_training_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_training_types_id_seq OWNED BY public.hr_training_types.id;


--
-- Name: hr_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_transfers (
    id integer NOT NULL,
    employee_id integer,
    from_branch_id integer,
    to_branch_id integer,
    transfer_date date,
    reason text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_transfers_id_seq OWNED BY public.hr_transfers.id;


--
-- Name: hr_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_trips (
    id integer NOT NULL,
    employee_id integer,
    trip_type character varying(100),
    destination character varying(255),
    start_date date,
    end_date date,
    purpose text,
    status character varying(50) DEFAULT 'Planned'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_trips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_trips_id_seq OWNED BY public.hr_trips.id;


--
-- Name: hr_warnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_warnings (
    id integer NOT NULL,
    employee_id integer,
    warning_type character varying(100),
    warning_date date,
    subject character varying(255),
    description text,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_warnings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_warnings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_warnings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_warnings_id_seq OWNED BY public.hr_warnings.id;


--
-- Name: incomplete_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incomplete_orders (
    id integer NOT NULL,
    customer_id integer,
    session_id character varying(255),
    email character varying(255),
    phone character varying(20),
    name character varying(255),
    cart_data jsonb,
    total_amount numeric(10,2),
    abandoned_stage character varying(50),
    recovery_email_sent boolean DEFAULT false,
    recovery_sms_sent boolean DEFAULT false,
    recovered boolean DEFAULT false,
    recovered_order_id integer,
    recovery_discount_code character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(50),
    landing_page_id integer,
    landing_page_slug character varying(255),
    landing_page_title character varying(500),
    address text,
    note text,
    delivery_zone character varying(20),
    delivery_charge numeric(10,2),
    referrer_url text,
    user_agent text,
    converted_to_order boolean DEFAULT false,
    contacted_done boolean DEFAULT false,
    assigned_to integer,
    assigned_by integer,
    assigned_at timestamp without time zone,
    telephony_called_at timestamp without time zone,
    telephony_call_status character varying(30),
    telephony_outcome character varying(50),
    telephony_suggestion character varying(100),
    telephony_notes text
);


--
-- Name: TABLE incomplete_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.incomplete_orders IS 'Track incomplete orders for recovery campaigns';


--
-- Name: incomplete_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incomplete_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incomplete_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incomplete_orders_id_seq OWNED BY public.incomplete_orders.id;


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    service_type character varying(50),
    api_key character varying(255),
    api_secret character varying(255),
    webhook_url text,
    is_active boolean DEFAULT false,
    configuration jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integrations_id_seq OWNED BY public.integrations.id;


--
-- Name: interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactions (
    id bigint NOT NULL,
    customer_id integer NOT NULL,
    created_by integer NOT NULL,
    interaction_type character varying(50),
    channel character varying(50),
    subject character varying(255),
    message text,
    sentiment character varying(20),
    response_required boolean DEFAULT false,
    response_due_date date,
    response_provided boolean DEFAULT false,
    response_content text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interactions_id_seq OWNED BY public.interactions.id;


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interviews (
    id integer NOT NULL,
    application_id integer,
    interview_type character varying(20) DEFAULT 'offline'::character varying,
    scheduled_date timestamp without time zone NOT NULL,
    scheduled_time character varying(10),
    duration_minutes integer DEFAULT 60,
    meeting_link character varying(300),
    meeting_address character varying(300),
    interview_notes text,
    interviewer_id integer,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    feedback text,
    technical_rating integer,
    communication_rating integer,
    cultural_fit_rating integer,
    overall_rating integer,
    recommend_for_hiring boolean DEFAULT false,
    scheduled_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: interviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interviews_id_seq OWNED BY public.interviews.id;


--
-- Name: product_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_inventory (
    id integer NOT NULL,
    product_id integer NOT NULL,
    warehouse_id integer,
    quantity_on_hand numeric(12,2) DEFAULT 0 NOT NULL,
    quantity_reserved numeric(12,2) DEFAULT 0,
    quantity_available numeric(12,2) GENERATED ALWAYS AS ((quantity_on_hand - quantity_reserved)) STORED,
    reorder_level numeric(12,2),
    reorder_quantity numeric(12,2),
    last_stock_check timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_alerts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.inventory_alerts AS
 SELECT p.id,
    p.sku,
    p.name_en,
    pi.quantity_on_hand,
    pi.reorder_level,
        CASE
            WHEN (pi.quantity_on_hand <= (0)::numeric) THEN 'OUT_OF_STOCK'::text
            WHEN (pi.quantity_on_hand <= pi.reorder_level) THEN 'LOW_STOCK'::text
            ELSE 'OK'::text
        END AS stock_status
   FROM (public.products p
     JOIN public.product_inventory pi ON ((p.id = pi.product_id)))
  WHERE ((pi.quantity_on_hand <= COALESCE(pi.reorder_level, (0)::numeric)) OR (pi.quantity_on_hand <= (0)::numeric));


--
-- Name: inventory_count_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_count_items (
    id integer NOT NULL,
    count_id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    location_id integer,
    batch_id integer,
    system_quantity integer NOT NULL,
    counted_quantity integer,
    variance integer GENERATED ALWAYS AS ((counted_quantity - system_quantity)) STORED,
    variance_value numeric(12,2),
    variance_reason character varying(255),
    counted_by integer,
    counted_at timestamp without time zone,
    verified_by integer,
    verified_quantity integer,
    status character varying(20) DEFAULT 'pending'::character varying
);


--
-- Name: inventory_count_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_count_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_count_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_count_items_id_seq OWNED BY public.inventory_count_items.id;


--
-- Name: inventory_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_counts (
    id integer NOT NULL,
    count_number character varying(50) NOT NULL,
    warehouse_id integer NOT NULL,
    count_type character varying(20) NOT NULL,
    scope_zone_id integer,
    scope_category_id integer,
    status character varying(20) DEFAULT 'planned'::character varying,
    started_by integer,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    approved_by integer,
    approved_at timestamp without time zone,
    total_items_counted integer DEFAULT 0,
    total_variances integer DEFAULT 0,
    total_variance_value numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_counts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_counts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_counts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_counts_id_seq OWNED BY public.inventory_counts.id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id bigint NOT NULL,
    product_id integer NOT NULL,
    movement_type character varying(20),
    quantity numeric(12,2) NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    reason character varying(255),
    recorded_by integer,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_movements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_movements_id_seq OWNED BY public.inventory_movements.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    invoice_number character varying(50) NOT NULL,
    customer_id integer NOT NULL,
    order_id integer,
    invoice_date date NOT NULL,
    due_date date,
    subtotal numeric(15,2),
    tax_amount numeric(15,2),
    discount_amount numeric(15,2),
    shipping_amount numeric(15,2),
    grand_total numeric(15,2),
    paid_amount numeric(15,2) DEFAULT 0,
    balance_due numeric(15,2),
    notes text,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: invoice_aging; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.invoice_aging AS
 SELECT inv.id,
    inv.invoice_number,
    (((c.name)::text || ' '::text) || (c.last_name)::text) AS customer_name,
    inv.invoice_date,
    inv.due_date,
    inv.grand_total,
    inv.paid_amount,
    inv.balance_due,
    (CURRENT_DATE - inv.due_date) AS days_overdue,
        CASE
            WHEN ((inv.status)::text = 'paid'::text) THEN 'Paid'::text
            WHEN (CURRENT_DATE <= inv.due_date) THEN 'Current'::text
            WHEN (((CURRENT_DATE - inv.due_date) >= 1) AND ((CURRENT_DATE - inv.due_date) <= 30)) THEN '30+ Days'::text
            WHEN (((CURRENT_DATE - inv.due_date) >= 31) AND ((CURRENT_DATE - inv.due_date) <= 60)) THEN '60+ Days'::text
            ELSE '90+ Days'::text
        END AS aging_bucket
   FROM (public.invoices inv
     JOIN public.customers c ON ((inv.customer_id = c.id)))
  WHERE ((inv.status)::text <> 'paid'::text)
  ORDER BY inv.due_date;


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_applications (
    id integer NOT NULL,
    job_post_id integer,
    applicant_id integer,
    full_name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    current_company character varying(200),
    current_position character varying(100),
    years_of_experience integer DEFAULT 0,
    expected_salary numeric(10,2),
    resume_url character varying(300),
    cover_letter_url character varying(300),
    cover_letter_text text,
    linkedin_url character varying(300),
    portfolio_url character varying(300),
    skills text[],
    status character varying(30) DEFAULT 'applied'::character varying,
    tag character varying(20),
    recruiter_notes text,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: job_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_applications_id_seq OWNED BY public.job_applications.id;


--
-- Name: job_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_posts (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    slug character varying(250) NOT NULL,
    description text NOT NULL,
    requirements text NOT NULL,
    responsibilities text,
    category character varying(100) NOT NULL,
    department character varying(100) NOT NULL,
    location character varying(100) NOT NULL,
    job_type character varying(20) DEFAULT 'full-time'::character varying,
    experience_level character varying(20) DEFAULT 'mid'::character varying,
    min_salary integer,
    max_salary integer,
    currency character varying(20) DEFAULT 'BDT'::character varying,
    vacancies integer DEFAULT 1,
    deadline date,
    status character varying(20) DEFAULT 'draft'::character varying,
    required_skills text[],
    benefits text[],
    posted_by integer,
    views_count integer DEFAULT 0,
    applications_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: job_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_posts_id_seq OWNED BY public.job_posts.id;


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    entry_number character varying(50) NOT NULL,
    entry_date date NOT NULL,
    description text,
    reference_type character varying(50),
    reference_id integer,
    created_by integer NOT NULL,
    approved_by integer,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entries_id_seq OWNED BY public.journal_entries.id;


--
-- Name: journal_entry_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_details (
    id integer NOT NULL,
    journal_entry_id integer NOT NULL,
    account_id integer NOT NULL,
    debit_amount numeric(15,2),
    credit_amount numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: journal_entry_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entry_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entry_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entry_details_id_seq OWNED BY public.journal_entry_details.id;


--
-- Name: knowledgebase_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledgebase_articles (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    title character varying(255) NOT NULL,
    slug character varying(255),
    content text NOT NULL,
    category character varying(100),
    tags text[],
    author_id integer,
    is_published boolean DEFAULT false,
    views_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    not_helpful_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: knowledgebase_articles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knowledgebase_articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledgebase_articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledgebase_articles_id_seq OWNED BY public.knowledgebase_articles.id;


--
-- Name: landing_page_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_page_orders (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    landing_page_id integer NOT NULL,
    landing_page_title character varying(255),
    landing_page_slug character varying(255),
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(20) NOT NULL,
    customer_address text NOT NULL,
    district character varying(100) DEFAULT 'Dhaka'::character varying,
    note text,
    items jsonb DEFAULT '[]'::jsonb,
    total_amount numeric(10,2) DEFAULT 0,
    payment_method character varying(50) DEFAULT 'cod'::character varying,
    status public.landing_page_order_status DEFAULT 'pending'::public.landing_page_order_status,
    admin_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: landing_page_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.landing_page_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: landing_page_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.landing_page_orders_id_seq OWNED BY public.landing_page_orders.id;


--
-- Name: landing_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_pages (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    hero_image_url character varying(500),
    hero_title character varying(255),
    hero_subtitle text,
    hero_button_text character varying(100),
    primary_color character varying(50) DEFAULT '#FF6B35'::character varying,
    secondary_color character varying(50) DEFAULT '#FFFFFF'::character varying,
    background_color character varying(50) DEFAULT '#1a1a2e'::character varying,
    meta_title character varying(500),
    meta_description text,
    og_image_url character varying(500),
    sections jsonb DEFAULT '[]'::jsonb,
    products jsonb DEFAULT '[]'::jsonb,
    phone_number character varying(20),
    whatsapp_number character varying(255),
    show_order_form boolean DEFAULT true,
    cash_on_delivery boolean DEFAULT true,
    free_delivery boolean DEFAULT false,
    delivery_note text,
    is_active boolean DEFAULT true,
    view_count integer DEFAULT 0,
    order_count integer DEFAULT 0,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    delivery_charge numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_charge_outside numeric(10,2) DEFAULT 0,
    template character varying(50) DEFAULT 'classic'::character varying NOT NULL,
    cross_sell_product jsonb,
    hero_layout character varying(20) DEFAULT 'image-first'::character varying,
    show_hero_price boolean DEFAULT true,
    hero_subtitle_position character varying(20) DEFAULT 'above-image'::character varying,
    floating_whatsapp_color character varying(50) DEFAULT '#25D366'::character varying,
    floating_phone_color character varying(50) DEFAULT '#FF6B35'::character varying,
    btn_bg_color character varying(50) DEFAULT '#2d6a4f'::character varying NOT NULL,
    btn_text_color character varying(50) DEFAULT '#ffffff'::character varying NOT NULL,
    btn_border_color character varying(50) DEFAULT 'transparent'::character varying NOT NULL,
    btn_border_radius integer DEFAULT 16 NOT NULL,
    hero_background_image_url character varying(500),
    order_form_bg_color character varying(50) DEFAULT '#ffffff'::character varying NOT NULL,
    order_form_card_bg_color character varying(50) DEFAULT '#ffffff'::character varying NOT NULL,
    order_form_title_color character varying(50) DEFAULT '#1f2937'::character varying NOT NULL,
    order_form_text_color character varying(50) DEFAULT '#374151'::character varying NOT NULL,
    order_form_accent_color character varying(50) DEFAULT '#2d6a4f'::character varying NOT NULL,
    order_form_border_color character varying(50) DEFAULT '#e5e7eb'::character varying NOT NULL,
    footer_bg_color character varying(50) DEFAULT '#111827'::character varying NOT NULL,
    footer_text_color character varying(50) DEFAULT '#ffffff'::character varying NOT NULL,
    footer_link_bg_color character varying(50) DEFAULT '#f59e0b'::character varying NOT NULL,
    footer_link_text_color character varying(50) DEFAULT '#111827'::character varying NOT NULL,
    footer_border_color character varying(50) DEFAULT '#1f2937'::character varying NOT NULL,
    order_form_button_bg_color character varying(50) DEFAULT '#16a34a'::character varying NOT NULL,
    order_form_button_text_color character varying(50) DEFAULT '#ffffff'::character varying NOT NULL,
    order_form_button_border_color character varying(50) DEFAULT 'transparent'::character varying NOT NULL,
    order_form_button_border_radius integer DEFAULT 16 NOT NULL,
    footer_link_border_color character varying(50) DEFAULT 'transparent'::character varying NOT NULL,
    footer_link_border_radius integer DEFAULT 999 NOT NULL,
    hero_video_url character varying(500)
);


--
-- Name: COLUMN landing_pages.hero_video_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.landing_pages.hero_video_url IS 'YouTube/direct video URL used when hero_layout is video-first';


--
-- Name: landing_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.landing_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: landing_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.landing_pages_id_seq OWNED BY public.landing_pages.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    employee_id integer NOT NULL,
    leave_type character varying(50),
    from_date date NOT NULL,
    to_date date NOT NULL,
    total_days integer,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by integer,
    approval_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id integer NOT NULL,
    leave_type_name character varying(50) NOT NULL,
    description text,
    annual_quota integer,
    is_paid boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: leave_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_types_id_seq OWNED BY public.leave_types.id;


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    logout_time timestamp without time zone,
    ip_address character varying(45),
    user_agent text,
    login_status character varying(20) DEFAULT 'success'::character varying
);


--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id integer NOT NULL,
    campaign_name character varying(255) NOT NULL,
    campaign_type character varying(50),
    channel character varying(50),
    target_segment character varying(100),
    message_template text,
    trigger_condition jsonb,
    is_active boolean DEFAULT true,
    send_time time without time zone,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT marketing_campaigns_campaign_type_check CHECK (((campaign_type)::text = ANY (ARRAY[('upsell'::character varying)::text, ('reactivation'::character varying)::text, ('retention'::character varying)::text, ('promotion'::character varying)::text, ('feedback'::character varying)::text]))),
    CONSTRAINT marketing_campaigns_channel_check CHECK (((channel)::text = ANY (ARRAY[('sms'::character varying)::text, ('whatsapp'::character varying)::text, ('email'::character varying)::text, ('all'::character varying)::text])))
);


--
-- Name: TABLE marketing_campaigns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marketing_campaigns IS 'Behavior-based automated marketing campaigns';


--
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_campaigns_id_seq OWNED BY public.marketing_campaigns.id;


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    customer_id integer,
    deal_id integer,
    organizer_id integer,
    attendees integer[],
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    timezone character varying(50) NOT NULL,
    location character varying(255),
    meeting_link character varying(500),
    agenda text,
    preparation_notes text,
    meeting_notes text,
    action_items jsonb,
    next_steps text,
    outcome_rating integer,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    recording_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT meetings_outcome_rating_check CHECK (((outcome_rating >= 1) AND (outcome_rating <= 5)))
);


--
-- Name: meetings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meetings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meetings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meetings_id_seq OWNED BY public.meetings.id;


--
-- Name: monthly_grocery_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_grocery_lists (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    list_name character varying(255) DEFAULT 'Monthly Grocery'::character varying,
    is_active boolean DEFAULT true,
    is_subscription boolean DEFAULT false,
    subscription_day integer,
    next_order_date date,
    auto_reorder boolean DEFAULT false,
    total_orders_placed integer DEFAULT 0,
    last_ordered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT monthly_grocery_lists_subscription_day_check CHECK (((subscription_day >= 1) AND (subscription_day <= 31)))
);


--
-- Name: TABLE monthly_grocery_lists; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.monthly_grocery_lists IS 'Customer monthly grocery habit lists';


--
-- Name: price_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_locks (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    product_id integer NOT NULL,
    locked_price numeric(10,2) NOT NULL,
    current_price numeric(10,2),
    savings numeric(10,2) GENERATED ALWAYS AS ((current_price - locked_price)) STORED,
    locked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE price_locks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.price_locks IS 'Gold member price protection (old price even after hike)';


--
-- Name: member_benefits_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.member_benefits_summary AS
 SELECT cm.customer_id,
    cm.membership_tier,
    cm.discount_percentage,
    cm.current_month_spend,
    cm.total_monthly_spend,
    cw.balance AS wallet_balance,
    cw.total_earned AS wallet_earned,
    count(DISTINCT cr.id) AS total_referrals,
    count(DISTINCT cr.id) FILTER (WHERE ((cr.status)::text = 'completed'::text)) AS completed_referrals,
    count(DISTINCT mgl.id) FILTER (WHERE (mgl.is_subscription = true)) AS active_subscriptions,
    count(DISTINCT pl.id) FILTER (WHERE (pl.is_active = true)) AS active_price_locks,
    COALESCE(sum(pl.savings), (0)::numeric) AS total_price_lock_savings,
    count(DISTINCT cg.id) FILTER (WHERE ((cg.status)::text = 'sent'::text)) AS gifts_received,
    cm.tier_achieved_at,
    cm.created_at
   FROM (((((public.customer_memberships cm
     LEFT JOIN public.customer_wallets cw ON ((cm.customer_id = cw.customer_id)))
     LEFT JOIN public.customer_referrals cr ON ((cm.customer_id = cr.referrer_customer_id)))
     LEFT JOIN public.monthly_grocery_lists mgl ON (((cm.customer_id = mgl.customer_id) AND (mgl.is_active = true))))
     LEFT JOIN public.price_locks pl ON ((cm.customer_id = pl.customer_id)))
     LEFT JOIN public.customer_gifts cg ON ((cm.customer_id = cg.customer_id)))
  GROUP BY cm.customer_id, cm.membership_tier, cm.discount_percentage, cm.current_month_spend, cm.total_monthly_spend, cm.tier_achieved_at, cm.created_at, cw.balance, cw.total_earned;


--
-- Name: VIEW member_benefits_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.member_benefits_summary IS 'Complete benefits overview per member';


--
-- Name: meta_capi_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meta_capi_events (
    id integer NOT NULL,
    order_id integer NOT NULL,
    event_name character varying(80) NOT NULL,
    status_trigger character varying(80) NOT NULL,
    event_id character varying(120) NOT NULL,
    pixel_id character varying(120),
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    error_message text,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE meta_capi_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.meta_capi_events IS 'Idempotent audit log for Meta Conversions API events emitted from ERP order lifecycle changes.';


--
-- Name: meta_capi_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meta_capi_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meta_capi_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meta_capi_events_id_seq OWNED BY public.meta_capi_events.id;


--
-- Name: monthly_grocery_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monthly_grocery_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monthly_grocery_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monthly_grocery_lists_id_seq OWNED BY public.monthly_grocery_lists.id;


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    push_notifications boolean DEFAULT true,
    daily_digest boolean DEFAULT false,
    notification_schedule jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- Name: offer_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_categories (
    id integer NOT NULL,
    offer_id integer,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: offer_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offer_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offer_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offer_categories_id_seq OWNED BY public.offer_categories.id;


--
-- Name: offer_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_codes (
    id integer NOT NULL,
    offer_id integer,
    code character varying(50) NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_customer_id integer,
    max_uses_per_customer integer,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone
);


--
-- Name: offer_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offer_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offer_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offer_codes_id_seq OWNED BY public.offer_codes.id;


--
-- Name: offer_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_conditions (
    id integer NOT NULL,
    offer_id integer,
    condition_type public.condition_type_enum NOT NULL,
    operator character varying(10) NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE offer_conditions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.offer_conditions IS 'Rules that must be satisfied for offer to apply';


--
-- Name: offer_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offer_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offer_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offer_conditions_id_seq OWNED BY public.offer_conditions.id;


--
-- Name: offer_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_products (
    id integer NOT NULL,
    offer_id integer,
    product_id integer NOT NULL,
    is_required boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: offer_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offer_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offer_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offer_products_id_seq OWNED BY public.offer_products.id;


--
-- Name: offer_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_rewards (
    id integer NOT NULL,
    offer_id integer,
    reward_type public.reward_type_enum NOT NULL,
    value jsonb NOT NULL,
    max_free_qty integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE offer_rewards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.offer_rewards IS 'Benefits customer receives when offer applies';


--
-- Name: offer_rewards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offer_rewards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offer_rewards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offer_rewards_id_seq OWNED BY public.offer_rewards.id;


--
-- Name: offer_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_usage (
    id integer NOT NULL,
    offer_id integer,
    customer_id integer,
    order_id integer,
    discount_amount numeric(15,2),
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE offer_usage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.offer_usage IS 'Track how many times each offer has been used';


--
-- Name: offer_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offer_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offer_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offer_usage_id_seq OWNED BY public.offer_usage.id;


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    offer_type public.offer_type_enum NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    priority integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying,
    auto_apply boolean DEFAULT false,
    max_usage_total integer,
    current_usage integer DEFAULT 0,
    max_usage_per_user integer DEFAULT 1,
    min_cart_amount numeric(15,2),
    max_discount_amount numeric(15,2),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE offers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.offers IS 'Main offer/promotion configuration';


--
-- Name: offers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.offers_id_seq OWNED BY public.offers.id;


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    opportunity_name character varying(255) NOT NULL,
    customer_id integer,
    description text,
    expected_value numeric(15,2),
    probability_percentage integer,
    expected_closing_date date,
    stage character varying(50),
    source character varying(50),
    assigned_to integer NOT NULL,
    owner_supervisor integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opportunities_id_seq OWNED BY public.opportunities.id;


--
-- Name: order_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_activity_logs (
    id integer NOT NULL,
    order_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    action_description text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    performed_by integer,
    performed_by_name character varying(255),
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: order_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_activity_logs_id_seq OWNED BY public.order_activity_logs.id;


--
-- Name: order_guard_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_guard_settings (
    id integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    window_minutes integer DEFAULT 10 NOT NULL,
    block_note_html text DEFAULT '<p><strong>We already received an order from this connection.</strong></p><p>Please wait a few minutes before placing another order. Our team will contact you soon.</p>'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_guard_settings_singleton CHECK ((id = 1)),
    CONSTRAINT order_guard_settings_window_positive CHECK ((window_minutes > 0))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer,
    product_name character varying(255) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer,
    variant_name character varying(255) DEFAULT NULL::character varying,
    custom_product_name character varying(500) DEFAULT NULL::character varying,
    is_cross_sell boolean DEFAULT false NOT NULL,
    added_by integer,
    is_upsell boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN order_items.custom_product_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.custom_product_name IS 'Optional override for product display name. Used in invoices, stickers, courier. Does NOT modify actual product.';


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id bigint NOT NULL,
    ecommerce_order_id integer NOT NULL,
    old_status public.order_status_enum,
    new_status public.order_status_enum NOT NULL,
    changed_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: order_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_status_history_id_seq OWNED BY public.order_status_history.id;


--
-- Name: packaging_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packaging_configs (
    id integer NOT NULL,
    source_product_id integer NOT NULL,
    source_variant_key character varying(255),
    source_qty numeric(10,3) DEFAULT 1 NOT NULL,
    output_product_id integer NOT NULL,
    output_variant_key character varying(255),
    output_qty integer NOT NULL,
    waste_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    description character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: packaging_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.packaging_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: packaging_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.packaging_configs_id_seq OWNED BY public.packaging_configs.id;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    method_type character varying(50),
    is_active boolean DEFAULT true,
    api_key character varying(255),
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id integer NOT NULL,
    order_id integer NOT NULL,
    transaction_id character varying(255) NOT NULL,
    gateway character varying(50) DEFAULT 'sslcommerz'::character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(10) DEFAULT 'BDT'::character varying NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    bank_tran_id character varying(255),
    card_type character varying(100),
    card_no character varying(100),
    card_issuer character varying(255),
    card_brand character varying(50),
    card_issuer_country character varying(100),
    store_amount numeric(12,2),
    val_id character varying(255),
    validated_at timestamp without time zone,
    validation_status character varying(50),
    error_message text,
    gateway_response jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_transactions_id_seq OWNED BY public.payment_transactions.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    ecommerce_order_id integer NOT NULL,
    sales_order_id integer,
    payment_method_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum,
    transaction_id character varying(100),
    reference_number character varying(100),
    payment_date timestamp without time zone,
    gateway_response jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: payroll_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payroll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payroll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payroll_id_seq OWNED BY public.payroll.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    ticket_number character varying(50) NOT NULL,
    customer_id integer NOT NULL,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(50),
    subcategory character varying(50),
    priority public.ticket_priority_enum DEFAULT 'medium'::public.ticket_priority_enum,
    status public.ticket_status_enum DEFAULT 'open'::public.ticket_status_enum,
    assigned_to integer,
    assigned_supervisor integer,
    resolution character varying(2000),
    resolution_time timestamp without time zone,
    sla_response_due timestamp without time zone,
    sla_resolution_due timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    closed_at timestamp without time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    phone character varying(20),
    password_hash character varying(255) NOT NULL,
    role_id integer NOT NULL,
    department_id integer,
    status public.user_status_enum DEFAULT 'active'::public.user_status_enum,
    avatar_url text,
    two_factor_enabled boolean DEFAULT false,
    last_login timestamp without time zone,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    primary_role_id integer,
    is_active boolean DEFAULT true,
    team_leader_id integer,
    team_id integer,
    bkash_number character varying(20) DEFAULT NULL::character varying,
    nagad_number character varying(20) DEFAULT NULL::character varying,
    rocket_number character varying(20) DEFAULT NULL::character varying,
    payment_method character varying(50) DEFAULT NULL::character varying,
    bank_name character varying(100) DEFAULT NULL::character varying,
    bank_account_holder character varying(100) DEFAULT NULL::character varying,
    bank_account_number character varying(50) DEFAULT NULL::character varying,
    bank_branch_name character varying(100) DEFAULT NULL::character varying,
    agent_tier character varying(20) DEFAULT 'silver'::character varying
);


--
-- Name: pending_tickets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pending_tickets AS
 SELECT t.id,
    t.uuid,
    t.ticket_number,
    t.customer_id,
    t.subject,
    t.description,
    t.category,
    t.subcategory,
    t.priority,
    t.status,
    t.assigned_to,
    t.assigned_supervisor,
    t.resolution,
    t.resolution_time,
    t.sla_response_due,
    t.sla_resolution_due,
    t.created_at,
    t.updated_at,
    t.closed_at,
    c.name AS customer_name,
    u.name AS assigned_user_name,
    date_part('day'::text, (CURRENT_TIMESTAMP - (t.created_at)::timestamp with time zone)) AS days_open
   FROM ((public.tickets t
     JOIN public.customers c ON ((t.customer_id = c.id)))
     LEFT JOIN public.users u ON ((t.assigned_to = u.id)))
  WHERE (t.status = ANY (ARRAY['open'::public.ticket_status_enum, 'in_progress'::public.ticket_status_enum, 'waiting_customer'::public.ticket_status_enum]))
  ORDER BY t.priority DESC, t.created_at;


--
-- Name: performance_appraisals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_appraisals (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    employee_id integer NOT NULL,
    appraisal_period character varying(20),
    rating integer,
    reviewer_id integer NOT NULL,
    goals text,
    achievements text,
    areas_for_improvement text,
    overall_comments text,
    status character varying(20) DEFAULT 'draft'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: performance_appraisals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.performance_appraisals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: performance_appraisals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.performance_appraisals_id_seq OWNED BY public.performance_appraisals.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: point_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_transactions (
    id integer NOT NULL,
    customer_id integer,
    customer_uuid uuid,
    idempotency_key character varying(100),
    transaction_type character varying(20) NOT NULL,
    points integer NOT NULL,
    source character varying(50) NOT NULL,
    reference_id integer,
    description text,
    balance_after integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT point_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY (ARRAY[('earn'::character varying)::text, ('redeem'::character varying)::text, ('adjust'::character varying)::text])))
);


--
-- Name: point_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.point_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: point_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.point_transactions_id_seq OWNED BY public.point_transactions.id;


--
-- Name: presence_calendar_override_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presence_calendar_override_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date_key character varying(10) NOT NULL,
    action character varying(20) NOT NULL,
    previous_attendance_key character varying(10),
    previous_attendance_label character varying(100),
    previous_note text,
    new_attendance_key character varying(10),
    new_attendance_label character varying(100),
    new_note text,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: presence_calendar_override_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presence_calendar_override_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presence_calendar_override_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presence_calendar_override_history_id_seq OWNED BY public.presence_calendar_override_history.id;


--
-- Name: presence_calendar_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presence_calendar_overrides (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date_key character varying(10) NOT NULL,
    attendance_key character varying(10) NOT NULL,
    attendance_label character varying(100),
    note text,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: presence_calendar_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presence_calendar_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presence_calendar_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presence_calendar_overrides_id_seq OWNED BY public.presence_calendar_overrides.id;


--
-- Name: presence_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presence_settings (
    id integer NOT NULL,
    office_start_time character varying(5) DEFAULT '09:00'::character varying NOT NULL,
    office_end_time character varying(5) DEFAULT '18:00'::character varying NOT NULL,
    timezone character varying(80) DEFAULT 'Asia/Dhaka'::character varying NOT NULL,
    attendance_key character varying(255),
    google_spreadsheet_id character varying(255),
    summary_sheet_name character varying(100) DEFAULT 'May-26'::character varying NOT NULL,
    events_sheet_name character varying(100) DEFAULT ''::character varying NOT NULL,
    settings_sheet_name character varying(100) DEFAULT 'Attendance key'::character varying NOT NULL,
    last_synced_at timestamp without time zone,
    last_sync_status character varying(30),
    last_sync_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    attendance_present_key character varying(10) DEFAULT 'P'::character varying NOT NULL,
    attendance_present_label character varying(100) DEFAULT 'Present'::character varying NOT NULL,
    attendance_late_key character varying(10) DEFAULT 'L'::character varying NOT NULL,
    attendance_late_label character varying(100) DEFAULT 'Late'::character varying NOT NULL,
    attendance_weekly_off_key character varying(10) DEFAULT 'W'::character varying NOT NULL,
    attendance_weekly_off_label character varying(100) DEFAULT 'Weekly off day'::character varying NOT NULL,
    attendance_excused_absence_key character varying(10) DEFAULT 'U'::character varying NOT NULL,
    attendance_excused_absence_label character varying(100) DEFAULT 'Excused absence'::character varying NOT NULL,
    attendance_unexcused_absence_key character varying(10) DEFAULT 'A'::character varying NOT NULL,
    attendance_unexcused_absence_label character varying(100) DEFAULT 'Unexcused absence'::character varying NOT NULL,
    attendance_present_color character varying(20) DEFAULT '#16a34a'::character varying NOT NULL,
    attendance_late_color character varying(20) DEFAULT '#f59e0b'::character varying NOT NULL,
    attendance_weekly_off_color character varying(20) DEFAULT '#64748b'::character varying NOT NULL,
    attendance_excused_absence_color character varying(20) DEFAULT '#2563eb'::character varying NOT NULL,
    attendance_unexcused_absence_color character varying(20) DEFAULT '#dc2626'::character varying NOT NULL,
    calendar_team_gap_every integer DEFAULT 0 NOT NULL,
    calendar_team_gap_size integer DEFAULT 12 NOT NULL,
    calendar_user_order jsonb,
    allowed_check_in_ips text
);


--
-- Name: TABLE presence_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.presence_settings IS 'Presence module settings and Google Sheets sync configuration.';


--
-- Name: presence_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presence_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presence_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presence_settings_id_seq OWNED BY public.presence_settings.id;


--
-- Name: presence_user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presence_user_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT presence_user_profiles_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'backup'::character varying])::text[])))
);


--
-- Name: presence_user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presence_user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presence_user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presence_user_profiles_id_seq OWNED BY public.presence_user_profiles.id;


--
-- Name: price_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_locks_id_seq OWNED BY public.price_locks.id;


--
-- Name: printer_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.printer_settings (
    id integer NOT NULL,
    printer_name character varying(255) NOT NULL,
    printer_type character varying(50) DEFAULT 'thermal'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    paper_size character varying(50) DEFAULT '80mm'::character varying NOT NULL,
    sticker_width integer DEFAULT 51 NOT NULL,
    sticker_height integer DEFAULT 102 NOT NULL,
    invoice_header text,
    invoice_footer text,
    company_name character varying(255),
    company_address text,
    company_phone character varying(50),
    company_email character varying(255),
    company_logo_url character varying(1000),
    show_logo boolean DEFAULT true NOT NULL,
    show_barcode boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: printer_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.printer_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: printer_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.printer_settings_id_seq OWNED BY public.printer_settings.id;


--
-- Name: product_consumption_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_consumption_profiles (
    id integer NOT NULL,
    product_id integer,
    category_id integer,
    avg_consumption_days integer DEFAULT 30 NOT NULL,
    buffer_days integer DEFAULT 7 NOT NULL,
    min_days integer DEFAULT 7 NOT NULL,
    max_days integer DEFAULT 180 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_consumption_profiles_check CHECK ((((product_id IS NOT NULL) AND (category_id IS NULL)) OR ((product_id IS NULL) AND (category_id IS NOT NULL))))
);


--
-- Name: TABLE product_consumption_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_consumption_profiles IS 'Consumption cycle settings for reminders (per product OR per category)';


--
-- Name: product_consumption_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_consumption_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_consumption_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_consumption_profiles_id_seq OWNED BY public.product_consumption_profiles.id;


--
-- Name: product_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_history (
    id integer NOT NULL,
    product_id integer,
    product_name character varying(255),
    product_sku character varying(255),
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100),
    action character varying(80) NOT NULL,
    summary text NOT NULL,
    changed_fields jsonb,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb,
    performed_by integer,
    performed_by_name character varying(255),
    ip_address character varying(100),
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_history_id_seq OWNED BY public.product_history.id;


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id integer NOT NULL,
    product_id integer NOT NULL,
    image_url character varying(500) NOT NULL,
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_images_id_seq OWNED BY public.product_images.id;


--
-- Name: product_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_inventory_id_seq OWNED BY public.product_inventory.id;


--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_history (
    id integer NOT NULL,
    product_id integer NOT NULL,
    old_price numeric(12,2),
    new_price numeric(12,2),
    changed_by integer,
    effective_from date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_price_history_id_seq OWNED BY public.product_price_history.id;


--
-- Name: product_recommendation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_recommendation_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_recommendation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_recommendation_rules_id_seq OWNED BY public.product_recommendation_rules.id;


--
-- Name: product_section_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_section_orders (
    id integer NOT NULL,
    section_key character varying(80) NOT NULL,
    product_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_section_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_section_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_section_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_section_orders_id_seq OWNED BY public.product_section_orders.id;


--
-- Name: product_suggestion_shortlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_suggestion_shortlist (
    id integer NOT NULL,
    product_id integer NOT NULL,
    variant_name text,
    variant_key text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: product_suggestion_shortlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_suggestion_shortlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_suggestion_shortlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_suggestion_shortlist_id_seq OWNED BY public.product_suggestion_shortlist.id;


--
-- Name: product_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_suggestions (
    id integer NOT NULL,
    product_id integer NOT NULL,
    suggested_product_id integer NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_suggestions_id_seq OWNED BY public.product_suggestions.id;


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id integer NOT NULL,
    product_id integer NOT NULL,
    variant_sku character varying(50),
    variant_name character varying(255),
    variant_details jsonb,
    price_adjustment numeric(12,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variants_id_seq OWNED BY public.product_variants.id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id integer NOT NULL,
    project_id integer NOT NULL,
    milestone_name character varying(255) NOT NULL,
    description text,
    target_date date NOT NULL,
    completion_date date,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: project_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_milestones_id_seq OWNED BY public.project_milestones.id;


--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tasks (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    project_id integer NOT NULL,
    task_name character varying(255) NOT NULL,
    description text,
    assigned_to integer,
    priority character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying,
    start_date date,
    due_date date,
    completion_date date,
    estimated_hours numeric(8,2),
    actual_hours numeric(8,2),
    progress_percentage integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    project_code character varying(50) NOT NULL,
    project_name character varying(255) NOT NULL,
    description text,
    client_id integer,
    project_manager_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date,
    budget numeric(15,2),
    status character varying(20) DEFAULT 'planning'::character varying,
    priority character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: project_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_status AS
 SELECT p.id,
    p.project_code,
    p.project_name,
    (((c.name)::text || ' '::text) || (c.last_name)::text) AS client_name,
    p.start_date,
    p.end_date,
    p.budget,
    p.status,
    count(DISTINCT pt.id) AS total_tasks,
    count(DISTINCT
        CASE
            WHEN ((pt.status)::text = 'completed'::text) THEN pt.id
            ELSE NULL::integer
        END) AS completed_tasks,
    (((count(DISTINCT
        CASE
            WHEN ((pt.status)::text = 'completed'::text) THEN pt.id
            ELSE NULL::integer
        END) * 100) / NULLIF(count(DISTINCT pt.id), 0)))::integer AS progress_percentage
   FROM ((public.projects p
     LEFT JOIN public.customers c ON ((p.client_id = c.id)))
     LEFT JOIN public.project_tasks pt ON ((p.id = pt.project_id)))
  GROUP BY p.id, p.project_code, p.project_name, c.name, c.last_name, p.start_date, p.end_date, p.budget, p.status;


--
-- Name: project_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_tasks_id_seq OWNED BY public.project_tasks.id;


--
-- Name: project_time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_time_logs (
    id bigint NOT NULL,
    task_id integer NOT NULL,
    employee_id integer NOT NULL,
    log_date date NOT NULL,
    hours_worked numeric(8,2) NOT NULL,
    description text,
    logged_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: project_time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_time_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_time_logs_id_seq OWNED BY public.project_time_logs.id;


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: purchase_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_invoices (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    invoice_number character varying(50) NOT NULL,
    supplier_id integer NOT NULL,
    po_id integer,
    invoice_date date NOT NULL,
    due_date date,
    subtotal numeric(15,2),
    tax_amount numeric(15,2),
    discount_amount numeric(15,2),
    grand_total numeric(15,2),
    status character varying(20) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_invoices_id_seq OWNED BY public.purchase_invoices.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    description character varying(500),
    quantity_ordered integer NOT NULL,
    quantity_received integer DEFAULT 0,
    unit_price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    line_total numeric(12,2) NOT NULL,
    expected_delivery_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_number character varying(50) NOT NULL,
    supplier_id integer,
    warehouse_id integer NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    priority character varying(10) DEFAULT 'normal'::character varying,
    order_date date NOT NULL,
    expected_delivery_date date,
    actual_delivery_date date,
    subtotal numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    shipping_cost numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying,
    payment_terms character varying(50),
    payment_due_date date,
    currency character varying(3) DEFAULT 'BDT'::character varying,
    notes text,
    internal_notes text,
    terms_and_conditions text,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    cancelled_by integer,
    cancelled_at timestamp without time zone,
    cancel_reason character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: purchase_requisition_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisition_items (
    id integer NOT NULL,
    requisition_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(12,2) NOT NULL,
    estimated_unit_price numeric(12,2),
    estimated_total numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_requisition_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisition_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisition_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisition_items_id_seq OWNED BY public.purchase_requisition_items.id;


--
-- Name: purchase_requisitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisitions (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    requisition_number character varying(50) NOT NULL,
    requisition_date date NOT NULL,
    required_by_date date,
    department_id integer,
    requested_by integer NOT NULL,
    approved_by integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    total_amount numeric(15,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_requisitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisitions_id_seq OWNED BY public.purchase_requisitions.id;


--
-- Name: quotation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_items (
    id integer NOT NULL,
    quotation_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(12,2) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_total numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quotation_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotation_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotation_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotation_items_id_seq OWNED BY public.quotation_items.id;


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotations (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    quotation_number character varying(50) NOT NULL,
    customer_id integer NOT NULL,
    deal_id integer,
    quotation_date date NOT NULL,
    valid_until date,
    total_amount numeric(15,2),
    discount_percentage numeric(5,2),
    discount_amount numeric(15,2),
    tax_amount numeric(15,2),
    grand_total numeric(15,2),
    notes text,
    status character varying(20),
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quotations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotations_id_seq OWNED BY public.quotations.id;


--
-- Name: quote_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_approvals (
    id integer NOT NULL,
    quote_id integer,
    approver_id integer,
    status character varying(50),
    comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT quote_approvals_status_check CHECK (((status)::text = ANY (ARRAY[('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: quote_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_approvals_id_seq OWNED BY public.quote_approvals.id;


--
-- Name: quote_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    header_content text,
    footer_content text,
    terms_and_conditions text,
    payment_terms text,
    template_layout character varying(50) DEFAULT 'standard'::character varying,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: quote_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_templates_id_seq OWNED BY public.quote_templates.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    quote_number character varying(50) NOT NULL,
    customer_id integer,
    deal_id integer,
    created_by integer,
    valid_until date NOT NULL,
    line_items jsonb NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    tax numeric(15,2) DEFAULT 0,
    discount numeric(15,2) DEFAULT 0,
    total numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    payment_terms text,
    delivery_terms text,
    status character varying(50) DEFAULT 'draft'::character varying,
    sent_at timestamp without time zone,
    viewed_at timestamp without time zone,
    accepted_at timestamp without time zone,
    notes text,
    pdf_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    template_id integer,
    version integer DEFAULT 1,
    parent_quote_id integer,
    approval_status character varying(50) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    CONSTRAINT quotes_approval_status_check CHECK (((approval_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: referral_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    reward_type character varying(20) DEFAULT 'wallet'::character varying NOT NULL,
    reward_referrer_amount numeric(10,2) DEFAULT 100 NOT NULL,
    reward_referred_amount numeric(10,2) DEFAULT 0 NOT NULL,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reward_referrer_points integer DEFAULT 0 NOT NULL,
    reward_referred_points integer DEFAULT 0 NOT NULL,
    referrer_offer_id integer,
    referred_offer_id integer,
    vip_referrals_threshold integer,
    vip_membership_tier character varying(20)
);


--
-- Name: referral_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_events (
    id bigint NOT NULL,
    event_type character varying(40) NOT NULL,
    referral_id integer,
    referrer_customer_id integer,
    referred_customer_id integer,
    order_id integer,
    share_code_used character varying(50),
    partner_code character varying(50),
    source_channel character varying(30),
    payload jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: referral_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_events_id_seq OWNED BY public.referral_events.id;


--
-- Name: referral_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    partner_type character varying(30) DEFAULT 'influencer'::character varying NOT NULL,
    name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: reorder_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reorder_rules (
    id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    warehouse_id integer,
    reorder_point integer NOT NULL,
    reorder_quantity integer NOT NULL,
    max_stock_level integer,
    safety_stock integer DEFAULT 0,
    lead_time_days integer DEFAULT 3,
    preferred_supplier_id integer,
    auto_reorder boolean DEFAULT false,
    is_active boolean DEFAULT true,
    last_triggered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: reorder_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reorder_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reorder_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reorder_rules_id_seq OWNED BY public.reorder_rules.id;


--
-- Name: repack_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repack_orders (
    id integer NOT NULL,
    repack_number character varying(50) NOT NULL,
    warehouse_id integer NOT NULL,
    config_id integer,
    source_product_id integer NOT NULL,
    source_variant_key character varying(255),
    source_batch_id integer,
    source_qty_to_consume numeric(10,3) NOT NULL,
    source_qty_consumed numeric(10,3),
    output_product_id integer NOT NULL,
    output_variant_key character varying(255),
    output_qty_expected integer NOT NULL,
    output_qty_actual integer,
    output_batch_number character varying(100),
    waste_qty numeric(10,3) DEFAULT 0 NOT NULL,
    notes text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by integer,
    completed_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


--
-- Name: repack_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.repack_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: repack_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.repack_orders_id_seq OWNED BY public.repack_orders.id;


--
-- Name: repeat_order_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.repeat_order_reminders (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    last_order_id integer,
    last_order_date date,
    reminder_due_date date,
    reminder_sent boolean DEFAULT false,
    reminder_sent_at timestamp without time zone,
    reminder_channel character varying(20),
    customer_responded boolean DEFAULT false,
    order_placed boolean DEFAULT false,
    new_order_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT repeat_order_reminders_reminder_channel_check CHECK (((reminder_channel)::text = ANY (ARRAY[('whatsapp'::character varying)::text, ('sms'::character varying)::text, ('call'::character varying)::text, ('email'::character varying)::text])))
);


--
-- Name: TABLE repeat_order_reminders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.repeat_order_reminders IS 'Auto-reminders for repeat purchases (25-30 days)';


--
-- Name: repeat_order_reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.repeat_order_reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: repeat_order_reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.repeat_order_reminders_id_seq OWNED BY public.repeat_order_reminders.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    report_name character varying(255) NOT NULL,
    report_type character varying(50),
    created_by integer NOT NULL,
    query text,
    filters jsonb,
    schedule character varying(20),
    recipients text[],
    is_scheduled boolean DEFAULT false,
    last_generated timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.returns (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    return_number character varying(50) NOT NULL,
    ecommerce_order_id integer,
    sales_order_id integer,
    customer_id integer NOT NULL,
    return_date date,
    reason_for_return text,
    status character varying(20),
    refund_amount numeric(15,2),
    refund_status public.payment_status_enum DEFAULT 'pending'::public.payment_status_enum,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: returns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.returns_id_seq OWNED BY public.returns.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_system_role boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    slug character varying(50),
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_structures (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    base_salary numeric(15,2) NOT NULL,
    house_rent_allowance numeric(15,2) DEFAULT 0,
    medical_allowance numeric(15,2) DEFAULT 0,
    conveyance_allowance numeric(15,2) DEFAULT 0,
    other_allowances numeric(15,2) DEFAULT 0,
    gross_salary numeric(15,2) GENERATED ALWAYS AS (((((base_salary + house_rent_allowance) + medical_allowance) + conveyance_allowance) + other_allowances)) STORED,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: salary_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.salary_structures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salary_structures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salary_structures_id_seq OWNED BY public.salary_structures.id;


--
-- Name: sales_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_forecasts (
    id integer NOT NULL,
    forecast_period character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    forecast_type character varying(50),
    forecast_amount numeric(15,2) NOT NULL,
    actual_amount numeric(15,2),
    accuracy_percentage numeric(5,2),
    deal_count integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_forecasts_forecast_type_check CHECK (((forecast_type)::text = ANY (ARRAY[('weighted_pipeline'::character varying)::text, ('historical_trend'::character varying)::text, ('quota_based'::character varying)::text, ('best_case'::character varying)::text, ('most_likely'::character varying)::text, ('worst_case'::character varying)::text])))
);


--
-- Name: sales_forecasts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_forecasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_forecasts_id_seq OWNED BY public.sales_forecasts.id;


--
-- Name: sales_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_metrics (
    id bigint NOT NULL,
    metric_date date NOT NULL,
    user_id integer,
    department_id integer,
    total_orders integer DEFAULT 0,
    total_value numeric(15,2) DEFAULT 0,
    average_order_value numeric(15,2),
    deals_closed integer DEFAULT 0,
    deals_lost integer DEFAULT 0,
    conversion_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_metrics_id_seq OWNED BY public.sales_metrics.id;


--
-- Name: sales_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_order_items_id_seq OWNED BY public.sales_order_items.id;


--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: sales_pipelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_pipelines (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_pipelines_id_seq OWNED BY public.sales_pipelines.id;


--
-- Name: sales_quotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_quotas (
    id integer NOT NULL,
    user_id integer,
    team_id integer,
    quota_period character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    quota_amount numeric(15,2) NOT NULL,
    actual_amount numeric(15,2) DEFAULT 0,
    attainment_percentage numeric(5,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_quotas_check CHECK ((((user_id IS NOT NULL) AND (team_id IS NULL)) OR ((user_id IS NULL) AND (team_id IS NOT NULL))))
);


--
-- Name: sales_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_quotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_quotas_id_seq OWNED BY public.sales_quotas.id;


--
-- Name: sales_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sales_summary AS
 SELECT date(created_at) AS sales_date,
    count(id) AS total_orders,
    sum(grand_total) AS total_revenue,
    avg(grand_total) AS average_order_value,
    count(DISTINCT customer_id) AS unique_customers
   FROM public.ecommerce_orders o
  WHERE (status <> 'cancelled'::public.order_status_enum)
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;


--
-- Name: sales_team_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_team_assignments (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    assigned_executive_id integer NOT NULL,
    assigned_supervisor_id integer NOT NULL,
    assigned_date date DEFAULT CURRENT_DATE,
    assignment_status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_team_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_team_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_team_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_team_assignments_id_seq OWNED BY public.sales_team_assignments.id;


--
-- Name: sales_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_teams (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    team_leader_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sales_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_teams_id_seq OWNED BY public.sales_teams.id;


--
-- Name: scheduled_lead_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_lead_assignments (
    id bigint NOT NULL,
    customer_id integer NOT NULL,
    action character varying(20) NOT NULL,
    agent_id integer,
    scheduled_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    scheduled_by integer,
    processed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scheduled_lead_assignments_action_check CHECK (((action)::text = ANY ((ARRAY['assign'::character varying, 'unassign'::character varying])::text[]))),
    CONSTRAINT scheduled_lead_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'processed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: scheduled_lead_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduled_lead_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduled_lead_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduled_lead_assignments_id_seq OWNED BY public.scheduled_lead_assignments.id;


--
-- Name: segment_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.segment_members (
    id integer NOT NULL,
    segment_id integer NOT NULL,
    customer_id integer NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: segment_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.segment_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: segment_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.segment_members_id_seq OWNED BY public.segment_members.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    data_type character varying(20),
    category character varying(50),
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipments (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    ecommerce_order_id integer,
    sales_order_id integer,
    shipment_number character varying(50) NOT NULL,
    carrier_name character varying(100),
    tracking_number character varying(100),
    shipping_date date,
    estimated_delivery_date date,
    actual_delivery_date date,
    weight numeric(10,2),
    dimensions jsonb,
    status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;


--
-- Name: sms_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100),
    message text NOT NULL,
    variables jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    character_count integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sms_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sms_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sms_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sms_templates_id_seq OWNED BY public.sms_templates.id;


--
-- Name: special_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.special_offers (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    subtitle character varying(255),
    description text,
    features jsonb,
    primary_button_text character varying(100),
    primary_button_link character varying(500),
    secondary_button_text character varying(100),
    secondary_button_link character varying(500),
    image_url character varying(500),
    background_gradient character varying(255) DEFAULT 'from-orange-50 via-white to-orange-50'::character varying,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    context character varying(50) DEFAULT 'homepage'::character varying NOT NULL,
    product_id integer,
    offer_price numeric(12,2)
);


--
-- Name: special_offers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.special_offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: special_offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.special_offers_id_seq OWNED BY public.special_offers.id;


--
-- Name: stock_adjustment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustment_items (
    id integer NOT NULL,
    adjustment_id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    batch_id integer,
    location_id integer,
    quantity_before integer NOT NULL,
    quantity_after integer NOT NULL,
    quantity_change integer NOT NULL,
    unit_cost numeric(10,2),
    value_impact numeric(12,2),
    reason character varying(255)
);


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_adjustment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_adjustment_items_id_seq OWNED BY public.stock_adjustment_items.id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustments (
    id integer NOT NULL,
    adjustment_number character varying(50) NOT NULL,
    warehouse_id integer NOT NULL,
    adjustment_type character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    reason character varying(255) NOT NULL,
    notes text,
    total_value_impact numeric(12,2) DEFAULT 0,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    rejected_by integer,
    rejected_at timestamp without time zone,
    rejection_reason character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_adjustments_id_seq OWNED BY public.stock_adjustments.id;


--
-- Name: stock_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_alerts (
    id integer NOT NULL,
    alert_type character varying(30) NOT NULL,
    product_id integer,
    variant_key character varying(100),
    warehouse_id integer,
    batch_id integer,
    message text NOT NULL,
    severity character varying(10) NOT NULL,
    is_read boolean DEFAULT false,
    is_resolved boolean DEFAULT false,
    resolved_by integer,
    resolved_at timestamp without time zone,
    resolution_notes character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_alerts_id_seq OWNED BY public.stock_alerts.id;


--
-- Name: stock_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_batches (
    id integer NOT NULL,
    batch_number character varying(50) NOT NULL,
    lot_number character varying(50),
    product_id integer NOT NULL,
    variant_key character varying(100),
    supplier_id integer,
    purchase_order_id integer,
    grn_id integer,
    warehouse_id integer,
    manufacturing_date date,
    expiry_date date,
    received_date date NOT NULL,
    initial_quantity integer NOT NULL,
    remaining_quantity integer NOT NULL,
    cost_price numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying,
    quality_status character varying(20) DEFAULT 'accepted'::character varying,
    quality_notes text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_batches_id_seq OWNED BY public.stock_batches.id;


--
-- Name: stock_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_levels (
    id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    warehouse_id integer NOT NULL,
    location_id integer,
    batch_id integer,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0,
    available_quantity integer GENERATED ALWAYS AS ((quantity - reserved_quantity)) STORED,
    damaged_quantity integer DEFAULT 0,
    cost_price numeric(10,2),
    last_counted_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_levels_id_seq OWNED BY public.stock_levels.id;


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    reference_number character varying(50) NOT NULL,
    movement_type character varying(30) NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    batch_id integer,
    source_warehouse_id integer,
    source_location_id integer,
    destination_warehouse_id integer,
    destination_location_id integer,
    quantity integer NOT NULL,
    unit_cost numeric(10,2),
    total_cost numeric(12,2),
    balance_before integer,
    balance_after integer,
    reason character varying(255),
    notes text,
    related_document_type character varying(30),
    related_document_id integer,
    performed_by integer NOT NULL,
    approved_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_reservations (
    id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    warehouse_id integer NOT NULL,
    batch_id integer,
    sales_order_id integer NOT NULL,
    quantity integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    reserved_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    fulfilled_at timestamp without time zone,
    released_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_reservations_id_seq OWNED BY public.stock_reservations.id;


--
-- Name: stock_transfer_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfer_items (
    id integer NOT NULL,
    transfer_id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    batch_id integer,
    quantity_requested integer NOT NULL,
    quantity_shipped integer DEFAULT 0,
    quantity_received integer DEFAULT 0,
    source_location_id integer,
    destination_location_id integer,
    notes character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_transfer_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_transfer_items_id_seq OWNED BY public.stock_transfer_items.id;


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfers (
    id integer NOT NULL,
    transfer_number character varying(50) NOT NULL,
    source_warehouse_id integer NOT NULL,
    destination_warehouse_id integer NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    priority character varying(10) DEFAULT 'normal'::character varying,
    requested_by integer NOT NULL,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    approved_by integer,
    approved_at timestamp without time zone,
    shipped_by integer,
    shipped_at timestamp without time zone,
    received_by integer,
    received_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_transfers_id_seq OWNED BY public.stock_transfers.id;


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_payments (
    id integer NOT NULL,
    uuid uuid DEFAULT public.uuid_generate_v4(),
    supplier_id integer NOT NULL,
    invoice_id integer,
    payment_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(50),
    reference_number character varying(100),
    status character varying(20) DEFAULT 'completed'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: supplier_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_payments_id_seq OWNED BY public.supplier_payments.id;


--
-- Name: supplier_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_products (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    product_id integer NOT NULL,
    variant_key character varying(100),
    supplier_sku character varying(50),
    unit_price numeric(10,2) NOT NULL,
    min_order_quantity integer DEFAULT 1,
    lead_time_days integer,
    is_preferred boolean DEFAULT false,
    is_active boolean DEFAULT true,
    last_supplied_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: supplier_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_products_id_seq OWNED BY public.supplier_products.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    company_name character varying(200) NOT NULL,
    company_name_bn character varying(200),
    contact_person character varying(150),
    email character varying(255),
    phone character varying(30),
    alt_phone character varying(30),
    address text,
    city character varying(100),
    district character varying(100),
    country character varying(50) DEFAULT 'Bangladesh'::character varying,
    tax_id character varying(50),
    trade_license character varying(50),
    bank_name character varying(100),
    bank_account_number character varying(50),
    bank_branch character varying(100),
    payment_terms character varying(50) DEFAULT 'net_30'::character varying,
    credit_limit numeric(12,2),
    lead_time_days integer DEFAULT 3,
    rating numeric(3,2),
    total_orders integer DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    category character varying(50),
    certifications jsonb DEFAULT '[]'::jsonb,
    notes text,
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    customer_id character varying(36),
    customer_email character varying(255),
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    priority character varying(20) DEFAULT 'low'::character varying,
    assigned_to integer,
    response text,
    responded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    severity character varying(20) DEFAULT 'medium'::character varying,
    support_group character varying(50) DEFAULT 'general'::character varying,
    first_response_due_at timestamp without time zone,
    resolution_due_at timestamp without time zone,
    resolved_at timestamp without time zone,
    sla_breached boolean DEFAULT false
);


--
-- Name: TABLE support_tickets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.support_tickets IS 'Customer support tickets and inquiries';


--
-- Name: COLUMN support_tickets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.status IS 'Ticket status: open, in_progress, resolved, closed';


--
-- Name: COLUMN support_tickets.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.priority IS 'Ticket priority: low, medium, high, urgent';


--
-- Name: COLUMN support_tickets.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.severity IS 'Ticket severity: low, medium, high, critical';


--
-- Name: COLUMN support_tickets.support_group; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.support_group IS 'Routing group: general, billing, delivery, account, technical';


--
-- Name: COLUMN support_tickets.first_response_due_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.first_response_due_at IS 'SLA due time for first response';


--
-- Name: COLUMN support_tickets.resolution_due_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.resolution_due_at IS 'SLA due time for resolution/closure';


--
-- Name: COLUMN support_tickets.resolved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.resolved_at IS 'Timestamp when ticket moved to resolved/closed';


--
-- Name: COLUMN support_tickets.sla_breached; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.support_tickets.sla_breached IS 'True if ticket missed SLA (first response or resolution)';


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    file_name character varying(255),
    file_url text,
    file_size bigint,
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_attachments_id_seq OWNED BY public.task_attachments.id;


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id bigint NOT NULL,
    task_id integer NOT NULL,
    commented_by integer NOT NULL,
    comment text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_comments_id_seq OWNED BY public.task_comments.id;


--
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_dependencies (
    id integer NOT NULL,
    task_id integer NOT NULL,
    depends_on_task_id integer NOT NULL,
    dependency_type character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_dependencies_id_seq OWNED BY public.task_dependencies.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    customer_id integer,
    deal_id integer,
    assigned_to integer,
    assigned_by integer,
    due_date date,
    due_time character varying(10),
    priority character varying(20) DEFAULT 'medium'::character varying,
    category character varying(50),
    tags text[],
    status character varying(50) DEFAULT 'pending'::character varying,
    completed_at timestamp without time zone,
    recurring boolean DEFAULT false,
    recurrence_rule character varying(255),
    reminders jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: team_a_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_a_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_a_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_a_data_id_seq OWNED BY public.team_a_data.id;


--
-- Name: team_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_assignments_id_seq OWNED BY public.team_assignments.id;


--
-- Name: team_b_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_b_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_b_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_b_data_id_seq OWNED BY public.team_b_data.id;


--
-- Name: team_c_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_c_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_c_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_c_data_id_seq OWNED BY public.team_c_data.id;


--
-- Name: team_d_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_d_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_d_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_d_data_id_seq OWNED BY public.team_d_data.id;


--
-- Name: team_e_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_e_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_e_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_e_data_id_seq OWNED BY public.team_e_data.id;


--
-- Name: team_leader_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_leader_teams (
    id integer NOT NULL,
    team_leader_id integer NOT NULL,
    team_type character varying(10) NOT NULL,
    team_name character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_leader_teams_team_type_check CHECK (((team_type)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('D'::character varying)::text, ('E'::character varying)::text])))
);


--
-- Name: TABLE team_leader_teams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_leader_teams IS 'Maps team leaders to their 5 teams (A, B, C, D, E)';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    user_id integer NOT NULL,
    team_leader_id integer NOT NULL,
    team_type character varying(10) NOT NULL,
    is_active boolean DEFAULT true,
    assigned_leads_count integer DEFAULT 0,
    completed_leads_count integer DEFAULT 0,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT team_members_team_type_check CHECK (((team_type)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('D'::character varying)::text, ('E'::character varying)::text])))
);


--
-- Name: TABLE team_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_members IS 'Stores team member assignments under team leaders';


--
-- Name: team_leader_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.team_leader_dashboard AS
 SELECT tl.team_leader_id,
    tl.team_type,
    tl.team_name,
    count(DISTINCT tm.id) AS team_members_count,
    count(DISTINCT ta.id) AS assigned_leads_count,
    count(DISTINCT
        CASE
            WHEN ((ta.status)::text = 'completed'::text) THEN ta.id
            ELSE NULL::integer
        END) AS completed_leads_count,
    count(DISTINCT
        CASE
            WHEN ((ta.status)::text = 'pending'::text) THEN ta.id
            ELSE NULL::integer
        END) AS pending_leads_count
   FROM ((public.team_leader_teams tl
     LEFT JOIN public.team_members tm ON (((tl.team_leader_id = tm.team_leader_id) AND ((tl.team_type)::text = (tm.team_type)::text))))
     LEFT JOIN public.team_assignments ta ON (((tm.user_id = ta.assigned_to_id) AND ((tl.team_type)::text = (ta.team_type)::text))))
  GROUP BY tl.team_leader_id, tl.team_type, tl.team_name;


--
-- Name: team_leader_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_leader_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_leader_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_leader_teams_id_seq OWNED BY public.team_leader_teams.id;


--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: telephony_agent_presence_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telephony_agent_presence_events (
    id integer NOT NULL,
    user_id integer NOT NULL,
    status character varying(20) NOT NULL,
    source character varying(50) DEFAULT 'api'::character varying NOT NULL,
    occurred_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT telephony_agent_presence_events_status_check CHECK (((status)::text = ANY (ARRAY[('online'::character varying)::text, ('on_call'::character varying)::text, ('break'::character varying)::text, ('offline'::character varying)::text])))
);


--
-- Name: TABLE telephony_agent_presence_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.telephony_agent_presence_events IS 'Agent presence transitions for call-center reporting (login/logout/break/on_call)';


--
-- Name: telephony_agent_presence_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telephony_agent_presence_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telephony_agent_presence_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telephony_agent_presence_events_id_seq OWNED BY public.telephony_agent_presence_events.id;


--
-- Name: telephony_assignment_call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telephony_assignment_call_logs (
    id integer NOT NULL,
    record_type character varying(40) NOT NULL,
    assignment_type character varying(40),
    order_id integer NOT NULL,
    caller_user_id integer,
    caller_name character varying(150),
    outcome character varying(50),
    suggestion text,
    notes text NOT NULL,
    called_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: telephony_assignment_call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telephony_assignment_call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telephony_assignment_call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telephony_assignment_call_logs_id_seq OWNED BY public.telephony_assignment_call_logs.id;


--
-- Name: telephony_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telephony_calls (
    id integer NOT NULL,
    provider character varying(50) DEFAULT 'bracknet'::character varying NOT NULL,
    external_call_id character varying(255),
    task_id integer,
    agent_user_id integer,
    agent_phone character varying(30),
    customer_phone character varying(30) NOT NULL,
    direction character varying(20) DEFAULT 'outbound'::character varying NOT NULL,
    status character varying(20) DEFAULT 'initiated'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    answered_at timestamp without time zone,
    ended_at timestamp without time zone,
    duration_seconds integer,
    recording_url text,
    meta jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    queue_name character varying(100),
    trunk_name character varying(100),
    wait_seconds integer,
    hold_seconds integer,
    disposition character varying(50),
    CONSTRAINT telephony_calls_status_check CHECK (((status)::text = ANY (ARRAY[('initiated'::character varying)::text, ('ringing'::character varying)::text, ('answered'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: COLUMN telephony_calls.queue_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telephony_calls.queue_name IS 'PBX queue identifier/name (if provided by webhook)';


--
-- Name: COLUMN telephony_calls.trunk_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telephony_calls.trunk_name IS 'PBX trunk identifier/name (if provided by webhook)';


--
-- Name: COLUMN telephony_calls.wait_seconds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telephony_calls.wait_seconds IS 'Queue wait/ring time until answered (seconds)';


--
-- Name: COLUMN telephony_calls.hold_seconds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telephony_calls.hold_seconds IS 'Hold time during call (seconds, if provided)';


--
-- Name: COLUMN telephony_calls.disposition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telephony_calls.disposition IS 'Call disposition: answered/completed/missed/abandoned/busy/no_answer/failed';


--
-- Name: telephony_calls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telephony_calls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telephony_calls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telephony_calls_id_seq OWNED BY public.telephony_calls.id;


--
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_attachments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    file_name character varying(255),
    file_url text,
    file_size bigint,
    mime_type character varying(50),
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ticket_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_attachments_id_seq OWNED BY public.ticket_attachments.id;


--
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_comments (
    id bigint NOT NULL,
    ticket_id integer NOT NULL,
    created_by integer NOT NULL,
    comment text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ticket_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_comments_id_seq OWNED BY public.ticket_comments.id;


--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: two_factor_auth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.two_factor_auth (
    id integer NOT NULL,
    user_id integer NOT NULL,
    secret character varying(255) NOT NULL,
    backup_codes text[],
    is_enabled boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: two_factor_auth_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.two_factor_auth_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: two_factor_auth_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.two_factor_auth_id_seq OWNED BY public.two_factor_auth.id;


--
-- Name: unassigned_leads; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.unassigned_leads AS
 SELECT c.id,
    c.name AS first_name,
    c.last_name,
    c.email,
    c.phone,
    c.lead_source,
    c.lead_score,
    c.created_at,
    cs.source_details,
    cs.campaign_id,
    io.total_amount AS incomplete_order_value
   FROM ((public.customers c
     LEFT JOIN public.customer_sessions cs ON ((c.id = cs.customer_id)))
     LEFT JOIN public.incomplete_orders io ON ((c.id = io.customer_id)))
  WHERE ((c.is_lead = true) AND ((c.lead_status)::text = 'unassigned'::text))
  ORDER BY c.lead_score DESC, c.created_at DESC;


--
-- Name: upcoming_birthdays_anniversaries; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.upcoming_birthdays_anniversaries AS
 SELECT 'customer'::text AS type,
    c.id AS customer_id,
    NULL::integer AS family_member_id,
    (((c.name)::text || ' '::text) || (COALESCE(c.last_name, ''::character varying))::text) AS name,
    c.phone,
    c.email,
    'birthday'::text AS event_type,
    c.date_of_birth AS event_date,
    date_part('month'::text, c.date_of_birth) AS event_month,
    date_part('day'::text, c.date_of_birth) AS event_day,
        CASE
            WHEN ((date_part('month'::text, CURRENT_DATE) = date_part('month'::text, c.date_of_birth)) AND (date_part('day'::text, CURRENT_DATE) = date_part('day'::text, c.date_of_birth))) THEN (0)::double precision
            WHEN (date_part('doy'::text, c.date_of_birth) >= date_part('doy'::text, CURRENT_DATE)) THEN (date_part('doy'::text, c.date_of_birth) - date_part('doy'::text, CURRENT_DATE))
            ELSE (((365)::double precision + date_part('doy'::text, c.date_of_birth)) - date_part('doy'::text, CURRENT_DATE))
        END AS days_until_event
   FROM public.customers c
  WHERE (c.date_of_birth IS NOT NULL)
UNION ALL
 SELECT 'customer'::text AS type,
    c.id AS customer_id,
    NULL::integer AS family_member_id,
    (((c.name)::text || ' '::text) || (COALESCE(c.last_name, ''::character varying))::text) AS name,
    c.phone,
    c.email,
    'anniversary'::text AS event_type,
    c.anniversary_date AS event_date,
    date_part('month'::text, c.anniversary_date) AS event_month,
    date_part('day'::text, c.anniversary_date) AS event_day,
        CASE
            WHEN ((date_part('month'::text, CURRENT_DATE) = date_part('month'::text, c.anniversary_date)) AND (date_part('day'::text, CURRENT_DATE) = date_part('day'::text, c.anniversary_date))) THEN (0)::double precision
            WHEN (date_part('doy'::text, c.anniversary_date) >= date_part('doy'::text, CURRENT_DATE)) THEN (date_part('doy'::text, c.anniversary_date) - date_part('doy'::text, CURRENT_DATE))
            ELSE (((365)::double precision + date_part('doy'::text, c.anniversary_date)) - date_part('doy'::text, CURRENT_DATE))
        END AS days_until_event
   FROM public.customers c
  WHERE (c.anniversary_date IS NOT NULL)
UNION ALL
 SELECT 'family_member'::text AS type,
    cfm.customer_id,
    cfm.id AS family_member_id,
    cfm.name,
    cfm.phone,
    cfm.email,
    'birthday'::text AS event_type,
    cfm.date_of_birth AS event_date,
    date_part('month'::text, cfm.date_of_birth) AS event_month,
    date_part('day'::text, cfm.date_of_birth) AS event_day,
        CASE
            WHEN ((date_part('month'::text, CURRENT_DATE) = date_part('month'::text, cfm.date_of_birth)) AND (date_part('day'::text, CURRENT_DATE) = date_part('day'::text, cfm.date_of_birth))) THEN (0)::double precision
            WHEN (date_part('doy'::text, cfm.date_of_birth) >= date_part('doy'::text, CURRENT_DATE)) THEN (date_part('doy'::text, cfm.date_of_birth) - date_part('doy'::text, CURRENT_DATE))
            ELSE (((365)::double precision + date_part('doy'::text, cfm.date_of_birth)) - date_part('doy'::text, CURRENT_DATE))
        END AS days_until_event
   FROM public.customer_family_members cfm
  WHERE ((cfm.date_of_birth IS NOT NULL) AND (cfm.is_active = true))
UNION ALL
 SELECT 'family_member'::text AS type,
    cfm.customer_id,
    cfm.id AS family_member_id,
    cfm.name,
    cfm.phone,
    cfm.email,
    'anniversary'::text AS event_type,
    cfm.anniversary_date AS event_date,
    date_part('month'::text, cfm.anniversary_date) AS event_month,
    date_part('day'::text, cfm.anniversary_date) AS event_day,
        CASE
            WHEN ((date_part('month'::text, CURRENT_DATE) = date_part('month'::text, cfm.anniversary_date)) AND (date_part('day'::text, CURRENT_DATE) = date_part('day'::text, cfm.anniversary_date))) THEN (0)::double precision
            WHEN (date_part('doy'::text, cfm.anniversary_date) >= date_part('doy'::text, CURRENT_DATE)) THEN (date_part('doy'::text, cfm.anniversary_date) - date_part('doy'::text, CURRENT_DATE))
            ELSE (((365)::double precision + date_part('doy'::text, cfm.anniversary_date)) - date_part('doy'::text, CURRENT_DATE))
        END AS days_until_event
   FROM public.customer_family_members cfm
  WHERE ((cfm.anniversary_date IS NOT NULL) AND (cfm.is_active = true))
  ORDER BY 11;


--
-- Name: VIEW upcoming_birthdays_anniversaries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.upcoming_birthdays_anniversaries IS 'Upcoming birthdays and anniversaries for offers';


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    action character varying(100) NOT NULL,
    module character varying(50),
    resource_type character varying(50),
    resource_id integer,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: user_office_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_office_times (
    id integer NOT NULL,
    user_id integer NOT NULL,
    office_start_time character varying(5),
    office_end_time character varying(5),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    weekly_day_off character varying(20),
    caution_minutes integer DEFAULT 10 NOT NULL,
    lunch_break_start_time character varying(5),
    lunch_break_end_time character varying(5)
);


--
-- Name: user_office_times_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_office_times_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_office_times_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_office_times_id_seq OWNED BY public.user_office_times.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission character varying(100) NOT NULL,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: user_presence_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence_events (
    id integer NOT NULL,
    user_id integer NOT NULL,
    state character varying(20) NOT NULL,
    source character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    occurred_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_presence_events_state_check CHECK (((state)::text = ANY ((ARRAY['online'::character varying, 'offline'::character varying])::text[])))
);


--
-- Name: TABLE user_presence_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_presence_events IS 'Online/offline transitions used for counters and duration reporting.';


--
-- Name: user_presence_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_presence_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_presence_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_presence_events_id_seq OWNED BY public.user_presence_events.id;


--
-- Name: user_presence_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_presence_statuses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    state character varying(20) DEFAULT 'offline'::character varying NOT NULL,
    last_changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at timestamp without time zone,
    source character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_presence_statuses_state_check CHECK (((state)::text = ANY ((ARRAY['online'::character varying, 'offline'::character varying])::text[])))
);


--
-- Name: TABLE user_presence_statuses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_presence_statuses IS 'Current online/offline state for every admin user.';


--
-- Name: user_presence_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_presence_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_presence_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_presence_statuses_id_seq OWNED BY public.user_presence_statuses.id;


--
-- Name: user_product_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_product_views (
    id integer NOT NULL,
    user_id integer,
    session_id character varying(100),
    product_id integer,
    viewed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_product_views_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_product_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_product_views_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_product_views_id_seq OWNED BY public.user_product_views.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id integer NOT NULL,
    wallet_id integer NOT NULL,
    customer_id integer,
    transaction_type character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    source character varying(50) NOT NULL,
    reference_id integer,
    description text,
    balance_after numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_uuid uuid,
    idempotency_key character varying(100),
    status character varying(20) DEFAULT 'posted'::character varying NOT NULL,
    CONSTRAINT wallet_transactions_source_check CHECK (((source)::text = ANY (ARRAY[('referral'::character varying)::text, ('bonus'::character varying)::text, ('refund'::character varying)::text, ('purchase'::character varying)::text, ('withdrawal'::character varying)::text]))),
    CONSTRAINT wallet_transactions_transaction_type_check CHECK (((transaction_type)::text = ANY (ARRAY[('credit'::character varying)::text, ('debit'::character varying)::text])))
);


--
-- Name: TABLE wallet_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wallet_transactions IS 'All wallet credit/debit transactions';


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: wallet_withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_withdrawal_requests (
    id bigint NOT NULL,
    customer_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    method character varying(30) DEFAULT 'bkash'::character varying NOT NULL,
    account character varying(80) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: wallet_withdrawal_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_withdrawal_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_withdrawal_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_withdrawal_requests_id_seq OWNED BY public.wallet_withdrawal_requests.id;


--
-- Name: warehouse_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_locations (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    zone_id integer,
    code character varying(30) NOT NULL,
    aisle character varying(10),
    rack character varying(10),
    shelf character varying(10),
    bin character varying(10),
    location_type character varying(30) DEFAULT 'storage'::character varying,
    max_weight_kg numeric(10,2),
    max_volume_m3 numeric(10,4),
    is_active boolean DEFAULT true,
    barcode character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: warehouse_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_locations_id_seq OWNED BY public.warehouse_locations.id;


--
-- Name: warehouse_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_zones (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(30) DEFAULT 'ambient'::character varying NOT NULL,
    temperature_min numeric(5,2),
    temperature_max numeric(5,2),
    humidity_min numeric(5,2),
    humidity_max numeric(5,2),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: warehouse_zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_zones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_zones_id_seq OWNED BY public.warehouse_zones.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(150) NOT NULL,
    type character varying(30) DEFAULT 'main'::character varying NOT NULL,
    address text,
    city character varying(100),
    district character varying(100),
    country character varying(50) DEFAULT 'Bangladesh'::character varying,
    phone character varying(30),
    email character varying(255),
    manager_id integer,
    latitude numeric(10,7),
    longitude numeric(10,7),
    total_area_sqft numeric(10,2),
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    operating_hours jsonb,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: workflow_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_executions (
    id integer NOT NULL,
    workflow_id integer,
    trigger_data jsonb,
    execution_status character varying(50),
    actions_executed jsonb DEFAULT '[]'::jsonb,
    error_message text,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workflow_executions_execution_status_check CHECK (((execution_status)::text = ANY (ARRAY[('success'::character varying)::text, ('failed'::character varying)::text, ('partial'::character varying)::text])))
);


--
-- Name: workflow_executions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_executions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_executions_id_seq OWNED BY public.workflow_executions.id;


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: activity_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_templates ALTER COLUMN id SET DEFAULT nextval('public.activity_templates_id_seq'::regclass);


--
-- Name: admin_menu_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_menu_items ALTER COLUMN id SET DEFAULT nextval('public.admin_menu_items_id_seq'::regclass);


--
-- Name: agent_commissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commissions ALTER COLUMN id SET DEFAULT nextval('public.agent_commissions_id_seq'::regclass);


--
-- Name: agent_tl_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_tl_history ALTER COLUMN id SET DEFAULT nextval('public.agent_tl_history_id_seq'::regclass);


--
-- Name: api_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens ALTER COLUMN id SET DEFAULT nextval('public.api_tokens_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: automatic_order_assignment_agent_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences ALTER COLUMN id SET DEFAULT nextval('public.automatic_order_assignment_agent_preferences_id_seq'::regclass);


--
-- Name: automatic_order_assignment_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_logs ALTER COLUMN id SET DEFAULT nextval('public.automatic_order_assignment_logs_id_seq'::regclass);


--
-- Name: automatic_order_assignment_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_settings ALTER COLUMN id SET DEFAULT nextval('public.automatic_order_assignment_settings_id_seq'::regclass);


--
-- Name: automatic_order_assignment_team_work_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_team_work_types ALTER COLUMN id SET DEFAULT nextval('public.automatic_order_assignment_team_work_types_id_seq'::regclass);


--
-- Name: automation_workflows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_workflows ALTER COLUMN id SET DEFAULT nextval('public.automation_workflows_id_seq'::regclass);


--
-- Name: backup_team_office_times id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_team_office_times ALTER COLUMN id SET DEFAULT nextval('public.backup_team_office_times_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: bank_reconciliation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation ALTER COLUMN id SET DEFAULT nextval('public.bank_reconciliation_id_seq'::regclass);


--
-- Name: banners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners ALTER COLUMN id SET DEFAULT nextval('public.banners_id_seq'::regclass);


--
-- Name: batch_tracking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_tracking ALTER COLUMN id SET DEFAULT nextval('public.batch_tracking_id_seq'::regclass);


--
-- Name: blog_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories ALTER COLUMN id SET DEFAULT nextval('public.blog_categories_id_seq'::regclass);


--
-- Name: blog_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts ALTER COLUMN id SET DEFAULT nextval('public.blog_posts_id_seq'::regclass);


--
-- Name: blog_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags ALTER COLUMN id SET DEFAULT nextval('public.blog_tags_id_seq'::regclass);


--
-- Name: call_log_visibility_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log_visibility_history ALTER COLUMN id SET DEFAULT nextval('public.call_log_visibility_history_id_seq'::regclass);


--
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- Name: campaign_customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_customers ALTER COLUMN id SET DEFAULT nextval('public.campaign_customers_id_seq'::regclass);


--
-- Name: campaign_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members ALTER COLUMN id SET DEFAULT nextval('public.campaign_members_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: chart_of_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_id_seq'::regclass);


--
-- Name: combo_deal_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_images ALTER COLUMN id SET DEFAULT nextval('public.combo_deal_images_id_seq'::regclass);


--
-- Name: combo_deal_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_products ALTER COLUMN id SET DEFAULT nextval('public.combo_deal_products_id_seq'::regclass);


--
-- Name: combo_deals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deals ALTER COLUMN id SET DEFAULT nextval('public.combo_deals_id_seq'::regclass);


--
-- Name: commission_extra_partial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_extra_partial ALTER COLUMN id SET DEFAULT nextval('public.commission_extra_partial_id_seq'::regclass);


--
-- Name: commission_payment_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests ALTER COLUMN id SET DEFAULT nextval('public.commission_payment_requests_id_seq'::regclass);


--
-- Name: commission_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_settings ALTER COLUMN id SET DEFAULT nextval('public.commission_settings_id_seq'::regclass);


--
-- Name: commission_slabs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_slabs ALTER COLUMN id SET DEFAULT nextval('public.commission_slabs_id_seq'::regclass);


--
-- Name: coupon_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_campaigns ALTER COLUMN id SET DEFAULT nextval('public.coupon_campaigns_id_seq'::regclass);


--
-- Name: courier_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_configurations ALTER COLUMN id SET DEFAULT nextval('public.courier_configurations_id_seq'::regclass);


--
-- Name: courier_tracking_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_tracking_history ALTER COLUMN id SET DEFAULT nextval('public.courier_tracking_history_id_seq'::regclass);


--
-- Name: crm_call_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_call_tasks ALTER COLUMN id SET DEFAULT nextval('public.crm_call_tasks_id_seq'::regclass);


--
-- Name: crm_dashboard_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_dashboard_configs ALTER COLUMN id SET DEFAULT nextval('public.crm_dashboard_configs_id_seq'::regclass);


--
-- Name: crm_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_notifications ALTER COLUMN id SET DEFAULT nextval('public.crm_notifications_id_seq'::regclass);


--
-- Name: custom_deal_stages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_deal_stages ALTER COLUMN id SET DEFAULT nextval('public.custom_deal_stages_id_seq'::regclass);


--
-- Name: customer_addresses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses ALTER COLUMN id SET DEFAULT nextval('public.customer_addresses_id_seq'::regclass);


--
-- Name: customer_behavior id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_behavior ALTER COLUMN id SET DEFAULT nextval('public.customer_behavior_id_seq'::regclass);


--
-- Name: customer_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.customer_contacts_id_seq'::regclass);


--
-- Name: customer_dropoff_tracking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_dropoff_tracking ALTER COLUMN id SET DEFAULT nextval('public.customer_dropoff_tracking_id_seq'::regclass);


--
-- Name: customer_engagement_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_engagement_history ALTER COLUMN id SET DEFAULT nextval('public.customer_engagement_history_id_seq'::regclass);


--
-- Name: customer_family_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_family_members ALTER COLUMN id SET DEFAULT nextval('public.customer_family_members_id_seq'::regclass);


--
-- Name: customer_gifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_gifts ALTER COLUMN id SET DEFAULT nextval('public.customer_gifts_id_seq'::regclass);


--
-- Name: customer_interactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_interactions ALTER COLUMN id SET DEFAULT nextval('public.customer_interactions_id_seq'::regclass);


--
-- Name: customer_kyc id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_kyc ALTER COLUMN id SET DEFAULT nextval('public.customer_kyc_id_seq'::regclass);


--
-- Name: customer_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships ALTER COLUMN id SET DEFAULT nextval('public.customer_memberships_id_seq'::regclass);


--
-- Name: customer_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_metrics ALTER COLUMN id SET DEFAULT nextval('public.customer_metrics_id_seq'::regclass);


--
-- Name: customer_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes ALTER COLUMN id SET DEFAULT nextval('public.customer_notes_id_seq'::regclass);


--
-- Name: customer_page_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_page_visits ALTER COLUMN id SET DEFAULT nextval('public.customer_page_visits_id_seq'::regclass);


--
-- Name: customer_points id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_points ALTER COLUMN id SET DEFAULT nextval('public.customer_points_id_seq'::regclass);


--
-- Name: customer_product_reminders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_reminders ALTER COLUMN id SET DEFAULT nextval('public.customer_product_reminders_id_seq'::regclass);


--
-- Name: customer_product_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_suggestions ALTER COLUMN id SET DEFAULT nextval('public.customer_product_suggestions_id_seq'::regclass);


--
-- Name: customer_referrals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_referrals ALTER COLUMN id SET DEFAULT nextval('public.customer_referrals_id_seq'::regclass);


--
-- Name: customer_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reviews ALTER COLUMN id SET DEFAULT nextval('public.customer_reviews_id_seq'::regclass);


--
-- Name: customer_segments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments ALTER COLUMN id SET DEFAULT nextval('public.customer_segments_id_seq'::regclass);


--
-- Name: customer_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions ALTER COLUMN id SET DEFAULT nextval('public.customer_sessions_id_seq'::regclass);


--
-- Name: customer_tier_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tier_history ALTER COLUMN id SET DEFAULT nextval('public.customer_tier_history_id_seq'::regclass);


--
-- Name: customer_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tiers ALTER COLUMN id SET DEFAULT nextval('public.customer_tiers_id_seq'::regclass);


--
-- Name: customer_wallets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets ALTER COLUMN id SET DEFAULT nextval('public.customer_wallets_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: dashboard_widgets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets ALTER COLUMN id SET DEFAULT nextval('public.dashboard_widgets_id_seq'::regclass);


--
-- Name: deal_of_the_day id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_of_the_day ALTER COLUMN id SET DEFAULT nextval('public.deal_of_the_day_id_seq'::regclass);


--
-- Name: deal_stages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_stages ALTER COLUMN id SET DEFAULT nextval('public.deal_stages_id_seq'::regclass);


--
-- Name: deals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals ALTER COLUMN id SET DEFAULT nextval('public.deals_id_seq'::regclass);


--
-- Name: demand_forecasts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_forecasts ALTER COLUMN id SET DEFAULT nextval('public.demand_forecasts_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: dollar_consumption_calculations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dollar_consumption_calculations ALTER COLUMN id SET DEFAULT nextval('public.dollar_consumption_calculations_id_seq'::regclass);


--
-- Name: ecommerce_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders ALTER COLUMN id SET DEFAULT nextval('public.ecommerce_orders_id_seq'::regclass);


--
-- Name: email_subscribers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_subscribers ALTER COLUMN id SET DEFAULT nextval('public.email_subscribers_id_seq'::regclass);


--
-- Name: email_template_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_usage ALTER COLUMN id SET DEFAULT nextval('public.email_template_usage_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: email_tracking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking ALTER COLUMN id SET DEFAULT nextval('public.email_tracking_id_seq'::regclass);


--
-- Name: emails id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails ALTER COLUMN id SET DEFAULT nextval('public.emails_id_seq'::regclass);


--
-- Name: employee_benefits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_benefits ALTER COLUMN id SET DEFAULT nextval('public.employee_benefits_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: expiry_dates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_dates ALTER COLUMN id SET DEFAULT nextval('public.expiry_dates_id_seq'::regclass);


--
-- Name: faqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs ALTER COLUMN id SET DEFAULT nextval('public.faqs_id_seq'::regclass);


--
-- Name: follow_ups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups ALTER COLUMN id SET DEFAULT nextval('public.follow_ups_id_seq'::regclass);


--
-- Name: fraud_checks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_checks ALTER COLUMN id SET DEFAULT nextval('public.fraud_checks_id_seq'::regclass);


--
-- Name: goods_received_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes ALTER COLUMN id SET DEFAULT nextval('public.goods_received_notes_id_seq'::regclass);


--
-- Name: grn_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items ALTER COLUMN id SET DEFAULT nextval('public.grn_items_id_seq'::regclass);


--
-- Name: grocery_list_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grocery_list_items ALTER COLUMN id SET DEFAULT nextval('public.grocery_list_items_id_seq'::regclass);


--
-- Name: hot_deals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_deals ALTER COLUMN id SET DEFAULT nextval('public.hot_deals_id_seq'::regclass);


--
-- Name: hr_announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_announcements ALTER COLUMN id SET DEFAULT nextval('public.hr_announcements_id_seq'::regclass);


--
-- Name: hr_award_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_award_types ALTER COLUMN id SET DEFAULT nextval('public.hr_award_types_id_seq'::regclass);


--
-- Name: hr_awards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_awards ALTER COLUMN id SET DEFAULT nextval('public.hr_awards_id_seq'::regclass);


--
-- Name: hr_branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_branches ALTER COLUMN id SET DEFAULT nextval('public.hr_branches_id_seq'::regclass);


--
-- Name: hr_complaints id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_complaints ALTER COLUMN id SET DEFAULT nextval('public.hr_complaints_id_seq'::regclass);


--
-- Name: hr_departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_departments ALTER COLUMN id SET DEFAULT nextval('public.hr_departments_id_seq'::regclass);


--
-- Name: hr_designations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_designations ALTER COLUMN id SET DEFAULT nextval('public.hr_designations_id_seq'::regclass);


--
-- Name: hr_document_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_document_types ALTER COLUMN id SET DEFAULT nextval('public.hr_document_types_id_seq'::regclass);


--
-- Name: hr_employee_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_documents_id_seq'::regclass);


--
-- Name: hr_employee_performance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_performance ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_performance_id_seq'::regclass);


--
-- Name: hr_employee_trainings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_trainings_id_seq'::regclass);


--
-- Name: hr_employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees ALTER COLUMN id SET DEFAULT nextval('public.hr_employees_id_seq'::regclass);


--
-- Name: hr_holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_holidays ALTER COLUMN id SET DEFAULT nextval('public.hr_holidays_id_seq'::regclass);


--
-- Name: hr_performance_indicator_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_indicator_categories ALTER COLUMN id SET DEFAULT nextval('public.hr_performance_indicator_categories_id_seq'::regclass);


--
-- Name: hr_performance_indicators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_indicators ALTER COLUMN id SET DEFAULT nextval('public.hr_performance_indicators_id_seq'::regclass);


--
-- Name: hr_promotions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_promotions ALTER COLUMN id SET DEFAULT nextval('public.hr_promotions_id_seq'::regclass);


--
-- Name: hr_resignations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_resignations ALTER COLUMN id SET DEFAULT nextval('public.hr_resignations_id_seq'::regclass);


--
-- Name: hr_terminations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_terminations ALTER COLUMN id SET DEFAULT nextval('public.hr_terminations_id_seq'::regclass);


--
-- Name: hr_training_programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_programs ALTER COLUMN id SET DEFAULT nextval('public.hr_training_programs_id_seq'::regclass);


--
-- Name: hr_training_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_sessions ALTER COLUMN id SET DEFAULT nextval('public.hr_training_sessions_id_seq'::regclass);


--
-- Name: hr_training_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_types ALTER COLUMN id SET DEFAULT nextval('public.hr_training_types_id_seq'::regclass);


--
-- Name: hr_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_transfers ALTER COLUMN id SET DEFAULT nextval('public.hr_transfers_id_seq'::regclass);


--
-- Name: hr_trips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_trips ALTER COLUMN id SET DEFAULT nextval('public.hr_trips_id_seq'::regclass);


--
-- Name: hr_warnings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_warnings ALTER COLUMN id SET DEFAULT nextval('public.hr_warnings_id_seq'::regclass);


--
-- Name: incomplete_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomplete_orders ALTER COLUMN id SET DEFAULT nextval('public.incomplete_orders_id_seq'::regclass);


--
-- Name: integrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations ALTER COLUMN id SET DEFAULT nextval('public.integrations_id_seq'::regclass);


--
-- Name: interactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions ALTER COLUMN id SET DEFAULT nextval('public.interactions_id_seq'::regclass);


--
-- Name: interviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews ALTER COLUMN id SET DEFAULT nextval('public.interviews_id_seq'::regclass);


--
-- Name: inventory_count_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_count_items_id_seq'::regclass);


--
-- Name: inventory_counts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts ALTER COLUMN id SET DEFAULT nextval('public.inventory_counts_id_seq'::regclass);


--
-- Name: inventory_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_movements_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: job_applications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications ALTER COLUMN id SET DEFAULT nextval('public.job_applications_id_seq'::regclass);


--
-- Name: job_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_posts ALTER COLUMN id SET DEFAULT nextval('public.job_posts_id_seq'::regclass);


--
-- Name: journal_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN id SET DEFAULT nextval('public.journal_entries_id_seq'::regclass);


--
-- Name: journal_entry_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_details ALTER COLUMN id SET DEFAULT nextval('public.journal_entry_details_id_seq'::regclass);


--
-- Name: knowledgebase_articles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase_articles ALTER COLUMN id SET DEFAULT nextval('public.knowledgebase_articles_id_seq'::regclass);


--
-- Name: landing_page_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_orders ALTER COLUMN id SET DEFAULT nextval('public.landing_page_orders_id_seq'::regclass);


--
-- Name: landing_pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages ALTER COLUMN id SET DEFAULT nextval('public.landing_pages_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: leave_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types ALTER COLUMN id SET DEFAULT nextval('public.leave_types_id_seq'::regclass);


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: marketing_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns ALTER COLUMN id SET DEFAULT nextval('public.marketing_campaigns_id_seq'::regclass);


--
-- Name: meetings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings ALTER COLUMN id SET DEFAULT nextval('public.meetings_id_seq'::regclass);


--
-- Name: meta_capi_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_capi_events ALTER COLUMN id SET DEFAULT nextval('public.meta_capi_events_id_seq'::regclass);


--
-- Name: monthly_grocery_lists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_grocery_lists ALTER COLUMN id SET DEFAULT nextval('public.monthly_grocery_lists_id_seq'::regclass);


--
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- Name: offer_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_categories ALTER COLUMN id SET DEFAULT nextval('public.offer_categories_id_seq'::regclass);


--
-- Name: offer_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_codes ALTER COLUMN id SET DEFAULT nextval('public.offer_codes_id_seq'::regclass);


--
-- Name: offer_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_conditions ALTER COLUMN id SET DEFAULT nextval('public.offer_conditions_id_seq'::regclass);


--
-- Name: offer_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_products ALTER COLUMN id SET DEFAULT nextval('public.offer_products_id_seq'::regclass);


--
-- Name: offer_rewards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_rewards ALTER COLUMN id SET DEFAULT nextval('public.offer_rewards_id_seq'::regclass);


--
-- Name: offer_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_usage ALTER COLUMN id SET DEFAULT nextval('public.offer_usage_id_seq'::regclass);


--
-- Name: offers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers ALTER COLUMN id SET DEFAULT nextval('public.offers_id_seq'::regclass);


--
-- Name: opportunities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities ALTER COLUMN id SET DEFAULT nextval('public.opportunities_id_seq'::regclass);


--
-- Name: order_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.order_activity_logs_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_status_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history ALTER COLUMN id SET DEFAULT nextval('public.order_status_history_id_seq'::regclass);


--
-- Name: packaging_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packaging_configs ALTER COLUMN id SET DEFAULT nextval('public.packaging_configs_id_seq'::regclass);


--
-- Name: payment_methods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);


--
-- Name: payment_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.payment_transactions_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: payroll id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll ALTER COLUMN id SET DEFAULT nextval('public.payroll_id_seq'::regclass);


--
-- Name: performance_appraisals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_appraisals ALTER COLUMN id SET DEFAULT nextval('public.performance_appraisals_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: point_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions ALTER COLUMN id SET DEFAULT nextval('public.point_transactions_id_seq'::regclass);


--
-- Name: presence_calendar_override_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_calendar_override_history ALTER COLUMN id SET DEFAULT nextval('public.presence_calendar_override_history_id_seq'::regclass);


--
-- Name: presence_calendar_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_calendar_overrides ALTER COLUMN id SET DEFAULT nextval('public.presence_calendar_overrides_id_seq'::regclass);


--
-- Name: presence_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_settings ALTER COLUMN id SET DEFAULT nextval('public.presence_settings_id_seq'::regclass);


--
-- Name: presence_user_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_user_profiles ALTER COLUMN id SET DEFAULT nextval('public.presence_user_profiles_id_seq'::regclass);


--
-- Name: price_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_locks ALTER COLUMN id SET DEFAULT nextval('public.price_locks_id_seq'::regclass);


--
-- Name: printer_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printer_settings ALTER COLUMN id SET DEFAULT nextval('public.printer_settings_id_seq'::regclass);


--
-- Name: product_consumption_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_consumption_profiles ALTER COLUMN id SET DEFAULT nextval('public.product_consumption_profiles_id_seq'::regclass);


--
-- Name: product_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_history ALTER COLUMN id SET DEFAULT nextval('public.product_history_id_seq'::regclass);


--
-- Name: product_images id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images ALTER COLUMN id SET DEFAULT nextval('public.product_images_id_seq'::regclass);


--
-- Name: product_inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory ALTER COLUMN id SET DEFAULT nextval('public.product_inventory_id_seq'::regclass);


--
-- Name: product_price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history ALTER COLUMN id SET DEFAULT nextval('public.product_price_history_id_seq'::regclass);


--
-- Name: product_recommendation_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_recommendation_rules ALTER COLUMN id SET DEFAULT nextval('public.product_recommendation_rules_id_seq'::regclass);


--
-- Name: product_section_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_section_orders ALTER COLUMN id SET DEFAULT nextval('public.product_section_orders_id_seq'::regclass);


--
-- Name: product_suggestion_shortlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestion_shortlist ALTER COLUMN id SET DEFAULT nextval('public.product_suggestion_shortlist_id_seq'::regclass);


--
-- Name: product_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestions ALTER COLUMN id SET DEFAULT nextval('public.product_suggestions_id_seq'::regclass);


--
-- Name: product_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants ALTER COLUMN id SET DEFAULT nextval('public.product_variants_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: project_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones ALTER COLUMN id SET DEFAULT nextval('public.project_milestones_id_seq'::regclass);


--
-- Name: project_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks ALTER COLUMN id SET DEFAULT nextval('public.project_tasks_id_seq'::regclass);


--
-- Name: project_time_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_time_logs ALTER COLUMN id SET DEFAULT nextval('public.project_time_logs_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: purchase_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices ALTER COLUMN id SET DEFAULT nextval('public.purchase_invoices_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: purchase_requisition_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_requisition_items_id_seq'::regclass);


--
-- Name: purchase_requisitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions ALTER COLUMN id SET DEFAULT nextval('public.purchase_requisitions_id_seq'::regclass);


--
-- Name: quotation_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_items ALTER COLUMN id SET DEFAULT nextval('public.quotation_items_id_seq'::regclass);


--
-- Name: quotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations ALTER COLUMN id SET DEFAULT nextval('public.quotations_id_seq'::regclass);


--
-- Name: quote_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals ALTER COLUMN id SET DEFAULT nextval('public.quote_approvals_id_seq'::regclass);


--
-- Name: quote_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_templates ALTER COLUMN id SET DEFAULT nextval('public.quote_templates_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: referral_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_events ALTER COLUMN id SET DEFAULT nextval('public.referral_events_id_seq'::regclass);


--
-- Name: reorder_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules ALTER COLUMN id SET DEFAULT nextval('public.reorder_rules_id_seq'::regclass);


--
-- Name: repack_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repack_orders ALTER COLUMN id SET DEFAULT nextval('public.repack_orders_id_seq'::regclass);


--
-- Name: repeat_order_reminders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repeat_order_reminders ALTER COLUMN id SET DEFAULT nextval('public.repeat_order_reminders_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: returns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns ALTER COLUMN id SET DEFAULT nextval('public.returns_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: salary_structures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures ALTER COLUMN id SET DEFAULT nextval('public.salary_structures_id_seq'::regclass);


--
-- Name: sales_forecasts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_forecasts ALTER COLUMN id SET DEFAULT nextval('public.sales_forecasts_id_seq'::regclass);


--
-- Name: sales_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_metrics ALTER COLUMN id SET DEFAULT nextval('public.sales_metrics_id_seq'::regclass);


--
-- Name: sales_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items ALTER COLUMN id SET DEFAULT nextval('public.sales_order_items_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: sales_pipelines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipelines ALTER COLUMN id SET DEFAULT nextval('public.sales_pipelines_id_seq'::regclass);


--
-- Name: sales_quotas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotas ALTER COLUMN id SET DEFAULT nextval('public.sales_quotas_id_seq'::regclass);


--
-- Name: sales_team_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_team_assignments ALTER COLUMN id SET DEFAULT nextval('public.sales_team_assignments_id_seq'::regclass);


--
-- Name: sales_teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_teams ALTER COLUMN id SET DEFAULT nextval('public.sales_teams_id_seq'::regclass);


--
-- Name: scheduled_lead_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_lead_assignments ALTER COLUMN id SET DEFAULT nextval('public.scheduled_lead_assignments_id_seq'::regclass);


--
-- Name: segment_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_members ALTER COLUMN id SET DEFAULT nextval('public.segment_members_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: shipments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);


--
-- Name: sms_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_templates ALTER COLUMN id SET DEFAULT nextval('public.sms_templates_id_seq'::regclass);


--
-- Name: special_offers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_offers ALTER COLUMN id SET DEFAULT nextval('public.special_offers_id_seq'::regclass);


--
-- Name: stock_adjustment_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustment_items_id_seq'::regclass);


--
-- Name: stock_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustments_id_seq'::regclass);


--
-- Name: stock_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts ALTER COLUMN id SET DEFAULT nextval('public.stock_alerts_id_seq'::regclass);


--
-- Name: stock_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_batches ALTER COLUMN id SET DEFAULT nextval('public.stock_batches_id_seq'::regclass);


--
-- Name: stock_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels ALTER COLUMN id SET DEFAULT nextval('public.stock_levels_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: stock_reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations ALTER COLUMN id SET DEFAULT nextval('public.stock_reservations_id_seq'::regclass);


--
-- Name: stock_transfer_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items ALTER COLUMN id SET DEFAULT nextval('public.stock_transfer_items_id_seq'::regclass);


--
-- Name: stock_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers ALTER COLUMN id SET DEFAULT nextval('public.stock_transfers_id_seq'::regclass);


--
-- Name: supplier_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments ALTER COLUMN id SET DEFAULT nextval('public.supplier_payments_id_seq'::regclass);


--
-- Name: supplier_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products ALTER COLUMN id SET DEFAULT nextval('public.supplier_products_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: task_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments ALTER COLUMN id SET DEFAULT nextval('public.task_attachments_id_seq'::regclass);


--
-- Name: task_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments ALTER COLUMN id SET DEFAULT nextval('public.task_comments_id_seq'::regclass);


--
-- Name: task_dependencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies ALTER COLUMN id SET DEFAULT nextval('public.task_dependencies_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: team_a_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_a_data ALTER COLUMN id SET DEFAULT nextval('public.team_a_data_id_seq'::regclass);


--
-- Name: team_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_assignments ALTER COLUMN id SET DEFAULT nextval('public.team_assignments_id_seq'::regclass);


--
-- Name: team_b_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_b_data ALTER COLUMN id SET DEFAULT nextval('public.team_b_data_id_seq'::regclass);


--
-- Name: team_c_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_c_data ALTER COLUMN id SET DEFAULT nextval('public.team_c_data_id_seq'::regclass);


--
-- Name: team_d_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_d_data ALTER COLUMN id SET DEFAULT nextval('public.team_d_data_id_seq'::regclass);


--
-- Name: team_e_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_e_data ALTER COLUMN id SET DEFAULT nextval('public.team_e_data_id_seq'::regclass);


--
-- Name: team_leader_teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_leader_teams ALTER COLUMN id SET DEFAULT nextval('public.team_leader_teams_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: telephony_agent_presence_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_agent_presence_events ALTER COLUMN id SET DEFAULT nextval('public.telephony_agent_presence_events_id_seq'::regclass);


--
-- Name: telephony_assignment_call_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_assignment_call_logs ALTER COLUMN id SET DEFAULT nextval('public.telephony_assignment_call_logs_id_seq'::regclass);


--
-- Name: telephony_calls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_calls ALTER COLUMN id SET DEFAULT nextval('public.telephony_calls_id_seq'::regclass);


--
-- Name: ticket_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments ALTER COLUMN id SET DEFAULT nextval('public.ticket_attachments_id_seq'::regclass);


--
-- Name: ticket_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.ticket_comments_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: two_factor_auth id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factor_auth ALTER COLUMN id SET DEFAULT nextval('public.two_factor_auth_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: user_office_times id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_office_times ALTER COLUMN id SET DEFAULT nextval('public.user_office_times_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: user_presence_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence_events ALTER COLUMN id SET DEFAULT nextval('public.user_presence_events_id_seq'::regclass);


--
-- Name: user_presence_statuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence_statuses ALTER COLUMN id SET DEFAULT nextval('public.user_presence_statuses_id_seq'::regclass);


--
-- Name: user_product_views id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_views ALTER COLUMN id SET DEFAULT nextval('public.user_product_views_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Name: wallet_withdrawal_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_withdrawal_requests ALTER COLUMN id SET DEFAULT nextval('public.wallet_withdrawal_requests_id_seq'::regclass);


--
-- Name: warehouse_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations ALTER COLUMN id SET DEFAULT nextval('public.warehouse_locations_id_seq'::regclass);


--
-- Name: warehouse_zones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_zones ALTER COLUMN id SET DEFAULT nextval('public.warehouse_zones_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: workflow_executions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions ALTER COLUMN id SET DEFAULT nextval('public.workflow_executions_id_seq'::regclass);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: activity_templates activity_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_templates
    ADD CONSTRAINT activity_templates_pkey PRIMARY KEY (id);


--
-- Name: admin_menu_items admin_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_menu_items
    ADD CONSTRAINT admin_menu_items_pkey PRIMARY KEY (id);


--
-- Name: agent_commissions agent_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT agent_commissions_pkey PRIMARY KEY (id);


--
-- Name: agent_tl_history agent_tl_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_tl_history
    ADD CONSTRAINT agent_tl_history_pkey PRIMARY KEY (id);


--
-- Name: api_tokens api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_pkey PRIMARY KEY (id);


--
-- Name: api_tokens api_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_token_key UNIQUE (token);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: automatic_order_assignment_agent_preferences automatic_order_assignment_agent_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences
    ADD CONSTRAINT automatic_order_assignment_agent_preferences_pkey PRIMARY KEY (id);


--
-- Name: automatic_order_assignment_logs automatic_order_assignment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_logs
    ADD CONSTRAINT automatic_order_assignment_logs_pkey PRIMARY KEY (id);


--
-- Name: automatic_order_assignment_settings automatic_order_assignment_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_settings
    ADD CONSTRAINT automatic_order_assignment_settings_pkey PRIMARY KEY (id);


--
-- Name: automatic_order_assignment_settings automatic_order_assignment_settings_team_leader_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_settings
    ADD CONSTRAINT automatic_order_assignment_settings_team_leader_id_key UNIQUE (team_leader_id);


--
-- Name: automatic_order_assignment_team_work_types automatic_order_assignment_team_work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_team_work_types
    ADD CONSTRAINT automatic_order_assignment_team_work_types_pkey PRIMARY KEY (id);


--
-- Name: automation_workflows automation_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_workflows
    ADD CONSTRAINT automation_workflows_pkey PRIMARY KEY (id);


--
-- Name: backup_team_office_times backup_team_office_times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_team_office_times
    ADD CONSTRAINT backup_team_office_times_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_reconciliation bank_reconciliation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation
    ADD CONSTRAINT bank_reconciliation_pkey PRIMARY KEY (id);


--
-- Name: bank_reconciliation bank_reconciliation_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation
    ADD CONSTRAINT bank_reconciliation_uuid_key UNIQUE (uuid);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: banners banners_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_uuid_key UNIQUE (uuid);


--
-- Name: batch_tracking batch_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_tracking
    ADD CONSTRAINT batch_tracking_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);


--
-- Name: blog_post_tags blog_post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_pkey PRIMARY KEY (blog_post_id, blog_tag_id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: blog_tags blog_tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_name_key UNIQUE (name);


--
-- Name: blog_tags blog_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_pkey PRIMARY KEY (id);


--
-- Name: blog_tags blog_tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT blog_tags_slug_key UNIQUE (slug);


--
-- Name: call_log_visibility_history call_log_visibility_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log_visibility_history
    ADD CONSTRAINT call_log_visibility_history_pkey PRIMARY KEY (id);


--
-- Name: call_log_visibility call_log_visibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log_visibility
    ADD CONSTRAINT call_log_visibility_pkey PRIMARY KEY (log_key);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: campaign_customers campaign_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_customers
    ADD CONSTRAINT campaign_customers_pkey PRIMARY KEY (id);


--
-- Name: campaign_members campaign_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_uuid_key UNIQUE (uuid);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: chart_of_accounts chart_of_accounts_account_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_account_code_key UNIQUE (account_code);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: combo_deal_images combo_deal_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_images
    ADD CONSTRAINT combo_deal_images_pkey PRIMARY KEY (id);


--
-- Name: combo_deal_products combo_deal_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_products
    ADD CONSTRAINT combo_deal_products_pkey PRIMARY KEY (id);


--
-- Name: combo_deals combo_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deals
    ADD CONSTRAINT combo_deals_pkey PRIMARY KEY (id);


--
-- Name: combo_deals combo_deals_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deals
    ADD CONSTRAINT combo_deals_slug_key UNIQUE (slug);


--
-- Name: commission_extra_partial commission_extra_partial_agent_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_extra_partial
    ADD CONSTRAINT commission_extra_partial_agent_id_month_key UNIQUE (agent_id, month);


--
-- Name: commission_extra_partial commission_extra_partial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_extra_partial
    ADD CONSTRAINT commission_extra_partial_pkey PRIMARY KEY (id);


--
-- Name: commission_payment_requests commission_payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests
    ADD CONSTRAINT commission_payment_requests_pkey PRIMARY KEY (id);


--
-- Name: commission_settings commission_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_settings
    ADD CONSTRAINT commission_settings_pkey PRIMARY KEY (id);


--
-- Name: commission_slabs commission_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_slabs
    ADD CONSTRAINT commission_slabs_pkey PRIMARY KEY (id);


--
-- Name: coupon_campaigns coupon_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_campaigns
    ADD CONSTRAINT coupon_campaigns_pkey PRIMARY KEY (id);


--
-- Name: courier_configurations courier_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_configurations
    ADD CONSTRAINT courier_configurations_pkey PRIMARY KEY (id);


--
-- Name: courier_tracking_history courier_tracking_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_tracking_history
    ADD CONSTRAINT courier_tracking_history_pkey PRIMARY KEY (id);


--
-- Name: crm_call_tasks crm_call_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_call_tasks
    ADD CONSTRAINT crm_call_tasks_pkey PRIMARY KEY (id);


--
-- Name: crm_dashboard_configs crm_dashboard_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_dashboard_configs
    ADD CONSTRAINT crm_dashboard_configs_pkey PRIMARY KEY (id);


--
-- Name: crm_dashboard_configs crm_dashboard_configs_team_leader_id_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_dashboard_configs
    ADD CONSTRAINT crm_dashboard_configs_team_leader_id_config_key_key UNIQUE (team_leader_id, config_key);


--
-- Name: crm_notifications crm_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_notifications
    ADD CONSTRAINT crm_notifications_pkey PRIMARY KEY (id);


--
-- Name: custom_deal_stages custom_deal_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_deal_stages
    ADD CONSTRAINT custom_deal_stages_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_behavior customer_behavior_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_behavior
    ADD CONSTRAINT customer_behavior_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: customer_dropoff_tracking customer_dropoff_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_dropoff_tracking
    ADD CONSTRAINT customer_dropoff_tracking_pkey PRIMARY KEY (id);


--
-- Name: customer_engagement_history customer_engagement_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_engagement_history
    ADD CONSTRAINT customer_engagement_history_pkey PRIMARY KEY (id);


--
-- Name: customer_family_members customer_family_members_phone_required; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.customer_family_members
    ADD CONSTRAINT customer_family_members_phone_required CHECK (((phone IS NOT NULL) AND (length(btrim((phone)::text)) > 0))) NOT VALID;


--
-- Name: customer_family_members customer_family_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_family_members
    ADD CONSTRAINT customer_family_members_pkey PRIMARY KEY (id);


--
-- Name: customer_gifts customer_gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_gifts
    ADD CONSTRAINT customer_gifts_pkey PRIMARY KEY (id);


--
-- Name: customer_interactions customer_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_interactions
    ADD CONSTRAINT customer_interactions_pkey PRIMARY KEY (id);


--
-- Name: customer_kyc customer_kyc_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_kyc
    ADD CONSTRAINT customer_kyc_customer_id_key UNIQUE (customer_id);


--
-- Name: customer_kyc customer_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_kyc
    ADD CONSTRAINT customer_kyc_pkey PRIMARY KEY (id);


--
-- Name: customer_memberships customer_memberships_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_customer_id_key UNIQUE (customer_id);


--
-- Name: customer_memberships customer_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_pkey PRIMARY KEY (id);


--
-- Name: customer_metrics customer_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_metrics
    ADD CONSTRAINT customer_metrics_pkey PRIMARY KEY (id);


--
-- Name: customer_notes customer_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_pkey PRIMARY KEY (id);


--
-- Name: customer_page_visits customer_page_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_page_visits
    ADD CONSTRAINT customer_page_visits_pkey PRIMARY KEY (id);


--
-- Name: customer_points customer_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_points
    ADD CONSTRAINT customer_points_pkey PRIMARY KEY (id);


--
-- Name: customer_product_reminders customer_product_reminders_customer_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_reminders
    ADD CONSTRAINT customer_product_reminders_customer_id_product_id_key UNIQUE (customer_id, product_id);


--
-- Name: customer_product_reminders customer_product_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_reminders
    ADD CONSTRAINT customer_product_reminders_pkey PRIMARY KEY (id);


--
-- Name: customer_product_suggestions customer_product_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_suggestions
    ADD CONSTRAINT customer_product_suggestions_pkey PRIMARY KEY (id);


--
-- Name: customer_referrals customer_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_referrals
    ADD CONSTRAINT customer_referrals_pkey PRIMARY KEY (id);


--
-- Name: customer_referrals customer_referrals_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_referrals
    ADD CONSTRAINT customer_referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: customer_reviews customer_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reviews
    ADD CONSTRAINT customer_reviews_pkey PRIMARY KEY (id);


--
-- Name: customer_segments customer_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_pkey PRIMARY KEY (id);


--
-- Name: customer_sessions customer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_pkey PRIMARY KEY (id);


--
-- Name: customer_sessions customer_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_session_id_key UNIQUE (session_id);


--
-- Name: customer_tag_assignments customer_tag_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tag_assignments
    ADD CONSTRAINT customer_tag_assignments_pkey PRIMARY KEY (tag_id, customer_id);


--
-- Name: customer_tags customer_tags_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_name_unique UNIQUE (name);


--
-- Name: customer_tags customer_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tags
    ADD CONSTRAINT customer_tags_pkey PRIMARY KEY (id);


--
-- Name: customer_tier_history customer_tier_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tier_history
    ADD CONSTRAINT customer_tier_history_pkey PRIMARY KEY (id);


--
-- Name: customer_tiers customer_tiers_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tiers
    ADD CONSTRAINT customer_tiers_customer_id_key UNIQUE (customer_id);


--
-- Name: customer_tiers customer_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tiers
    ADD CONSTRAINT customer_tiers_pkey PRIMARY KEY (id);


--
-- Name: customer_wallets customer_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_uuid_key UNIQUE (uuid);


--
-- Name: dashboard_widgets dashboard_widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT dashboard_widgets_pkey PRIMARY KEY (id);


--
-- Name: deal_of_the_day deal_of_the_day_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_of_the_day
    ADD CONSTRAINT deal_of_the_day_pkey PRIMARY KEY (id);


--
-- Name: deal_stages deal_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_stages
    ADD CONSTRAINT deal_stages_pkey PRIMARY KEY (id);


--
-- Name: deal_stages deal_stages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_stages
    ADD CONSTRAINT deal_stages_slug_key UNIQUE (slug);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: demand_forecasts demand_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_forecasts
    ADD CONSTRAINT demand_forecasts_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: dollar_consumption_calculations dollar_consumption_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dollar_consumption_calculations
    ADD CONSTRAINT dollar_consumption_calculations_pkey PRIMARY KEY (id);


--
-- Name: ecommerce_orders ecommerce_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders
    ADD CONSTRAINT ecommerce_orders_order_number_key UNIQUE (order_number);


--
-- Name: ecommerce_orders ecommerce_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders
    ADD CONSTRAINT ecommerce_orders_pkey PRIMARY KEY (id);


--
-- Name: ecommerce_orders ecommerce_orders_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders
    ADD CONSTRAINT ecommerce_orders_uuid_key UNIQUE (uuid);


--
-- Name: email_subscribers email_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_subscribers
    ADD CONSTRAINT email_subscribers_email_key UNIQUE (email);


--
-- Name: email_subscribers email_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_subscribers
    ADD CONSTRAINT email_subscribers_pkey PRIMARY KEY (id);


--
-- Name: email_template_usage email_template_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_usage
    ADD CONSTRAINT email_template_usage_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_slug_key UNIQUE (slug);


--
-- Name: email_tracking email_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_pkey PRIMARY KEY (id);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: emails emails_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_uuid_key UNIQUE (uuid);


--
-- Name: employee_benefits employee_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_benefits
    ADD CONSTRAINT employee_benefits_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_code_key UNIQUE (employee_code);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);


--
-- Name: employees employees_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_uuid_key UNIQUE (uuid);


--
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_uuid_key UNIQUE (uuid);


--
-- Name: expiry_dates expiry_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_dates
    ADD CONSTRAINT expiry_dates_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: follow_ups follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_pkey PRIMARY KEY (id);


--
-- Name: fraud_checks fraud_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_checks
    ADD CONSTRAINT fraud_checks_pkey PRIMARY KEY (id);


--
-- Name: goods_received_notes goods_received_notes_grn_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_grn_number_key UNIQUE (grn_number);


--
-- Name: goods_received_notes goods_received_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_pkey PRIMARY KEY (id);


--
-- Name: grn_items grn_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);


--
-- Name: grocery_list_items grocery_list_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grocery_list_items
    ADD CONSTRAINT grocery_list_items_pkey PRIMARY KEY (id);


--
-- Name: hot_deals hot_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_deals
    ADD CONSTRAINT hot_deals_pkey PRIMARY KEY (id);


--
-- Name: hr_announcements hr_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_announcements
    ADD CONSTRAINT hr_announcements_pkey PRIMARY KEY (id);


--
-- Name: hr_award_types hr_award_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_award_types
    ADD CONSTRAINT hr_award_types_pkey PRIMARY KEY (id);


--
-- Name: hr_awards hr_awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_awards
    ADD CONSTRAINT hr_awards_pkey PRIMARY KEY (id);


--
-- Name: hr_branches hr_branches_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_branches
    ADD CONSTRAINT hr_branches_code_key UNIQUE (code);


--
-- Name: hr_branches hr_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_branches
    ADD CONSTRAINT hr_branches_pkey PRIMARY KEY (id);


--
-- Name: hr_complaints hr_complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_complaints
    ADD CONSTRAINT hr_complaints_pkey PRIMARY KEY (id);


--
-- Name: hr_departments hr_departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_departments
    ADD CONSTRAINT hr_departments_code_key UNIQUE (code);


--
-- Name: hr_departments hr_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_departments
    ADD CONSTRAINT hr_departments_pkey PRIMARY KEY (id);


--
-- Name: hr_designations hr_designations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_designations
    ADD CONSTRAINT hr_designations_code_key UNIQUE (code);


--
-- Name: hr_designations hr_designations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_designations
    ADD CONSTRAINT hr_designations_pkey PRIMARY KEY (id);


--
-- Name: hr_document_types hr_document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_document_types
    ADD CONSTRAINT hr_document_types_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_documents hr_employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents
    ADD CONSTRAINT hr_employee_documents_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_performance hr_employee_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_performance
    ADD CONSTRAINT hr_employee_performance_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_trainings hr_employee_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_pkey PRIMARY KEY (id);


--
-- Name: hr_employees hr_employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_email_key UNIQUE (email);


--
-- Name: hr_employees hr_employees_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_employee_code_key UNIQUE (employee_code);


--
-- Name: hr_employees hr_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_pkey PRIMARY KEY (id);


--
-- Name: hr_holidays hr_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_holidays
    ADD CONSTRAINT hr_holidays_pkey PRIMARY KEY (id);


--
-- Name: hr_performance_indicator_categories hr_performance_indicator_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_indicator_categories
    ADD CONSTRAINT hr_performance_indicator_categories_pkey PRIMARY KEY (id);


--
-- Name: hr_performance_indicators hr_performance_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_indicators
    ADD CONSTRAINT hr_performance_indicators_pkey PRIMARY KEY (id);


--
-- Name: hr_promotions hr_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_promotions
    ADD CONSTRAINT hr_promotions_pkey PRIMARY KEY (id);


--
-- Name: hr_resignations hr_resignations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_resignations
    ADD CONSTRAINT hr_resignations_pkey PRIMARY KEY (id);


--
-- Name: hr_terminations hr_terminations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_terminations
    ADD CONSTRAINT hr_terminations_pkey PRIMARY KEY (id);


--
-- Name: hr_training_programs hr_training_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_programs
    ADD CONSTRAINT hr_training_programs_pkey PRIMARY KEY (id);


--
-- Name: hr_training_sessions hr_training_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_sessions
    ADD CONSTRAINT hr_training_sessions_pkey PRIMARY KEY (id);


--
-- Name: hr_training_types hr_training_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_types
    ADD CONSTRAINT hr_training_types_pkey PRIMARY KEY (id);


--
-- Name: hr_transfers hr_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_transfers
    ADD CONSTRAINT hr_transfers_pkey PRIMARY KEY (id);


--
-- Name: hr_trips hr_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_trips
    ADD CONSTRAINT hr_trips_pkey PRIMARY KEY (id);


--
-- Name: hr_warnings hr_warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_warnings
    ADD CONSTRAINT hr_warnings_pkey PRIMARY KEY (id);


--
-- Name: incomplete_orders incomplete_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomplete_orders
    ADD CONSTRAINT incomplete_orders_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: inventory_count_items inventory_count_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_counts inventory_counts_count_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_count_number_key UNIQUE (count_number);


--
-- Name: inventory_counts inventory_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_uuid_key UNIQUE (uuid);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_posts job_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_posts
    ADD CONSTRAINT job_posts_pkey PRIMARY KEY (id);


--
-- Name: job_posts job_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_posts
    ADD CONSTRAINT job_posts_slug_key UNIQUE (slug);


--
-- Name: journal_entries journal_entries_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_entry_number_key UNIQUE (entry_number);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_uuid_key UNIQUE (uuid);


--
-- Name: journal_entry_details journal_entry_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_details
    ADD CONSTRAINT journal_entry_details_pkey PRIMARY KEY (id);


--
-- Name: knowledgebase_articles knowledgebase_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase_articles
    ADD CONSTRAINT knowledgebase_articles_pkey PRIMARY KEY (id);


--
-- Name: knowledgebase_articles knowledgebase_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase_articles
    ADD CONSTRAINT knowledgebase_articles_slug_key UNIQUE (slug);


--
-- Name: knowledgebase_articles knowledgebase_articles_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase_articles
    ADD CONSTRAINT knowledgebase_articles_uuid_key UNIQUE (uuid);


--
-- Name: landing_page_orders landing_page_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_orders
    ADD CONSTRAINT landing_page_orders_pkey PRIMARY KEY (id);


--
-- Name: landing_page_orders landing_page_orders_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_orders
    ADD CONSTRAINT landing_page_orders_uuid_key UNIQUE (uuid);


--
-- Name: landing_pages landing_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_pkey PRIMARY KEY (id);


--
-- Name: landing_pages landing_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_slug_key UNIQUE (slug);


--
-- Name: landing_pages landing_pages_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_uuid_key UNIQUE (uuid);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_uuid_key UNIQUE (uuid);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: meta_capi_events meta_capi_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_capi_events
    ADD CONSTRAINT meta_capi_events_pkey PRIMARY KEY (id);


--
-- Name: monthly_grocery_lists monthly_grocery_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_grocery_lists
    ADD CONSTRAINT monthly_grocery_lists_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: offer_categories offer_categories_offer_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_categories
    ADD CONSTRAINT offer_categories_offer_id_category_id_key UNIQUE (offer_id, category_id);


--
-- Name: offer_categories offer_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_categories
    ADD CONSTRAINT offer_categories_pkey PRIMARY KEY (id);


--
-- Name: offer_codes offer_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_codes
    ADD CONSTRAINT offer_codes_code_key UNIQUE (code);


--
-- Name: offer_codes offer_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_codes
    ADD CONSTRAINT offer_codes_pkey PRIMARY KEY (id);


--
-- Name: offer_conditions offer_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_conditions
    ADD CONSTRAINT offer_conditions_pkey PRIMARY KEY (id);


--
-- Name: offer_products offer_products_offer_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_products
    ADD CONSTRAINT offer_products_offer_id_product_id_key UNIQUE (offer_id, product_id);


--
-- Name: offer_products offer_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_products
    ADD CONSTRAINT offer_products_pkey PRIMARY KEY (id);


--
-- Name: offer_rewards offer_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_rewards
    ADD CONSTRAINT offer_rewards_pkey PRIMARY KEY (id);


--
-- Name: offer_usage offer_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_usage
    ADD CONSTRAINT offer_usage_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_uuid_key UNIQUE (uuid);


--
-- Name: order_activity_logs order_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_activity_logs
    ADD CONSTRAINT order_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: order_guard_settings order_guard_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_guard_settings
    ADD CONSTRAINT order_guard_settings_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: packaging_configs packaging_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packaging_configs
    ADD CONSTRAINT packaging_configs_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_uuid_key UNIQUE (uuid);


--
-- Name: payroll payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);


--
-- Name: payroll payroll_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_uuid_key UNIQUE (uuid);


--
-- Name: performance_appraisals performance_appraisals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_appraisals
    ADD CONSTRAINT performance_appraisals_pkey PRIMARY KEY (id);


--
-- Name: performance_appraisals performance_appraisals_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_appraisals
    ADD CONSTRAINT performance_appraisals_uuid_key UNIQUE (uuid);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_slug_key UNIQUE (slug);


--
-- Name: point_transactions point_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);


--
-- Name: presence_calendar_override_history presence_calendar_override_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_calendar_override_history
    ADD CONSTRAINT presence_calendar_override_history_pkey PRIMARY KEY (id);


--
-- Name: presence_calendar_overrides presence_calendar_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_calendar_overrides
    ADD CONSTRAINT presence_calendar_overrides_pkey PRIMARY KEY (id);


--
-- Name: presence_settings presence_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_settings
    ADD CONSTRAINT presence_settings_pkey PRIMARY KEY (id);


--
-- Name: presence_user_profiles presence_user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_user_profiles
    ADD CONSTRAINT presence_user_profiles_pkey PRIMARY KEY (id);


--
-- Name: presence_user_profiles presence_user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_user_profiles
    ADD CONSTRAINT presence_user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: price_locks price_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_locks
    ADD CONSTRAINT price_locks_pkey PRIMARY KEY (id);


--
-- Name: printer_settings printer_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printer_settings
    ADD CONSTRAINT printer_settings_pkey PRIMARY KEY (id);


--
-- Name: product_consumption_profiles product_consumption_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_consumption_profiles
    ADD CONSTRAINT product_consumption_profiles_pkey PRIMARY KEY (id);


--
-- Name: product_history product_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_history
    ADD CONSTRAINT product_history_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_inventory product_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_pkey PRIMARY KEY (id);


--
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);


--
-- Name: product_recommendation_rules product_recommendation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_recommendation_rules
    ADD CONSTRAINT product_recommendation_rules_pkey PRIMARY KEY (id);


--
-- Name: product_section_orders product_section_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_section_orders
    ADD CONSTRAINT product_section_orders_pkey PRIMARY KEY (id);


--
-- Name: product_section_orders product_section_orders_section_product_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_section_orders
    ADD CONSTRAINT product_section_orders_section_product_unique UNIQUE (section_key, product_id);


--
-- Name: product_suggestion_shortlist product_suggestion_shortlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestion_shortlist
    ADD CONSTRAINT product_suggestion_shortlist_pkey PRIMARY KEY (id);


--
-- Name: product_suggestion_shortlist product_suggestion_shortlist_unique_entry; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestion_shortlist
    ADD CONSTRAINT product_suggestion_shortlist_unique_entry UNIQUE (product_id, variant_key);


--
-- Name: product_suggestions product_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestions
    ADD CONSTRAINT product_suggestions_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_variant_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_variant_sku_key UNIQUE (variant_sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_uuid_key UNIQUE (uuid);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: project_tasks project_tasks_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_uuid_key UNIQUE (uuid);


--
-- Name: project_time_logs project_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_time_logs
    ADD CONSTRAINT project_time_logs_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);


--
-- Name: projects projects_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_uuid_key UNIQUE (uuid);


--
-- Name: purchase_invoices purchase_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: purchase_invoices purchase_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoices purchase_invoices_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_uuid_key UNIQUE (uuid);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: purchase_requisition_items purchase_requisition_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_requisitions purchase_requisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (id);


--
-- Name: purchase_requisitions purchase_requisitions_requisition_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_requisition_number_key UNIQUE (requisition_number);


--
-- Name: purchase_requisitions purchase_requisitions_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_uuid_key UNIQUE (uuid);


--
-- Name: quotation_items quotation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_quotation_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_number_key UNIQUE (quotation_number);


--
-- Name: quotations quotations_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_uuid_key UNIQUE (uuid);


--
-- Name: quote_approvals quote_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals
    ADD CONSTRAINT quote_approvals_pkey PRIMARY KEY (id);


--
-- Name: quote_templates quote_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_templates
    ADD CONSTRAINT quote_templates_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: referral_campaigns referral_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_campaigns
    ADD CONSTRAINT referral_campaigns_pkey PRIMARY KEY (id);


--
-- Name: referral_events referral_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_events
    ADD CONSTRAINT referral_events_pkey PRIMARY KEY (id);


--
-- Name: referral_partners referral_partners_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_code_key UNIQUE (code);


--
-- Name: referral_partners referral_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_pkey PRIMARY KEY (id);


--
-- Name: reorder_rules reorder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_pkey PRIMARY KEY (id);


--
-- Name: repack_orders repack_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repack_orders
    ADD CONSTRAINT repack_orders_pkey PRIMARY KEY (id);


--
-- Name: repack_orders repack_orders_repack_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repack_orders
    ADD CONSTRAINT repack_orders_repack_number_key UNIQUE (repack_number);


--
-- Name: repeat_order_reminders repeat_order_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repeat_order_reminders
    ADD CONSTRAINT repeat_order_reminders_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reports reports_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_uuid_key UNIQUE (uuid);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: returns returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_return_number_key UNIQUE (return_number);


--
-- Name: returns returns_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_uuid_key UNIQUE (uuid);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_slug_key UNIQUE (slug);


--
-- Name: roles roles_slug_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_slug_key1 UNIQUE (slug);


--
-- Name: salary_structures salary_structures_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_employee_id_key UNIQUE (employee_id);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: sales_forecasts sales_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_forecasts
    ADD CONSTRAINT sales_forecasts_pkey PRIMARY KEY (id);


--
-- Name: sales_metrics sales_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_metrics
    ADD CONSTRAINT sales_metrics_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_sales_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_sales_order_number_key UNIQUE (sales_order_number);


--
-- Name: sales_orders sales_orders_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_uuid_key UNIQUE (uuid);


--
-- Name: sales_pipelines sales_pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_pipelines
    ADD CONSTRAINT sales_pipelines_pkey PRIMARY KEY (id);


--
-- Name: sales_quotas sales_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotas
    ADD CONSTRAINT sales_quotas_pkey PRIMARY KEY (id);


--
-- Name: sales_team_assignments sales_team_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_team_assignments
    ADD CONSTRAINT sales_team_assignments_pkey PRIMARY KEY (id);


--
-- Name: sales_teams sales_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_teams
    ADD CONSTRAINT sales_teams_pkey PRIMARY KEY (id);


--
-- Name: scheduled_lead_assignments scheduled_lead_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_lead_assignments
    ADD CONSTRAINT scheduled_lead_assignments_pkey PRIMARY KEY (id);


--
-- Name: segment_members segment_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_members
    ADD CONSTRAINT segment_members_pkey PRIMARY KEY (id);


--
-- Name: segment_members segment_members_segment_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_members
    ADD CONSTRAINT segment_members_segment_id_customer_id_key UNIQUE (segment_id, customer_id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_shipment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_shipment_number_key UNIQUE (shipment_number);


--
-- Name: shipments shipments_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_uuid_key UNIQUE (uuid);


--
-- Name: sms_templates sms_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_templates
    ADD CONSTRAINT sms_templates_pkey PRIMARY KEY (id);


--
-- Name: sms_templates sms_templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_templates
    ADD CONSTRAINT sms_templates_slug_key UNIQUE (slug);


--
-- Name: special_offers special_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_offers
    ADD CONSTRAINT special_offers_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustment_items stock_adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_adjustment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_adjustment_number_key UNIQUE (adjustment_number);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: stock_alerts stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: stock_batches stock_batches_batch_number_product_id_warehouse_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_batches
    ADD CONSTRAINT stock_batches_batch_number_product_id_warehouse_id_key UNIQUE (batch_number, product_id, warehouse_id);


--
-- Name: stock_batches stock_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_batches
    ADD CONSTRAINT stock_batches_pkey PRIMARY KEY (id);


--
-- Name: stock_levels stock_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_reference_number_key UNIQUE (reference_number);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_uuid_key UNIQUE (uuid);


--
-- Name: supplier_products supplier_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_code_key UNIQUE (code);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_a_data team_a_data_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_a_data
    ADD CONSTRAINT team_a_data_customer_id_key UNIQUE (customer_id);


--
-- Name: team_a_data team_a_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_a_data
    ADD CONSTRAINT team_a_data_pkey PRIMARY KEY (id);


--
-- Name: team_assignments team_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_assignments
    ADD CONSTRAINT team_assignments_pkey PRIMARY KEY (id);


--
-- Name: team_b_data team_b_data_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_b_data
    ADD CONSTRAINT team_b_data_customer_id_key UNIQUE (customer_id);


--
-- Name: team_b_data team_b_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_b_data
    ADD CONSTRAINT team_b_data_pkey PRIMARY KEY (id);


--
-- Name: team_c_data team_c_data_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_c_data
    ADD CONSTRAINT team_c_data_customer_id_key UNIQUE (customer_id);


--
-- Name: team_c_data team_c_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_c_data
    ADD CONSTRAINT team_c_data_pkey PRIMARY KEY (id);


--
-- Name: team_d_data team_d_data_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_d_data
    ADD CONSTRAINT team_d_data_customer_id_key UNIQUE (customer_id);


--
-- Name: team_d_data team_d_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_d_data
    ADD CONSTRAINT team_d_data_pkey PRIMARY KEY (id);


--
-- Name: team_e_data team_e_data_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_e_data
    ADD CONSTRAINT team_e_data_customer_id_key UNIQUE (customer_id);


--
-- Name: team_e_data team_e_data_permanent_membership_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_e_data
    ADD CONSTRAINT team_e_data_permanent_membership_number_key UNIQUE (permanent_membership_number);


--
-- Name: team_e_data team_e_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_e_data
    ADD CONSTRAINT team_e_data_pkey PRIMARY KEY (id);


--
-- Name: team_leader_teams team_leader_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_leader_teams
    ADD CONSTRAINT team_leader_teams_pkey PRIMARY KEY (id);


--
-- Name: team_leader_teams team_leader_teams_team_leader_id_team_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_leader_teams
    ADD CONSTRAINT team_leader_teams_team_leader_id_team_type_key UNIQUE (team_leader_id, team_type);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_key UNIQUE (user_id);


--
-- Name: telephony_agent_presence_events telephony_agent_presence_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_agent_presence_events
    ADD CONSTRAINT telephony_agent_presence_events_pkey PRIMARY KEY (id);


--
-- Name: telephony_assignment_call_logs telephony_assignment_call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_assignment_call_logs
    ADD CONSTRAINT telephony_assignment_call_logs_pkey PRIMARY KEY (id);


--
-- Name: telephony_calls telephony_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_calls
    ADD CONSTRAINT telephony_calls_pkey PRIMARY KEY (id);


--
-- Name: ticket_attachments ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);


--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: tickets tickets_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_uuid_key UNIQUE (uuid);


--
-- Name: two_factor_auth two_factor_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT two_factor_auth_pkey PRIMARY KEY (id);


--
-- Name: two_factor_auth two_factor_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT two_factor_auth_user_id_key UNIQUE (user_id);


--
-- Name: agent_commissions unique_agent_order_commission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT unique_agent_order_commission UNIQUE (agent_id, sales_order_id);


--
-- Name: products unique_product_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT unique_product_slug UNIQUE (slug);


--
-- Name: product_suggestions unique_product_suggestion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestions
    ADD CONSTRAINT unique_product_suggestion UNIQUE (product_id, suggested_product_id);


--
-- Name: automatic_order_assignment_agent_preferences uq_auto_assignment_agent_preference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences
    ADD CONSTRAINT uq_auto_assignment_agent_preference UNIQUE (team_leader_id, agent_id);


--
-- Name: automatic_order_assignment_team_work_types uq_auto_assignment_team_work_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_team_work_types
    ADD CONSTRAINT uq_auto_assignment_team_work_type UNIQUE (team_leader_id, team_id, work_type);


--
-- Name: presence_calendar_overrides uq_presence_calendar_overrides_user_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_calendar_overrides
    ADD CONSTRAINT uq_presence_calendar_overrides_user_date UNIQUE (user_id, date_key);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_office_times user_office_times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_office_times
    ADD CONSTRAINT user_office_times_pkey PRIMARY KEY (id);


--
-- Name: user_office_times user_office_times_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_office_times
    ADD CONSTRAINT user_office_times_user_id_key UNIQUE (user_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_presence_events user_presence_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence_events
    ADD CONSTRAINT user_presence_events_pkey PRIMARY KEY (id);


--
-- Name: user_presence_statuses user_presence_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence_statuses
    ADD CONSTRAINT user_presence_statuses_pkey PRIMARY KEY (id);


--
-- Name: user_presence_statuses user_presence_statuses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_presence_statuses
    ADD CONSTRAINT user_presence_statuses_user_id_key UNIQUE (user_id);


--
-- Name: user_product_views user_product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_views
    ADD CONSTRAINT user_product_views_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uuid_key UNIQUE (uuid);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallet_withdrawal_requests wallet_withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_withdrawal_requests
    ADD CONSTRAINT wallet_withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: warehouse_locations warehouse_locations_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_barcode_key UNIQUE (barcode);


--
-- Name: warehouse_locations warehouse_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id);


--
-- Name: warehouse_locations warehouse_locations_warehouse_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_warehouse_id_code_key UNIQUE (warehouse_id, code);


--
-- Name: warehouse_zones warehouse_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_zones
    ADD CONSTRAINT warehouse_zones_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_code_key UNIQUE (code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: workflow_executions workflow_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);


--
-- Name: idx_activities_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_customer ON public.activities USING btree (customer_id);


--
-- Name: idx_activities_customer_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_customer_type ON public.activities USING btree (customer_id, type);


--
-- Name: idx_activities_customer_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_customer_type_created ON public.activities USING btree (customer_id, type, created_at);


--
-- Name: idx_activities_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_deal ON public.activities USING btree (deal_id);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type ON public.activities USING btree (type);


--
-- Name: idx_activities_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_user ON public.activities USING btree (user_id);


--
-- Name: idx_activity_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created ON public.activity_logs USING btree (created_at);


--
-- Name: idx_activity_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_module ON public.activity_logs USING btree (module);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_admin_menu_items_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_menu_items_active ON public.admin_menu_items USING btree (is_active);


--
-- Name: idx_admin_menu_items_parent_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_menu_items_parent_sort ON public.admin_menu_items USING btree (parent_id, sort_order);


--
-- Name: idx_agent_commissions_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_commissions_agent ON public.agent_commissions USING btree (agent_id);


--
-- Name: idx_agent_commissions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_commissions_created ON public.agent_commissions USING btree (created_at);


--
-- Name: idx_agent_commissions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_commissions_order ON public.agent_commissions USING btree (sales_order_id);


--
-- Name: idx_agent_commissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_commissions_status ON public.agent_commissions USING btree (status);


--
-- Name: idx_ath_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ath_agent ON public.agent_tl_history USING btree (agent_id);


--
-- Name: idx_ath_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ath_dates ON public.agent_tl_history USING btree (valid_from, valid_until);


--
-- Name: idx_ath_tl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ath_tl ON public.agent_tl_history USING btree (team_leader_id);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (attendance_date);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_date ON public.attendance USING btree (employee_id, attendance_date);


--
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_id ON public.attendance USING btree (employee_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);


--
-- Name: idx_audit_logs_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs USING btree (performed_by);


--
-- Name: idx_auto_assignment_agent_preferences_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_agent_preferences_product ON public.automatic_order_assignment_agent_preferences USING btree (product_id);


--
-- Name: idx_auto_assignment_agent_preferences_tl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_agent_preferences_tl ON public.automatic_order_assignment_agent_preferences USING btree (team_leader_id);


--
-- Name: idx_auto_assignment_logs_agent_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_logs_agent_created ON public.automatic_order_assignment_logs USING btree (agent_id, created_at DESC);


--
-- Name: idx_auto_assignment_logs_record_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_logs_record_type_created ON public.automatic_order_assignment_logs USING btree (record_type, created_at DESC);


--
-- Name: idx_auto_assignment_logs_tl_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_logs_tl_created ON public.automatic_order_assignment_logs USING btree (team_leader_id, created_at DESC);


--
-- Name: idx_auto_assignment_settings_tl_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_settings_tl_enabled ON public.automatic_order_assignment_settings USING btree (team_leader_id, is_enabled);


--
-- Name: idx_auto_assignment_team_work_types_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_team_work_types_team ON public.automatic_order_assignment_team_work_types USING btree (team_id);


--
-- Name: idx_auto_assignment_team_work_types_tl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_assignment_team_work_types_tl ON public.automatic_order_assignment_team_work_types USING btree (team_leader_id);


--
-- Name: idx_backup_team_office_times_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_team_office_times_user ON public.backup_team_office_times USING btree (user_id);


--
-- Name: idx_backup_team_office_times_weekdays; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_team_office_times_weekdays ON public.backup_team_office_times USING gin (weekdays);


--
-- Name: idx_banner_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banner_type ON public.banners USING btree (banner_type);


--
-- Name: idx_batch_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_expiry ON public.stock_batches USING btree (expiry_date);


--
-- Name: idx_batch_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_number ON public.stock_batches USING btree (batch_number);


--
-- Name: idx_batch_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_product ON public.stock_batches USING btree (product_id);


--
-- Name: idx_batch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_status ON public.stock_batches USING btree (status);


--
-- Name: idx_behavior_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_customer ON public.customer_behavior USING btree (customer_id);


--
-- Name: idx_behavior_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_date ON public.customer_behavior USING btree (created_at);


--
-- Name: idx_behavior_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_product ON public.customer_behavior USING btree (product_id) WHERE (product_id IS NOT NULL);


--
-- Name: idx_behavior_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_behavior_type ON public.customer_behavior USING btree (behavior_type);


--
-- Name: idx_blog_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_categories_slug ON public.blog_categories USING btree (slug);


--
-- Name: idx_blog_posts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_category ON public.blog_posts USING btree (category_id);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);


--
-- Name: idx_blog_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_tags_slug ON public.blog_tags USING btree (slug);


--
-- Name: idx_call_log_visibility_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_log_visibility_customer ON public.call_log_visibility USING btree (customer_id, hidden_from_sales_agents);


--
-- Name: idx_call_log_visibility_history_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_log_visibility_history_log ON public.call_log_visibility_history USING btree (log_key, changed_at DESC);


--
-- Name: idx_call_tasks_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_tasks_agent ON public.crm_call_tasks USING btree (assigned_agent_id);


--
-- Name: idx_call_tasks_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_tasks_customer ON public.crm_call_tasks USING btree (customer_id);


--
-- Name: idx_call_tasks_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_tasks_date ON public.crm_call_tasks USING btree (task_date);


--
-- Name: idx_call_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_tasks_priority ON public.crm_call_tasks USING btree (priority);


--
-- Name: idx_call_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_tasks_status ON public.crm_call_tasks USING btree (status);


--
-- Name: idx_campaign_customers_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_customers_campaign ON public.campaign_customers USING btree (campaign_id);


--
-- Name: idx_campaign_customers_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_customers_customer ON public.campaign_customers USING btree (customer_id);


--
-- Name: idx_campaign_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_customers_phone ON public.campaign_customers USING btree (customer_phone);


--
-- Name: idx_campaign_customers_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_campaign_customers_uniq ON public.campaign_customers USING btree (campaign_id, customer_id) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_campaign_customers_uniq_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_campaign_customers_uniq_phone ON public.campaign_customers USING btree (campaign_id, customer_phone) WHERE ((customer_phone IS NOT NULL) AND (customer_id IS NULL));


--
-- Name: idx_campaigns_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_active ON public.marketing_campaigns USING btree (is_active);


--
-- Name: idx_campaigns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_type ON public.marketing_campaigns USING btree (campaign_type);


--
-- Name: idx_cart_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_customer_id ON public.cart_items USING btree (customer_id);


--
-- Name: idx_cart_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_session_id ON public.cart_items USING btree (session_id);


--
-- Name: idx_combo_deal_images_combo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_deal_images_combo_id ON public.combo_deal_images USING btree (combo_deal_id);


--
-- Name: idx_combo_deal_images_combo_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_deal_images_combo_order ON public.combo_deal_images USING btree (combo_deal_id, is_primary DESC, display_order);


--
-- Name: idx_combo_deal_products_combo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_deal_products_combo_id ON public.combo_deal_products USING btree (combo_deal_id);


--
-- Name: idx_combo_deal_products_combo_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_deal_products_combo_order ON public.combo_deal_products USING btree (combo_deal_id, display_order, id);


--
-- Name: idx_combo_deal_products_combo_product_variant_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_combo_deal_products_combo_product_variant_unique ON public.combo_deal_products USING btree (combo_deal_id, product_id, COALESCE(variant_name, ''::character varying));


--
-- Name: idx_combo_deal_products_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_deal_products_product_id ON public.combo_deal_products USING btree (product_id);


--
-- Name: idx_combo_deals_display_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_combo_deals_display_position ON public.combo_deals USING btree (display_position);


--
-- Name: idx_commission_payment_requests_agent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_payment_requests_agent_id ON public.commission_payment_requests USING btree (agent_id);


--
-- Name: idx_commission_payment_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_payment_requests_created_at ON public.commission_payment_requests USING btree (created_at);


--
-- Name: idx_commission_payment_requests_one_open_per_month; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_commission_payment_requests_one_open_per_month ON public.commission_payment_requests USING btree (agent_id, commission_month) WHERE (((status)::text = 'pending'::text) AND (commission_month IS NOT NULL));


--
-- Name: idx_commission_payment_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_payment_requests_status ON public.commission_payment_requests USING btree (status);


--
-- Name: idx_commission_settings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_settings_active ON public.commission_settings USING btree (is_active);


--
-- Name: idx_commission_settings_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_settings_agent ON public.commission_settings USING btree (agent_id);


--
-- Name: idx_commission_settings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_settings_type ON public.commission_settings USING btree (setting_type);


--
-- Name: idx_commission_slabs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_slabs_active ON public.commission_slabs USING btree (is_active);


--
-- Name: idx_commission_slabs_role_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_slabs_role_tier ON public.commission_slabs USING btree (role_type, agent_tier);


--
-- Name: idx_commission_slabs_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_commission_slabs_unique_active ON public.commission_slabs USING btree (role_type, agent_tier, slab_type, min_order_count) WHERE (is_active = true);


--
-- Name: idx_consumption_profile_category; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_consumption_profile_category ON public.product_consumption_profiles USING btree (category_id) WHERE (category_id IS NOT NULL);


--
-- Name: idx_consumption_profile_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_consumption_profile_product ON public.product_consumption_profiles USING btree (product_id) WHERE (product_id IS NOT NULL);


--
-- Name: idx_coupon_campaigns_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_campaigns_active ON public.coupon_campaigns USING btree (is_active);


--
-- Name: idx_coupon_campaigns_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_coupon_campaigns_code ON public.coupon_campaigns USING btree (upper((code)::text)) WHERE (code IS NOT NULL);


--
-- Name: idx_coupon_campaigns_trigger; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_campaigns_trigger ON public.coupon_campaigns USING btree (trigger_product_id) WHERE (trigger_product_id IS NOT NULL);


--
-- Name: idx_courier_configurations_companyname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_configurations_companyname ON public.courier_configurations USING btree (companyname);


--
-- Name: idx_courier_tracking_consignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_tracking_consignment ON public.courier_tracking_history USING btree (consignment_id) WHERE (consignment_id IS NOT NULL);


--
-- Name: idx_courier_tracking_history_order_delivered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_tracking_history_order_delivered ON public.courier_tracking_history USING btree (order_id, lower((status)::text), updated_at DESC);


--
-- Name: idx_courier_tracking_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_tracking_order_id ON public.courier_tracking_history USING btree (order_id);


--
-- Name: idx_courier_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courier_tracking_status ON public.courier_tracking_history USING btree (status);


--
-- Name: idx_crm_call_tasks_customer_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_call_tasks_customer_dates ON public.crm_call_tasks USING btree (customer_id, completed_at, updated_at, created_at);


--
-- Name: idx_crm_call_tasks_customer_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_call_tasks_customer_outcome ON public.crm_call_tasks USING btree (customer_id, call_outcome);


--
-- Name: idx_crm_notif_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_notif_user_unread ON public.crm_notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_crm_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_notifications_created_at ON public.crm_notifications USING btree (created_at DESC);


--
-- Name: idx_crm_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crm_notifications_user_read ON public.crm_notifications USING btree (user_id, is_read);


--
-- Name: idx_custom_deal_stages_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_custom_deal_stages_position ON public.custom_deal_stages USING btree (pipeline_id, "position") WHERE (is_active = true);


--
-- Name: idx_customer_addresses_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses USING btree (customer_id);


--
-- Name: idx_customer_engagement_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_engagement_customer_created ON public.customer_engagement_history USING btree (customer_id, created_at);


--
-- Name: idx_customer_engagement_customer_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_engagement_customer_type ON public.customer_engagement_history USING btree (customer_id, engagement_type);


--
-- Name: idx_customer_engagement_customer_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_engagement_customer_type_created ON public.customer_engagement_history USING btree (customer_id, engagement_type, created_at);


--
-- Name: idx_customer_family_members_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_family_members_phone ON public.customer_family_members USING btree (phone);


--
-- Name: idx_customer_memberships_permanent_card; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customer_memberships_permanent_card ON public.customer_memberships USING btree (permanent_card_number) WHERE (permanent_card_number IS NOT NULL);


--
-- Name: idx_customer_points_customer_id_unique_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customer_points_customer_id_unique_notnull ON public.customer_points USING btree (customer_id) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_customer_points_customer_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_points_customer_uuid ON public.customer_points USING btree (customer_uuid);


--
-- Name: idx_customer_points_customer_uuid_unique_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customer_points_customer_uuid_unique_notnull ON public.customer_points USING btree (customer_uuid) WHERE (customer_uuid IS NOT NULL);


--
-- Name: idx_customer_product_reminders_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_product_reminders_due ON public.customer_product_reminders USING btree (reminder_due_date);


--
-- Name: idx_customer_product_reminders_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_product_reminders_sent ON public.customer_product_reminders USING btree (reminder_sent);


--
-- Name: idx_customer_product_suggestions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_product_suggestions_customer ON public.customer_product_suggestions USING btree (customer_id);


--
-- Name: idx_customer_product_suggestions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_product_suggestions_product ON public.customer_product_suggestions USING btree (product_id);


--
-- Name: idx_customer_product_suggestions_suggestion_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_product_suggestions_suggestion_trgm ON public.customer_product_suggestions USING gin (suggestion public.gin_trgm_ops);


--
-- Name: idx_customer_product_suggestions_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_product_suggestions_updated ON public.customer_product_suggestions USING btree (updated_at DESC);


--
-- Name: idx_customer_reviews_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_reviews_featured ON public.customer_reviews USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_customer_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_reviews_product ON public.customer_reviews USING btree (product_id);


--
-- Name: idx_customer_tag_assignments_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tag_assignments_customer_id ON public.customer_tag_assignments USING btree (customer_id);


--
-- Name: idx_customer_tag_assignments_customer_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tag_assignments_customer_tag ON public.customer_tag_assignments USING btree (customer_id, tag_id);


--
-- Name: idx_customer_tag_assignments_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tag_assignments_tag_id ON public.customer_tag_assignments USING btree (tag_id);


--
-- Name: idx_customer_tiers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_active ON public.customer_tiers USING btree (is_active);


--
-- Name: idx_customer_tiers_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_customer ON public.customer_tiers USING btree (customer_id);


--
-- Name: idx_customer_tiers_customer_assigned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_customer_assigned_at ON public.customer_tiers USING btree (customer_id, tier_assigned_at);


--
-- Name: idx_customer_tiers_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_customer_id ON public.customer_tiers USING btree (customer_id);


--
-- Name: idx_customer_tiers_customer_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_customer_tier ON public.customer_tiers USING btree (customer_id, tier);


--
-- Name: idx_customer_tiers_customer_tier_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_customer_tier_active ON public.customer_tiers USING btree (customer_id, tier, is_active);


--
-- Name: idx_customer_tiers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_is_active ON public.customer_tiers USING btree (is_active);


--
-- Name: idx_customer_tiers_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_tier ON public.customer_tiers USING btree (tier);


--
-- Name: idx_customer_tiers_tier_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tiers_tier_customer ON public.customer_tiers USING btree (tier, customer_id);


--
-- Name: idx_customer_wallets_customer_id_unique_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customer_wallets_customer_id_unique_notnull ON public.customer_wallets USING btree (customer_id) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_customer_wallets_customer_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_wallets_customer_uuid ON public.customer_wallets USING btree (customer_uuid);


--
-- Name: idx_customer_wallets_customer_uuid_unique_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customer_wallets_customer_uuid_unique_notnull ON public.customer_wallets USING btree (customer_uuid) WHERE (customer_uuid IS NOT NULL);


--
-- Name: idx_customers_active_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_active_created ON public.customers USING btree (is_deleted, created_at DESC);


--
-- Name: idx_customers_address_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_address_trgm ON public.customers USING gin (address public.gin_trgm_ops);


--
-- Name: idx_customers_anniversary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_anniversary ON public.customers USING btree (anniversary_date);


--
-- Name: idx_customers_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned ON public.customers USING btree (assigned_to);


--
-- Name: idx_customers_assigned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_at ON public.customers USING btree (assigned_at);


--
-- Name: idx_customers_assigned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_by ON public.customers USING btree (assigned_by);


--
-- Name: idx_customers_assigned_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_supervisor ON public.customers USING btree (assigned_supervisor_id);


--
-- Name: idx_customers_assigned_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_team ON public.customers USING btree (assigned_team_member_id);


--
-- Name: idx_customers_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_to ON public.customers USING btree (assigned_to);


--
-- Name: idx_customers_assigned_to_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_to_at ON public.customers USING btree (assigned_to, assigned_at);


--
-- Name: idx_customers_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_assigned_user ON public.customers USING btree (assigned_user_id);


--
-- Name: idx_customers_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_city ON public.customers USING btree (city);


--
-- Name: idx_customers_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_created_at ON public.customers USING btree (created_at);


--
-- Name: idx_customers_customer_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_customer_type ON public.customers USING btree (customer_type);


--
-- Name: idx_customers_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_district ON public.customers USING btree (district);


--
-- Name: idx_customers_dob; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_dob ON public.customers USING btree (date_of_birth);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email);


--
-- Name: idx_customers_is_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_is_lead ON public.customers USING btree (is_lead);


--
-- Name: idx_customers_last_contact_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_last_contact_date ON public.customers USING btree (last_contact_date);


--
-- Name: idx_customers_last_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_last_name_trgm ON public.customers USING gin (last_name public.gin_trgm_ops);


--
-- Name: idx_customers_lead_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_lead_status ON public.customers USING btree (lead_status);


--
-- Name: idx_customers_lifecycle_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_lifecycle_stage ON public.customers USING btree (lifecycle_stage);


--
-- Name: idx_customers_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_name_trgm ON public.customers USING gin (name public.gin_trgm_ops);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_customers_phone_digits_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone_digits_active ON public.customers USING btree (NULLIF(regexp_replace(regexp_replace((COALESCE(phone, ''::character varying))::text, '\D'::text, ''::text, 'g'::text), '^88'::text, ''::text), ''::text)) WHERE (is_deleted = false);


--
-- Name: idx_customers_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone_trgm ON public.customers USING gin (phone public.gin_trgm_ops);


--
-- Name: idx_customers_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_priority ON public.customers USING btree (priority);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_dashboard_configs_team_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_configs_team_leader ON public.crm_dashboard_configs USING btree (team_leader_id);


--
-- Name: idx_deal_of_the_day_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deal_of_the_day_active ON public.deal_of_the_day USING btree (is_active);


--
-- Name: idx_deal_of_the_day_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deal_of_the_day_product ON public.deal_of_the_day USING btree (product_id);


--
-- Name: idx_deals_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_customer ON public.deals USING btree (customer_id);


--
-- Name: idx_deals_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_owner ON public.deals USING btree (owner_id);


--
-- Name: idx_deals_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_stage ON public.deals USING btree (stage);


--
-- Name: idx_deals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_status ON public.deals USING btree (status);


--
-- Name: idx_demand_forecasts_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demand_forecasts_period ON public.demand_forecasts USING btree (forecast_period);


--
-- Name: idx_demand_forecasts_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demand_forecasts_product ON public.demand_forecasts USING btree (product_id);


--
-- Name: idx_demand_forecasts_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demand_forecasts_warehouse ON public.demand_forecasts USING btree (warehouse_id);


--
-- Name: idx_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_display_order ON public.banners USING btree (display_order);


--
-- Name: idx_dollar_consumption_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dollar_consumption_date ON public.dollar_consumption_calculations USING btree (calculation_date);


--
-- Name: idx_dollar_consumption_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dollar_consumption_reference ON public.dollar_consumption_calculations USING btree (reference_no);


--
-- Name: idx_dropoff_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dropoff_customer ON public.customer_dropoff_tracking USING btree (customer_id);


--
-- Name: idx_dropoff_recovered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dropoff_recovered ON public.customer_dropoff_tracking USING btree (recovered);


--
-- Name: idx_dropoff_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dropoff_stage ON public.customer_dropoff_tracking USING btree (stage);


--
-- Name: idx_ecommerce_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecommerce_orders_created_at ON public.ecommerce_orders USING btree (created_at);


--
-- Name: idx_ecommerce_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecommerce_orders_customer_id ON public.ecommerce_orders USING btree (customer_id);


--
-- Name: idx_ecommerce_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecommerce_orders_payment_status ON public.ecommerce_orders USING btree (payment_status);


--
-- Name: idx_ecommerce_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ecommerce_orders_status ON public.ecommerce_orders USING btree (status);


--
-- Name: idx_email_subscribers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_subscribers_status ON public.email_subscribers USING btree (status);


--
-- Name: idx_email_tracking_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_tracking_customer ON public.email_tracking USING btree (customer_id);


--
-- Name: idx_email_tracking_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_tracking_customer_id ON public.email_tracking USING btree (customer_id);


--
-- Name: idx_email_tracking_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_tracking_sent_at ON public.email_tracking USING btree (sent_at);


--
-- Name: idx_email_tracking_sent_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_tracking_sent_by ON public.email_tracking USING btree (sent_by);


--
-- Name: idx_employees_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_department_id ON public.employees USING btree (department_id);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_email ON public.employees USING btree (email);


--
-- Name: idx_employees_employee_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_employee_code ON public.employees USING btree (employee_code);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_status ON public.employees USING btree (employment_status);


--
-- Name: idx_engagement_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_customer ON public.customer_engagement_history USING btree (customer_id);


--
-- Name: idx_engagement_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_date ON public.customer_engagement_history USING btree (created_at);


--
-- Name: idx_engagement_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_status ON public.customer_engagement_history USING btree (status);


--
-- Name: idx_engagement_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_type ON public.customer_engagement_history USING btree (engagement_type);


--
-- Name: idx_expenses_expense_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_expenses_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_submitted_by ON public.expenses USING btree (submitted_by);


--
-- Name: idx_family_anniversary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_family_anniversary ON public.customer_family_members USING btree (anniversary_date);


--
-- Name: idx_family_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_family_customer ON public.customer_family_members USING btree (customer_id);


--
-- Name: idx_family_dob; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_family_dob ON public.customer_family_members USING btree (date_of_birth);


--
-- Name: idx_family_relationship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_family_relationship ON public.customer_family_members USING btree (relationship);


--
-- Name: idx_fraud_checks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_checks_created_at ON public.fraud_checks USING btree (created_at);


--
-- Name: idx_fraud_checks_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_checks_order_id ON public.fraud_checks USING btree (order_id);


--
-- Name: idx_fraud_checks_phone_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_checks_phone_number ON public.fraud_checks USING btree (phone_number);


--
-- Name: idx_fraud_checks_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fraud_checks_risk_level ON public.fraud_checks USING btree (risk_level);


--
-- Name: idx_gift_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_customer ON public.customer_gifts USING btree (customer_id);


--
-- Name: idx_gift_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_status ON public.customer_gifts USING btree (status);


--
-- Name: idx_gift_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_type ON public.customer_gifts USING btree (gift_type);


--
-- Name: idx_grocery_items_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grocery_items_list ON public.grocery_list_items USING btree (list_id);


--
-- Name: idx_grocery_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grocery_items_product ON public.grocery_list_items USING btree (product_id);


--
-- Name: idx_grocery_list_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grocery_list_active ON public.monthly_grocery_lists USING btree (is_active);


--
-- Name: idx_grocery_list_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grocery_list_customer ON public.monthly_grocery_lists USING btree (customer_id);


--
-- Name: idx_grocery_list_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grocery_list_subscription ON public.monthly_grocery_lists USING btree (is_subscription);


--
-- Name: idx_hot_deals_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hot_deals_display_order ON public.hot_deals USING btree (display_order);


--
-- Name: idx_hot_deals_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hot_deals_is_active ON public.hot_deals USING btree (is_active);


--
-- Name: idx_hot_deals_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hot_deals_product_id ON public.hot_deals USING btree (product_id);


--
-- Name: idx_hot_deals_unique_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_hot_deals_unique_product ON public.hot_deals USING btree (product_id);


--
-- Name: idx_incomplete_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_converted ON public.incomplete_orders USING btree (converted_to_order);


--
-- Name: idx_incomplete_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_customer ON public.incomplete_orders USING btree (customer_id);


--
-- Name: idx_incomplete_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_date ON public.incomplete_orders USING btree (created_at);


--
-- Name: idx_incomplete_landing_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_landing_page_id ON public.incomplete_orders USING btree (landing_page_id);


--
-- Name: idx_incomplete_landing_page_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_landing_page_slug ON public.incomplete_orders USING btree (landing_page_slug);


--
-- Name: idx_incomplete_orders_assigned_call_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_orders_assigned_call_status ON public.incomplete_orders USING btree (assigned_to, telephony_call_status);


--
-- Name: idx_incomplete_orders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_orders_assigned_to ON public.incomplete_orders USING btree (assigned_to);


--
-- Name: idx_incomplete_orders_customer_telephony_called; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_orders_customer_telephony_called ON public.incomplete_orders USING btree (customer_id, telephony_called_at);


--
-- Name: idx_incomplete_orders_phone_telephony_called; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_orders_phone_telephony_called ON public.incomplete_orders USING btree (phone, telephony_called_at);


--
-- Name: idx_incomplete_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_phone ON public.incomplete_orders USING btree (phone);


--
-- Name: idx_incomplete_recovered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_recovered ON public.incomplete_orders USING btree (recovered);


--
-- Name: idx_incomplete_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_session ON public.incomplete_orders USING btree (session_id);


--
-- Name: idx_incomplete_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_source ON public.incomplete_orders USING btree (source);


--
-- Name: idx_incomplete_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incomplete_stage ON public.incomplete_orders USING btree (abandoned_stage);


--
-- Name: idx_interactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_customer ON public.customer_interactions USING btree (customer_id);


--
-- Name: idx_interactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_date ON public.customer_interactions USING btree (created_at);


--
-- Name: idx_interactions_follow_up; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_follow_up ON public.customer_interactions USING btree (follow_up_date) WHERE (follow_up_required = true);


--
-- Name: idx_interactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interactions_type ON public.customer_interactions USING btree (interaction_type);


--
-- Name: idx_interviews_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_application ON public.interviews USING btree (application_id);


--
-- Name: idx_interviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interviews_status ON public.interviews USING btree (status);


--
-- Name: idx_invoices_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_customer_id ON public.invoices USING btree (customer_id);


--
-- Name: idx_invoices_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);


--
-- Name: idx_invoices_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_invoice_date ON public.invoices USING btree (invoice_date);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_is_active ON public.banners USING btree (is_active);


--
-- Name: idx_job_applications_applicant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_applicant ON public.job_applications USING btree (applicant_id);


--
-- Name: idx_job_applications_job_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_job_post ON public.job_applications USING btree (job_post_id);


--
-- Name: idx_job_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_applications_status ON public.job_applications USING btree (status);


--
-- Name: idx_job_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_posts_slug ON public.job_posts USING btree (slug);


--
-- Name: idx_job_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_posts_status ON public.job_posts USING btree (status);


--
-- Name: idx_landing_pages_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_pages_dates ON public.landing_pages USING btree (start_date, end_date);


--
-- Name: idx_landing_pages_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_pages_is_active ON public.landing_pages USING btree (is_active);


--
-- Name: idx_landing_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_pages_slug ON public.landing_pages USING btree (slug);


--
-- Name: idx_lp_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_orders_created_at ON public.landing_page_orders USING btree (created_at DESC);


--
-- Name: idx_lp_orders_customer_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_orders_customer_phone ON public.landing_page_orders USING btree (customer_phone);


--
-- Name: idx_lp_orders_landing_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_orders_landing_page_id ON public.landing_page_orders USING btree (landing_page_id);


--
-- Name: idx_lp_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lp_orders_status ON public.landing_page_orders USING btree (status);


--
-- Name: idx_meetings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_customer ON public.meetings USING btree (customer_id);


--
-- Name: idx_meetings_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_deal ON public.meetings USING btree (deal_id);


--
-- Name: idx_meetings_organizer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_organizer ON public.meetings USING btree (organizer_id);


--
-- Name: idx_meetings_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_start_time ON public.meetings USING btree (start_time);


--
-- Name: idx_meetings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_status ON public.meetings USING btree (status);


--
-- Name: idx_membership_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_customer ON public.customer_memberships USING btree (customer_id);


--
-- Name: idx_membership_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_tier ON public.customer_memberships USING btree (membership_tier);


--
-- Name: idx_meta_capi_events_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meta_capi_events_order_id ON public.meta_capi_events USING btree (order_id);


--
-- Name: idx_meta_capi_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meta_capi_events_status ON public.meta_capi_events USING btree (status);


--
-- Name: idx_movement_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movement_date ON public.stock_movements USING btree (created_at);


--
-- Name: idx_movement_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movement_product ON public.stock_movements USING btree (product_id);


--
-- Name: idx_movement_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movement_ref ON public.stock_movements USING btree (reference_number);


--
-- Name: idx_movement_related_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movement_related_doc ON public.stock_movements USING btree (related_document_type, related_document_id);


--
-- Name: idx_movement_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movement_type ON public.stock_movements USING btree (movement_type);


--
-- Name: idx_offer_codes_assigned_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_codes_assigned_customer_id ON public.offer_codes USING btree (assigned_customer_id);


--
-- Name: idx_offer_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_codes_code ON public.offer_codes USING btree (code);


--
-- Name: idx_offer_products_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_products_product ON public.offer_products USING btree (product_id);


--
-- Name: idx_offer_usage_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_usage_customer ON public.offer_usage USING btree (customer_id);


--
-- Name: idx_offer_usage_offer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offer_usage_offer ON public.offer_usage USING btree (offer_id);


--
-- Name: idx_offers_auto_apply; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_auto_apply ON public.offers USING btree (auto_apply) WHERE (auto_apply = true);


--
-- Name: idx_offers_status_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_status_time ON public.offers USING btree (status, start_time, end_time);


--
-- Name: idx_one_active_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_one_active_deal ON public.deal_of_the_day USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_order_activity_logs_action_order_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_activity_logs_action_order_created ON public.order_activity_logs USING btree (action_type, order_id, created_at);


--
-- Name: idx_order_activity_logs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_activity_logs_action_type ON public.order_activity_logs USING btree (action_type);


--
-- Name: idx_order_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_activity_logs_created_at ON public.order_activity_logs USING btree (created_at);


--
-- Name: idx_order_activity_logs_order_action_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_activity_logs_order_action_created ON public.order_activity_logs USING btree (order_id, action_type, created_at);


--
-- Name: idx_order_activity_logs_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_activity_logs_order_id ON public.order_activity_logs USING btree (order_id);


--
-- Name: idx_order_items_added_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_added_by ON public.order_items USING btree (added_by) WHERE (added_by IS NOT NULL);


--
-- Name: idx_order_items_cross_sell; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_cross_sell ON public.order_items USING btree (is_cross_sell) WHERE (is_cross_sell = true);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_order_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_product ON public.order_items USING btree (order_id, product_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_order_items_upsell; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_upsell ON public.order_items USING btree (added_by) WHERE (is_upsell = true);


--
-- Name: idx_orders_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_created ON public.ecommerce_orders USING btree (customer_id, created_at);


--
-- Name: idx_packaging_configs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packaging_configs_active ON public.packaging_configs USING btree (is_active);


--
-- Name: idx_packaging_configs_output; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packaging_configs_output ON public.packaging_configs USING btree (output_product_id);


--
-- Name: idx_packaging_configs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_packaging_configs_source ON public.packaging_configs USING btree (source_product_id);


--
-- Name: idx_page_visits_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_visits_customer ON public.customer_page_visits USING btree (customer_id);


--
-- Name: idx_page_visits_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_visits_date ON public.customer_page_visits USING btree (visited_at);


--
-- Name: idx_page_visits_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_visits_product ON public.customer_page_visits USING btree (product_id);


--
-- Name: idx_page_visits_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_visits_session ON public.customer_page_visits USING btree (session_id);


--
-- Name: idx_payment_transactions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_order_id ON public.payment_transactions USING btree (order_id);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_transaction_id ON public.payment_transactions USING btree (transaction_id);


--
-- Name: idx_payroll_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_employee_id ON public.payroll USING btree (employee_id);


--
-- Name: idx_payroll_employee_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_employee_month ON public.payroll USING btree (employee_id, salary_month);


--
-- Name: idx_payroll_salary_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_salary_month ON public.payroll USING btree (salary_month);


--
-- Name: idx_payroll_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_status ON public.payroll USING btree (payment_status);


--
-- Name: idx_permissions_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_action ON public.permissions USING btree (action);


--
-- Name: idx_permissions_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_module ON public.permissions USING btree (module);


--
-- Name: idx_point_transactions_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_point_transactions_customer_id ON public.point_transactions USING btree (customer_id);


--
-- Name: idx_point_transactions_customer_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_point_transactions_customer_uuid ON public.point_transactions USING btree (customer_uuid);


--
-- Name: idx_point_transactions_idempotency_key_unique_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_point_transactions_idempotency_key_unique_notnull ON public.point_transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_presence_calendar_override_history_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presence_calendar_override_history_updated_by ON public.presence_calendar_override_history USING btree (updated_by, created_at DESC);


--
-- Name: idx_presence_calendar_override_history_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presence_calendar_override_history_user_date ON public.presence_calendar_override_history USING btree (user_id, date_key, created_at DESC);


--
-- Name: idx_presence_calendar_overrides_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_presence_calendar_overrides_user_date ON public.presence_calendar_overrides USING btree (user_id, date_key);


--
-- Name: idx_presence_user_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presence_user_profiles_status ON public.presence_user_profiles USING btree (status);


--
-- Name: idx_presence_user_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presence_user_profiles_user ON public.presence_user_profiles USING btree (user_id);


--
-- Name: idx_price_lock_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_lock_active ON public.price_locks USING btree (is_active);


--
-- Name: idx_price_lock_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_lock_customer ON public.price_locks USING btree (customer_id);


--
-- Name: idx_price_lock_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_lock_product ON public.price_locks USING btree (product_id);


--
-- Name: idx_product_history_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_history_action ON public.product_history USING btree (action);


--
-- Name: idx_product_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_history_created_at ON public.product_history USING btree (created_at DESC);


--
-- Name: idx_product_history_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_history_entity_type ON public.product_history USING btree (entity_type);


--
-- Name: idx_product_history_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_history_performed_by ON public.product_history USING btree (performed_by);


--
-- Name: idx_product_history_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_history_product_id ON public.product_history USING btree (product_id);


--
-- Name: idx_product_images_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_display_order ON public.product_images USING btree (display_order);


--
-- Name: idx_product_images_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);


--
-- Name: idx_product_section_orders_section_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_section_orders_section_order ON public.product_section_orders USING btree (section_key, display_order, product_id);


--
-- Name: idx_product_suggestion_shortlist_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_suggestion_shortlist_active_order ON public.product_suggestion_shortlist USING btree (is_active, display_order, created_at);


--
-- Name: idx_product_suggestion_shortlist_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_suggestion_shortlist_product ON public.product_suggestion_shortlist USING btree (product_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_deal_of_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_deal_of_day ON public.products USING btree (is_deal_of_day) WHERE (is_deal_of_day = true);


--
-- Name: idx_products_display_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_display_position ON public.products USING btree (display_position);


--
-- Name: idx_products_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_featured ON public.products USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_products_name_bn_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_bn_trgm ON public.products USING gin (name_bn public.gin_trgm_ops);


--
-- Name: idx_products_name_en_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_en_trgm ON public.products USING gin (name_en public.gin_trgm_ops);


--
-- Name: idx_products_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_name_trgm ON public.products USING gin (name_en public.gin_trgm_ops);


--
-- Name: idx_products_new_arrival; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_new_arrival ON public.products USING btree (is_new_arrival) WHERE (is_new_arrival = true);


--
-- Name: idx_products_popular; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_popular ON public.products USING btree (is_popular) WHERE (is_popular = true);


--
-- Name: idx_products_size_variants; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_size_variants ON public.products USING gin (size_variants);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku);


--
-- Name: idx_products_sku_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku_trgm ON public.products USING gin (sku public.gin_trgm_ops);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- Name: idx_projects_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_client_id ON public.projects USING btree (client_id);


--
-- Name: idx_projects_manager_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_manager_status ON public.projects USING btree (project_manager_id, status);


--
-- Name: idx_projects_project_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_project_manager_id ON public.projects USING btree (project_manager_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_purchase_invoices_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_invoices_invoice_date ON public.purchase_invoices USING btree (invoice_date);


--
-- Name: idx_purchase_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_invoices_status ON public.purchase_invoices USING btree (status);


--
-- Name: idx_purchase_invoices_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_invoices_supplier_id ON public.purchase_invoices USING btree (supplier_id);


--
-- Name: idx_quotes_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_customer ON public.quotes USING btree (customer_id);


--
-- Name: idx_quotes_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_deal ON public.quotes USING btree (deal_id);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);


--
-- Name: idx_recommendation_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_rules_active ON public.product_recommendation_rules USING btree (is_active);


--
-- Name: idx_recommendation_rules_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_rules_category ON public.product_recommendation_rules USING btree (trigger_category_id);


--
-- Name: idx_recommendation_rules_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_rules_product ON public.product_recommendation_rules USING btree (trigger_product_id);


--
-- Name: idx_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_code ON public.customer_referrals USING btree (referral_code);


--
-- Name: idx_referral_events_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_events_order_id ON public.referral_events USING btree (order_id);


--
-- Name: idx_referral_events_referral_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_events_referral_id ON public.referral_events USING btree (referral_id);


--
-- Name: idx_referral_events_referred_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_events_referred_id ON public.referral_events USING btree (referred_customer_id);


--
-- Name: idx_referral_events_referrer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_events_referrer_id ON public.referral_events USING btree (referrer_customer_id);


--
-- Name: idx_referral_referred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_referred ON public.customer_referrals USING btree (referred_customer_id);


--
-- Name: idx_referral_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_referrer ON public.customer_referrals USING btree (referrer_customer_id);


--
-- Name: idx_referral_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_status ON public.customer_referrals USING btree (status);


--
-- Name: idx_reminder_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_customer ON public.repeat_order_reminders USING btree (customer_id);


--
-- Name: idx_reminder_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_due_date ON public.repeat_order_reminders USING btree (reminder_due_date);


--
-- Name: idx_reminder_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_sent ON public.repeat_order_reminders USING btree (reminder_sent);


--
-- Name: idx_reorder_rule_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_reorder_rule_unique ON public.reorder_rules USING btree (product_id, COALESCE(variant_key, ''::character varying), COALESCE(warehouse_id, 0));


--
-- Name: idx_repack_orders_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repack_orders_number ON public.repack_orders USING btree (repack_number);


--
-- Name: idx_repack_orders_output_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repack_orders_output_product ON public.repack_orders USING btree (output_product_id);


--
-- Name: idx_repack_orders_source_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repack_orders_source_product ON public.repack_orders USING btree (source_product_id);


--
-- Name: idx_repack_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repack_orders_status ON public.repack_orders USING btree (status);


--
-- Name: idx_repack_orders_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_repack_orders_warehouse ON public.repack_orders USING btree (warehouse_id);


--
-- Name: idx_reservation_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_order ON public.stock_reservations USING btree (sales_order_id);


--
-- Name: idx_reservation_product_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_product_warehouse ON public.stock_reservations USING btree (product_id, warehouse_id);


--
-- Name: idx_reservation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reservation_status ON public.stock_reservations USING btree (status);


--
-- Name: idx_sales_metrics_date_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_metrics_date_user ON public.sales_metrics USING btree (metric_date, user_id);


--
-- Name: idx_sales_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_order_items_order ON public.sales_order_items USING btree (sales_order_id);


--
-- Name: idx_sales_order_items_order_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_order_items_order_product ON public.sales_order_items USING btree (sales_order_id, product_id);


--
-- Name: idx_sales_order_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_order_items_product ON public.sales_order_items USING btree (product_id);


--
-- Name: idx_sales_orders_assigned_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_assigned_by ON public.sales_orders USING btree (assigned_by);


--
-- Name: idx_sales_orders_assigned_call_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_assigned_call_status ON public.sales_orders USING btree (assigned_to, telephony_call_status);


--
-- Name: idx_sales_orders_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_assigned_to ON public.sales_orders USING btree (assigned_to);


--
-- Name: idx_sales_orders_courier_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_courier_company_status ON public.sales_orders USING btree (courier_company, status) WHERE (courier_company IS NOT NULL);


--
-- Name: idx_sales_orders_courier_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_courier_order_id ON public.sales_orders USING btree (courier_order_id) WHERE (courier_order_id IS NOT NULL);


--
-- Name: idx_sales_orders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_created_by ON public.sales_orders USING btree (created_by);


--
-- Name: idx_sales_orders_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_created ON public.sales_orders USING btree (customer_id, created_at DESC) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_sales_orders_customer_delivered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_delivered_at ON public.sales_orders USING btree (customer_id, delivered_at);


--
-- Name: idx_sales_orders_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_id ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_customer_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_number ON public.sales_orders USING btree (customer_id, sales_order_number);


--
-- Name: idx_sales_orders_customer_order_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_order_dates ON public.sales_orders USING btree (customer_id, order_date, created_at);


--
-- Name: idx_sales_orders_customer_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_status ON public.sales_orders USING btree (customer_id, status);


--
-- Name: idx_sales_orders_customer_status_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_status_number ON public.sales_orders USING btree (customer_id, status, sales_order_number) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_sales_orders_customer_telephony_called; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer_telephony_called ON public.sales_orders USING btree (customer_id, telephony_called_at);


--
-- Name: idx_sales_orders_offer_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_offer_code ON public.sales_orders USING btree (offer_code);


--
-- Name: idx_sales_orders_offer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_offer_id ON public.sales_orders USING btree (offer_id);


--
-- Name: idx_sales_orders_order_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_order_source ON public.sales_orders USING btree (order_source);


--
-- Name: idx_sales_orders_pathao_sync_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_pathao_sync_queue ON public.sales_orders USING btree (pathao_last_synced_at, created_at, id) WHERE (lower((COALESCE(courier_company, ''::character varying))::text) = 'pathao'::text);


--
-- Name: idx_sales_orders_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_payment_status ON public.sales_orders USING btree (payment_status);


--
-- Name: idx_sales_orders_phone_digits_no_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_phone_digits_no_customer ON public.sales_orders USING btree (NULLIF(regexp_replace(regexp_replace((COALESCE(customer_phone, ''::character varying))::text, '\D'::text, ''::text, 'g'::text), '^88'::text, ''::text), ''::text)) WHERE (customer_id IS NULL);


--
-- Name: idx_sales_orders_phone_replace_digits; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_phone_replace_digits ON public.sales_orders USING btree (regexp_replace(replace((customer_phone)::text, '+88'::text, ''::text), '\D'::text, ''::text, 'g'::text));


--
-- Name: idx_sales_orders_phone_telephony_called; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_phone_telephony_called ON public.sales_orders USING btree (customer_phone, telephony_called_at);


--
-- Name: idx_sales_orders_source_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_source_approval ON public.sales_orders USING btree (order_source, approved_at, status);


--
-- Name: idx_sales_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (status);


--
-- Name: idx_sales_orders_telephony_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_telephony_outcome ON public.sales_orders USING btree (telephony_outcome);


--
-- Name: idx_sales_orders_tracking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_tracking_id ON public.sales_orders USING btree (tracking_id) WHERE (tracking_id IS NOT NULL);


--
-- Name: idx_sales_pipelines_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sales_pipelines_name_unique ON public.sales_pipelines USING btree (name);


--
-- Name: idx_sales_quotas_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotas_period ON public.sales_quotas USING btree (start_date, end_date);


--
-- Name: idx_sales_quotas_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotas_team ON public.sales_quotas USING btree (team_id);


--
-- Name: idx_sales_quotas_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_quotas_user ON public.sales_quotas USING btree (user_id);


--
-- Name: idx_sales_teams_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_teams_leader ON public.sales_teams USING btree (team_leader_id);


--
-- Name: idx_scheduled_lead_assignments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_lead_assignments_customer ON public.scheduled_lead_assignments USING btree (customer_id);


--
-- Name: idx_scheduled_lead_assignments_customer_status_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_lead_assignments_customer_status_action ON public.scheduled_lead_assignments USING btree (customer_id, status, action);


--
-- Name: idx_scheduled_lead_assignments_customer_status_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_lead_assignments_customer_status_agent ON public.scheduled_lead_assignments USING btree (customer_id, status, agent_id);


--
-- Name: idx_scheduled_lead_assignments_customer_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_lead_assignments_customer_status_date ON public.scheduled_lead_assignments USING btree (customer_id, status, scheduled_at);


--
-- Name: idx_scheduled_lead_assignments_filters; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_lead_assignments_filters ON public.scheduled_lead_assignments USING btree (status, action, agent_id, scheduled_at);


--
-- Name: idx_scheduled_lead_assignments_pending_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_lead_assignments_pending_due ON public.scheduled_lead_assignments USING btree (status, scheduled_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_segment_members_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_segment_members_customer ON public.segment_members USING btree (customer_id);


--
-- Name: idx_segment_members_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_segment_members_segment ON public.segment_members USING btree (segment_id);


--
-- Name: idx_sessions_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_campaign ON public.customer_sessions USING btree (campaign_id);


--
-- Name: idx_sessions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_customer ON public.customer_sessions USING btree (customer_id);


--
-- Name: idx_sessions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_date ON public.customer_sessions USING btree (session_start);


--
-- Name: idx_sessions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_source ON public.customer_sessions USING btree (source_details);


--
-- Name: idx_stock_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_batch ON public.stock_levels USING btree (batch_id);


--
-- Name: idx_stock_level_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_stock_level_unique ON public.stock_levels USING btree (product_id, COALESCE(variant_key, ''::character varying), warehouse_id, COALESCE(location_id, 0), COALESCE(batch_id, 0));


--
-- Name: idx_stock_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_product ON public.stock_levels USING btree (product_id);


--
-- Name: idx_stock_product_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_product_warehouse ON public.stock_levels USING btree (product_id, warehouse_id);


--
-- Name: idx_stock_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_warehouse ON public.stock_levels USING btree (warehouse_id);


--
-- Name: idx_supplier_product_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_supplier_product_variant ON public.supplier_products USING btree (supplier_id, product_id, COALESCE(variant_key, ''::character varying));


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (code);


--
-- Name: idx_suppliers_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_company_name ON public.suppliers USING btree (company_name);


--
-- Name: idx_suppliers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_status ON public.suppliers USING btree (status);


--
-- Name: idx_support_tickets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at DESC);


--
-- Name: idx_support_tickets_customer_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_customer_email ON public.support_tickets USING btree (customer_email);


--
-- Name: idx_support_tickets_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_customer_id ON public.support_tickets USING btree (customer_id);


--
-- Name: idx_support_tickets_first_response_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_first_response_due ON public.support_tickets USING btree (first_response_due_at);


--
-- Name: idx_support_tickets_resolution_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_resolution_due ON public.support_tickets USING btree (resolution_due_at);


--
-- Name: idx_support_tickets_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_severity ON public.support_tickets USING btree (severity);


--
-- Name: idx_support_tickets_sla_breached; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_sla_breached ON public.support_tickets USING btree (sla_breached);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_support_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_support_group ON public.support_tickets USING btree (support_group);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_customer ON public.tasks USING btree (customer_id);


--
-- Name: idx_tasks_deal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_deal ON public.tasks USING btree (deal_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_team_a_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_a_customer ON public.team_a_data USING btree (customer_id);


--
-- Name: idx_team_a_gender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_a_gender ON public.team_a_data USING btree (gender);


--
-- Name: idx_team_assignments_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_assignments_assigned_to ON public.team_assignments USING btree (assigned_to_id);


--
-- Name: idx_team_assignments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_assignments_customer ON public.team_assignments USING btree (customer_id);


--
-- Name: idx_team_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_assignments_status ON public.team_assignments USING btree (status);


--
-- Name: idx_team_assignments_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_assignments_type ON public.team_assignments USING btree (team_type);


--
-- Name: idx_team_b_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_b_customer ON public.team_b_data USING btree (customer_id);


--
-- Name: idx_team_b_dob; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_b_dob ON public.team_b_data USING btree (date_of_birth);


--
-- Name: idx_team_b_marriage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_b_marriage ON public.team_b_data USING btree (marriage_day);


--
-- Name: idx_team_c_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_c_customer ON public.team_c_data USING btree (customer_id);


--
-- Name: idx_team_d_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_d_customer ON public.team_d_data USING btree (customer_id);


--
-- Name: idx_team_d_health_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_d_health_card ON public.team_d_data USING btree (health_card_number);


--
-- Name: idx_team_d_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_d_membership ON public.team_d_data USING btree (membership_card_number);


--
-- Name: idx_team_e_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_e_customer ON public.team_e_data USING btree (customer_id);


--
-- Name: idx_team_e_membership_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_e_membership_number ON public.team_e_data USING btree (permanent_membership_number);


--
-- Name: idx_team_e_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_e_tier ON public.team_e_data USING btree (membership_tier);


--
-- Name: idx_team_leader_teams_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_leader_teams_leader ON public.team_leader_teams USING btree (team_leader_id);


--
-- Name: idx_team_leader_teams_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_leader_teams_type ON public.team_leader_teams USING btree (team_type);


--
-- Name: idx_team_members_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_leader ON public.team_members USING btree (team_leader_id);


--
-- Name: idx_team_members_team_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team_leader ON public.team_members USING btree (team_leader_id);


--
-- Name: idx_team_members_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_type ON public.team_members USING btree (team_type);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_telephony_assignment_call_logs_caller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_assignment_call_logs_caller ON public.telephony_assignment_call_logs USING btree (caller_user_id, called_at DESC);


--
-- Name: idx_telephony_assignment_call_logs_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_assignment_call_logs_record ON public.telephony_assignment_call_logs USING btree (record_type, order_id, called_at DESC);


--
-- Name: idx_telephony_calls_agent_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_calls_agent_user_id ON public.telephony_calls USING btree (agent_user_id);


--
-- Name: idx_telephony_calls_disposition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_calls_disposition ON public.telephony_calls USING btree (disposition);


--
-- Name: idx_telephony_calls_queue_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_calls_queue_name ON public.telephony_calls USING btree (queue_name);


--
-- Name: idx_telephony_calls_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_calls_started_at ON public.telephony_calls USING btree (started_at);


--
-- Name: idx_telephony_calls_trunk_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_calls_trunk_name ON public.telephony_calls USING btree (trunk_name);


--
-- Name: idx_telephony_logs_order_record_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_logs_order_record_outcome ON public.telephony_assignment_call_logs USING btree (order_id, record_type, outcome);


--
-- Name: idx_telephony_logs_record_called_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_logs_record_called_at ON public.telephony_assignment_call_logs USING btree (record_type, called_at, created_at);


--
-- Name: idx_telephony_logs_record_order_called; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_logs_record_order_called ON public.telephony_assignment_call_logs USING btree (record_type, order_id, called_at, created_at);


--
-- Name: idx_telephony_presence_events_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telephony_presence_events_user_time ON public.telephony_agent_presence_events USING btree (user_id, occurred_at);


--
-- Name: idx_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assigned_to ON public.tickets USING btree (assigned_to);


--
-- Name: idx_tickets_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_customer_id ON public.tickets USING btree (customer_id);


--
-- Name: idx_tickets_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_priority ON public.tickets USING btree (priority);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_tier_history_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tier_history_customer ON public.customer_tier_history USING btree (customer_id);


--
-- Name: idx_tier_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tier_history_date ON public.customer_tier_history USING btree (changed_at);


--
-- Name: idx_unique_product_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_product_primary ON public.product_images USING btree (product_id) WHERE (is_primary = true);


--
-- Name: idx_user_office_times_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_office_times_user ON public.user_office_times USING btree (user_id);


--
-- Name: idx_user_presence_events_state_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_events_state_time ON public.user_presence_events USING btree (state, occurred_at);


--
-- Name: idx_user_presence_events_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_events_user_time ON public.user_presence_events USING btree (user_id, occurred_at);


--
-- Name: idx_user_presence_statuses_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_statuses_state ON public.user_presence_statuses USING btree (state);


--
-- Name: idx_user_presence_statuses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_presence_statuses_user ON public.user_presence_statuses USING btree (user_id);


--
-- Name: idx_user_product_views_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_product_views_product ON public.user_product_views USING btree (product_id);


--
-- Name: idx_user_product_views_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_product_views_session ON public.user_product_views USING btree (session_id);


--
-- Name: idx_user_product_views_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_product_views_user ON public.user_product_views USING btree (user_id);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_primary_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_primary_role ON public.users USING btree (primary_role_id);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_team ON public.users USING btree (team_id);


--
-- Name: idx_users_team_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_team_leader ON public.users USING btree (team_leader_id);


--
-- Name: idx_wallet_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_customer ON public.customer_wallets USING btree (customer_id);


--
-- Name: idx_wallet_trans_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_trans_customer ON public.wallet_transactions USING btree (customer_id);


--
-- Name: idx_wallet_trans_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_trans_type ON public.wallet_transactions USING btree (transaction_type);


--
-- Name: idx_wallet_trans_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_trans_wallet ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: idx_wallet_transactions_customer_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_customer_uuid ON public.wallet_transactions USING btree (customer_uuid);


--
-- Name: idx_wallet_transactions_idempotency_key_unique_notnull; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wallet_transactions_idempotency_key_unique_notnull ON public.wallet_transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_wallet_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions USING btree (status);


--
-- Name: idx_wallet_withdrawal_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_withdrawal_customer_id ON public.wallet_withdrawal_requests USING btree (customer_id);


--
-- Name: idx_wallet_withdrawal_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_withdrawal_status ON public.wallet_withdrawal_requests USING btree (status);


--
-- Name: idx_warehouse_zones_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_zones_warehouse_id ON public.warehouse_zones USING btree (warehouse_id);


--
-- Name: idx_warehouses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_code ON public.warehouses USING btree (code);


--
-- Name: idx_warehouses_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_is_active ON public.warehouses USING btree (is_active);


--
-- Name: idx_wh_locations_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wh_locations_barcode ON public.warehouse_locations USING btree (barcode);


--
-- Name: idx_wh_locations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wh_locations_code ON public.warehouse_locations USING btree (code);


--
-- Name: idx_wh_locations_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wh_locations_warehouse ON public.warehouse_locations USING btree (warehouse_id);


--
-- Name: idx_workflow_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_status ON public.workflow_executions USING btree (execution_status);


--
-- Name: idx_workflow_executions_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions USING btree (workflow_id);


--
-- Name: unique_active_global_setting_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_global_setting_idx ON public.commission_settings USING btree (setting_type) WHERE (((setting_type)::text = 'global'::text) AND (is_active = true));


--
-- Name: unique_agent_setting_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_agent_setting_idx ON public.commission_settings USING btree (agent_id) WHERE ((agent_id IS NOT NULL) AND (is_active = true));


--
-- Name: uq_customer_family_members_customer_phone_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_customer_family_members_customer_phone_active ON public.customer_family_members USING btree (customer_id, phone) WHERE (is_active = true);


--
-- Name: uq_customer_referrals_referred_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_customer_referrals_referred_customer_id ON public.customer_referrals USING btree (referred_customer_id) WHERE (referred_customer_id IS NOT NULL);


--
-- Name: ux_meta_capi_events_order_event_status; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_meta_capi_events_order_event_status ON public.meta_capi_events USING btree (order_id, event_name, status_trigger);


--
-- Name: ux_product_images_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_product_images_primary ON public.product_images USING btree (product_id) WHERE (is_primary = true);


--
-- Name: ux_product_images_product_id_image_url; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_product_images_product_id_image_url ON public.product_images USING btree (product_id, image_url);


--
-- Name: customer_360_view _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.customer_360_view AS
 SELECT c.id AS customer_id,
    c.name AS first_name,
    c.last_name,
    c.email,
    c.phone,
    c.mobile,
    c.district,
    c.city,
    c.gender,
    c.date_of_birth,
    c.marital_status,
    c.anniversary_date,
    c.profession,
    c.available_time,
    c.customer_type,
    c.lifecycle_stage,
    c.status,
    c.priority,
    c.assigned_to,
    count(DISTINCT so.id) AS total_orders,
    COALESCE(sum(so.grand_total), (0)::numeric) AS lifetime_value,
    COALESCE(avg(so.grand_total), (0)::numeric) AS avg_order_value,
    max(so.order_date) AS last_order_date,
    min(so.order_date) AS first_order_date,
    COALESCE((CURRENT_DATE - max(so.order_date)), 999) AS days_since_last_order,
    count(DISTINCT ci.id) AS total_interactions,
    count(DISTINCT ci.id) FILTER (WHERE ((ci.interaction_type)::text = 'call'::text)) AS total_calls,
    count(DISTINCT ci.id) FILTER (WHERE ((ci.interaction_type)::text = 'whatsapp'::text)) AS total_whatsapp,
    count(DISTINCT ci.id) FILTER (WHERE ((ci.interaction_type)::text = 'email'::text)) AS total_emails,
    max(ci.created_at) AS last_interaction_date,
    count(DISTINCT cb.id) AS total_behaviors,
    count(DISTINCT cb.product_id) AS products_viewed,
    count(DISTINCT cb.id) FILTER (WHERE ((cb.behavior_type)::text = 'product_view'::text)) AS product_views_count,
    count(DISTINCT cfm.id) AS family_members_count,
        CASE
            WHEN (max(so.order_date) > (CURRENT_DATE - '7 days'::interval)) THEN 'hot'::text
            WHEN (max(so.order_date) > (CURRENT_DATE - '30 days'::interval)) THEN 'warm'::text
            ELSE 'cold'::text
        END AS customer_temperature,
    c.created_at AS customer_since,
    c.updated_at AS last_updated
   FROM ((((public.customers c
     LEFT JOIN public.sales_orders so ON ((c.id = so.customer_id)))
     LEFT JOIN public.customer_interactions ci ON ((c.id = ci.customer_id)))
     LEFT JOIN public.customer_behavior cb ON ((c.id = cb.customer_id)))
     LEFT JOIN public.customer_family_members cfm ON ((c.id = cfm.customer_id)))
  GROUP BY c.id;


--
-- Name: sales_orders tr_remove_churn_risk_30d_on_new_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_remove_churn_risk_30d_on_new_order AFTER INSERT ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.remove_churn_risk_30d_on_new_order();


--
-- Name: courier_configurations trg_courier_configurations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_courier_configurations_updated_at BEFORE UPDATE ON public.courier_configurations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_courier_configurations();


--
-- Name: customers trigger_audit_customer_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_customer_changes AFTER UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_customer_changes();


--
-- Name: customer_referrals trigger_credit_referral; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_credit_referral BEFORE UPDATE ON public.customer_referrals FOR EACH ROW EXECUTE FUNCTION public.credit_referral_reward();


--
-- Name: hot_deals trigger_hot_deals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_hot_deals_updated_at BEFORE UPDATE ON public.hot_deals FOR EACH ROW EXECUTE FUNCTION public.update_hot_deals_updated_at();


--
-- Name: attendance trigger_log_attendance_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_attendance_changes AFTER INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.log_attendance_changes();


--
-- Name: ecommerce_orders trigger_update_customer_lifetime_value; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_customer_lifetime_value AFTER INSERT ON public.ecommerce_orders FOR EACH ROW EXECUTE FUNCTION public.update_customer_lifetime_value();


--
-- Name: customers trigger_update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_customers_updated_at();


--
-- Name: sales_orders trigger_update_lifecycle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_lifecycle AFTER INSERT OR UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_customer_lifecycle();


--
-- Name: sales_orders trigger_update_membership; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_membership AFTER INSERT OR UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_membership_tier();


--
-- Name: order_items trigger_update_order_items_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_order_items_timestamp BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_items_timestamp();


--
-- Name: order_items trigger_update_order_total_on_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_order_total_on_delete AFTER DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total();


--
-- Name: order_items trigger_update_order_total_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_order_total_on_insert AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total();


--
-- Name: order_items trigger_update_order_total_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_order_total_on_update AFTER UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_order_total();


--
-- Name: ecommerce_orders trigger_update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_orders_updated_at BEFORE UPDATE ON public.ecommerce_orders FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();


--
-- Name: payroll trigger_update_payroll_deductions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_payroll_deductions BEFORE INSERT OR UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.update_payroll_deductions();


--
-- Name: project_tasks trigger_update_project_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_project_progress AFTER UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_project_progress();


--
-- Name: purchase_invoices trigger_update_supplier_total_purchases; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_supplier_total_purchases AFTER INSERT ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_supplier_total_purchases();


--
-- Name: team_assignments trigger_update_team_member_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_team_member_stats AFTER UPDATE ON public.team_assignments FOR EACH ROW EXECUTE FUNCTION public.update_team_member_stats();


--
-- Name: users trigger_update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_users_updated_at();


--
-- Name: leave_requests trigger_validate_leave_dates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_leave_dates BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.validate_leave_dates();


--
-- Name: activity_templates update_activity_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_activity_templates_updated_at BEFORE UPDATE ON public.activity_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: automation_workflows update_automation_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON public.automation_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: banners update_banners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_deal_stages update_custom_deal_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_deal_stages_updated_at BEFORE UPDATE ON public.custom_deal_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_segments update_customer_segments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deal_of_the_day update_deal_of_the_day_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deal_of_the_day_timestamp BEFORE UPDATE ON public.deal_of_the_day FOR EACH ROW EXECUTE FUNCTION public.update_deal_of_the_day_updated_at();


--
-- Name: email_templates update_email_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_templates update_quote_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quote_templates_updated_at BEFORE UPDATE ON public.quote_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_pipelines update_sales_pipelines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_pipelines_updated_at BEFORE UPDATE ON public.sales_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_quotas update_sales_quotas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_quotas_updated_at BEFORE UPDATE ON public.sales_quotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: special_offers update_special_offers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_special_offers_updated_at BEFORE UPDATE ON public.special_offers FOR EACH ROW EXECUTE FUNCTION public.update_special_offers_updated_at();


--
-- Name: activities activities_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: activities activities_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activity_templates activity_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_templates
    ADD CONSTRAINT activity_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: admin_menu_items admin_menu_items_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_menu_items
    ADD CONSTRAINT admin_menu_items_parent_fk FOREIGN KEY (parent_id) REFERENCES public.admin_menu_items(id) ON DELETE CASCADE;


--
-- Name: agent_commissions agent_commissions_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT agent_commissions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_commissions agent_commissions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commissions
    ADD CONSTRAINT agent_commissions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: api_tokens api_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_agent_preferences automatic_order_assignment_agent_preference_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences
    ADD CONSTRAINT automatic_order_assignment_agent_preference_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_agent_preferences automatic_order_assignment_agent_preferences_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences
    ADD CONSTRAINT automatic_order_assignment_agent_preferences_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_agent_preferences automatic_order_assignment_agent_preferences_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences
    ADD CONSTRAINT automatic_order_assignment_agent_preferences_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: automatic_order_assignment_agent_preferences automatic_order_assignment_agent_preferences_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_agent_preferences
    ADD CONSTRAINT automatic_order_assignment_agent_preferences_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: automatic_order_assignment_logs automatic_order_assignment_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_logs
    ADD CONSTRAINT automatic_order_assignment_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_logs automatic_order_assignment_logs_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_logs
    ADD CONSTRAINT automatic_order_assignment_logs_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: automatic_order_assignment_logs automatic_order_assignment_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_logs
    ADD CONSTRAINT automatic_order_assignment_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_logs automatic_order_assignment_logs_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_logs
    ADD CONSTRAINT automatic_order_assignment_logs_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_settings automatic_order_assignment_settings_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_settings
    ADD CONSTRAINT automatic_order_assignment_settings_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_settings automatic_order_assignment_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_settings
    ADD CONSTRAINT automatic_order_assignment_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: automatic_order_assignment_team_work_types automatic_order_assignment_team_work_types_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_team_work_types
    ADD CONSTRAINT automatic_order_assignment_team_work_types_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.sales_teams(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_team_work_types automatic_order_assignment_team_work_types_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_team_work_types
    ADD CONSTRAINT automatic_order_assignment_team_work_types_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: automatic_order_assignment_team_work_types automatic_order_assignment_team_work_types_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automatic_order_assignment_team_work_types
    ADD CONSTRAINT automatic_order_assignment_team_work_types_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: automation_workflows automation_workflows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_workflows
    ADD CONSTRAINT automation_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: backup_team_office_times backup_team_office_times_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_team_office_times
    ADD CONSTRAINT backup_team_office_times_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bank_reconciliation bank_reconciliation_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation
    ADD CONSTRAINT bank_reconciliation_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: bank_reconciliation bank_reconciliation_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_reconciliation
    ADD CONSTRAINT bank_reconciliation_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES public.users(id);


--
-- Name: batch_tracking batch_tracking_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_tracking
    ADD CONSTRAINT batch_tracking_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: blog_post_tags blog_post_tags_blog_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_blog_post_id_fkey FOREIGN KEY (blog_post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_post_tags blog_post_tags_blog_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT blog_post_tags_blog_tag_id_fkey FOREIGN KEY (blog_tag_id) REFERENCES public.blog_tags(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id);


--
-- Name: call_log_visibility_history call_log_visibility_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log_visibility_history
    ADD CONSTRAINT call_log_visibility_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: call_log_visibility call_log_visibility_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_log_visibility
    ADD CONSTRAINT call_log_visibility_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: call_logs call_logs_called_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_called_by_fkey FOREIGN KEY (called_by) REFERENCES public.users(id);


--
-- Name: call_logs call_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: campaign_customers campaign_customers_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_customers
    ADD CONSTRAINT campaign_customers_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_members campaign_members_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_members campaign_members_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: campaigns campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: combo_deal_images combo_deal_images_combo_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_images
    ADD CONSTRAINT combo_deal_images_combo_deal_id_fkey FOREIGN KEY (combo_deal_id) REFERENCES public.combo_deals(id) ON DELETE CASCADE;


--
-- Name: combo_deal_products combo_deal_products_combo_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_products
    ADD CONSTRAINT combo_deal_products_combo_deal_id_fkey FOREIGN KEY (combo_deal_id) REFERENCES public.combo_deals(id) ON DELETE CASCADE;


--
-- Name: combo_deal_products combo_deal_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combo_deal_products
    ADD CONSTRAINT combo_deal_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: commission_payment_requests commission_payment_requests_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests
    ADD CONSTRAINT commission_payment_requests_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: commission_payment_requests commission_payment_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests
    ADD CONSTRAINT commission_payment_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: commission_payment_requests commission_payment_requests_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests
    ADD CONSTRAINT commission_payment_requests_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.users(id);


--
-- Name: commission_payment_requests commission_payment_requests_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests
    ADD CONSTRAINT commission_payment_requests_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: commission_payment_requests commission_payment_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payment_requests
    ADD CONSTRAINT commission_payment_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: commission_settings commission_settings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_settings
    ADD CONSTRAINT commission_settings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: commission_settings commission_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_settings
    ADD CONSTRAINT commission_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: commission_settings commission_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_settings
    ADD CONSTRAINT commission_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: commission_slabs commission_slabs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_slabs
    ADD CONSTRAINT commission_slabs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: commission_slabs commission_slabs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_slabs
    ADD CONSTRAINT commission_slabs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: courier_tracking_history courier_tracking_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_tracking_history
    ADD CONSTRAINT courier_tracking_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: crm_call_tasks crm_call_tasks_recommended_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_call_tasks
    ADD CONSTRAINT crm_call_tasks_recommended_product_id_fkey FOREIGN KEY (recommended_product_id) REFERENCES public.products(id);


--
-- Name: customer_addresses customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_contacts customer_contacts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_kyc customer_kyc_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_kyc
    ADD CONSTRAINT customer_kyc_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_kyc customer_kyc_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_kyc
    ADD CONSTRAINT customer_kyc_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: customer_notes customer_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customer_notes customer_notes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notes
    ADD CONSTRAINT customer_notes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_product_suggestions customer_product_suggestions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_suggestions
    ADD CONSTRAINT customer_product_suggestions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_product_suggestions customer_product_suggestions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_suggestions
    ADD CONSTRAINT customer_product_suggestions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_product_suggestions customer_product_suggestions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_suggestions
    ADD CONSTRAINT customer_product_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: customer_product_suggestions customer_product_suggestions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_product_suggestions
    ADD CONSTRAINT customer_product_suggestions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_reviews customer_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_reviews
    ADD CONSTRAINT customer_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: customer_tag_assignments customer_tag_assignments_customer_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tag_assignments
    ADD CONSTRAINT customer_tag_assignments_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_tag_assignments customer_tag_assignments_tag_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tag_assignments
    ADD CONSTRAINT customer_tag_assignments_tag_fk FOREIGN KEY (tag_id) REFERENCES public.customer_tags(id) ON DELETE CASCADE;


--
-- Name: customers customers_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customers customers_assigned_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_assigned_supervisor_id_fkey FOREIGN KEY (assigned_supervisor_id) REFERENCES public.users(id);


--
-- Name: customers customers_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customers customers_assigned_to_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_assigned_to_fkey1 FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customers customers_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id);


--
-- Name: dashboard_widgets dashboard_widgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT dashboard_widgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: deals deals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: deals deals_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: deals deals_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.sales_pipelines(id);


--
-- Name: departments departments_parent_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES public.departments(id);


--
-- Name: ecommerce_orders ecommerce_orders_billing_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders
    ADD CONSTRAINT ecommerce_orders_billing_address_id_fkey FOREIGN KEY (billing_address_id) REFERENCES public.customer_addresses(id);


--
-- Name: ecommerce_orders ecommerce_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders
    ADD CONSTRAINT ecommerce_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: ecommerce_orders ecommerce_orders_shipping_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ecommerce_orders
    ADD CONSTRAINT ecommerce_orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.customer_addresses(id);


--
-- Name: email_template_usage email_template_usage_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_usage
    ADD CONSTRAINT email_template_usage_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: email_template_usage email_template_usage_email_tracking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_usage
    ADD CONSTRAINT email_template_usage_email_tracking_id_fkey FOREIGN KEY (email_tracking_id) REFERENCES public.email_tracking(id);


--
-- Name: email_template_usage email_template_usage_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_usage
    ADD CONSTRAINT email_template_usage_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE CASCADE;


--
-- Name: email_template_usage email_template_usage_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_usage
    ADD CONSTRAINT email_template_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: email_tracking email_tracking_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: email_tracking email_tracking_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: emails emails_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: emails emails_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id);


--
-- Name: employee_benefits employee_benefits_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_benefits
    ADD CONSTRAINT employee_benefits_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: employees employees_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id);


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expenses expenses_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: expiry_dates expiry_dates_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_dates
    ADD CONSTRAINT expiry_dates_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_tracking(id);


--
-- Name: expiry_dates expiry_dates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_dates
    ADD CONSTRAINT expiry_dates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: faqs faqs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: team_assignments fk_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_assignments
    ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_referrals fk_customer_referrals_campaign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_referrals
    ADD CONSTRAINT fk_customer_referrals_campaign FOREIGN KEY (campaign_id) REFERENCES public.referral_campaigns(id) ON DELETE SET NULL;


--
-- Name: customer_referrals fk_customer_referrals_partner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_referrals
    ADD CONSTRAINT fk_customer_referrals_partner FOREIGN KEY (partner_id) REFERENCES public.referral_partners(id) ON DELETE SET NULL;


--
-- Name: team_a_data fk_customer_team_a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_a_data
    ADD CONSTRAINT fk_customer_team_a FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: team_b_data fk_customer_team_b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_b_data
    ADD CONSTRAINT fk_customer_team_b FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: team_c_data fk_customer_team_c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_c_data
    ADD CONSTRAINT fk_customer_team_c FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: team_d_data fk_customer_team_d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_d_data
    ADD CONSTRAINT fk_customer_team_d FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: team_e_data fk_customer_team_e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_e_data
    ADD CONSTRAINT fk_customer_team_e FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_tiers fk_customer_tier; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tiers
    ADD CONSTRAINT fk_customer_tier FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_tier_history fk_customer_tier_history; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tier_history
    ADD CONSTRAINT fk_customer_tier_history FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customers fk_customers_referral_campaign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT fk_customers_referral_campaign FOREIGN KEY (referral_campaign_id) REFERENCES public.referral_campaigns(id) ON DELETE SET NULL;


--
-- Name: customers fk_customers_referred_by_partner; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT fk_customers_referred_by_partner FOREIGN KEY (referred_by_partner_id) REFERENCES public.referral_partners(id) ON DELETE SET NULL;


--
-- Name: deal_of_the_day fk_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_of_the_day
    ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: follow_ups follow_ups_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: follow_ups follow_ups_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: fraud_checks fraud_checks_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_checks
    ADD CONSTRAINT fraud_checks_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: fraud_checks fraud_checks_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_checks
    ADD CONSTRAINT fraud_checks_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE SET NULL;


--
-- Name: goods_received_notes goods_received_notes_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: goods_received_notes goods_received_notes_quality_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_quality_checked_by_fkey FOREIGN KEY (quality_checked_by) REFERENCES public.users(id);


--
-- Name: goods_received_notes goods_received_notes_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: goods_received_notes goods_received_notes_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: goods_received_notes goods_received_notes_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_notes
    ADD CONSTRAINT goods_received_notes_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: grn_items grn_items_grn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.goods_received_notes(id) ON DELETE CASCADE;


--
-- Name: grn_items grn_items_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id);


--
-- Name: grn_items grn_items_po_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES public.purchase_order_items(id);


--
-- Name: grn_items grn_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: hot_deals hot_deals_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hot_deals
    ADD CONSTRAINT hot_deals_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: hr_awards hr_awards_award_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_awards
    ADD CONSTRAINT hr_awards_award_type_id_fkey FOREIGN KEY (award_type_id) REFERENCES public.hr_award_types(id) ON DELETE SET NULL;


--
-- Name: hr_awards hr_awards_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_awards
    ADD CONSTRAINT hr_awards_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_complaints hr_complaints_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_complaints
    ADD CONSTRAINT hr_complaints_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_departments hr_departments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_departments
    ADD CONSTRAINT hr_departments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.hr_branches(id) ON DELETE SET NULL;


--
-- Name: hr_designations hr_designations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_designations
    ADD CONSTRAINT hr_designations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.hr_departments(id) ON DELETE SET NULL;


--
-- Name: hr_employee_documents hr_employee_documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents
    ADD CONSTRAINT hr_employee_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.hr_document_types(id) ON DELETE SET NULL;


--
-- Name: hr_employee_documents hr_employee_documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents
    ADD CONSTRAINT hr_employee_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_employee_performance hr_employee_performance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_performance
    ADD CONSTRAINT hr_employee_performance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_employee_performance hr_employee_performance_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_performance
    ADD CONSTRAINT hr_employee_performance_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.hr_performance_indicators(id) ON DELETE SET NULL;


--
-- Name: hr_employee_trainings hr_employee_trainings_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_employee_trainings hr_employee_trainings_training_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_training_session_id_fkey FOREIGN KEY (training_session_id) REFERENCES public.hr_training_sessions(id) ON DELETE SET NULL;


--
-- Name: hr_employees hr_employees_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.hr_branches(id) ON DELETE SET NULL;


--
-- Name: hr_employees hr_employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.hr_departments(id) ON DELETE SET NULL;


--
-- Name: hr_employees hr_employees_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employees
    ADD CONSTRAINT hr_employees_designation_id_fkey FOREIGN KEY (designation_id) REFERENCES public.hr_designations(id) ON DELETE SET NULL;


--
-- Name: hr_performance_indicators hr_performance_indicators_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_indicators
    ADD CONSTRAINT hr_performance_indicators_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.hr_performance_indicator_categories(id) ON DELETE SET NULL;


--
-- Name: hr_promotions hr_promotions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_promotions
    ADD CONSTRAINT hr_promotions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_promotions hr_promotions_new_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_promotions
    ADD CONSTRAINT hr_promotions_new_designation_id_fkey FOREIGN KEY (new_designation_id) REFERENCES public.hr_designations(id) ON DELETE SET NULL;


--
-- Name: hr_promotions hr_promotions_old_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_promotions
    ADD CONSTRAINT hr_promotions_old_designation_id_fkey FOREIGN KEY (old_designation_id) REFERENCES public.hr_designations(id) ON DELETE SET NULL;


--
-- Name: hr_resignations hr_resignations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_resignations
    ADD CONSTRAINT hr_resignations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_terminations hr_terminations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_terminations
    ADD CONSTRAINT hr_terminations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_training_programs hr_training_programs_training_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_programs
    ADD CONSTRAINT hr_training_programs_training_type_id_fkey FOREIGN KEY (training_type_id) REFERENCES public.hr_training_types(id) ON DELETE SET NULL;


--
-- Name: hr_training_sessions hr_training_sessions_training_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_sessions
    ADD CONSTRAINT hr_training_sessions_training_program_id_fkey FOREIGN KEY (training_program_id) REFERENCES public.hr_training_programs(id) ON DELETE SET NULL;


--
-- Name: hr_transfers hr_transfers_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_transfers
    ADD CONSTRAINT hr_transfers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_transfers hr_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_transfers
    ADD CONSTRAINT hr_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.hr_branches(id) ON DELETE SET NULL;


--
-- Name: hr_transfers hr_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_transfers
    ADD CONSTRAINT hr_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.hr_branches(id) ON DELETE SET NULL;


--
-- Name: hr_trips hr_trips_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_trips
    ADD CONSTRAINT hr_trips_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: hr_warnings hr_warnings_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_warnings
    ADD CONSTRAINT hr_warnings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;


--
-- Name: incomplete_orders incomplete_orders_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomplete_orders
    ADD CONSTRAINT incomplete_orders_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: incomplete_orders incomplete_orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomplete_orders
    ADD CONSTRAINT incomplete_orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interactions interactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: interactions interactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: interviews interviews_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE;


--
-- Name: interviews interviews_interviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: interviews interviews_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_count_items inventory_count_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: inventory_count_items inventory_count_items_count_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_count_id_fkey FOREIGN KEY (count_id) REFERENCES public.inventory_counts(id) ON DELETE CASCADE;


--
-- Name: inventory_count_items inventory_count_items_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.users(id);


--
-- Name: inventory_count_items inventory_count_items_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id);


--
-- Name: inventory_count_items inventory_count_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_count_items inventory_count_items_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: inventory_counts inventory_counts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: inventory_counts inventory_counts_scope_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_scope_zone_id_fkey FOREIGN KEY (scope_zone_id) REFERENCES public.warehouse_zones(id);


--
-- Name: inventory_counts inventory_counts_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(id);


--
-- Name: inventory_counts inventory_counts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_movements inventory_movements_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: invoices invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.ecommerce_orders(id);


--
-- Name: job_applications job_applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_job_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_post_id_fkey FOREIGN KEY (job_post_id) REFERENCES public.job_posts(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: job_posts job_posts_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_posts
    ADD CONSTRAINT job_posts_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_entry_details journal_entry_details_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_details
    ADD CONSTRAINT journal_entry_details_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: journal_entry_details journal_entry_details_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_details
    ADD CONSTRAINT journal_entry_details_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: knowledgebase_articles knowledgebase_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledgebase_articles
    ADD CONSTRAINT knowledgebase_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: leave_requests leave_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: meetings meetings_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id);


--
-- Name: meta_capi_events meta_capi_events_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meta_capi_events
    ADD CONSTRAINT meta_capi_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: offer_categories offer_categories_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_categories
    ADD CONSTRAINT offer_categories_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offer_codes offer_codes_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_codes
    ADD CONSTRAINT offer_codes_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offer_conditions offer_conditions_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_conditions
    ADD CONSTRAINT offer_conditions_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offer_products offer_products_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_products
    ADD CONSTRAINT offer_products_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offer_rewards offer_rewards_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_rewards
    ADD CONSTRAINT offer_rewards_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offer_usage offer_usage_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_usage
    ADD CONSTRAINT offer_usage_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id);


--
-- Name: opportunities opportunities_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: opportunities opportunities_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: opportunities opportunities_owner_supervisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_owner_supervisor_fkey FOREIGN KEY (owner_supervisor) REFERENCES public.users(id);


--
-- Name: order_activity_logs order_activity_logs_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_activity_logs
    ADD CONSTRAINT order_activity_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: order_activity_logs order_activity_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_activity_logs
    ADD CONSTRAINT order_activity_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: order_status_history order_status_history_ecommerce_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_ecommerce_order_id_fkey FOREIGN KEY (ecommerce_order_id) REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: payments payments_ecommerce_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_ecommerce_order_id_fkey FOREIGN KEY (ecommerce_order_id) REFERENCES public.ecommerce_orders(id);


--
-- Name: payments payments_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: payroll payroll_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: payroll payroll_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: performance_appraisals performance_appraisals_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_appraisals
    ADD CONSTRAINT performance_appraisals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: performance_appraisals performance_appraisals_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_appraisals
    ADD CONSTRAINT performance_appraisals_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: presence_user_profiles presence_user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presence_user_profiles
    ADD CONSTRAINT presence_user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_history product_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_history
    ADD CONSTRAINT product_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_inventory product_inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_inventory
    ADD CONSTRAINT product_inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_price_history product_price_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: product_price_history product_price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_recommendation_rules product_recommendation_rules_recommended_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_recommendation_rules
    ADD CONSTRAINT product_recommendation_rules_recommended_product_id_fkey FOREIGN KEY (recommended_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_recommendation_rules product_recommendation_rules_trigger_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_recommendation_rules
    ADD CONSTRAINT product_recommendation_rules_trigger_product_id_fkey FOREIGN KEY (trigger_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_section_orders product_section_orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_section_orders
    ADD CONSTRAINT product_section_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_suggestion_shortlist product_suggestion_shortlist_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestion_shortlist
    ADD CONSTRAINT product_suggestion_shortlist_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_suggestion_shortlist product_suggestion_shortlist_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestion_shortlist
    ADD CONSTRAINT product_suggestion_shortlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_suggestion_shortlist product_suggestion_shortlist_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestion_shortlist
    ADD CONSTRAINT product_suggestion_shortlist_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_suggestions product_suggestions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestions
    ADD CONSTRAINT product_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_suggestions product_suggestions_suggested_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_suggestions
    ADD CONSTRAINT product_suggestions_suggested_product_id_fkey FOREIGN KEY (suggested_product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_tasks project_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_time_logs project_time_logs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_time_logs
    ADD CONSTRAINT project_time_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: project_time_logs project_time_logs_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_time_logs
    ADD CONSTRAINT project_time_logs_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.users(id);


--
-- Name: project_time_logs project_time_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_time_logs
    ADD CONSTRAINT project_time_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.project_tasks(id);


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.customers(id);


--
-- Name: projects projects_project_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.users(id);


--
-- Name: purchase_order_items purchase_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: purchase_orders purchase_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchase_requisition_items purchase_requisition_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_requisition_items purchase_requisition_items_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE;


--
-- Name: purchase_requisitions purchase_requisitions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_requisitions purchase_requisitions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: purchase_requisitions purchase_requisitions_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: quotation_items quotation_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: quotation_items quotation_items_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: quotations quotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotations quotations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: quote_approvals quote_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals
    ADD CONSTRAINT quote_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: quote_approvals quote_approvals_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals
    ADD CONSTRAINT quote_approvals_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_templates quote_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_templates
    ADD CONSTRAINT quote_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotes quotes_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: quotes quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;


--
-- Name: quotes quotes_parent_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_parent_quote_id_fkey FOREIGN KEY (parent_quote_id) REFERENCES public.quotes(id);


--
-- Name: quotes quotes_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.quote_templates(id);


--
-- Name: reorder_rules reorder_rules_preferred_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_preferred_supplier_id_fkey FOREIGN KEY (preferred_supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: reorder_rules reorder_rules_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reorder_rules reorder_rules_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_rules
    ADD CONSTRAINT reorder_rules_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: repack_orders repack_orders_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.repack_orders
    ADD CONSTRAINT repack_orders_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.packaging_configs(id) ON DELETE SET NULL;


--
-- Name: reports reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: returns returns_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: returns returns_ecommerce_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_ecommerce_order_id_fkey FOREIGN KEY (ecommerce_order_id) REFERENCES public.ecommerce_orders(id);


--
-- Name: returns returns_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT returns_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: salary_structures salary_structures_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: sales_forecasts sales_forecasts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_forecasts
    ADD CONSTRAINT sales_forecasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_metrics sales_metrics_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_metrics
    ADD CONSTRAINT sales_metrics_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: sales_metrics sales_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_metrics
    ADD CONSTRAINT sales_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_order_items sales_order_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_tracking(id);


--
-- Name: sales_order_items sales_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales_order_items sales_order_items_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales_orders sales_orders_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);


--
-- Name: sales_quotas sales_quotas_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotas
    ADD CONSTRAINT sales_quotas_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.sales_teams(id);


--
-- Name: sales_quotas sales_quotas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotas
    ADD CONSTRAINT sales_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_team_assignments sales_team_assignments_assigned_executive_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_team_assignments
    ADD CONSTRAINT sales_team_assignments_assigned_executive_id_fkey FOREIGN KEY (assigned_executive_id) REFERENCES public.users(id);


--
-- Name: sales_team_assignments sales_team_assignments_assigned_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_team_assignments
    ADD CONSTRAINT sales_team_assignments_assigned_supervisor_id_fkey FOREIGN KEY (assigned_supervisor_id) REFERENCES public.users(id);


--
-- Name: sales_team_assignments sales_team_assignments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_team_assignments
    ADD CONSTRAINT sales_team_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: sales_teams sales_teams_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_teams
    ADD CONSTRAINT sales_teams_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id);


--
-- Name: scheduled_lead_assignments scheduled_lead_assignments_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_lead_assignments
    ADD CONSTRAINT scheduled_lead_assignments_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: scheduled_lead_assignments scheduled_lead_assignments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_lead_assignments
    ADD CONSTRAINT scheduled_lead_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: scheduled_lead_assignments scheduled_lead_assignments_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_lead_assignments
    ADD CONSTRAINT scheduled_lead_assignments_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: segment_members segment_members_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_members
    ADD CONSTRAINT segment_members_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: segment_members segment_members_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.segment_members
    ADD CONSTRAINT segment_members_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.customer_segments(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_ecommerce_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_ecommerce_order_id_fkey FOREIGN KEY (ecommerce_order_id) REFERENCES public.ecommerce_orders(id);


--
-- Name: shipments shipments_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: stock_adjustment_items stock_adjustment_items_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.stock_adjustments(id) ON DELETE CASCADE;


--
-- Name: stock_adjustment_items stock_adjustment_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: stock_adjustment_items stock_adjustment_items_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id);


--
-- Name: stock_adjustment_items stock_adjustment_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_adjustments stock_adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: stock_adjustments stock_adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_adjustments stock_adjustments_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: stock_adjustments stock_adjustments_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_alerts stock_alerts_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: stock_alerts stock_alerts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_alerts stock_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_alerts stock_alerts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: stock_batches stock_batches_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_batches
    ADD CONSTRAINT stock_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_batches stock_batches_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_batches
    ADD CONSTRAINT stock_batches_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: stock_batches stock_batches_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_batches
    ADD CONSTRAINT stock_batches_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: stock_levels stock_levels_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: stock_levels stock_levels_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;


--
-- Name: stock_levels stock_levels_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_levels
    ADD CONSTRAINT stock_levels_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_destination_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_destination_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_destination_warehouse_id_fkey FOREIGN KEY (destination_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_source_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_source_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_source_warehouse_id_fkey FOREIGN KEY (source_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: stock_reservations stock_reservations_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: stock_reservations stock_reservations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: stock_transfer_items stock_transfer_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.stock_batches(id) ON DELETE SET NULL;


--
-- Name: stock_transfer_items stock_transfer_items_destination_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES public.warehouse_locations(id);


--
-- Name: stock_transfer_items stock_transfer_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_transfer_items stock_transfer_items_source_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES public.warehouse_locations(id);


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: stock_transfers stock_transfers_destination_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_destination_warehouse_id_fkey FOREIGN KEY (destination_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: stock_transfers stock_transfers_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: stock_transfers stock_transfers_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: stock_transfers stock_transfers_shipped_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_shipped_by_fkey FOREIGN KEY (shipped_by) REFERENCES public.users(id);


--
-- Name: stock_transfers stock_transfers_source_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_source_warehouse_id_fkey FOREIGN KEY (source_warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: supplier_payments supplier_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: supplier_payments supplier_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.purchase_invoices(id);


--
-- Name: supplier_products supplier_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: supplier_products supplier_products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_attachments task_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: task_comments task_comments_commented_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_commented_by_fkey FOREIGN KEY (commented_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tasks tasks_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: telephony_assignment_call_logs telephony_assignment_call_logs_caller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telephony_assignment_call_logs
    ADD CONSTRAINT telephony_assignment_call_logs_caller_user_id_fkey FOREIGN KEY (caller_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ticket_attachments ticket_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_attachments ticket_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: ticket_comments ticket_comments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ticket_comments ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_assigned_supervisor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_supervisor_fkey FOREIGN KEY (assigned_supervisor) REFERENCES public.users(id);


--
-- Name: tickets tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tickets tickets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: two_factor_auth two_factor_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT two_factor_auth_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_activity_logs user_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_product_views user_product_views_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_views
    ADD CONSTRAINT user_product_views_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: user_product_views user_product_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_views
    ADD CONSTRAINT user_product_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: users users_primary_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_primary_role_id_fkey FOREIGN KEY (primary_role_id) REFERENCES public.roles(id);


--
-- Name: users users_primary_role_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_primary_role_id_fkey1 FOREIGN KEY (primary_role_id) REFERENCES public.roles(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: users users_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.sales_teams(id);


--
-- Name: users users_team_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES public.users(id);


--
-- Name: users users_team_leader_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_leader_id_fkey1 FOREIGN KEY (team_leader_id) REFERENCES public.users(id);


--
-- Name: warehouse_locations warehouse_locations_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: warehouse_locations warehouse_locations_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_locations
    ADD CONSTRAINT warehouse_locations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.warehouse_zones(id) ON DELETE SET NULL;


--
-- Name: warehouse_zones warehouse_zones_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_zones
    ADD CONSTRAINT warehouse_zones_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: warehouses warehouses_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: workflow_executions workflow_executions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.automation_workflows(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7C3CPPujwXueYuWytnEatrU4XjMaO0AIrTrSZlo02Y4vzfiCwDzOtJU7eZ9ct5h

