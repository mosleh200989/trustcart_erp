-- Migration: Move commission permissions to their own 'commission' module
-- Previously they were under 'crm' module and buried among 29 CRM permissions
-- This gives them their own collapsible section in the role permissions page

UPDATE permissions
SET module = 'commission'
WHERE slug IN (
  'manage-commission-settings',
  'view-commission-reports',
  'approve-commissions'
);
