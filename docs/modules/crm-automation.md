# 🤖 TrustCart ERP - CRM Automation System
## Complete Implementation Guide

---

## 📋 Overview

এই সিস্টেমে আছে:

### ✅ Customer Intelligence Engine
- প্রতিটি customer-এর purchase history analysis
- Automatic HOT/WARM/COLD tagging
- Lifetime value calculation
- Buy frequency tracking

### ✅ Auto Call Priority System
- প্রতিদিন সকালে automatic call list তৈরি
- HOT customers → Immediate call
- WARM customers → Follow-up call
- COLD customers → WhatsApp/SMS only

### ✅ Upsell/Cross-sell Rules Engine
- Product recommendation rules
- "Honey কিনেছে → Pain relief suggest করো"
- Automatic product matching

### ✅ Marketing Automation
- Behavior-based campaigns
- SMS/WhatsApp/Email auto-send
- Missed call → WhatsApp
- Inactive 30 days → Discount offer

### ✅ Agent Dashboard
- Today's call list
- "What to do next" guidance
- Performance metrics
- Product push suggestions

---

## 🗄️ Database Tables

### 1. **crm_call_tasks** (Auto Call Priority)
```sql
- id, customer_id, assigned_agent_id
- task_date, priority (hot/warm/cold)
- status (pending/completed/failed)
- call_reason, recommended_product_id
- notes, scheduled_time, completed_at
```

### 2. **customer_engagement_history** (Tracking)
```sql
- id, customer_id, engagement_type
- channel (call/sms/whatsapp/email)
- status (sent/delivered/responded)
- message_content, agent_id, campaign_id
```

### 3. **product_recommendation_rules** (Upsell Brain)
```sql
- id, rule_name
- trigger_product_id, recommended_product_id
- min_days_passed, max_days_passed
- min_order_value, priority
- is_active, success_rate
```

### 4. **marketing_campaigns** (Automation)
```sql
- id, campaign_name, campaign_type
- channel (sms/whatsapp/email)
- target_segment, message_template
- trigger_condition (JSON)
- success_count, conversion_rate
```

### 5. **Views (Auto-calculated)**
- `customer_intelligence` - Real-time customer analytics
- `customer_product_recommendations` - Personalized suggestions
- `agent_performance_dashboard` - Team metrics

---

## 🚀 API Endpoints

### Call Tasks
```http
GET    /crm/automation/tasks/today?agentId=1
PUT    /crm/automation/tasks/:id/status
PUT    /crm/automation/tasks/:id/assign
POST   /crm/automation/tasks/generate
```

### Customer Intelligence
```http
GET    /crm/automation/intelligence/:customerId
GET    /crm/automation/customers/hot
GET    /crm/automation/customers/warm
GET    /crm/automation/customers/cold
```

### Recommendations
```http
GET    /crm/automation/recommendations/:customerId
GET    /crm/automation/recommendation-rules
POST   /crm/automation/recommendation-rules
PUT    /crm/automation/recommendation-rules/:id
DELETE /crm/automation/recommendation-rules/:id
```

### Engagement Tracking
```http
POST   /crm/automation/engagement
GET    /crm/automation/engagement/:customerId
GET    /crm/automation/engagement/:customerId/stats
```

### Marketing Campaigns
```http
GET    /crm/automation/campaigns
GET    /crm/automation/campaigns/active
POST   /crm/automation/campaigns
PUT    /crm/automation/campaigns/:id
PUT    /crm/automation/campaigns/:id/toggle
DELETE /crm/automation/campaigns/:id
GET    /crm/automation/campaigns/:id/stats
```

### Agent Dashboard
```http
GET    /crm/automation/agent/performance?agentId=1
GET    /crm/automation/agent/:id/dashboard
GET    /crm/automation/agent/:id/next-action
```

---

## 💡 How It Works

### Morning Routine (8:00 AM - Auto)
```sql
SELECT generate_daily_call_tasks();
```

