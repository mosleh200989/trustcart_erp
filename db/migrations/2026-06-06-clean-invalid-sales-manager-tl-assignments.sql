WITH sales_team_leader_roles AS (
  SELECT id
  FROM roles
  WHERE slug = 'sales-team-leader'
     OR LOWER(name) LIKE '%team leader%'
),
invalid_assignments AS (
  SELECT c.id
  FROM customers c
  LEFT JOIN users u ON u.id = c.assigned_supervisor_id
  WHERE c.assigned_supervisor_id IS NOT NULL
    AND (
      u.id IS NULL
      OR COALESCE(u.is_deleted, false) = true
      OR COALESCE(u.status::text, '') <> 'active'
      OR u.role_id NOT IN (SELECT id FROM sales_team_leader_roles)
    )
)
UPDATE customers c
SET assigned_supervisor_id = NULL,
    updated_at = NOW()
FROM invalid_assignments ia
WHERE c.id = ia.id;
