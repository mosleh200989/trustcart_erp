ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS district VARCHAR(100);

COMMENT ON COLUMN sales_orders.district IS
  'Customer district captured for main website checkout. Nullable for historical orders created before district became mandatory.';

UPDATE sales_orders so
SET district = NULLIF(BTRIM(c.district), '')
FROM customers c
WHERE so.customer_id = c.id
  AND NULLIF(BTRIM(COALESCE(so.district, '')), '') IS NULL
  AND NULLIF(BTRIM(COALESCE(c.district, '')), '') IS NOT NULL;

WITH ranked_addresses AS (
  SELECT DISTINCT ON (customer_id)
    customer_id,
    district
  FROM customer_addresses
  WHERE NULLIF(BTRIM(COALESCE(district, '')), '') IS NOT NULL
  ORDER BY customer_id, is_primary DESC, updated_at DESC, id DESC
)
UPDATE sales_orders so
SET district = NULLIF(BTRIM(ra.district), '')
FROM ranked_addresses ra
WHERE so.customer_id::text = ra.customer_id::text
  AND NULLIF(BTRIM(COALESCE(so.district, '')), '') IS NULL;

WITH district_aliases(district, needle) AS (
  VALUES
    ('Bagerhat', 'Bagerhat'),
    ('Bandarban', 'Bandarban'),
    ('Barguna', 'Barguna'),
    ('Barishal', 'Barishal'),
    ('Barishal', 'Barisal'),
    ('Bhola', 'Bhola'),
    ('Bogura', 'Bogura'),
    ('Bogura', 'Bogra'),
    ('Brahmanbaria', 'Brahmanbaria'),
    ('Chandpur', 'Chandpur'),
    ('Chapai Nawabganj', 'Chapai Nawabganj'),
    ('Chapai Nawabganj', 'Chapainawabganj'),
    ('Chattogram', 'Chattogram'),
    ('Chattogram', 'Chittagong'),
    ('Chuadanga', 'Chuadanga'),
    ('Cox''s Bazar', 'Cox''s Bazar'),
    ('Cox''s Bazar', 'Cox Bazar'),
    ('Cumilla', 'Cumilla'),
    ('Cumilla', 'Comilla'),
    ('Dhaka', 'Dhaka'),
    ('Dinajpur', 'Dinajpur'),
    ('Faridpur', 'Faridpur'),
    ('Feni', 'Feni'),
    ('Gaibandha', 'Gaibandha'),
    ('Gazipur', 'Gazipur'),
    ('Gopalganj', 'Gopalganj'),
    ('Habiganj', 'Habiganj'),
    ('Jamalpur', 'Jamalpur'),
    ('Jashore', 'Jashore'),
    ('Jashore', 'Jessore'),
    ('Jhalokathi', 'Jhalokathi'),
    ('Jhenaidah', 'Jhenaidah'),
    ('Joypurhat', 'Joypurhat'),
    ('Khagrachhari', 'Khagrachhari'),
    ('Khulna', 'Khulna'),
    ('Kishoreganj', 'Kishoreganj'),
    ('Kurigram', 'Kurigram'),
    ('Kushtia', 'Kushtia'),
    ('Lakshmipur', 'Lakshmipur'),
    ('Lalmonirhat', 'Lalmonirhat'),
    ('Madaripur', 'Madaripur'),
    ('Magura', 'Magura'),
    ('Manikganj', 'Manikganj'),
    ('Meherpur', 'Meherpur'),
    ('Moulvibazar', 'Moulvibazar'),
    ('Moulvibazar', 'Moulvi Bazar'),
    ('Munshiganj', 'Munshiganj'),
    ('Mymensingh', 'Mymensingh'),
    ('Naogaon', 'Naogaon'),
    ('Narail', 'Narail'),
    ('Narayanganj', 'Narayanganj'),
    ('Narsingdi', 'Narsingdi'),
    ('Natore', 'Natore'),
    ('Netrokona', 'Netrokona'),
    ('Nilphamari', 'Nilphamari'),
    ('Noakhali', 'Noakhali'),
    ('Pabna', 'Pabna'),
    ('Panchagarh', 'Panchagarh'),
    ('Patuakhali', 'Patuakhali'),
    ('Pirojpur', 'Pirojpur'),
    ('Rajbari', 'Rajbari'),
    ('Rajshahi', 'Rajshahi'),
    ('Rangamati', 'Rangamati'),
    ('Rangpur', 'Rangpur'),
    ('Satkhira', 'Satkhira'),
    ('Shariatpur', 'Shariatpur'),
    ('Sherpur', 'Sherpur'),
    ('Sirajganj', 'Sirajganj'),
    ('Sunamganj', 'Sunamganj'),
    ('Sylhet', 'Sylhet'),
    ('Tangail', 'Tangail'),
    ('Thakurgaon', 'Thakurgaon')
),
matched_orders AS (
  SELECT DISTINCT ON (so.id)
    so.id,
    da.district
  FROM sales_orders so
  JOIN district_aliases da
    ON LOWER(CONCAT_WS(' ', so.shipping_address, so.notes)) LIKE '%' || LOWER(da.needle) || '%'
  WHERE NULLIF(BTRIM(COALESCE(so.district, '')), '') IS NULL
  ORDER BY so.id, LENGTH(da.needle) DESC
)
UPDATE sales_orders so
SET district = mo.district
FROM matched_orders mo
WHERE so.id = mo.id
  AND NULLIF(BTRIM(COALESCE(so.district, '')), '') IS NULL;
