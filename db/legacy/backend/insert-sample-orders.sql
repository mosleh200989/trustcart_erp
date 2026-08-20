-- =====================================================
-- Insert Sample Order Data for Testing
-- =====================================================

-- Insert sample orders with complete tracking information
INSERT INTO sales_orders (
    sales_order_number, customer_id, order_date, status, total_amount, created_by,
    shipping_address, courier_notes, rider_instructions, internal_notes,
    user_ip, geo_location, browser_info, device_type, operating_system,
    traffic_source, referrer_url, utm_source, utm_medium, utm_campaign,
    notes, created_at
) VALUES 
-- Order 1: Pending order with complete tracking
(
    'SO-1735017600-001',
    1,
    NOW() - INTERVAL '2 days',
    'pending',
    1850.00,
    1,
    'House 12, Road 5, Dhanmondi, Dhaka-1205',
    'Please handle with care - fragile items',
    'Call customer 15 minutes before delivery',
    'Customer is a VIP member. Priority handling required.',
    '103.92.84.123',
    '{"country": "Bangladesh", "city": "Dhaka", "latitude": 23.8103, "longitude": 90.4125}'::jsonb,
    'Chrome 120',
    'mobile',
    'Android',
    'facebook_ads',
    'https://facebook.com/trustcart-ad',
    'facebook',
    'cpc',
    'winter_sale_2025',
    'Customer requested morning delivery between 9-11 AM',
    NOW() - INTERVAL '2 days'
),

-- Order 2: Approved order ready to ship
(
    'SO-1735017600-002',
    2,
    NOW() - INTERVAL '1 day',
    'pending',
    3250.50,
    1,
    'Flat 4B, Gulshan Avenue, Gulshan-2, Dhaka-1212',
    'Leave at security if customer unavailable',
    'Gate code: #4521',
    'Customer ordered via phone. Payment verified.',
    '45.115.48.90',
    '{"country": "Bangladesh", "city": "Dhaka", "latitude": 23.7925, "longitude": 90.4078}'::jsonb,
    'Safari 17',
    'desktop',
    'MacOS',
    'google_ads',
    'https://google.com/search?q=organic+food',
    'google',
    'cpc',
    'organic_products_campaign',
    'Customer wants invoice for office reimbursement',
    NOW() - INTERVAL '1 day'
),

-- Order 3: Shipped order with courier tracking
(
    'SO-1735017600-003',
    3,
    NOW() - INTERVAL '3 days',
    'pending',
    2100.00,
    1,
    'Village: Sreepur, Upazila: Gazipur Sadar, District: Gazipur',
    'Rural area - call customer for exact location',
    'Delivery after 2 PM only',
    'Second order from this customer. Reliable.',
    '119.30.41.205',
    '{"country": "Bangladesh", "city": "Gazipur", "latitude": 23.9999, "longitude": 90.4203}'::jsonb,
    'Chrome 119',
    'mobile',
    'Android',
    'direct',
    NULL,
    NULL,
    NULL,
    NULL,
    'Customer address: Near Gazipur Bus Stand',
    NOW() - INTERVAL '3 days'
),

-- Order 4: Hold order with issue
(
    'SO-1735017600-004',
    4,
    NOW() - INTERVAL '5 hours',
    'pending',
    950.00,
    1,
    '25 College Road, Chittagong-4000',
    'Payment pending verification',
    'Do not deliver until confirmed',
    'Suspicious order - multiple orders from same IP. Investigating.',
    '103.92.84.123',
    '{"country": "Bangladesh", "city": "Chittagong", "latitude": 22.3569, "longitude": 91.7832}'::jsonb,
    'Firefox 121',
    'desktop',
    'Windows',
    'organic_search',
    'https://google.com',
    NULL,
    'organic',
    NULL,
    'Same IP as Order #1. Possible fraud.',
    NOW() - INTERVAL '5 hours'
),