**এটা করে:**
1. গতকালের pending tasks মুছে দেয়
2. Customer intelligence analysis করে
3. HOT customers খুঁজে বের করে (last purchase 7-15 days, high value)
4. WARM customers খুঁজে বের করে (15-30 days, repeat buyer)
5. প্রতিটির জন্য call task তৈরি করে
6. Agent-দের assign করে

### Agent Opens Dashboard
```javascript
GET /crm/automation/agent/1/dashboard

Response:
{
  "today_tasks": 15,
  "hot_leads": 5,
  "warm_leads": 10,
  "pending": 12,
  "completed": 3,
  "tasks": [
    {
      "id": 123,
      "customer_id": "abc-123",
      "priority": "hot",
      "call_reason": "Upsell opportunity - Recent high-value customer",
      "scheduled_time": "09:00"
    }
  ]
}
```

### Agent Asks "What To Do Next?"
```javascript
GET /crm/automation/agent/1/next-action

Response:
{
  "action": "call_hot_customer",
  "priority": "HIGH",
  "message": "Call Md. Karim NOW - High-value customer!",
  "customer_intel": {
    "name": "Md. Karim",
    "phone": "01712345678",
    "last_purchase_date": "2025-12-08",
    "days_since_last_order": 10,
    "lifetime_value": 25000,
    "avg_order_value": 2500
  },
  "products_to_push": [
    "Pain Relief Oil",
    "Honey 500g",
    "Herbal Tea"
  ],
  "task": { ... }
}
```

### Auto Marketing Trigger (Every 2 Hours)
```sql
SELECT trigger_marketing_automation();
```

**Campaigns run automatically:**

#### Campaign: Missed Call Follow-up
```
IF call_status = 'failed'
AND time_passed > 30 minutes
THEN send_whatsapp("আপনার কল মিস হয়েছে। কীভাবে সাহায্য করতে পারি?")
```

#### Campaign: Inactive Reactivation
```
IF days_since_last_order >= 30
THEN send_sms("৩০% ছাড়ে ফিরে আসুন!")
```

#### Campaign: Premium Upsell
```
IF total_orders >= 2
AND avg_order_value > 1000
THEN send_email("আপনার জন্য বিশেষ premium অফার")
```

---

## 📊 Example Usage Scenarios

### Scenario 1: Morning Agent Login

**Agent:** আজ আমার কী কী কাজ?

**API Call:**
```bash
curl http://localhost:3001/crm/automation/agent/1/dashboard
```

**System Response:**
- 15টি call করতে হবে
- 5টি HOT (এখনই call করো)
- 10টি WARM (follow-up)
- List দেখাচ্ছে priority অনুযায়ী

---

### Scenario 2: Agent Calls Customer

**Agent clicks "Call" button**

**Frontend:**
```javascript
// Get customer details + recommendations
const intel = await api.get(`/crm/automation/intelligence/${customerId}`)
const recommendations = await api.get(`/crm/automation/recommendations/${customerId}`)

// Show to agent:
// - Customer name, phone
// - Last purchase: 10 days ago
// - Bought: Honey
// - Suggest: Pain Relief Oil (high priority)
```

**After call:**
```javascript
// Mark task complete
await api.put(`/crm/automation/tasks/${taskId}/status`, {
  status: 'completed',
  outcome: 'interested',
  notes: 'Will buy pain relief oil next week'
})

// Track engagement
await api.post('/crm/automation/engagement', {
  customer_id: customerId,
  engagement_type: 'call',
  status: 'responded',
  agent_id: 1
})
```

---

### Scenario 3: Create Upsell Rule

**Admin creates rule:**
```javascript
POST /crm/automation/recommendation-rules
{
  "rule_name": "Honey → Pain Relief Oil",
  "trigger_product_id": 10,
  "recommended_product_id": 25,
  "min_days_passed": 10,
  "max_days_passed": 20,
  "min_order_value": 800,
  "priority": "high"
}
```

