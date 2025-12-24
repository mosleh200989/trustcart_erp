# 🎯 CDM System - Quick Reference

## 🚀 Quick Start

### Access URLs:
- **Customer List**: http://localhost:3000/admin/customers/cdm
- **Customer 360° Profile**: http://localhost:3000/admin/customers/{id}
- **AI Call Dashboard**: http://localhost:3000/admin/crm/agent-dashboard

---

## 📊 Customer Profile Fields

### Basic Profile:
```
✅ first_name, last_name
✅ email, phone, mobile
✅ address, district, city
✅ gender, date_of_birth
✅ marital_status, anniversary_date
✅ profession, available_time
```

### Classification:
```
✅ customer_type: new | repeat | vip | inactive
✅ lifecycle_stage: lead | prospect | first_buyer | repeat_buyer | loyal | inactive
✅ customer_temperature: hot | warm | cold (auto-calculated)
```

---

## 👨‍👩‍👧‍👦 Family Member Fields

```
✅ name, phone, email
✅ relationship: spouse | child | parent | sibling | grandparent | other
✅ date_of_birth (for birthday offers)
✅ anniversary_date (for couple offers)
✅ gender, profession
```

---

## 💬 Interaction Types

```
✅ call - Phone calls
✅ whatsapp - WhatsApp messages
✅ sms - SMS messages
✅ email - Email communication
✅ facebook - Facebook messages
✅ instagram - Instagram DMs
✅ website_visit - Site visits
✅ support_ticket - Support requests
✅ meeting - In-person meetings
```

---

## 🔍 Behavior Types

```
✅ product_view - Product page visits
✅ add_to_cart - Cart additions
✅ wishlist - Wishlist saves
✅ search - Search queries
✅ page_visit - General site navigation
✅ call_attempt - Failed call attempts
✅ email_open - Email open tracking
✅ email_click - Email link clicks
```

---

## 📉 Drop-off Stages

```
✅ product_view - Viewed but didn't add to cart
✅ add_to_cart - Added but didn't checkout
✅ checkout_initiated - Started checkout but abandoned
✅ payment_pending - Payment incomplete
✅ payment_failed - Payment declined
✅ abandoned - Complete abandonment
```

---

## 🤖 AI Decision Logic

### Call Priority Score (1-10):
- **10**: Hot customer + LTV > 5000
- **9**: Hot customer
- **8**: Warm + 3+ orders
- **7**: Warm customer
- **6**: 30-60 days since last order
- **5**: Prospect + 5+ product views
- **3**: Default

### Offer Types (AI-generated):
- Hot + Loyal → "Premium product upsell"
- Hot → "Repeat purchase incentive"
- Warm + 2+ orders → "Cross-sell related products"
- 30-60 days → "Reactivation discount 20%"
- 60+ days → "Win-back offer 30%"
- Prospect → "First order discount 15%"
- Default → "General catalog offer"

### Best Call Time (AI-suggested):
- If `available_time` set → Use that
- If past successful calls → "10:00-12:00"
- Default → "14:00-16:00"

---

## 📍 Top 10 API Endpoints

### 1. Get Customer 360°
```
GET /cdm/customer360/{customerId}
```

### 2. Get All Customers (filtered)
```
GET /cdm/customer360?customerType=vip&temperature=hot
```

### 3. Get Family Members
```
GET /cdm/family/{customerId}
```

### 4. Add Family Member
```
POST /cdm/family
Body: { customerId, name, relationship, date_of_birth }
```

### 5. Track Interaction
```
POST /cdm/interactions
Body: { customerId, interaction_type, outcome }
```

### 6. Track Behavior
```
POST /cdm/behavior
Body: { customerId, behavior_type, productId }
```

### 7. Get Today's Events
```
GET /cdm/events/today
```

### 8. Get AI Recommendations
```
GET /cdm/ai/recommendations?limit=50
```

### 9. Get Dashboard Stats
```
GET /cdm/stats/dashboard
```

### 10. Get Drop-off Stats
```
GET /cdm/dropoff/stats/all
```

---

## 🎨 Frontend Components

### Customer 360° Page Tabs:

**Tab 1: Overview**
- Transaction summary (LTV, orders, avg)
- Communication summary (calls, WhatsApp, emails)
- Behavior summary (views, activities)
- AI recommendation card

**Tab 2: Profile**
- Personal information
- Contact & location
- Demographics

**Tab 3: Family (👨‍👩‍👧‍👦)**
- Family members list
- Add family member modal
- Birthday/anniversary tracking

**Tab 4: Interactions (💬)**
- Interaction timeline
- Log interaction modal
- Call/email/WhatsApp history

**Tab 5: Behavior (🔍)**
- Behavior analytics
- Most viewed products
- Activity breakdown

**Tab 6: AI Insights (🤖)**
- Priority score
- Offer recommendation
- Best call time
- Next action

