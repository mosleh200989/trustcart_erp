# 📊 CDM & CRM Complete User Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [CDM - Customer Data Management](#cdm---customer-data-management)
3. [CRM - Customer Relationship Management](#crm---customer-relationship-management)
4. [Getting Started](#getting-started)
5. [API Reference](#api-reference)
6. [Frontend Pages](#frontend-pages)
7. [Automation Features](#automation-features)
8. [Best Practices](#best-practices)

---

## System Overview

TrustCart ERP এর CDM ও CRM সিস্টেম একসাথে কাজ করে কাস্টমারদের সম্পূর্ণ জীবনচক্র ম্যানেজ করার জন্য।

### 🎯 Key Features:
- **CDM**: 360° customer view, family tracking, behavior analysis, dropoff detection
- **CRM**: Call task automation, engagement tracking, marketing campaigns, product recommendations

### 🔗 Integration:
```
CDM (Customer Data) ──► CRM (Actions) ──► Loyalty (Rewards) ──► Repeat Sales
```

---

## CDM - Customer Data Management

### 📋 What is CDM?

Customer Data Management হল একটি সিস্টেম যা প্রতিটি কাস্টমারের সম্পূর্ণ তথ্য এক জায়গায় সংরক্ষণ করে এবং বিশ্লেষণ করে।

### 🗂️ Database Tables

#### 1. **customers** (Enhanced)
```sql
-- New columns added by CDM:
first_name VARCHAR(50)
last_name VARCHAR(50)
date_of_birth DATE
anniversary_date DATE
priority_level VARCHAR(20)          -- hot, warm, cold
customer_type VARCHAR(20)            -- new, repeat, vip, inactive
lifecycle_stage VARCHAR(30)          -- prospect, new, active, at_risk, churned
total_spend DECIMAL(12,2)
last_order_date DATE
notes TEXT
```

**Customer Types:**
- `new` - প্রথম অর্ডার করেছে (1 order)
- `repeat` - রিপিট কাস্টমার (2-5 orders)
- `vip` - ভিআইপি কাস্টমার (6+ orders or high spend)
- `inactive` - 90+ দিন অর্ডার করেনি

**Lifecycle Stages:**
- `prospect` - রেজিস্টার করেছে, অর্ডার করেনি
- `new` - প্রথম অর্ডার করেছে
- `active` - নিয়মিত অর্ডার করে
- `at_risk` - 60+ দিন অর্ডার করেনি
- `churned` - 120+ দিন অর্ডার করেনি

**Temperature:**
- `hot` 🔥 - Last 7 days এ অর্ডার
- `warm` 🟡 - Last 30 days এ অর্ডার
- `cold` ❄️ - 30+ days no order

#### 2. **customer_family_members**
পরিবারের সদস্যদের তথ্য সংরক্ষণ করে।

```sql
CREATE TABLE customer_family_members (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50),           -- spouse, child, parent, sibling
  date_of_birth DATE,
  phone VARCHAR(20),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Use Cases:**
- পরিবারের জন্মদিন ট্র্যাক করা
- Family combo offers পাঠানো
- Multiple delivery addresses ম্যানেজ করা

#### 3. **customer_interactions**
কাস্টমারের সাথে সব ধরনের কমিউনিকেশন ট্র্যাক করে।

```sql
CREATE TABLE customer_interactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  interaction_type VARCHAR(30),       -- call, whatsapp, sms, email, visit
  direction VARCHAR(20),               -- inbound, outbound
  subject VARCHAR(200),
  details TEXT,
  outcome VARCHAR(50),                 -- successful, no_answer, follow_up_needed
  agent_id INTEGER REFERENCES users(id),
  interaction_date TIMESTAMP DEFAULT NOW(),
  follow_up_date DATE
);
```

**Interaction Types:**
- `call` - ফোন কল
- `whatsapp` - WhatsApp মেসেজ
- `sms` - SMS
- `email` - ইমেইল
- `visit` - অফিস ভিজিট

**Outcomes:**
- `successful` - সফল (অর্ডার বা ইতিবাচক রেসপন্স)
- `no_answer` - উত্তর দেয়নি
- `follow_up_needed` - ফলো-আপ প্রয়োজন
- `not_interested` - আগ্রহী নয়

#### 4. **customer_behavior**
কাস্টমার আচরণ বিশ্লেষণ ও পছন্দ।

```sql
CREATE TABLE customer_behavior (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  avg_order_value DECIMAL(10,2),
  preferred_categories TEXT[],        -- JSON array of category IDs
  preferred_payment_method VARCHAR(50),
  avg_days_between_orders INTEGER,
  peak_order_time VARCHAR(20),        -- morning, afternoon, evening, night
  has_abandoned_cart BOOLEAN DEFAULT FALSE,
  cart_recovery_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Behavior Insights:**
- Average order value tracking
- Preferred product categories
- Payment method preferences
- Order frequency patterns
- Cart abandonment tracking

#### 5. **customer_dropoff_tracking**
কাস্টমার চলে যাওয়ার ঝুঁকি ট্র্যাক করে।

```sql
CREATE TABLE customer_dropoff_tracking (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  last_active_date DATE,
  days_inactive INTEGER,
  risk_level VARCHAR(20),             -- low, medium, high, critical
  reason TEXT,
  recovery_attempted BOOLEAN DEFAULT FALSE,
  recovery_successful BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Risk Levels:**
- `low` - 30-60 days inactive
- `medium` - 60-90 days inactive
- `high` - 90-120 days inactive
- `critical` - 120+ days inactive

### 📊 CDM Views

#### customer_360_view
প্রতিটি কাস্টমারের সম্পূর্ণ তথ্য এক জায়গায়।

```sql
SELECT 
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.customer_type,
  c.lifecycle_stage,
  c.priority_level as customer_temperature,
  c.total_spend as lifetime_value,
  COUNT(DISTINCT so.id) as total_orders,
  AVG(so.total_amount) as avg_order_value,
  MAX(so.order_date) as last_order_date,
  CURRENT_DATE - MAX(so.order_date) as days_since_last_order,
  COUNT(DISTINCT cfm.id) as family_members_count,
  COUNT(DISTINCT ci.id) as total_interactions,
  cb.preferred_categories,
  cb.avg_days_between_orders
FROM customers c
LEFT JOIN sales_orders so ON c.id = so.customer_id
LEFT JOIN customer_family_members cfm ON c.id = cfm.customer_id
LEFT JOIN customer_interactions ci ON c.id = ci.customer_id
LEFT JOIN customer_behavior cb ON c.id = cb.customer_id
GROUP BY c.id, cb.*
```

#### upcoming_birthdays_anniversaries
আগামী 30 দিনের জন্মদিন ও বিবাহ বার্ষিকী।

```sql
SELECT 
  c.id,
  c.first_name || ' ' || c.last_name as name,
  c.email,
  c.phone,
  c.date_of_birth,
  c.anniversary_date,
  'birthday' as event_type
FROM customers c
WHERE EXTRACT(MONTH FROM c.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days')
  AND EXTRACT(DAY FROM c.date_of_birth) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) 
      AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days')

UNION ALL

SELECT 
  cfm.customer_id as id,
  cfm.name,
  c.email,
  c.phone,
  cfm.date_of_birth,
  NULL as anniversary_date,
  'family_birthday' as event_type
FROM customer_family_members cfm
JOIN customers c ON cfm.customer_id = c.id
WHERE EXTRACT(MONTH FROM cfm.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days')
```

### 🔧 CDM Backend API

**Base URL**: `http://localhost:3001/cdm`

#### Get Customer 360° View
```http
GET /cdm/customer360/:customerId

Response:
{
  "customer_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "customer_type": "repeat",
  "lifecycle_stage": "active",
  "customer_temperature": "warm",
  "lifetime_value": 15000,
  "total_orders": 5,
  "avg_order_value": 3000,
  "days_since_last_order": 15,
  "family_members_count": 3,
  "total_interactions": 8
}
```

#### Get All Customers 360°
```http
GET /cdm/customer360?customerType=vip&temperature=hot&limit=50&offset=0

Query Parameters:
- customerType: new | repeat | vip | inactive
- lifecycleStage: prospect | new | active | at_risk | churned
- temperature: hot | warm | cold
- limit: number (default 50)
- offset: number (default 0)
```

#### Get Family Members
```http
GET /cdm/family-members/:customerId

Response:
[
  {
    "id": 1,
    "name": "Jane Doe",
    "relationship": "spouse",
    "date_of_birth": "1995-03-15",
    "phone": "01700000001"
  }
]
```

#### Add Family Member
```http
POST /cdm/family-member

Body:
{
  "customerId": 1,
  "name": "Jane Doe",
  "relationship": "spouse",
  "dateOfBirth": "1995-03-15",
  "phone": "01700000001",
  "address": "Dhaka, Bangladesh"
}
```

#### Get Customer Interactions
```http
GET /cdm/interactions/:customerId?limit=20

Response:
[
  {
    "id": 1,
    "interaction_type": "call",
    "direction": "outbound",
    "subject": "Follow-up on order",
    "outcome": "successful",
    "agent_name": "Agent 1",
    "interaction_date": "2025-12-15T10:30:00Z"
  }
]
```

#### Log Interaction
```http
POST /cdm/interaction

Body:
{
  "customerId": 1,
  "interactionType": "call",
  "direction": "outbound",
  "subject": "Product inquiry",
  "details": "Customer asked about honey prices",
  "outcome": "successful",
  "agentId": 5,
  "followUpDate": "2025-12-20"
}
```

#### Get Customer Behavior
```http
GET /cdm/behavior/:customerId

Response:
{
  "customer_id": 1,
  "avg_order_value": 3000,
  "preferred_categories": ["Honey", "Organic Foods"],
  "preferred_payment_method": "bKash",
  "avg_days_between_orders": 25,
  "peak_order_time": "evening",
  "has_abandoned_cart": false
}
```

#### Get At-Risk Customers
```http
GET /cdm/dropoff?riskLevel=high&limit=50

Response:
[
  {
    "customer_id": 10,
    "name": "Customer Name",
    "last_active_date": "2025-09-15",
    "days_inactive": 95,
    "risk_level": "high",
    "lifetime_value": 8000,
    "recovery_attempted": true
  }
]
```

#### Get Upcoming Events (Birthdays/Anniversaries)
```http
GET /cdm/upcoming-events?days=30

Response:
[
  {
    "customer_id": 5,
    "name": "John Doe",
    "email": "john@example.com",
    "event_type": "birthday",
    "event_date": "2025-12-25",
    "days_until": 7
  }
]
```

---

## CRM - Customer Relationship Management

### 📋 What is CRM?

CRM সিস্টেম কাস্টমারদের সাথে সম্পর্ক তৈরি ও বজায় রাখার জন্য বিভিন্ন টুলস প্রদান করে।

### 🗂️ Database Tables

#### 1. **crm_call_tasks**
দৈনিক কল টাস্ক ম্যানেজমেন্ট।

```sql
CREATE TABLE crm_call_tasks (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  assigned_agent_id INTEGER REFERENCES users(id),
  task_type VARCHAR(50),              -- new_customer, follow_up, at_risk, birthday
  priority VARCHAR(20),                -- hot, warm, cold
  task_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, skipped
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Task Types:**
- `new_customer` - নতুন কাস্টমার ওয়েলকাম কল
- `follow_up` - ফলো-আপ কল
- `at_risk` - রিস্ক কাস্টমার রিকভারি
- `birthday` - জন্মদিনের শুভেচ্ছা
- `repeat_reminder` - রিপিট অর্ডার রিমাইন্ডার

**Priority:**
- `hot` 🔥 - Urgent (VIP, high-value customers)
- `warm` 🟡 - Normal priority
- `cold` ❄️ - Low priority

#### 2. **customer_engagement_history**
সব ধরনের কাস্টমার এনগেজমেন্ট ট্র্যাক করে।

```sql
CREATE TABLE customer_engagement_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  engagement_type VARCHAR(50),        -- call, message, email, offer_sent
  channel VARCHAR(30),                 -- phone, whatsapp, sms, email
  content TEXT,
  response VARCHAR(50),                -- positive, negative, no_response
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **product_recommendation_rules**
প্রোডাক্ট রেকমেন্ডেশন রুলস।

```sql
CREATE TABLE product_recommendation_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100),
  product_id INTEGER REFERENCES products(id),
  target_category VARCHAR(100),
  target_customer_type VARCHAR(50),   -- new, repeat, vip
  discount_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. **marketing_campaigns**
মার্কেটিং ক্যাম্পেইন ম্যানেজমেন্ট।

```sql
CREATE TABLE marketing_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_name VARCHAR(100),
  campaign_type VARCHAR(50),          -- sms, email, whatsapp, push
  target_segment VARCHAR(50),         -- all, new, repeat, vip, inactive
  message_template TEXT,
  discount_code VARCHAR(50),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  sent_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 📊 CRM Views

#### customer_intelligence
AI-powered customer insights.

```sql
SELECT 
  c.id as customer_id,
  c.first_name || ' ' || c.last_name as customer_name,
  c.customer_type,
  c.lifecycle_stage,
  c.total_spend,
  -- AI Recommendations
  CASE 
    WHEN c.lifecycle_stage = 'at_risk' THEN 'Send discount offer'
    WHEN c.customer_type = 'vip' THEN 'Personal call from manager'
    WHEN c.customer_type = 'new' THEN 'Welcome gift voucher'
    ELSE 'Regular follow-up'
  END as recommended_action,
  -- Call priority
  CASE 
    WHEN c.customer_type = 'vip' THEN 'hot'
    WHEN c.lifecycle_stage = 'at_risk' THEN 'warm'
    ELSE 'cold'
  END as call_priority
FROM customers c
```

#### agent_performance_dashboard
এজেন্ট পারফরম্যান্স ট্র্যাকিং।

```sql
SELECT 
  u.id as agent_id,
  u.name as agent_name,
  COUNT(DISTINCT ct.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN ct.status = 'completed' THEN ct.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN ct.outcome LIKE '%successful%' THEN ct.id END) as successful_calls,
  COUNT(DISTINCT ci.id) as total_interactions,
  AVG(EXTRACT(EPOCH FROM (ct.updated_at - ct.created_at))/60) as avg_call_duration_minutes
FROM users u
LEFT JOIN crm_call_tasks ct ON u.id = ct.assigned_agent_id
LEFT JOIN customer_interactions ci ON u.id = ci.agent_id
WHERE u.role = 'crm_agent'
GROUP BY u.id, u.name
```

### 🔧 CRM Backend API

**Base URL**: `http://localhost:3001/crm-automation`

#### Get Today's Call Tasks
```http
GET /crm-automation/call-tasks/today?agentId=5

Response:
[
  {
    "id": 1,
    "customer_name": "John Doe",
    "customer_phone": "01700000000",
    "task_type": "follow_up",
    "priority": "hot",
    "notes": "Customer showed interest in honey"
  }
]
```

#### Update Call Task Status
```http
PUT /crm-automation/call-task/:taskId/status

Body:
{
  "status": "completed",
  "outcome": "successful - placed order",
  "notes": "Customer ordered 2kg honey"
}
```

#### Generate Daily Call Tasks
```http
POST /crm-automation/generate-call-tasks

Body:
{
  "taskDate": "2025-12-19"
}

Response:
{
  "message": "Generated 25 call tasks for 2025-12-19",
  "breakdown": {
    "new_customer": 5,
    "follow_up": 10,
    "at_risk": 8,
    "birthday": 2
  }
}
```

#### Get Product Recommendations
```http
GET /crm-automation/recommendations/:customerId

Response:
[
  {
    "product_id": 10,
    "product_name": "Organic Honey 500g",
    "recommended_price": 450,
    "discount_percentage": 10,
    "reason": "Based on previous purchases"
  }
]
```

#### Log Customer Engagement
```http
POST /crm-automation/engagement

Body:
{
  "customerId": 1,
  "engagementType": "offer_sent",
  "channel": "whatsapp",
  "content": "Special 15% discount on honey",
  "response": "positive"
}
```

#### Get Marketing Campaigns
```http
GET /crm-automation/campaigns?status=active

Response:
[
  {
    "id": 1,
    "campaign_name": "Winter Sale 2025",
    "campaign_type": "whatsapp",
    "target_segment": "repeat",
    "discount_code": "WINTER25",
    "start_date": "2025-12-20",
    "end_date": "2025-12-31",
    "sent_count": 500,
    "response_count": 75
  }
]
```

#### Create Marketing Campaign
```http
POST /crm-automation/campaign

Body:
{
  "campaignName": "Eid Special 2026",
  "campaignType": "whatsapp",
  "targetSegment": "all",
  "messageTemplate": "🎉 Eid Mubarak! Get 20% off on all products. Use code: EID20",
  "discountCode": "EID20",
  "startDate": "2026-03-30",
  "endDate": "2026-04-05"
}
```

#### Send Campaign to Customers
```http
POST /crm-automation/campaign/:campaignId/send

Response:
{
  "message": "Campaign sent to 850 customers",
  "sent_count": 850,
  "failed_count": 0
}
```

#### Get Agent Performance
```http
GET /crm-automation/agent-performance?agentId=5&startDate=2025-12-01&endDate=2025-12-18

Response:
{
  "agent_id": 5,
  "agent_name": "Agent Name",
  "total_tasks": 120,
  "completed_tasks": 110,
  "successful_calls": 85,
  "completion_rate": 91.67,
  "success_rate": 77.27,
  "avg_call_duration": 8.5
}
```

---

## Getting Started

### Prerequisites

1. **Database**: PostgreSQL 12+
2. **Backend**: Node.js 16+, NestJS
3. **Frontend**: Next.js 14+

### Installation Steps

#### 1. Run Migrations

```powershell
# CDM Migration
cd c:\xampp\htdocs\trustcart_erp\backend
$env:PGPASSWORD="c0mm0n"
& "C:\Program Files\PostgreSQL\12\bin\psql.exe" -U postgres -d trustcart_erp -f cdm-migration.sql

# CRM Migration
& "C:\Program Files\PostgreSQL\12\bin\psql.exe" -U postgres -d trustcart_erp -f crm-automation-migration.sql
```

#### 2. Verify Tables

```sql
-- Check CDM tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'customer_%'
ORDER BY table_name;

-- Should return:
-- customer_behavior
-- customer_dropoff_tracking
-- customer_family_members
-- customer_interactions
-- customers

-- Check CRM tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'crm_%'
ORDER BY table_name;

-- Should return:
-- crm_call_tasks
-- customer_engagement_history
-- marketing_campaigns
-- product_recommendation_rules
```

#### 3. Start Backend

```powershell
cd c:\xampp\htdocs\trustcart_erp\backend
npm install
npm run start:dev
```

Backend will start at: http://localhost:3001

#### 4. Start Frontend

```powershell
cd c:\xampp\htdocs\trustcart_erp\frontend
npm install
npm run dev
```

Frontend will start at: http://localhost:3000

---

## Frontend Pages

### CDM Pages

#### 1. Customer 360° Dashboard
**URL**: `/admin/customers/cdm`

**Features:**
- View all customers with 360° data
- Filter by customer type, lifecycle stage, temperature
- Sort by lifetime value, last order date
- Quick actions (call, message, view details)

**Filters:**
```typescript
- Customer Type: All | New | Repeat | VIP | Inactive
- Temperature: All | Hot | Warm | Cold
- Lifecycle: All | Prospect | New | Active | At-Risk | Churned
```

#### 2. Customer Detail Page
**URL**: `/admin/customers/[id]`

**Tabs:**
1. **Overview**: Basic info, stats, recent orders
2. **Family**: Family members list
3. **Interactions**: Call/message history
4. **Behavior**: Purchase patterns, preferences
5. **360° View**: Complete customer intelligence

### CRM Pages

#### 1. CRM Dashboard
**URL**: `/admin/crm`

**Widgets:**
- Today's call tasks count
- Pending tasks by priority
- Agent performance summary
- Active campaigns
- Recent engagements

#### 2. Agent Dashboard
**URL**: `/admin/crm/agent-dashboard`

**Features:**
- Today's call list (auto-generated)
- Task priority indicators (🔥 Hot, 🟡 Warm, ❄️ Cold)
- One-click call status update
- Notes & outcome logging
- Performance metrics (completion rate, success rate)

#### 3. Team Dashboard
**URL**: `/admin/crm/team-dashboard`

**Features:**
- All agents performance comparison
- Task distribution by agent
- Success rate leaderboard
- Daily/weekly/monthly reports

#### 4. Automation Dashboard
**URL**: `/admin/crm/automation`

**Features:**
- Marketing campaigns list
- Create new campaign
- Send campaign to segments
- Campaign analytics (sent, opened, converted)
- Product recommendation rules
- Call task automation settings

---

## Automation Features

### 1. Daily Call Task Generation

**Trigger**: Cron job every day at 6:00 AM

```typescript
// Auto-generates call tasks based on:
- New customers (welcome call)
- Follow-up needed (from previous interactions)
- At-risk customers (60+ days no order)
- Birthdays (today & tomorrow)
- Anniversary reminders
```

**Database Function:**
```sql
SELECT generate_daily_call_tasks('2025-12-19');
```

### 2. Lifecycle Stage Auto-Update

**Trigger**: After every order

```sql
CREATE FUNCTION update_customer_lifecycle() RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    lifecycle_stage = CASE
      WHEN NEW.order_count = 1 THEN 'new'
      WHEN NEW.order_count >= 2 AND days_since_last < 60 THEN 'active'
      WHEN days_since_last BETWEEN 60 AND 90 THEN 'at_risk'
      WHEN days_since_last > 90 THEN 'churned'
      ELSE lifecycle_stage
    END
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Marketing Campaign Automation

**Trigger**: Manual or scheduled

```typescript
// Auto-sends campaigns based on:
- Customer segment (new, repeat, vip, inactive)
- Campaign type (SMS, WhatsApp, Email)
- Discount codes
- Time-based triggers
```

### 4. At-Risk Customer Detection

**Schedule**: Daily at midnight

```sql
INSERT INTO customer_dropoff_tracking (customer_id, days_inactive, risk_level)
SELECT 
  c.id,
  CURRENT_DATE - MAX(so.order_date) as days_inactive,
  CASE 
    WHEN CURRENT_DATE - MAX(so.order_date) BETWEEN 30 AND 60 THEN 'low'
    WHEN CURRENT_DATE - MAX(so.order_date) BETWEEN 60 AND 90 THEN 'medium'
    WHEN CURRENT_DATE - MAX(so.order_date) BETWEEN 90 AND 120 THEN 'high'
    ELSE 'critical'
  END as risk_level
FROM customers c
LEFT JOIN sales_orders so ON c.id = so.customer_id
WHERE CURRENT_DATE - MAX(so.order_date) > 30
GROUP BY c.id;
```

---

## Best Practices

### 1. Daily Workflow

**Morning (9:00 AM):**
1. Open Agent Dashboard (`/admin/crm/agent-dashboard`)
2. Review today's call tasks (auto-generated at 6 AM)
3. Sort by priority (🔥 Hot first)
4. Start calling from top of list

**During Calls:**
1. Update call status immediately after each call
2. Log outcome (successful, no_answer, follow_up_needed)
3. Add notes for context
4. Set follow-up date if needed

**Evening (5:00 PM):**
1. Review incomplete tasks
2. Reschedule urgent tasks for tomorrow
3. Check daily performance metrics
4. Plan next day's priorities

### 2. Customer Interaction Guidelines

**New Customer (First Call):**
```
✅ DO:
- Welcome warmly
- Thank for first order
- Ask about product satisfaction
- Offer 10% discount on next order
- Collect family member info
- Ask about preferred contact time

❌ DON'T:
- Rush the call
- Sound scripted
- Push for immediate sale
- Ignore customer questions
```

**At-Risk Customer (Recovery Call):**
```
✅ DO:
- Address by name
- Mention last purchase date
- Ask if there was any issue
- Offer exclusive discount (15-20%)
- Suggest new products they might like
- Create urgency (limited time offer)

❌ DON'T:
- Sound desperate
- Blame customer for not ordering
- Offer generic discounts
- Make false promises
```

**VIP Customer (Relationship Call):**
```
✅ DO:
- Personalized greeting
- Thank for loyalty
- Offer early access to new products
- Ask for feedback/suggestions
- Provide dedicated support number
- Send birthday/anniversary gifts

❌ DON'T:
- Treat like regular customer
- Sell aggressively
- Miss special occasions
```

### 3. Data Management

**Daily:**
- Log all customer interactions
- Update call task outcomes
- Mark completed tasks

**Weekly:**
- Review customer behavior changes
- Update customer temperatures
- Identify new at-risk customers
- Generate weekly reports

**Monthly:**
- Analyze campaign performance
- Update recommendation rules
- Review agent performance
- Plan next month's campaigns

### 4. Segmentation Strategy

**New Customers (0-30 days):**
- Frequency: 3 calls in first month
- Focus: Satisfaction, education, retention
- Offer: Welcome discount, product guide

**Repeat Customers (2-5 orders):**
- Frequency: 1 call per month
- Focus: Cross-sell, upsell, referrals
- Offer: Loyalty discount, combo deals

**VIP Customers (6+ orders):**
- Frequency: 2 calls per month
- Focus: Relationship, exclusivity, feedback
- Offer: VIP perks, early access, gifts

**Inactive Customers (90+ days):**
- Frequency: Weekly recovery attempts (3 weeks)
- Focus: Win-back, problem resolution
- Offer: 20-30% discount, free delivery

---

## Troubleshooting

### Common Issues

#### 1. Customer 360 View Not Loading

**Problem**: View returns null or empty
```sql
-- Check if view exists
SELECT * FROM customer_360_view LIMIT 1;
```

**Solution**: Recreate view
```sql
DROP VIEW IF EXISTS customer_360_view CASCADE;
-- Run cdm-migration.sql again
```

#### 2. Call Tasks Not Generating

**Problem**: No tasks in agent dashboard

**Solution**: Manually trigger generation
```sql
SELECT generate_daily_call_tasks(CURRENT_DATE::text);
```

#### 3. Family Members Not Saving

**Problem**: 400 Bad Request

**Solution**: Check required fields
```typescript
// Required fields:
{
  customerId: number,
  name: string,
  relationship: string
}
```

#### 4. Marketing Campaign Not Sending

**Problem**: Campaign shows 0 sent

**Solution**: Check target segment has customers
```sql
SELECT COUNT(*) FROM customers WHERE customer_type = 'repeat';
```

---

## Performance Optimization

### 1. Index Creation

```sql
-- CDM indexes
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_lifecycle ON customers(lifecycle_stage);
CREATE INDEX idx_customers_temperature ON customers(priority_level);
CREATE INDEX idx_customers_last_order ON customers(last_order_date);

-- CRM indexes
CREATE INDEX idx_call_tasks_date_status ON crm_call_tasks(task_date, status);
CREATE INDEX idx_call_tasks_agent_priority ON crm_call_tasks(assigned_agent_id, priority);
CREATE INDEX idx_engagement_customer_date ON customer_engagement_history(customer_id, created_at DESC);
```

### 2. Query Optimization

**Slow Query:**
```sql
-- DON'T: Full table scan
SELECT * FROM customers WHERE email LIKE '%@gmail.com%';
```

**Optimized Query:**
```sql
-- DO: Use indexed columns
SELECT * FROM customers 
WHERE customer_type = 'vip' 
  AND last_order_date > CURRENT_DATE - INTERVAL '7 days';
```

### 3. Caching Strategy

```typescript
// Cache customer 360 view for 5 minutes
const cacheKey = `customer360:${customerId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await getCustomer360(customerId);
await redis.setex(cacheKey, 300, JSON.stringify(data));
return data;
```

---

## Security & Privacy

### 1. Data Access Control

```typescript
// Only assigned agent or manager can view customer details
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('crm_agent', 'crm_manager', 'admin')
@Get('customer360/:id')
async getCustomer360(@Param('id') id: number, @Request() req) {
  // Check if agent is assigned to this customer
  const hasAccess = await this.checkAccess(req.user.id, id);
  if (!hasAccess) {
    throw new ForbiddenException('Access denied');
  }
  return this.cdmService.getCustomer360(id);
}
```

### 2. Data Encryption

```typescript
// Encrypt sensitive fields
import { createCipheriv, createDecipheriv } from 'crypto';

// Encrypt phone numbers
const encryptedPhone = encryptData(customer.phone);

// Mask email in logs
const maskedEmail = customer.email.replace(/(.{2}).*(@.*)/, '$1***$2');
// john@example.com -> jo***@example.com
```

### 3. Audit Logging

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(50),
  table_name VARCHAR(50),
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Log all customer data changes
CREATE TRIGGER audit_customer_changes
AFTER UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
```

---

## Integration with Other Modules

### 1. CDM + Loyalty Program

```typescript
// When customer reaches Silver/Gold tier
const customer360 = await cdmService.getCustomer360(customerId);
if (customer360.lifetime_value >= 50000) {
  await loyaltyService.upgradeTier(customerId, 'gold');
  await crmService.createCallTask({
    customerId,
    taskType: 'congratulate_gold_member',
    priority: 'hot'
  });
}
```

### 2. CRM + Sales Orders

```typescript
// After order placed, log engagement
await crmService.logEngagement({
  customerId: order.customer_id,
  engagementType: 'order_placed',
  channel: 'website',
  content: `Order #${order.id} placed`,
  response: 'positive'
});

// Update customer behavior
await cdmService.updateBehavior(order.customer_id, {
  lastOrderDate: new Date(),
  avgOrderValue: calculateAvgOrderValue(customerId)
});
```

### 3. CDM + WhatsApp API

```typescript
// Send birthday message
const upcomingBirthdays = await cdmService.getUpcomingEvents(7);

for (const event of upcomingBirthdays) {
  await whatsappService.send({
    to: event.phone,
    message: `🎉 Happy Birthday ${event.name}! 
              Enjoy 20% off on your next order. 
              Use code: BDAY20`
  });
  
  await crmService.logEngagement({
    customerId: event.customer_id,
    engagementType: 'birthday_message',
    channel: 'whatsapp'
  });
}
```

---

## Reporting & Analytics

### 1. Daily CRM Report

```sql
-- Daily call task summary
SELECT 
  task_date,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE outcome LIKE '%successful%') as successful,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 2) as completion_rate
FROM crm_call_tasks
WHERE task_date = CURRENT_DATE
GROUP BY task_date;
```

### 2. Customer Segmentation Report

```sql
-- Customer distribution by type and temperature
SELECT 
  customer_type,
  priority_level as temperature,
  COUNT(*) as customer_count,
  SUM(total_spend) as total_revenue,
  AVG(total_spend) as avg_lifetime_value
FROM customers
GROUP BY customer_type, priority_level
ORDER BY total_revenue DESC;
```

### 3. Agent Performance Report

```sql
-- Monthly agent performance
SELECT 
  u.name as agent_name,
  COUNT(DISTINCT ct.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN ct.status = 'completed' THEN ct.id END) as completed,
  COUNT(DISTINCT CASE WHEN ct.outcome LIKE '%successful%' THEN ct.id END) as successful,
  ROUND(AVG(CASE WHEN ct.status = 'completed' THEN 1 ELSE 0 END) * 100, 2) as completion_rate,
  COUNT(DISTINCT ci.id) as total_interactions
FROM users u
LEFT JOIN crm_call_tasks ct ON u.id = ct.assigned_agent_id 
  AND ct.task_date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN customer_interactions ci ON u.id = ci.agent_id 
  AND ci.interaction_date >= DATE_TRUNC('month', CURRENT_DATE)
WHERE u.role = 'crm_agent'
GROUP BY u.id, u.name
ORDER BY successful DESC;
```

---

## Quick Reference

### CDM Endpoints
```
GET  /cdm/customer360/:id               - Get customer 360 view
GET  /cdm/customer360                   - List all customers 360
GET  /cdm/family-members/:customerId    - Get family members
POST /cdm/family-member                 - Add family member
GET  /cdm/interactions/:customerId      - Get interactions
POST /cdm/interaction                   - Log interaction
GET  /cdm/behavior/:customerId          - Get customer behavior
GET  /cdm/dropoff                       - Get at-risk customers
GET  /cdm/upcoming-events               - Birthdays/anniversaries
```

### CRM Endpoints
```
GET  /crm-automation/call-tasks/today   - Today's call tasks
PUT  /crm-automation/call-task/:id/status - Update task status
POST /crm-automation/generate-call-tasks - Generate tasks
GET  /crm-automation/recommendations/:id - Product recommendations
POST /crm-automation/engagement         - Log engagement
GET  /crm-automation/campaigns          - List campaigns
POST /crm-automation/campaign           - Create campaign
POST /crm-automation/campaign/:id/send  - Send campaign
GET  /crm-automation/agent-performance  - Agent metrics
```

### Customer Types
```
new      - First order only (1 order)
repeat   - Regular customer (2-5 orders)
vip      - High-value customer (6+ orders or ৳50K+ spend)
inactive - No order in 90+ days
```

### Lifecycle Stages
```
prospect - Registered, no order
new      - First order placed
active   - Regular orders (<60 days gap)
at_risk  - 60-90 days no order
churned  - 90+ days no order
```

### Temperature/Priority
```
hot  🔥  - Last 7 days activity (urgent)
warm 🟡  - Last 30 days activity (normal)
cold ❄️  - 30+ days inactive (low priority)
```

---

## Support & Maintenance

### Database Backup

```powershell
# Backup CDM & CRM data
pg_dump -U postgres -d trustcart_erp -t "customer*" -t "crm*" > cdm_crm_backup.sql

# Restore
psql -U postgres -d trustcart_erp < cdm_crm_backup.sql
```

### Monitoring

```sql
-- Check system health
SELECT 
  'Total Customers' as metric, 
  COUNT(*) as value 
FROM customers

UNION ALL

SELECT 
  'Active Tasks Today', 
  COUNT(*) 
FROM crm_call_tasks 
WHERE task_date = CURRENT_DATE AND status = 'pending'

UNION ALL

SELECT 
  'At-Risk Customers', 
  COUNT(*) 
FROM customer_dropoff_tracking 
WHERE risk_level IN ('high', 'critical');
```

---

**Documentation Version**: 1.0  
**Last Updated**: December 18, 2025  
**System**: TrustCart ERP - CDM & CRM Module  
**Support**: For issues, check backend logs or contact admin