**এখন system automatically:**
- যে customer honey কিনেছে 10-20 দিন আগে
- এবং order value 800+ ছিল
- তাকে Pain Relief Oil suggest করবে

---

### Scenario 4: Campaign Automation

**Admin creates campaign:**
```javascript
POST /crm/automation/campaigns
{
  "campaign_name": "Inactive Customer Reactivation",
  "campaign_type": "reactivation",
  "channel": "sms",
  "target_segment": "inactive_30_days",
  "message_template": "We miss you! Get 30% discount. Order now!",
  "trigger_condition": {
    "trigger": "days_inactive",
    "value": 30
  },
  "is_active": true
}
```

**System automatically (every 2 hours):**
1. Find customers inactive 30+ days
2. Send SMS to each
3. Track in engagement_history
4. Update campaign success_count

---

## 🎯 Key Features Summary

### 👥 Team Automation
✅ Lead আসলেই auto assign  
✅ Priority auto-set (hot/warm/cold)  
✅ Daily call list auto-generate

### 🔁 Upsell/Cross-sell
✅ Product-based rules  
✅ Category-based rules  
✅ Time-based triggers  
✅ Order value filters

### 📞 Auto Call Priority
✅ HOT → Call today  
✅ WARM → Follow-up this week  
✅ COLD → SMS/WhatsApp only

### 📣 Marketing Automation
✅ Missed call → WhatsApp  
✅ Inactive → Discount SMS  
✅ Repeat customer → Premium email  
✅ Behavior-based triggers

### 🤖 "What To Do Next"
✅ Agent dashboard  
✅ Next best action  
✅ Product push suggestion  
✅ Customer intelligence

---

## 🔧 Setup Instructions

### 1. Database Migration (Already Done ✅)
```bash
psql -U postgres -d trustcart_erp -f crm-automation-migration.sql
```

### 2. Backend Running (Already Done ✅)
```bash
cd backend
npm run start:dev
```

### 3. Test Endpoints
```bash
# Get hot customers
curl http://localhost:3001/crm/automation/customers/hot

# Generate today's tasks
curl -X POST http://localhost:3001/crm/automation/tasks/generate

# Get agent dashboard
curl http://localhost:3001/crm/automation/agent/1/dashboard
```

---

## 📱 Frontend Implementation (Next Steps)

### Agent Dashboard (`/admin/crm/agent-dashboard`)
```typescript
// Components needed:
- CallTaskList (today's calls with priority badges)
- NextActionCard ("Call Md. Karim NOW!")
- PerformanceWidget (completed/pending stats)
- CustomerIntelCard (customer details when calling)
- ProductRecommendationList (products to push)
```

### Admin CRM Settings (`/admin/crm/automation`)
```typescript
// Tabs:
1. Recommendation Rules (CRUD for upsell rules)
2. Marketing Campaigns (CRUD for campaigns)
3. Team Performance (agent stats dashboard)
4. Customer Intelligence (analytics views)
```

---

## 🎉 Status

### ✅ Database
- Tables created
- Views created
- Functions created
- Sample data inserted

### ✅ Backend
- 4 Entities created
- CrmAutomationService (300+ lines)
- CrmAutomationController (30+ endpoints)
- Module registered
- Server running

### ⏳ Frontend
- Dashboard designs pending
- API integration pending

---

## 🚀 Quick Test

### Test Call Task Generation:
```bash
curl -X POST http://localhost:3001/crm/automation/tasks/generate
```

### Test Hot Customers:
```bash
curl http://localhost:3001/crm/automation/customers/hot
```

### Test Agent Dashboard:
```bash
curl http://localhost:3001/crm/automation/agent/1/dashboard
```

---

## 📞 Support

System ready! 
- Database: ✅ Migrated
- Backend: ✅ Running on port 3001
- Endpoints: ✅ 30+ APIs available
- Automation: ✅ Functions created

**Next:** Frontend dashboard implementation করতে পারেন! 🎯
