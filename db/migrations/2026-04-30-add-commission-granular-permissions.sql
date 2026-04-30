-- ============================================================
-- Migration: Granular Commission Permissions
-- Date: 2026-04-30
--
-- Adds fine-grained view/manage permissions for each commission
-- sub-module, replacing the single 'view-commission-reports'
-- permission with scoped alternatives.
--
-- Existing permissions are NOT removed (backward compatible):
--   257 manage-commission-settings  (kept)
--   258 view-commission-reports     (kept – existing roles unaffected)
--   259 approve-commissions         (kept)
--
-- New permission slugs:
--   view-commission-settings   – read-only access to settings & slabs
--   view-commission-sales      – view commission sales data
--   manage-commission-sales    – edit commission sales rows
--   view-agent-commissions     – view agent commission reports
--   manage-agent-commissions   – edit agent commissions (extra partial etc.)
--   view-tl-commissions        – view TL commission reports (admin ONLY)
--   manage-tl-commissions      – manage TL commission data
--   view-payment-requests      – view payment requests list
--   manage-payment-requests    – create/approve/pay/reject payment requests
--   view-payment-history       – view payment history
--   view-payment-breakdown     – view agent payment breakdown
-- ============================================================

INSERT INTO public.permissions (name, slug, module, action, description, created_at)
VALUES
  ('View Commission Settings',  'view-commission-settings',  'commission', 'read',   'View commission settings and slabs (read-only)',                    NOW()),
  ('View Commission Sales',     'view-commission-sales',     'commission', 'read',   'View commission sales data and order details',                     NOW()),
  ('Manage Commission Sales',   'manage-commission-sales',   'commission', 'update', 'Edit fields on commission sales rows',                             NOW()),
  ('View Agent Commissions',    'view-agent-commissions',    'commission', 'read',   'View agent commission reports and breakdowns (agents can see peers)', NOW()),
  ('Manage Agent Commissions',  'manage-agent-commissions',  'commission', 'update', 'Edit agent commission data (extra partial, adjustments)',          NOW()),
  ('View TL Commissions',       'view-tl-commissions',       'commission', 'read',   'View team-leader commission reports (admin/sales-manager only)',   NOW()),
  ('Manage TL Commissions',     'manage-tl-commissions',     'commission', 'update', 'Manage team-leader commission data',                               NOW()),
  ('View Payment Requests',     'view-payment-requests',     'commission', 'read',   'View commission payment requests',                                 NOW()),
  ('Manage Payment Requests',   'manage-payment-requests',   'commission', 'update', 'Create, approve, pay, or reject commission payment requests',      NOW()),
  ('View Payment History',      'view-payment-history',      'commission', 'read',   'View commission payment history',                                  NOW()),
  ('View Payment Breakdown',    'view-payment-breakdown',    'commission', 'read',   'View agent payment breakdown (daily slab calculations)',            NOW())
ON CONFLICT (slug) DO NOTHING;
