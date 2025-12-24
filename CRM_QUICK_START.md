# 🎯 CRM Automation - Quick Start Guide

## 🚀 System Status

✅ **Database:** Migrated (Tables + Views + Functions)  
✅ **Backend:** Service + Controller + Entities Ready  
✅ **Frontend:** 3 Pages Created + 1 Component  
✅ **Servers:** Running (Frontend: 3000)

---

## 📱 Access Your Dashboards

### 1. **Agent Dashboard** (For Sales Team)
```
URL: http://localhost:3000/admin/crm/agent-dashboard
```

**What You'll See:**
- 📊 Your daily task statistics
- 🔥 Hot leads to call NOW
- ⏰ Warm leads for follow-up
- 🎯 "What to do next" AI guidance
- 📞 One-click call with customer intelligence

**How To Use:**
1. Open dashboard
2. Check "What To Do Next" card
3. Click "Call" on HOT leads
4. View customer intelligence + recommendations
5. Complete call with outcome

---

### 2. **Automation Settings** (For Admin)
```
URL: http://localhost:3000/admin/crm/automation
```

**3 Tabs:**

**Tab 1: Recommendation Rules**
- Create upsell/cross-sell rules
- Example: "Honey buyer → Suggest Pain Relief Oil"
- Set time window (10-20 days)
- Set minimum order value (৳800)

**Tab 2: Marketing Campaigns**
- Create automated SMS/WhatsApp/Email campaigns
- Example: "Inactive 30 days → Send 30% discount"
- Toggle campaigns on/off
- View success statistics

**Tab 3: Customer Intelligence**
- View hot customers list
- See lifetime value
- Check purchase frequency
- Monitor customer temperature

---

### 3. **CRM Main Page** (Quick Access)
```
URL: http://localhost:3000/admin/crm
```

**Features:**
- Quick stats widget
- Generate daily tasks button
- Links to Agent Dashboard
- Links to Automation Settings

---

## 🤖 How Automation Works

### Morning Routine (Auto):
```sql
SELECT generate_daily_call_tasks();
```

**What Happens:**
1. System analyzes all customers
2. Finds HOT customers (bought 7-15 days ago, high value)
3. Finds WARM customers (15-30 days ago, repeat buyers)
4. Creates call tasks for each
5. Assigns to agents

### Marketing Automation (Every 2 hours):
```sql
SELECT trigger_marketing_automation();
```

**What Happens:**
1. Check missed calls → Send WhatsApp
2. Check inactive customers → Send discount SMS
3. Check repeat buyers → Send premium email
4. Update campaign statistics

---

## 📊 Dashboard Features

### Agent Dashboard:
```
┌─────────────────────────────────────────┐
│ 📊 Today's Tasks: 15                    │
│ 🔥 Hot Leads: 5   ⏰ Warm: 10          │
│ ⏳ Pending: 12    ✅ Completed: 3      │
├─────────────────────────────────────────┤
│ 🔥 WHAT TO DO NEXT?                     │
│ Call Md. Karim NOW!                     │
│ 📱 01712345678                          │
│ 💰 Lifetime Value: ৳25,000              │
│ 📦 Total Orders: 10                     │
│ 🎯 Suggest: Pain Relief Oil (HIGH)      │
│ [Start Call Now]                        │
├─────────────────────────────────────────┤
│ TODAY'S CALL LIST                       │
│ 🔥 #123 | Upsell opportunity | [Call]  │
│ ⏰ #456 | Follow-up          | [Call]  │
│ ⏰ #789 | Repeat customer    | [Call]  │
└─────────────────────────────────────────┘
```

### Call Modal (When you click Call):
```
┌─────────────────────────────────────────┐
│ Customer Intelligence:                  │
│ Name: Md. Karim Rahman                  │
│ Phone: 01712345678                      │
│ Total Orders: 10                        │
│ Lifetime Value: ৳25,000                 │
│ Last Purchase: 10 days ago              │
├─────────────────────────────────────────┤
│ 🎯 Recommended Products:                │
│ ⚡ Pain Relief Oil (HIGH priority)      │
│ 🍯 Honey 500g (MEDIUM priority)         │
├─────────────────────────────────────────┤
│ Call Outcome: [Interested ▼]           │
│ Notes: [Customer wants to order...]     │
│ [Complete Task]                         │
└─────────────────────────────────────────┘
```

---

## ⚙️ Admin Setup