-- Order 5: Delivered order
(
    'SO-1735017600-005',
    5,
    NOW() - INTERVAL '5 days',
    'pending',
    4500.75,
    1,
    'House 45, Sector 7, Uttara, Dhaka-1230',
    'Customer preferred afternoon delivery',
    'Building has elevator access',
    'Regular customer. Always pays cash on delivery.',
    '180.211.99.102',
    '{"country": "Bangladesh", "city": "Dhaka", "latitude": 23.8759, "longitude": 90.3795}'::jsonb,
    'Edge 120',
    'desktop',
    'Windows',
    'email_campaign',
    NULL,
    'newsletter',
    'email',
    'december_special',
    'Delivered successfully on 2025-12-19',
    NOW() - INTERVAL '5 days'
);

-- Get the IDs of inserted orders for order_items
DO $$
DECLARE
    order1_id INT;
    order2_id INT;
    order3_id INT;
    order4_id INT;
    order5_id INT;
    product1_id INT;
    product2_id INT;
    product3_id INT;
BEGIN
    -- Get order IDs
    SELECT id INTO order1_id FROM sales_orders WHERE sales_order_number = 'SO-1735017600-001';
    SELECT id INTO order2_id FROM sales_orders WHERE sales_order_number = 'SO-1735017600-002';
    SELECT id INTO order3_id FROM sales_orders WHERE sales_order_number = 'SO-1735017600-003';
    SELECT id INTO order4_id FROM sales_orders WHERE sales_order_number = 'SO-1735017600-004';
    SELECT id INTO order5_id FROM sales_orders WHERE sales_order_number = 'SO-1735017600-005';
    
    -- Get some product IDs (assuming products exist)
    SELECT id INTO product1_id FROM products LIMIT 1 OFFSET 0;
    SELECT id INTO product2_id FROM products LIMIT 1 OFFSET 1;
    SELECT id INTO product3_id FROM products LIMIT 1 OFFSET 2;
    
    -- Insert order items for Order 1
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES 
        (order1_id, product1_id, 'Organic Basmati Rice 5kg', 2, 650.00, 1300.00),
        (order1_id, product2_id, 'Pure Mustard Oil 1L', 3, 250.00, 750.00);
    
    -- Insert order items for Order 2
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES 
        (order2_id, product1_id, 'Premium Honey 500g', 4, 450.00, 1800.00),
        (order2_id, product3_id, 'Organic Turmeric Powder 200g', 5, 180.00, 900.00),
        (order2_id, product2_id, 'Almonds Premium 250g', 2, 275.25, 550.50);
    
    -- Insert order items for Order 3
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES 
        (order3_id, product2_id, 'Red Chili Powder 500g', 6, 150.00, 900.00),
        (order3_id, product1_id, 'Black Pepper Whole 100g', 4, 300.00, 1200.00);
    
    -- Insert order items for Order 4
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES 
        (order4_id, product1_id, 'Green Tea Premium 100g', 5, 190.00, 950.00);
    
    -- Insert order items for Order 5
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES 
        (order5_id, product1_id, 'Dates Premium 1kg', 3, 850.00, 2550.00),
        (order5_id, product2_id, 'Cashew Nuts 500g', 2, 650.25, 1300.50),
        (order5_id, product3_id, 'Raisins Golden 250g', 4, 162.56, 650.25);
END $$;

-- Insert activity logs for the orders
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by_name, ip_address, created_at)
SELECT 
    id,
    'order_created',
    'Order created by customer through website',
    'System',
    user_ip,
    created_at
FROM sales_orders
WHERE sales_order_number LIKE 'SO-1735017600-%';

-- Add approval log for Order 2
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by, performed_by_name, ip_address, new_value, created_at)
SELECT 
    id,
    'approved',
    'Order approved by admin',
    1,
    'Admin User',
    '192.168.1.100',
    jsonb_build_object('status', 'approved', 'approvedAt', (NOW() - INTERVAL '12 hours')::text),
    NOW() - INTERVAL '12 hours'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-002';

-- Update Order 2 approval info
UPDATE sales_orders 
SET approved_by = 1, approved_at = NOW() - INTERVAL '12 hours'
WHERE sales_order_number = 'SO-1735017600-002';

-- Add shipping log for Order 3
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by, performed_by_name, ip_address, new_value, created_at)
SELECT 
    id,
    'shipped',
    'Order shipped via Steadfast. Tracking: ST-2025-789456',
    1,
    'Admin User',
    '192.168.1.100',
    jsonb_build_object('courierCompany', 'Steadfast', 'trackingId', 'ST-2025-789456'),
    NOW() - INTERVAL '2 days'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-003';

