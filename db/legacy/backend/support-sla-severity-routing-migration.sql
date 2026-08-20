-- Support Tickets: SLA + Severity + Support Group routing
-- Adds routing/severity/SLA fields without breaking existing installs.

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS support_group VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS first_response_due_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE;

-- Backfill nulls for older rows
UPDATE support_tickets
SET severity = COALESCE(severity, 'medium')
WHERE severity IS NULL;

UPDATE support_tickets
SET support_group = COALESCE(support_group, 'general')
WHERE support_group IS NULL;

-- Indexes to support routing & SLA dashboards
CREATE INDEX IF NOT EXISTS idx_support_tickets_support_group ON support_tickets(support_group);
CREATE INDEX IF NOT EXISTS idx_support_tickets_severity ON support_tickets(severity);
CREATE INDEX IF NOT EXISTS idx_support_tickets_first_response_due ON support_tickets(first_response_due_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_resolution_due ON support_tickets(resolution_due_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_breached ON support_tickets(sla_breached);

COMMENT ON COLUMN support_tickets.severity IS 'Ticket severity: low, medium, high, critical';
COMMENT ON COLUMN support_tickets.support_group IS 'Routing group: general, billing, delivery, account, technical';
COMMENT ON COLUMN support_tickets.first_response_due_at IS 'SLA due time for first response';
COMMENT ON COLUMN support_tickets.resolution_due_at IS 'SLA due time for resolution/closure';
COMMENT ON COLUMN support_tickets.resolved_at IS 'Timestamp when ticket moved to resolved/closed';
COMMENT ON COLUMN support_tickets.sla_breached IS 'True if ticket missed SLA (first response or resolution)';
