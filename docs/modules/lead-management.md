# 🎯 Team-Based Lead Management System - Complete Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Backend API](#backend-api)
4. [Frontend Pages](#frontend-pages)
5. [Team Workflows](#team-workflows)
6. [How to Use](#how-to-use)
7. [Migration Guide](#migration-guide)

---

## 🌟 System Overview

**Team-Based Lead Management System** is a comprehensive customer data collection and team workflow management system that enables:

### ✅ Key Features

#### 1. **Session & Campaign Tracking**
- Track customer source (Google, Facebook, Direct, Referral)
- Campaign ID tracking for marketing attribution
- Session time and page visit tracking
- Device, browser, and location tracking

#### 2. **Incomplete Order Recovery**
- Track abandoned carts at different stages
- Send recovery emails and SMS
- Discount code generation for recovery
- Recovery rate analytics

#### 3. **Lead Management**
- All customers start as "unassigned leads"
- Team leaders assign leads to team members
- Lead scoring and prioritization
- Login via mobile or email

#### 4. **Team-Based Data Collection**
Each team leader manages 5 teams (A, B, C, D, E) with specific responsibilities:

- **Team A**: Collect Gender, Profession, Product Interest, Order details
- **Team B**: Collect Date of Birth, Marriage Day, Product Interest, Order details
- **Team C**: Collect Family Member info (Name, Mobile, DoB, Profession), Product Interest, Order details
- **Team D**: Collect Health Card, Membership Card, Coupon, Product Interest, Order details
- **Team E**: Collect Permanent Membership details

#### 5. **Customer Tier Management**
- Active/Inactive status tracking
- Tier classification: Silver, Gold, Platinum, VIP
- Engagement score calculation
- Days inactive tracking
- Purchase history and lifetime value

---

## 🗄️ Database Schema

### 1. Customer Sessions Tracking

```sql
CREATE TABLE customer_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INT,                        -- NULL if guest
    session_id VARCHAR(255) UNIQUE,
    source_details VARCHAR(255),            -- Google, Facebook, etc.
    campaign_id VARCHAR(100),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    session_start TIMESTAMP,
    session_end TIMESTAMP,
    total_session_time INT,                 -- seconds
    pages_visited INT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address VARCHAR(45),
    country VARCHAR(100)
);
```

### 2. Page Visit Tracking

```sql
CREATE TABLE customer_page_visits (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    customer_id INT,
    page_url TEXT,
    page_title VARCHAR(255),
    time_spent_seconds INT,
    product_id INT,
    category_id INT,
    visited_at TIMESTAMP
);
```

### 3. Incomplete Orders

```sql
CREATE TABLE incomplete_orders (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    session_id VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    name VARCHAR(255),
    cart_data JSONB,
    total_amount DECIMAL(10, 2),
    abandoned_stage VARCHAR(50),            -- cart | checkout_info | checkout_payment
    recovered BOOLEAN DEFAULT false,
    recovered_order_id INT,
    recovery_discount_code VARCHAR(50)
);
```

### 4. Enhanced Customers Table

```sql
-- Added columns to customers table:
ALTER TABLE customers ADD COLUMN is_lead BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN lead_status VARCHAR(20) DEFAULT 'unassigned';
ALTER TABLE customers ADD COLUMN assigned_team_member_id INT;
ALTER TABLE customers ADD COLUMN lead_source VARCHAR(100);
ALTER TABLE customers ADD COLUMN can_login_with_mobile BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN can_login_with_email BOOLEAN DEFAULT true;
```

### 5. Team Assignments

```sql
CREATE TABLE team_assignments (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    team_type VARCHAR(10),                  -- A, B, C, D, E
    assigned_by_id INT,                     -- Team leader ID
    assigned_to_id INT,                     -- Team member ID
    status VARCHAR(20),                     -- pending | in_progress | completed
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

### 6. Team A Data (Gender, Profession, Product Interest)

```sql
CREATE TABLE team_a_data (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE,
    gender VARCHAR(20),
    profession VARCHAR(100),
    product_interest TEXT[],
    order_product_details JSONB,
    collected_by_id INT,
    collected_at TIMESTAMP
);
```

### 7. Team B Data (DOB, Marriage Day, Product Interest)

```sql
CREATE TABLE team_b_data (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE,
    date_of_birth DATE,
    marriage_day DATE,
    product_interest TEXT[],
    order_product_details JSONB,
    collected_by_id INT
);
```

### 8. Team C Data (Family Members)

```sql
CREATE TABLE team_c_data (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE,
    product_interest TEXT[],
    order_product_details JSONB,
    collected_by_id INT
);
-- Note: Family member details are stored in customer_family_members table
```

### 9. Team D Data (Health Card, Membership, Coupon)

```sql
CREATE TABLE team_d_data (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE,
    health_card_number VARCHAR(100),
    health_card_expiry DATE,
    membership_card_number VARCHAR(100),
    membership_card_type VARCHAR(50),
    membership_expiry DATE,
    coupon_codes TEXT[],
    product_interest TEXT[],
    order_product_details JSONB
);
```

### 10. Team E Data (Permanent Membership)

```sql
CREATE TABLE team_e_data (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE,
    permanent_membership_number VARCHAR(100) UNIQUE,
    membership_tier VARCHAR(20),            -- silver | gold | platinum | vip
    membership_start_date DATE,
    membership_benefits JSONB,
    lifetime_value DECIMAL(12, 2)
);
```

### 11. Customer Tiers

```sql
CREATE TABLE customer_tiers (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    tier VARCHAR(20),                       -- silver | gold | platinum | vip
    tier_assigned_at TIMESTAMP,
    tier_assigned_by_id INT,
    auto_assigned BOOLEAN,
    last_activity_date TIMESTAMP,
    days_inactive INT,
    total_purchases INT,
    total_spent DECIMAL(12, 2),
    engagement_score INT                    -- 0-100
);
```

### 12. Team Members

```sql
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE,
    team_leader_id INT,
    team_type VARCHAR(10),                  -- A, B, C, D, E
    is_active BOOLEAN DEFAULT true,
    assigned_leads_count INT DEFAULT 0,
    completed_leads_count INT DEFAULT 0
);
```

---

## 📊 Database Views

### 1. Unassigned Leads View

```sql
CREATE VIEW unassigned_leads AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.lead_source,
    c.lead_score,
    cs.source_details,
    cs.campaign_id,
    io.total_amount as incomplete_order_value
FROM customers c
LEFT JOIN customer_sessions cs ON c.id = cs.customer_id
LEFT JOIN incomplete_orders io ON c.id = io.customer_id
WHERE c.is_lead = true 
  AND c.lead_status = 'unassigned'
ORDER BY c.lead_score DESC, c.created_at DESC;
```

### 2. Team Leader Dashboard View

```sql
CREATE VIEW team_leader_dashboard AS
SELECT 
    tl.team_leader_id,
    tl.team_type,
    COUNT(DISTINCT tm.id) as team_members_count,
    COUNT(DISTINCT ta.id) as assigned_leads_count,
    COUNT(DISTINCT CASE WHEN ta.status = 'completed' THEN ta.id END) as completed_leads_count
FROM team_leader_teams tl
LEFT JOIN team_members tm ON tl.team_leader_id = tm.team_leader_id
LEFT JOIN team_assignments ta ON tm.user_id = ta.assigned_to_id
GROUP BY tl.team_leader_id, tl.team_type;
```

### 3. Customer Complete Profile View

```sql
CREATE VIEW customer_complete_profile AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.is_lead,
    c.lead_status,
    cs.source_details,
    cs.campaign_id,
    ct.tier,
    ct.is_active,
    ct.total_spent,
    ta.team_type as assigned_team,
    CASE WHEN tea.id IS NOT NULL THEN true ELSE false END as team_a_completed,
    CASE WHEN teb.id IS NOT NULL THEN true ELSE false END as team_b_completed,
    CASE WHEN tec.id IS NOT NULL THEN true ELSE false END as team_c_completed,
    CASE WHEN ted.id IS NOT NULL THEN true ELSE false END as team_d_completed,
    CASE WHEN tee.id IS NOT NULL THEN true ELSE false END as team_e_completed
FROM customers c
LEFT JOIN customer_sessions cs ON c.id = cs.customer_id
LEFT JOIN customer_tiers ct ON c.id = ct.customer_id
LEFT JOIN team_assignments ta ON c.id = ta.customer_id
LEFT JOIN team_a_data tea ON c.id = tea.customer_id
LEFT JOIN team_b_data teb ON c.id = teb.customer_id
LEFT JOIN team_c_data tec ON c.id = tec.customer_id
LEFT JOIN team_d_data ted ON c.id = ted.customer_id
LEFT JOIN team_e_data tee ON c.id = tee.customer_id;
```

---

## 🔧 Backend API

### Base URL: `http://localhost:3001/lead-management`

### Session Tracking APIs

#### Track Session
```
POST /lead-management/session/track
```
**Body:**
```json
{
  "sessionId": "abc123xyz",
  "customerId": 123,
  "sourceDetails": "Google",
  "campaignId": "SUMMER2024",
  "deviceType": "mobile",
  "browser": "Chrome"
}
```

#### Get Customer Sessions
```
GET /lead-management/session/customer/:customerId
```

---

### Incomplete Orders APIs

#### Track Incomplete Order
```
POST /lead-management/incomplete-order
```
**Body:**
```json
{
  "customerId": 123,
  "sessionId": "abc123",
  "email": "customer@example.com",
  "phone": "01712345678",
  "cartData": {...},
  "totalAmount": 5500,
  "abandonedStage": "checkout_payment"
}
```

#### Get Incomplete Orders
```
GET /lead-management/incomplete-order?customerId=123
```

#### Mark Order Recovered
```
PUT /lead-management/incomplete-order/:id/recover
```
**Body:**
```json
{
  "recoveredOrderId": 456
}
```

---

### Lead Assignment APIs

#### Get Unassigned Leads
```
GET /lead-management/leads/unassigned?limit=50
```

#### Assign Lead to Team
```
POST /lead-management/assignment
```
**Body:**
```json
{
  "customerId": 123,
  "teamType": "A",
  "assignedById": 1,
  "assignedToId": 5,
  "notes": "High-value lead"
}
```

#### Get Team Assignments
```
GET /lead-management/assignment?teamType=A&assignedToId=5&status=pending
```

#### Update Assignment Status
```
PUT /lead-management/assignment/:id/status
```
**Body:**
```json
{
  "status": "completed"
}
```

---

### Team Data Collection APIs

#### Save Team A Data
```
POST /lead-management/team-a
```
**Body:**
```json
{
  "customerId": 123,
  "gender": "male",
  "profession": "Engineer",
  "productInterest": ["Electronics", "Gadgets"],
  "notes": "Prefers high-tech products"
}
```

#### Get Team A Data
```
GET /lead-management/team-a/:customerId
```

**Similar endpoints for Team B, C, D, E:**
- `POST/GET /lead-management/team-b`
- `POST/GET /lead-management/team-c`
- `POST/GET /lead-management/team-d`
- `POST/GET /lead-management/team-e`

---

### Customer Tier Management APIs

#### Update Customer Tier
```
POST /lead-management/tier
```
**Body:**
```json
{
  "customerId": 123,
  "tier": "gold",
  "isActive": true,
  "notes": "Upgraded to gold tier due to high engagement"
}
```

#### Get Customer Tier
```
GET /lead-management/tier/:customerId
```

#### Get Customers by Tier
```
GET /lead-management/tier/by-tier/gold
```

#### Get Inactive Customers
```
GET /lead-management/tier/inactive/list?daysThreshold=30
```

---

### Team Member Management APIs

#### Add Team Member
```
POST /lead-management/team-member
```
**Body:**
```json
{
  "userId": 5,
  "teamLeaderId": 1,
  "teamType": "A"
}
```

#### Get Team Members
```
GET /lead-management/team-member/list/:teamLeaderId?teamType=A
```

---

## 🖥️ Frontend Pages

### 1. Lead Assignment Dashboard
**Path:** `/admin/crm/lead-assignment`

**Features:**
- View all unassigned leads
- Lead scoring and prioritization
- Source and campaign tracking
- Incomplete order value display
- Assign leads to team members (A, B, C, D, E)
- Team member workload display

### 2. Team Data Collection
**Path:** `/admin/crm/team-data-collection`

**Features:**
- Tab-based interface for Teams A, B, C, D, E
- View pending assignments
- Team-specific data collection forms
- Mark assignments as completed
- Notes and special instructions

### 3. Customer Tier Management
**Path:** `/admin/crm/customer-tier-management`

**Features:**
- Filter by tier (Silver, Gold, Platinum, VIP)
- Filter by status (Active/Inactive)
- Engagement score visualization
- Update tier and status
- Track days inactive
- Purchase history display

---

## 🎯 Team Workflows

### Workflow 1: New Customer Journey

1. **Customer Order Submission**
   - Customer submits order with: name, email (optional), phone, address
   - System checks if customer exists by phone/email
   - If exists: Use existing customer ID
   - If not: Create new customer with new ID
   - Track session: source, campaign, pages visited, session time

2. **Lead Creation**
   - Customer is created with `is_lead = true`
   - `lead_status = 'unassigned'`
   - Lead score calculated based on incomplete order value, source, session behavior

3. **Team Leader Assignment**
   - Team leader views unassigned leads dashboard
   - Sees leads sorted by lead score
   - Assigns lead to team member from Team A, B, C, D, or E
   - Lead status changes to 'assigned'

4. **Team Member Data Collection**
   - Team member logs in and sees pending assignments
   - Collects team-specific data:
     - **Team A**: Gender, Profession, Product Interest
     - **Team B**: DOB, Marriage Day, Product Interest
     - **Team C**: Family Members info, Product Interest
     - **Team D**: Health Card, Membership, Coupon, Product Interest
     - **Team E**: Permanent Membership details
   - Marks assignment as completed

5. **Tier Assignment**
   - Separate team reviews customer data
   - Checks if customer is active or inactive
   - Assigns tier: Silver, Gold, Platinum, or VIP
   - Based on: purchases, engagement score, lifetime value

### Workflow 2: Incomplete Order Recovery

1. **Abandonment Tracking**
   - Customer adds items to cart but doesn't complete order
   - System tracks abandoned stage: cart, checkout_info, checkout_payment
   - Records cart value and products

2. **Recovery Campaign**
   - Send recovery email/SMS with discount code
   - Track email opens and clicks
   - Mark recovery attempts

3. **Order Completion**
   - When customer completes order, mark as recovered
   - Link recovered order ID
   - Update customer tier based on purchase

---

## 📖 How to Use

### For Team Leaders:

#### Step 1: View Unassigned Leads
1. Go to **Admin → CRM → Lead Assignment**
2. See list of unassigned leads with:
   - Lead score (1-10)
   - Source (Google, Facebook, etc.)
   - Campaign ID
   - Incomplete order value
   - Contact details

#### Step 2: Assign Lead to Team
1. Click "Assign" button on a lead
2. Select team type (A, B, C, D, or E)
3. Select team member from the team
4. Add assignment notes (optional)
5. Click "Assign Lead"

#### Step 3: Monitor Team Progress
1. View team stats on dashboard
2. Check assigned vs completed leads per team
3. Track team member performance

### For Team Members:

#### Step 1: View Pending Assignments
1. Go to **Admin → CRM → Team Data Collection**
2. Select your team tab (A, B, C, D, or E)
3. See list of pending assignments

#### Step 2: Collect Customer Data
1. Click "Collect Data" on an assignment
2. Fill in team-specific form:
   - **Team A**: Gender, Profession, Product Interest
   - **Team B**: Date of Birth, Marriage Day, Product Interest
   - **Team C**: Product Interest (add family members via CDM)
   - **Team D**: Health Card, Membership Card, Coupon, Product Interest
   - **Team E**: Permanent Membership Number, Tier, Benefits
3. Add notes if needed
4. Click "Save & Complete"

### For Tier Management Team:

#### Step 1: View Customers
1. Go to **Admin → CRM → Customer Tier Management**
2. See customer list with:
   - Current tier and status
   - Total purchases and spent
   - Engagement score
   - Days inactive

#### Step 2: Update Tier/Status
1. Click "Manage" on a customer
2. Select new tier (Silver, Gold, Platinum, VIP)
3. Select status (Active/Inactive)
4. Add notes explaining the change
5. Click "Save Changes"

---

## 🚀 Migration Guide

### Step 1: Run Database Migration

```bash
# Copy migration file to Docker container
docker cp backend/team-based-lead-management-migration.sql trustcart_erp-postgres-1:/tmp/

# Execute migration
docker-compose exec postgres psql -U postgres -d trustcart_erp -f /tmp/team-based-lead-management-migration.sql
```

### Step 2: Start Backend Server

```bash
cd backend
npm run start:dev
```

### Step 3: Start Frontend Server

```bash
cd frontend
npm run dev
```

### Step 4: Access Features

1. **Lead Assignment**: http://localhost:3000/admin/crm/lead-assignment
2. **Team Data Collection**: http://localhost:3000/admin/crm/team-data-collection
3. **Tier Management**: http://localhost:3000/admin/crm/customer-tier-management

---

## 📊 Summary

### ✅ What's Implemented:

1. **Database Schema** ✓
   - 12 new tables
   - 3 database views
   - 2 triggers for auto-updates
   - Enhanced customers table with lead fields

2. **Backend (NestJS)** ✓
   - 10 entities
   - LeadManagementService with 30+ methods
   - LeadManagementController with 25+ REST endpoints
   - Integrated with AppModule

3. **Frontend (Next.js)** ✓
   - Lead Assignment Dashboard
   - Team Data Collection (5 team forms)
   - Customer Tier Management
   - Navigation menu updated

4. **Key Features** ✓
   - Session & campaign tracking
   - Incomplete order recovery
   - Team-based lead assignment
   - Team-specific data collection
   - Customer tier management
   - Auto-lead conversion on first order

---

**System Ready to Use!** 🚀

Your team-based lead management system is fully implemented and ready for use.