-- Update Order 3 courier info
UPDATE sales_orders 
SET 
    courier_company = 'Steadfast',
    tracking_id = 'ST-2025-789456',
    courier_status = 'in_transit',
    shipped_at = NOW() - INTERVAL '2 days'
WHERE sales_order_number = 'SO-1735017600-003';

-- Add courier tracking history for Order 3
INSERT INTO courier_tracking_history (order_id, courier_company, tracking_id, status, location, remarks, updated_at)
SELECT 
    id,
    'Steadfast',
    'ST-2025-789456',
    'picked',
    'Dhaka Hub',
    'Package picked up from warehouse',
    NOW() - INTERVAL '2 days'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-003'
UNION ALL
SELECT 
    id,
    'Steadfast',
    'ST-2025-789456',
    'in_transit',
    'Gazipur Distribution Center',
    'Package in transit to delivery location',
    NOW() - INTERVAL '1 day'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-003';

-- Add hold log for Order 4
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by, performed_by_name, ip_address, old_value, new_value, created_at)
SELECT 
    id,
    'hold',
    'Order put on hold due to payment verification needed',
    1,
    'Admin User',
    '192.168.1.100',
    '{"status": "pending"}'::jsonb,
    '{"status": "hold"}'::jsonb,
    NOW() - INTERVAL '3 hours'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-004';

-- Add internal note log for Order 4
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by, performed_by_name, ip_address, created_at)
SELECT 
    id,
    'notes_updated',
    'Internal notes added: Investigating potential fraud',
    1,
    'Admin User',
    '192.168.1.100',
    NOW() - INTERVAL '2 hours'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-004';

-- Add delivery log for Order 5
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by_name, new_value, created_at)
SELECT 
    id,
    'delivered',
    'Order successfully delivered to customer',
    'System',
    jsonb_build_object('courierStatus', 'delivered', 'deliveredAt', (NOW() - INTERVAL '3 days')::text),
    NOW() - INTERVAL '3 days'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-005';

-- Update Order 5 delivery info
UPDATE sales_orders 
SET 
    courier_company = 'Pathao',
    tracking_id = 'PATH-2025-456123',
    courier_status = 'delivered',
    shipped_at = NOW() - INTERVAL '4 days',
    delivered_at = NOW() - INTERVAL '3 days'
WHERE sales_order_number = 'SO-1735017600-005';

-- Add courier tracking history for Order 5
INSERT INTO courier_tracking_history (order_id, courier_company, tracking_id, status, location, remarks, updated_at)
SELECT 
    id,
    'Pathao',
    'PATH-2025-456123',
    'picked',
    'Uttara Hub',
    'Package picked up',
    NOW() - INTERVAL '4 days'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-005'
UNION ALL
SELECT 
    id,
    'Pathao',
    'PATH-2025-456123',
    'out_for_delivery',
    'Uttara Sector 7',
    'Out for delivery',
    NOW() - INTERVAL '3 days 6 hours'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-005'
UNION ALL
SELECT 
    id,
    'Pathao',
    'PATH-2025-456123',
    'delivered',
    'Customer Address - House 45',
    'Successfully delivered. Cash received.',
    NOW() - INTERVAL '3 days'
FROM sales_orders WHERE sales_order_number = 'SO-1735017600-005';

-- Final success message
SELECT 
    'Sample orders inserted successfully!' as status,
    COUNT(*) as total_orders
FROM sales_orders WHERE sales_order_number LIKE 'SO-1735017600-%';

SELECT 
    'Sample order items inserted!' as status,
    COUNT(*) as total_items
FROM order_items 
WHERE order_id IN (SELECT id FROM sales_orders WHERE sales_order_number LIKE 'SO-1735017600-%');

SELECT 
    'Activity logs created!' as status,
    COUNT(*) as total_logs
FROM order_activity_logs 
WHERE order_id IN (SELECT id FROM sales_orders WHERE sales_order_number LIKE 'SO-1735017600-%');
