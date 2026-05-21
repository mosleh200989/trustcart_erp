ALTER TABLE incomplete_orders
  ADD COLUMN IF NOT EXISTS assigned_to integer NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS telephony_called_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS telephony_call_status varchar(30) NULL,
  ADD COLUMN IF NOT EXISTS telephony_outcome varchar(50) NULL,
  ADD COLUMN IF NOT EXISTS telephony_suggestion varchar(100) NULL,
  ADD COLUMN IF NOT EXISTS telephony_notes text NULL;

CREATE INDEX IF NOT EXISTS idx_incomplete_orders_assigned_to ON incomplete_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incomplete_orders_assigned_call_status ON incomplete_orders(assigned_to, telephony_call_status);

WITH telephony_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'Telephony'
  ORDER BY id
  LIMIT 1
),
order_assignment AS (
  SELECT sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM telephony_parent)
    AND path = '/admin/telephony/order-assignment'
  ORDER BY id
  LIMIT 1
),
items(title, path, sort_offset) AS (
  VALUES
    ('Incomplete Assignment', '/admin/telephony/incomplete-assignment', 1),
    ('Cancelled Assignment', '/admin/telephony/cancelled-assignment', 2),
    ('Rejected Assignment', '/admin/telephony/rejected-assignment', 3)
)
INSERT INTO admin_menu_items (
  title,
  icon,
  path,
  parent_id,
  sort_order,
  is_active,
  required_permissions,
  created_at,
  updated_at
)
SELECT
  items.title,
  'FaPhone',
  items.path,
  telephony_parent.id,
  COALESCE((SELECT sort_order FROM order_assignment), 1) + items.sort_offset,
  TRUE,
  ARRAY['view-order-assignment']::text[],
  NOW(),
  NOW()
FROM telephony_parent, items
WHERE NOT EXISTS (
  SELECT 1 FROM admin_menu_items existing WHERE existing.path = items.path
);

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-order-assignment']::text[],
    icon = 'FaPhone',
    is_active = TRUE,
    updated_at = NOW()
WHERE path IN (
  '/admin/telephony/incomplete-assignment',
  '/admin/telephony/cancelled-assignment',
  '/admin/telephony/rejected-assignment'
);
