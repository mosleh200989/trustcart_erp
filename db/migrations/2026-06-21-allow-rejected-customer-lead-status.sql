-- Allow customers marked as Rejected tier to also carry rejected lead status.

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_lead_status_check;

ALTER TABLE customers ADD CONSTRAINT customers_lead_status_check
  CHECK (
    lead_status IS NULL OR lead_status IN (
      'unassigned',
      'assigned',
      'contacted',
      'qualified',
      'converted',
      'lost',
      'not_interested',
      'no_answer',
      'follow_up',
      'rejected'
    )
  );
