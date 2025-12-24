# 🎯 Customer Data Management (CDM) System - Complete Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Backend API](#backend-api)
4. [Frontend Pages](#frontend-pages)
5. [Features](#features)
6. [How to Use](#how-to-use)
7. [API Examples](#api-examples)

---

## 🌟 System Overview

**Customer Data Management (CDM)** একটি comprehensive customer intelligence system যা:

### ✅ সম্পূর্ণ Customer 360° View প্রদান করে
- **Customer Profile**: Name, contact, demographics, preferences
- **Family Members**: Birthday/anniversary offers এর জন্য family data
- **Transaction History**: সকল purchase data এবং lifetime value
- **Interaction Tracking**: Call logs, WhatsApp, SMS, email, meetings
- **Behavior Analytics**: Product views, cart activity, browsing patterns
- **AI Recommendations**: কাকে কল দিবে, কোন প্রোডাক্ট offer করবে, কখন contact করবে

### ✅ AI-Driven Automation
- **Smart Call Priority**: HOT/WARM/COLD customer segmentation
- **Next Best Action**: AI decides করে পরবর্তী step কী হবে
- **Upsell/Cross-sell**: Automatic product recommendations
- **Lifecycle Management**: Lead → Prospect → Buyer → Loyal → VIP
- **Drop-off Recovery**: Lost customer win-back campaigns

---

## 🗄️ Database Schema

### 1. Enhanced Customer Profile (customers table)

**New columns added:**
```sql
district VARCHAR(100)              -- Regional targeting
city VARCHAR(100)                  -- City-based segmentation
gender VARCHAR(20)                 -- Demographic data
date_of_birth DATE                 -- Birthday offers
marital_status VARCHAR(20)         -- Relationship status
anniversary_date DATE              -- Anniversary offers
profession VARCHAR(100)            -- Professional segmentation
available_time VARCHAR(50)         -- Best time to contact
customer_type VARCHAR(20)          -- new | repeat | vip | inactive
lifecycle_stage VARCHAR(20)        -- lead | prospect | first_buyer | repeat_buyer | loyal | inactive
```

### 2. Family Members Table

```sql
CREATE TABLE customer_family_members (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    relationship VARCHAR(50),      -- spouse | child | parent | sibling | grandparent
    date_of_birth DATE,
    anniversary_date DATE,
    gender VARCHAR(20),
    profession VARCHAR(100),
    ...
);
```

**Purpose**: Birthday এবং anniversary offers পাঠানোর জন্য family data সংরক্ষণ

### 3. Customer Interactions Table

```sql
CREATE TABLE customer_interactions (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    interaction_type VARCHAR(50),   -- call | whatsapp | sms | email | facebook | instagram
    interaction_direction VARCHAR(20), -- inbound | outbound
    subject VARCHAR(255),
    description TEXT,
    outcome VARCHAR(100),
    duration_seconds INT,
    follow_up_required BOOLEAN,
    ...
);
```

**Purpose**: সকল customer touchpoints track করা

### 4. Customer Behavior Table

```sql
CREATE TABLE customer_behavior (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    behavior_type VARCHAR(50),      -- product_view | add_to_cart | wishlist | search
    product_id INT,
    category_id INT,
    session_id VARCHAR(255),
    device_type VARCHAR(50),
    ...
);
```

**Purpose**: Customer browsing এবং interaction behavior analysis

### 5. Drop-off Tracking Table

```sql
CREATE TABLE customer_dropoff_tracking (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    stage VARCHAR(50),              -- product_view | add_to_cart | checkout_initiated | payment_failed
    product_id INT,
    cart_value DECIMAL(10,2),
    reason VARCHAR(255),
    recovered BOOLEAN,
    ...
);
```

**Purpose**: কোথায় customer drop করছে সেটা identify করা

---

## 📊 Database Views

### 1. customer_360_view

**Complete customer intelligence:**
```sql
SELECT * FROM customer_360_view WHERE customer_id = 123;
```

**Returns:**
- Customer profile (name, email, phone, demographics)
- Transaction summary (total orders, lifetime value, avg order value)
- Interaction summary (total calls, emails, WhatsApp)
- Behavior summary (products viewed, total activities)
- Family members count
- Customer temperature (hot/warm/cold)

### 2. upcoming_birthdays_anniversaries

**Upcoming events for offers:**
```sql
SELECT * FROM upcoming_birthdays_anniversaries
WHERE days_until_event <= 7
ORDER BY days_until_event;
```

**Returns:**
- Customer + family member birthdays
- Anniversary dates
- Days until event
- Contact information for campaign

### 3. ai_call_recommendations

**AI-powered call prioritization:**
```sql
SELECT * FROM ai_call_recommendations
ORDER BY call_priority_score DESC
LIMIT 50;
```

**AI Decides:**
- **WHO to call**: Priority score 1-10 based on temperature, LTV, purchase history
- **WHAT to offer**: Upsell, cross-sell, discount, reactivation
- **WHEN to call**: Best time based on past successful interactions

---

## 🔧 Backend API

### Base URL: `http://localhost:3001/cdm`

### Customer 360° Endpoints

#### 1. Get Single Customer 360° View
```
GET /cdm/customer360/:customerId
```

**Response:**
```json
{
  "customer_id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "01712345678",
  "customer_type": "vip",
  "lifecycle_stage": "loyal",
  "customer_temperature": "hot",
  "lifetime_value": 125000,
  "total_orders": 8,
  "avg_order_value": 15625,
  "days_since_last_order": 5,
  "total_interactions": 12,
  "total_calls": 5,
  "products_viewed": 25,
  "family_members_count": 3
}
```

#### 2. Get All Customers 360° (with filters)
```
GET /cdm/customer360?customerType=vip&lifecycleStage=loyal&temperature=hot&limit=50
```

**Query Parameters:**
- `customerType`: new | repeat | vip | inactive
- `lifecycleStage`: lead | prospect | first_buyer | repeat_buyer | loyal | inactive
- `temperature`: hot | warm | cold
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset

---

### Family Members Endpoints

#### 3. Get Family Members
```
GET /cdm/family/:customerId
```

#### 4. Add Family Member
```
POST /cdm/family
```

**Body:**
```json
{
  "customerId": 123,
  "name": "Sarah Doe",
  "relationship": "spouse",
  "phone": "01712345679",
  "date_of_birth": "1992-05-15",
  "anniversary_date": "2015-12-20"
}
```

#### 5. Update Family Member
```
PUT /cdm/family/:id
```

#### 6. Delete Family Member
```
DELETE /cdm/family/:id
```

---

### Interactions Endpoints

#### 7. Get Customer Interactions
```
GET /cdm/interactions/:customerId?type=call&limit=20
```

#### 8. Track New Interaction
```
POST /cdm/interactions
```

**Body:**
```json
{
  "customerId": 123,
  "interaction_type": "call",
  "interaction_direction": "outbound",
  "subject": "Follow-up on recent order",
  "description": "Customer is happy with product, interested in accessories",
  "outcome": "Interested",
  "duration_seconds": 180
}
```

#### 9. Get Interaction Stats
```
GET /cdm/interactions/:customerId/stats
```

---

### Behavior Tracking Endpoints

#### 10. Track Behavior
```
POST /cdm/behavior
```

**Body:**
```json
{
  "customerId": 123,
  "behavior_type": "product_view",
  "productId": 456,
  "sessionId": "abc123xyz"
}
```

#### 11. Get Customer Behaviors
```
GET /cdm/behavior/:customerId?type=product_view&limit=50
```

#### 12. Get Most Viewed Products
```
GET /cdm/behavior/:customerId/most-viewed?limit=10
```

---

### Drop-off Tracking Endpoints

#### 13. Track Drop-off
```
POST /cdm/dropoff
```

**Body:**
```json
{
  "customerId": 123,
  "stage": "checkout_initiated",
  "productId": 789,
  "cart_value": 5500,
  "reason": "High shipping cost"
}
```

#### 14. Get Customer Drop-offs
```
GET /cdm/dropoff/:customerId
```

#### 15. Mark Drop-off Recovered
```
PUT /cdm/dropoff/:dropoffId/recover
```

---

### Birthday & Anniversary Endpoints

#### 16. Get Upcoming Birthdays
```
GET /cdm/events/birthdays?days=7
```

#### 17. Get Upcoming Anniversaries
```
GET /cdm/events/anniversaries?days=7
```

#### 18. Get Today's Events
```
GET /cdm/events/today
```

**Returns:**
```json
[
  {
    "type": "customer",
    "customer_id": 123,
    "name": "John Doe",
    "phone": "01712345678",
    "event_type": "birthday",
    "event_date": "2024-12-18",
    "days_until_event": 0
  }
]
```

---

### AI Recommendation Endpoints

#### 19. Get AI Call Recommendations
```
GET /cdm/ai/recommendations?limit=50
```

**Returns:**
```json
[
  {
    "customer_id": 123,
    "customer_name": "John Doe",
    "phone": "01712345678",
    "customer_temperature": "hot",
    "call_priority_score": 10,
    "offer_type": "Premium product upsell",
    "best_call_time": "10:00-12:00",
    "recommended_products": "Product A, Product B",
    "next_action": "URGENT: Call within 24 hours"
  }
]
```

#### 20. Get Top Priority Customers
```
GET /cdm/ai/top-priority?limit=10
```

#### 21. Get Customer AI Recommendation
```
GET /cdm/ai/recommendation/:customerId
```

---

### Lifecycle & Segmentation Endpoints

#### 22. Get Customers by Lifecycle Stage
```
GET /cdm/lifecycle/:stage
```
Example: `/cdm/lifecycle/loyal`

#### 23. Get Customers by Type
```
GET /cdm/type/:type
```
Example: `/cdm/type/vip`

#### 24. Get Customers by Temperature
```
GET /cdm/temperature/:temperature
```
Example: `/cdm/temperature/hot`

---

### Dashboard Stats Endpoint

#### 25. Get Dashboard Statistics
```
GET /cdm/stats/dashboard
```

**Returns:**
```json
{
  "total_customers": 1250,
  "vip_customers": 85,
  "repeat_customers": 420,
  "new_customers": 180,
  "loyal_customers": 210,
  "hot_customers": 95,
  "warm_customers": 380,
  "cold_customers": 775,
  "total_lifetime_value": 15750000,
  "avg_lifetime_value": 12600
}
```

---

## 🖥️ Frontend Pages

### 1. Customer List with 360° View
**Path:** `/admin/customers/cdm`

**Features:**
- Filter by customer type, lifecycle stage, temperature
- Search by name, email, phone
- Display lifetime value, total orders, last order date
- Quick access to customer 360° profile
- Dashboard stats (VIP, hot customers, new customers)
- Today's birthday/anniversary events

### 2. Customer 360° Profile Page
**Path:** `/admin/customers/[id]`

**6 Tabs:**

#### Tab 1: Overview
- Transaction summary card (LTV, orders, avg order value)
- Communication summary card (calls, WhatsApp, emails)
- Behavior summary card (products viewed, activities)
- AI recommendation card (priority score, offer type, next action)

#### Tab 2: Profile
- Personal information (name, gender, DOB, marital status, anniversary, profession)
- Contact & location (email, phone, address, city, district)
- Best time to contact

#### Tab 3: Family Members
- List of family members with relationship
- Add family member button
- Birthday and anniversary dates
- Contact information for each member

#### Tab 4: Interactions
- Timeline of all interactions (calls, WhatsApp, SMS, email, meetings)
- Log new interaction button
- Shows direction (inbound/outbound), duration, outcome

#### Tab 5: Behavior
- Behavior analytics (product views, cart additions, wishlist, search)
- Most viewed products
- Activity counts

#### Tab 6: AI Insights
- Call priority score
- Best call time
- Recommended offer type
- Suggested products
- Next action

---

## 🎯 Key Features

### 1. Customer Profile Management
✅ Complete demographic data  
✅ Contact preferences  
✅ Best time to call  
✅ Customer type (New/Repeat/VIP/Inactive)  
✅ Lifecycle stage tracking  

### 2. Family Member Management
✅ Add spouse, children, parents, siblings  
✅ Birthday tracking for family offers  
✅ Anniversary tracking  
✅ Separate contact info for each member  

### 3. Interaction Tracking
✅ Log every touchpoint (call, WhatsApp, SMS, email)  
✅ Track duration, outcome, notes  
✅ Follow-up reminders  
✅ Complete interaction history  

### 4. Behavior Analytics
✅ Track product views  
✅ Cart activity monitoring  
✅ Wishlist tracking  
✅ Search history  
✅ Most viewed products  

### 5. Transaction Intelligence
✅ Lifetime value calculation  
✅ Average order value  
✅ Purchase frequency  
✅ Days since last order  
✅ Customer temperature (hot/warm/cold)  

### 6. AI-Driven Automation
✅ **Smart Call Priority**: Who to call first  
✅ **Offer Recommendations**: What to sell  
✅ **Best Call Time**: When to contact  
✅ **Next Action**: AI-powered guidance  
✅ **Customer Segmentation**: Automatic lifecycle updates  

### 7. Birthday & Anniversary Marketing
✅ Automatic event detection  
✅ 7-day advance reminders  
✅ Today's events dashboard  
✅ Family member events included  

### 8. Drop-off Recovery
✅ Track abandoned carts  
✅ Payment failure tracking  
✅ Win-back campaigns  
✅ Recovery rate analytics  

---

## 📖 How to Use

### For Sales Agents:

#### Step 1: View Today's Tasks
1. Go to `/admin/crm/agent-dashboard`
2. See AI-generated call list prioritized by temperature
3. Check "What To Do Next" card for guidance

#### Step 2: View Customer 360°
1. Click on customer name
2. Review:
   - Transaction history (lifetime value, last order)
   - Recent interactions
   - Product browsing behavior
   - AI recommendations

#### Step 3: Make the Call
1. Note AI-suggested best time to call
2. Have recommended products ready
3. Use suggested offer type (discount/upsell/cross-sell)

#### Step 4: Log Interaction
1. Click "Log Interaction" button
2. Select type (call/WhatsApp/SMS/email)
3. Add outcome and notes
4. System updates customer temperature automatically

### For Admins:

#### Step 1: Monitor Dashboard
1. Go to `/admin/customers/cdm`
2. View stats:
   - Total customers
   - VIP count
   - Hot customers
   - Today's birthdays/anniversaries

#### Step 2: Manage Family Members
1. Open customer profile
2. Go to "Family" tab
3. Click "Add Family Member"
4. Enter details including birthday
5. System will auto-remind for offers

#### Step 3: Review Drop-offs
1. Check drop-off tracking dashboard
2. Identify common drop-off stages
3. Create win-back campaigns
4. Mark recovered customers

#### Step 4: Set Up AI Rules
1. Go to `/admin/crm/automation`
2. Create recommendation rules
3. Define upsell/cross-sell logic
4. Set marketing automation triggers

---

## 🧪 API Testing Examples

### 1. Get Customer 360° View

```bash
curl http://localhost:3001/cdm/customer360/123
```

### 2. Add Family Member

```bash
curl -X POST http://localhost:3001/cdm/family \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 123,
    "name": "Sarah Doe",
    "relationship": "spouse",
    "date_of_birth": "1992-05-15"
  }'
```

### 3. Track Interaction

```bash
curl -X POST http://localhost:3001/cdm/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 123,
    "interaction_type": "call",
    "interaction_direction": "outbound",
    "outcome": "Interested",
    "duration_seconds": 180
  }'
```

### 4. Get AI Recommendations

```bash
curl http://localhost:3001/cdm/ai/recommendations?limit=10
```

### 5. Get Today's Birthdays

```bash
curl http://localhost:3001/cdm/events/today
```

---

## 🚀 Implementation Status

### ✅ Completed:

1. **Database Schema**
   - Enhanced customers table with CDM fields
   - Family members table
   - Interactions table
   - Behavior tracking table
   - Drop-off tracking table
   - 3 views (customer_360, birthdays, ai_recommendations)
   - Lifecycle automation trigger

2. **Backend (NestJS)**
   - 4 new entities (FamilyMember, CustomerInteraction, CustomerBehavior, CustomerDropoff)
   - CdmService with 30+ methods
   - CdmController with 25+ REST endpoints
   - Updated CustomersModule

3. **Frontend (Next.js + React)**
   - Customer 360° profile page (6 tabs)
   - Customer list with CDM filters
   - Family member management modals
   - Interaction logging modals
   - AI insights display

---

## 📊 Database Migration

**File:** `backend/cdm-migration.sql`

**To run migration:**

```bash
# Via Docker
docker cp backend/cdm-migration.sql trustcart_erp-postgres-1:/tmp/
docker-compose exec postgres psql -U postgres -d trustcart_erp -f /tmp/cdm-migration.sql

# Or directly (if PostgreSQL installed locally)
psql -U postgres -d trustcart_erp -f backend/cdm-migration.sql
```

---

## 🎉 Summary

এই CDM system সম্পূর্ণভাবে implement করা হয়েছে:

✅ **Customer 360° View** - সকল তথ্য এক জায়গায়  
✅ **Family Members** - Birthday/anniversary offers  
✅ **Interaction Tracking** - সকল touchpoints  
✅ **Behavior Analytics** - Browsing patterns  
✅ **Transaction Data** - Complete purchase history  
✅ **AI Recommendations** - Smart call prioritization  
✅ **Drop-off Recovery** - Win-back campaigns  
✅ **Lifecycle Management** - Automatic stage updates  

**System Ready to Use!** 🚀
