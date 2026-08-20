-- Add lead_status column to customers table
-- This column tracks the lead qualification status for CRM purposes

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS lead_status VARCHAR(50) NULL;

-- Drop existing constraint if any, then add updated one
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_lead_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_lead_status_check 
  CHECK (lead_status IN ('unassigned', 'assigned', 'contacted', 'qualified', 'converted', 'lost', 'not_interested', 'no_answer', 'follow_up'));

-- Create an index for faster filtering by lead status
CREATE INDEX IF NOT EXISTS idx_customers_lead_status ON customers(lead_status);

COMMENT ON COLUMN customers.lead_status IS 'Lead qualification status: qualified, converted, not_interested, no_answer, follow_up, etc.';
