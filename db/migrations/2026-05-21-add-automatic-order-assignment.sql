CREATE TABLE IF NOT EXISTS automatic_order_assignment_settings (
  id serial PRIMARY KEY,
  team_leader_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  max_active_orders integer NOT NULL DEFAULT 10,
  updated_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automatic_order_assignment_logs (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  agent_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_leader_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by integer NULL REFERENCES users(id) ON DELETE SET NULL,
  reason varchar(100) NOT NULL DEFAULT 'online_agent_auto_assignment',
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_assignment_settings_tl_enabled
  ON automatic_order_assignment_settings(team_leader_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_logs_tl_created
  ON automatic_order_assignment_logs(team_leader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_assignment_logs_agent_created
  ON automatic_order_assignment_logs(agent_id, created_at DESC);

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Automatic Assignment', 'view-auto-order-assignment', 'crm', 'read', 'View automatic order assignment settings and team reports'),
  ('Manage Automatic Assignment', 'manage-auto-order-assignment', 'crm', 'update', 'Enable automatic order assignment and configure team limits')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin', 'sales-manager', 'sales-team-leader')
  AND p.slug IN ('view-auto-order-assignment', 'manage-auto-order-assignment')
ON CONFLICT DO NOTHING;

WITH crm_parent AS (
  SELECT id
  FROM admin_menu_items
  WHERE parent_id IS NULL
    AND title = 'CRM'
  ORDER BY id
  LIMIT 1
),
last_child AS (
  SELECT COALESCE(MAX(sort_order), 0) AS sort_order
  FROM admin_menu_items
  WHERE parent_id = (SELECT id FROM crm_parent)
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
  'Automatic Assignment',
  'FaUserCheck',
  '/admin/crm/automatic-assignment',
  crm_parent.id,
  last_child.sort_order + 1,
  TRUE,
  ARRAY['view-auto-order-assignment', 'manage-auto-order-assignment']::text[],
  NOW(),
  NOW()
FROM crm_parent, last_child
WHERE NOT EXISTS (
  SELECT 1 FROM admin_menu_items WHERE path = '/admin/crm/automatic-assignment'
);

UPDATE admin_menu_items
SET required_permissions = ARRAY['view-auto-order-assignment', 'manage-auto-order-assignment']::text[],
    icon = 'FaUserCheck',
    is_active = TRUE,
    updated_at = NOW()
WHERE path = '/admin/crm/automatic-assignment';

UPDATE admin_menu_items
SET is_active = FALSE,
    updated_at = NOW()
WHERE path = '/admin/sales/assigned-orders';
