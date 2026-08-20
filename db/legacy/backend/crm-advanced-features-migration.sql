-- Advanced CRM Features Migration
-- Deals, Activities, Tasks, Quotes, Meetings, Email Tracking

-- Drop existing tables if they exist
DROP TABLE IF EXISTS email_tracking CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS deal_stages CASCADE;

-- 1. Create deals table
CREATE TABLE deals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  value DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  actual_close_date DATE,
  stage VARCHAR(50) DEFAULT 'new',
  owner_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open',
  lost_reason TEXT,
  source VARCHAR(100),
  campaign VARCHAR(100),
  description TEXT,
  tags TEXT[],
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_deals_customer;
DROP INDEX IF EXISTS idx_deals_owner;
DROP INDEX IF EXISTS idx_deals_status;
DROP INDEX IF EXISTS idx_deals_stage;
CREATE INDEX idx_deals_customer ON deals(customer_id);
CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_stage ON deals(stage);

-- 2. Create activities table
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  subject VARCHAR(255),
  description TEXT,
  duration INTEGER,
  outcome VARCHAR(100),
  notes TEXT,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_activities_customer;
DROP INDEX IF EXISTS idx_activities_deal;
DROP INDEX IF EXISTS idx_activities_user;
DROP INDEX IF EXISTS idx_activities_type;
CREATE INDEX idx_activities_customer ON activities(customer_id);
CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_type ON activities(type);

-- 3. Create tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to INTEGER REFERENCES users(id),
  assigned_by INTEGER REFERENCES users(id),
  due_date DATE,
  due_time VARCHAR(10),
  priority VARCHAR(20) DEFAULT 'medium',
  category VARCHAR(50),
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMP,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(255),
  reminders JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_tasks_customer;
DROP INDEX IF EXISTS idx_tasks_deal;
DROP INDEX IF EXISTS idx_tasks_assigned_to;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_due_date;
CREATE INDEX idx_tasks_customer ON tasks(customer_id);
CREATE INDEX idx_tasks_deal ON tasks(deal_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- 4. Create quotes table
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  valid_until DATE NOT NULL,
  line_items JSONB NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax DECIMAL(15, 2) DEFAULT 0,
  discount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_terms TEXT,
  delivery_terms TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  notes TEXT,
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_quotes_customer;
DROP INDEX IF EXISTS idx_quotes_deal;
DROP INDEX IF EXISTS idx_quotes_status;
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_deal ON quotes(deal_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- 5. Create meetings table
CREATE TABLE meetings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  organizer_id INTEGER REFERENCES users(id),
  attendees INTEGER[],
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  location VARCHAR(255),
  meeting_link VARCHAR(500),
  agenda TEXT,
  preparation_notes TEXT,
  meeting_notes TEXT,
  action_items JSONB,
  next_steps TEXT,
  outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
  status VARCHAR(50) DEFAULT 'scheduled',
  recording_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_meetings_customer;
DROP INDEX IF EXISTS idx_meetings_deal;
DROP INDEX IF EXISTS idx_meetings_organizer;
DROP INDEX IF EXISTS idx_meetings_start_time;
DROP INDEX IF EXISTS idx_meetings_status;
CREATE INDEX idx_meetings_customer ON meetings(customer_id);
CREATE INDEX idx_meetings_deal ON meetings(deal_id);
CREATE INDEX idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meetings_status ON meetings(status);

-- 6. Create email_tracking table
CREATE TABLE email_tracking (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  sent_by INTEGER REFERENCES users(id),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  sent_at TIMESTAMP NOT NULL,
  opened BOOLEAN DEFAULT FALSE,
  open_count INTEGER DEFAULT 0,
  first_opened_at TIMESTAMP,
  last_opened_at TIMESTAMP,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_links JSONB,
  replied BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMP,
  bounced BOOLEAN DEFAULT FALSE,
  template_used VARCHAR(100),
  attachments JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_email_tracking_customer;
DROP INDEX IF EXISTS idx_email_tracking_sent_by;
DROP INDEX IF EXISTS idx_email_tracking_sent_at;
CREATE INDEX idx_email_tracking_customer ON email_tracking(customer_id);
CREATE INDEX idx_email_tracking_sent_by ON email_tracking(sent_by);
CREATE INDEX idx_email_tracking_sent_at ON email_tracking(sent_at);

-- 7. Create default deal stages
CREATE TABLE deal_stages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  display_order INTEGER NOT NULL,
  probability INTEGER DEFAULT 50,
  is_closed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO deal_stages (name, slug, display_order, probability, is_closed, is_won, color) VALUES
('New Lead', 'new', 1, 10, FALSE, FALSE, '#94a3b8'),
('Contacted', 'contacted', 2, 20, FALSE, FALSE, '#60a5fa'),
('Qualified', 'qualified', 3, 30, FALSE, FALSE, '#3b82f6'),
('Meeting Scheduled', 'meeting_scheduled', 4, 40, FALSE, FALSE, '#8b5cf6'),
('Proposal Sent', 'proposal_sent', 5, 60, FALSE, FALSE, '#a78bfa'),
('Negotiation', 'negotiation', 6, 75, FALSE, FALSE, '#f59e0b'),
('Closed Won', 'closed_won', 7, 100, TRUE, TRUE, '#10b981'),
('Closed Lost', 'closed_lost', 8, 0, TRUE, FALSE, '#ef4444'),
('Nurturing', 'nurturing', 9, 15, FALSE, FALSE, '#6b7280')
ON CONFLICT (slug) DO NOTHING;
