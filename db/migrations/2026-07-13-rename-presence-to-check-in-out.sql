-- Rename the existing Presence parent menu without changing routes or permissions.

UPDATE admin_menu_items parent
SET title = 'Check In/Out',
    updated_at = NOW()
WHERE parent.title = 'Presence'
  AND parent.path IS NULL
  AND EXISTS (
    SELECT 1
    FROM admin_menu_items child
    WHERE child.parent_id = parent.id
      AND child.path LIKE '/admin/presence%'
  );
