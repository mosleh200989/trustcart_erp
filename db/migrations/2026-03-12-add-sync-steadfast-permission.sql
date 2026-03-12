-- Add sync-steadfast permission for bulk Steadfast status sync
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Sync Steadfast Status', 'sync-steadfast', 'sales', 'update', 'Trigger bulk sync of all Steadfast courier statuses')
ON CONFLICT (slug) DO NOTHING;