---

## 🎯 Common Use Cases

### Use Case 1: Birthday Offer Campaign
```bash
# Step 1: Get today's birthdays
GET /cdm/events/today

# Step 2: For each birthday customer
# - Send SMS/WhatsApp with birthday wish
# - Offer special discount code
# - Track interaction
POST /cdm/interactions
```

### Use Case 2: Win-back Inactive Customers
```bash
# Step 1: Get cold customers
GET /cdm/temperature/cold

# Step 2: Get AI recommendation for each
GET /cdm/ai/recommendation/{customerId}

# Step 3: Follow AI's next action
# - Send discount offer
# - Schedule call
# - Track drop-off recovery
```

### Use Case 3: Upsell to Hot Customers
```bash
# Step 1: Get hot customers
GET /cdm/temperature/hot

# Step 2: Get most viewed products
GET /cdm/behavior/{customerId}/most-viewed

# Step 3: Create personalized offer
# - Recommend related products
# - Apply premium discount
# - Track conversion
```

---

## 🗂️ File Structure

```
backend/
  └── src/modules/customers/
      ├── customer.entity.ts          (Updated with CDM fields)
      ├── cdm.service.ts              (30+ methods)
      ├── cdm.controller.ts           (25+ endpoints)
      ├── customers.module.ts         (Updated)
      └── entities/
          ├── family-member.entity.ts
          ├── customer-interaction.entity.ts
          ├── customer-behavior.entity.ts
          └── customer-dropoff.entity.ts

frontend/
  └── src/pages/admin/customers/
      ├── index.tsx                   (Customer list - existing)
      ├── cdm.tsx                     (CDM customer list)
      └── [id].tsx                    (Customer 360° profile - 6 tabs)

database/
  └── backend/cdm-migration.sql       (Complete migration)
```

---

## ⚡ Quick Commands

### Run Database Migration:
```bash
docker cp backend/cdm-migration.sql trustcart_erp-postgres-1:/tmp/
docker-compose exec postgres psql -U postgres -d trustcart_erp -f /tmp/cdm-migration.sql
```

### Test Customer 360° API:
```bash
curl http://localhost:3001/cdm/customer360/1 | json_pp
```

### Test AI Recommendations:
```bash
curl http://localhost:3001/cdm/ai/recommendations | json_pp
```

### Test Today's Events:
```bash
curl http://localhost:3001/cdm/events/today | json_pp
```

---

## 🎨 Color Coding

### Customer Temperature:
- 🔥 **Hot** (red): Last order within 7 days
- ☀️ **Warm** (orange): Last order within 30 days
- ❄️ **Cold** (blue): Last order > 30 days ago

### Customer Type:
- 💎 **VIP** (yellow): LTV > 50,000
- 🔁 **Repeat** (green): 3+ orders
- 🆕 **New** (blue): 0-2 orders
- 😴 **Inactive** (gray): No order in 90+ days

### Lifecycle Stage:
- 🌱 **Lead** (gray)
- 👀 **Prospect** (blue)
- 🛒 **First Buyer** (green)
- 🔁 **Repeat Buyer** (purple)
- 💎 **Loyal** (yellow)
- 😴 **Inactive** (red)

---

## 📞 Agent Workflow

### Morning Routine:
1. ✅ Check today's events (birthdays/anniversaries)
2. ✅ Review AI call recommendations
3. ✅ Start with priority score 9-10 customers
4. ✅ Check "What To Do Next" for each customer

### During Call:
1. ✅ Open Customer 360° profile
2. ✅ Review last interaction and outcome
3. ✅ Check AI-recommended products
4. ✅ Use suggested offer type
5. ✅ Note customer behavior (viewed products)

### After Call:
1. ✅ Log interaction immediately
2. ✅ Record outcome and notes
3. ✅ Set follow-up if needed
4. ✅ System auto-updates customer temperature

---

## 🎯 System Benefits

### For Sales Team:
✅ Know exactly who to call first  
✅ What products to recommend  
✅ Best time to contact  
✅ Complete customer history  
✅ Personalized conversation starters  

### For Marketing Team:
✅ Birthday/anniversary campaigns  
✅ Segment customers accurately  
✅ Track campaign effectiveness  
✅ Identify drop-off points  
✅ Win-back automation  

### For Management:
✅ Customer lifetime value tracking  
✅ Segmentation analytics  
✅ Agent performance insights  
✅ Revenue forecasting  
✅ Churn prediction  

---

## 🚀 Ready to Use!

**Database:** ✅ Tables, views, functions created  
**Backend:** ✅ 30+ methods, 25+ endpoints  
**Frontend:** ✅ Customer 360° profile, CDM list  
**AI:** ✅ Smart recommendations ready  

**Start using:** http://localhost:3000/admin/customers/cdm
