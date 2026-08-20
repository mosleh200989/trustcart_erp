-- Fix membership/loyalty triggers for guest orders (sales_orders.customer_id can be NULL)
-- Safe to run multiple times.

-- 1) Guard membership trigger against NULL customer_id
CREATE OR REPLACE FUNCTION update_membership_tier()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 2) Guard repeat reminders against NULL customer_id (prevents similar failures)
CREATE OR REPLACE FUNCTION generate_repeat_reminders()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

SELECT 'membership guest orders fix applied' AS status;