### Create Upsell Rule:
1. Go to `/admin/crm/automation`
2. Click "Recommendation Rules" tab
3. Click "+ Add Rule"
4. Fill in:
   - Rule Name: "Honey → Pain Relief"
   - Trigger Product ID: 10
   - Recommended Product ID: 25
   - Min Days: 10, Max Days: 20
   - Min Order Value: 800
   - Priority: High
5. Click "Create Rule"

**Result:** Any customer who bought product #10 (Honey) 10-20 days ago with order ৳800+ will get Pain Relief Oil recommended.

### Create Marketing Campaign:
1. Go to `/admin/crm/automation`
2. Click "Marketing Campaigns" tab
3. Click "+ Add Campaign"
4. Fill in:
   - Campaign Name: "Inactive Customer Reactivation"
   - Type: Reactivation
   - Channel: SMS
   - Target: inactive_30_days
   - Message: "We miss you! Get 30% off. Order now!"
5. Click "Create Campaign"

**Result:** Every 2 hours, system sends SMS to customers inactive 30+ days.

---

## 📞 API Examples (For Testing)

### Generate Daily Tasks:
```bash
curl -X POST http://localhost:3001/crm/automation/tasks/generate
```

### Get Hot Customers:
```bash
curl http://localhost:3001/crm/automation/customers/hot?limit=10
```

### Get Agent Dashboard:
```bash
curl http://localhost:3001/crm/automation/agent/1/dashboard
```

### Get Next Best Action:
```bash
curl http://localhost:3001/crm/automation/agent/1/next-action
```

**Response:**
```json
{
  "action": "call_hot_customer",
  "priority": "HIGH",
  "message": "Call Md. Karim NOW - High-value customer!",
  "customer_intel": {
    "phone": "01712345678",
    "lifetime_value": 25000,
    "days_since_last_order": 10
  },
  "products_to_push": ["Pain Relief Oil", "Honey"]
}
```

---

## 🎯 Key Features Summary

### 👥 Team Automation:
✅ Lead auto-assignment  
✅ Priority auto-tagging (hot/warm/cold)  
✅ Daily call list generation

### 🔁 Upsell/Cross-sell:
✅ Product-based rules  
✅ Time-window triggers  
✅ Order value filters  
✅ Priority management

### 📞 Auto Call Priority:
✅ HOT → Call immediately  
✅ WARM → Follow-up  
✅ COLD → SMS/WhatsApp only

### 📣 Marketing Automation:
✅ Missed call → WhatsApp follow-up  
✅ Inactive → Discount offer  
✅ Repeat buyer → Premium upsell  
✅ Behavior-based triggers

### 🤖 Agent Intelligence:
✅ "What to do next" guidance  
✅ Customer analytics  
✅ Product recommendations  
✅ Performance dashboard

---

## 📚 Documentation Files

1. **CRM_AUTOMATION_GUIDE.md** - Complete technical guide
2. **CRM_FRONTEND_COMPLETE.md** - Frontend implementation details
3. **CRM_QUICK_START.md** - This file (Quick start)

---

## 🔧 Troubleshooting

### Frontend not loading?
```bash
# Check if running
netstat -ano | Select-String "3000" | Select-String "LISTENING"

# Restart if needed
cd c:\xampp\htdocs\trustcart_erp\frontend
node node_modules/next/dist/bin/next dev
```

### Backend not responding?
```bash
# Check if running
netstat -ano | Select-String "3001" | Select-String "LISTENING"

# Restart if needed
cd c:\xampp\htdocs\trustcart_erp\backend
node node_modules/@nestjs/cli/bin/nest.js start --watch
```

### Database tables missing?
```bash
# Run migration
psql -U postgres -d trustcart_erp -f crm-automation-migration.sql
```

---

## 🎉 You're Ready!

### Quick Test:
1. Open: `http://localhost:3000/admin/crm`
2. See CRM Quick Actions widget
3. Click "Agent Dashboard"
4. View your dashboard
5. Click "Automation Settings"
6. Explore tabs

### For Sales Agents:
- Bookmark: `http://localhost:3000/admin/crm/agent-dashboard`
- Start your day by checking "What To Do Next"
- Follow the HOT leads first
- Complete tasks after each call

### For Admins:
- Bookmark: `http://localhost:3000/admin/crm/automation`
- Set up your upsell rules
- Create marketing campaigns
- Monitor customer intelligence

---

**System fully operational! 🚀**

**Questions?** Check the detailed guides:
- Technical details: `CRM_AUTOMATION_GUIDE.md`
- Frontend details: `CRM_FRONTEND_COMPLETE.md`
