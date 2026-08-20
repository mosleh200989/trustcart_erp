# 🚀 CDM & CRM Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Verify Database (30 seconds)

```powershell
cd c:\xampp\htdocs\trustcart_erp\backend
$env:PGPASSWORD="c0mm0n"
& "C:\Program Files\PostgreSQL\12\bin\psql.exe" -U postgres -d trustcart_erp -c "SELECT COUNT(*) FROM customer_360_view;"
```

✅ If you see a number, CDM is ready!

### Step 2: Start Backend (1 minute)

```powershell
cd c:\xampp\htdocs\trustcart_erp\backend
npm run start:dev
```

Wait for: `Nest application successfully started`

### Step 3: Start Frontend (1 minute)

```powershell
cd c:\xampp\htdocs\trustcart_erp\frontend
npm run dev
```

Wait for: `ready - started server on http://localhost:3000`

### Step 4: Access Dashboards (30 seconds)

Open your browser:
- **CDM Dashboard**: http://localhost:3000/admin/customers/cdm
- **CRM Dashboard**: http://localhost:3000/admin/crm
- **Agent Dashboard**: http://localhost:3000/admin/crm/agent-dashboard

---

## 📱 First Day Workflow

### Morning (9:00 AM)

#### 1. Check Today's Call Tasks
```
URL: http://localhost:3000/admin/crm/agent-dashboard

You'll see:
🔥 HOT (5 tasks)    - VIP customers, urgent
🟡 WARM (12 tasks)  - Regular follow-ups
❄️ COLD (8 tasks)   - Low priority
```

#### 2. Start Calling (Hot First)

**Example Hot Task:**
```
Customer: John Doe
Phone: 01700000000
Type: VIP Follow-up
Last Order: 5 days ago
Order Value: ৳8,000
Note: Interested in bulk honey order
```

**Call Script:**
```
"আসসালামু আলাইকুম, আমি TrustCart থেকে বলছি। 
আপনার আগের অর্ডারটি কেমন লেগেছে?
[Listen...]
আমরা এখন বাল্ক অর্ডারে ১৫% ডিসকাউন্ট দিচ্ছি।
আপনার জন্য কি ৫ কেজি মধু রিজার্ভ করে রাখি?"
```

#### 3. Update Task Status

After call:
- Click **"Mark Complete"**
- Select outcome: ✅ Successful / ❌ No Answer / 🔄 Follow-up Needed
- Add notes: "Customer agreed to 5kg order, will confirm by evening"
- Set follow-up date if needed

---

## 🎯 Common Use Cases

### Use Case 1: Welcome New Customer

**Scenario**: Customer just placed first order

**Action:**
1. Go to CDM Dashboard
2. Filter: Customer Type = "New"
3. Sort by: Registration Date (newest first)
4. Click customer name
5. Click "📞 Call Customer"

**Call Script:**
```
"আসসালামু আলাইকুম [Name],
TrustCart এ আপনার প্রথম অর্ডারের জন্য ধন্যবাদ!
আমরা আপনাকে একটি স্পেশাল ১০% ডিসকাউন্ট কোড দিচ্ছি 
পরবর্তী অর্ডারের জন্য: WELCOME10
এছাড়া আপনার কোন প্রশ্ন থাকলে জিজ্ঞেস করতে পারেন।"
```

**After Call:**
- Log interaction: Type = "call", Outcome = "successful"
- Add family members (if mentioned)
- Set follow-up date (+15 days)

### Use Case 2: Recover At-Risk Customer

**Scenario**: Customer hasn't ordered in 75 days

**Action:**
1. Go to CDM Dashboard
2. Filter: Customer Type = "At-Risk"
3. Sort by: Days Since Last Order (highest first)
4. View customer 360° profile
5. Check last order products

**Call Script:**
```
"আসসালামু আলাইকুম [Name],
আমি TrustCart থেকে বলছি। 
আমরা লক্ষ্য করেছি আপনি গত [X] দিন অর্ডার করেননি।
কোন সমস্যা হয়েছিল কি? 
[Listen...]
আমরা আপনাকে একটি স্পেশাল ২০% ডিসকাউন্ট অফার দিতে চাই।
আপনার পছন্দের [Product Name] এ।
কোড: COMEBACK20"
```

**After Call:**
- Log interaction with outcome
- If successful: Create order
- If not interested: Mark as "churned"
- Add notes about reason

### Use Case 3: Birthday Call

**Scenario**: Customer's birthday today

**Action:**
1. System auto-generates birthday task
2. Task appears in "Today's Tasks" with 🎂 icon
3. Click customer name to see details

**Call Script:**
```
"আসসালামু আলাইকুম [Name],
জন্মদিনের শুভেচ্ছা! 🎉
TrustCart পরিবার থেকে আপনাকে একটি স্পেশাল গিফট দিতে চাই।
আপনার পছন্দের যেকোন প্রোডাক্টে ২৫% ডিসকাউন্ট।
কোড: BDAY25
এবং ফ্রি হোম ডেলিভারি!"
```

**After Call:**
- Send WhatsApp message with discount code
- Log engagement
- Create gift entry in system

### Use Case 4: Create Marketing Campaign

**Scenario**: Eid sale announcement

**Action:**
1. Go to: http://localhost:3000/admin/crm/automation
2. Click "Create Campaign"
3. Fill form:
   - Name: "Eid Sale 2026"
   - Type: WhatsApp
   - Target: All customers
   - Message: "🌙 Eid Mubarak! 20% off on all products. Code: EID20"
   - Discount Code: EID20
   - Start Date: 2026-03-30
   - End Date: 2026-04-05
4. Click "Create Campaign"
5. Click "Send to Customers"

**System Actions:**
- Auto-sends WhatsApp to all customers
- Tracks sent/delivered/opened
- Tracks conversions (orders using EID20)

---

## 📊 Daily Reports

### Morning Report (9:00 AM)

```sql
-- Check your tasks for today
SELECT 
  priority,
  COUNT(*) as task_count
FROM crm_call_tasks
WHERE task_date = CURRENT_DATE 
  AND assigned_agent_id = YOUR_AGENT_ID
  AND status = 'pending'
GROUP BY priority
ORDER BY 
  CASE priority 
    WHEN 'hot' THEN 1 
    WHEN 'warm' THEN 2 
    ELSE 3 
  END;
```

**Expected Output:**
```
Priority | Task Count
---------|----------
hot      | 5
warm     | 12
cold     | 8
```

### Evening Report (5:00 PM)

```sql
-- Your performance today
SELECT 
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE outcome LIKE '%successful%') as successful,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100, 2) as completion_rate
FROM crm_call_tasks
WHERE task_date = CURRENT_DATE 
  AND assigned_agent_id = YOUR_AGENT_ID;
```

**Expected Output:**
```
Total: 25 | Completed: 23 | Successful: 18 | Rate: 92%
```

---

## 🎓 Training Checklist

### Week 1: Basics

- [ ] Login to system
- [ ] Navigate CDM dashboard
- [ ] View customer 360° profile
- [ ] Make first call from task list
- [ ] Update call status
- [ ] Add customer notes
- [ ] Log customer interaction
- [ ] View today's performance

### Week 2: Intermediate

- [ ] Add family member to customer
- [ ] Create follow-up task manually
- [ ] Filter customers by type/temperature
- [ ] Use product recommendations
- [ ] Send WhatsApp message from system
- [ ] Check customer behavior patterns
- [ ] Identify at-risk customers
- [ ] Complete 100% daily tasks

### Week 3: Advanced

- [ ] Create marketing campaign
- [ ] Analyze campaign performance
- [ ] Generate weekly report
- [ ] Handle VIP customers
- [ ] Use AI recommendations
- [ ] Manage customer dropoffs
- [ ] Train new agent

---

## 🔥 Pro Tips

### 1. Prioritization Strategy

```
🔥 HOT (Do First):
- VIP customers
- At-risk high-value customers  
- Birthday/anniversary calls
- Follow-ups with high potential

🟡 WARM (Do Second):
- Regular follow-ups
- New customer welcomes
- Repeat order reminders

❄️ COLD (Do Last):
- Low-value customers
- Cold leads
- General check-ins
```

### 2. Time Management

```
Morning (9-12):
- Complete all HOT tasks
- Start WARM tasks
- High energy for important calls

Afternoon (2-5):
- Complete WARM tasks
- Start COLD tasks
- Data entry & follow-ups

Evening (5-6):
- Review incomplete tasks
- Plan tomorrow
- Update notes
```

### 3. Call Success Tips

**DO:**
- ✅ Use customer's name
- ✅ Reference past orders
- ✅ Personalize offers
- ✅ Listen actively
- ✅ Create urgency (limited time)
- ✅ Confirm understanding
- ✅ Set clear next steps

**DON'T:**
- ❌ Sound scripted
- ❌ Rush the call
- ❌ Ignore objections
- ❌ Make false promises
- ❌ Be pushy
- ❌ Forget to follow up

### 4. Note-Taking Template

```
Date: 2025-12-18
Time: 10:30 AM
Customer: John Doe (#12345)
Phone: 01700000000

Call Purpose: Follow-up on bulk order inquiry

Discussion:
- Customer confirmed interest in 5kg honey
- Budget: ৳4,000-5,000
- Delivery needed by Friday
- Prefers bKash payment

Action Items:
- Send product catalog via WhatsApp
- Create quote for 5kg honey (15% discount)
- Follow-up tomorrow morning
- Reserve stock

Outcome: ✅ Successful
Next Follow-up: 2025-12-19
```

---

## ⚠️ Troubleshooting

### Problem 1: "No tasks showing in Agent Dashboard"

**Solution:**
```sql
-- Manually generate tasks for today
SELECT generate_daily_call_tasks(CURRENT_DATE::text);
```

### Problem 2: "Customer 360 view shows old data"

**Solution:**
```powershell
# Clear cache and refresh
Ctrl + F5 in browser
```

### Problem 3: "Cannot update task status"

**Check:**
1. Are you logged in?
2. Is backend running? (http://localhost:3001/health)
3. Is task assigned to you?

---

## 📞 Support

**Technical Issues:**
- Check backend logs: `backend/logs/`
- Check browser console: F12 → Console tab
- Restart backend: `npm run start:dev`

**Business Questions:**
- Refer to: [CDM_CRM_USER_GUIDE.md](CDM_CRM_USER_GUIDE.md)
- Contact: Team Lead / Manager

---

## 🎯 Success Metrics

### Individual KPIs

```
Daily:
- Call completion rate: >90%
- Call success rate: >70%
- Average calls per day: >25

Weekly:
- New customer conversions: >5
- At-risk recoveries: >3
- Follow-up completion: 100%

Monthly:
- Revenue generated: ৳50,000+
- Customer satisfaction: >4.5/5
- Task completion streak: >20 days
```

### Team KPIs

```
Daily:
- Total calls completed: >200
- Active campaigns: >2

Weekly:
- Team success rate: >75%
- Customer retention: >85%

Monthly:
- Total revenue: ৳500,000+
- New customers acquired: >50
- At-risk customers recovered: >30
```

---

## 📅 Monthly Calendar

### Week 1: Planning
- Review last month's performance
- Set this month's targets
- Plan marketing campaigns
- Update recommendation rules

### Week 2-3: Execution
- Daily call tasks
- Campaign monitoring
- Agent training
- Customer follow-ups

### Week 4: Analysis
- Generate monthly reports
- Identify top performers
- Analyze customer trends
- Plan next month

---

## 🎓 Certification

After completing training:

- [ ] Complete all Week 1-3 checklists
- [ ] Achieve 90%+ task completion for 5 days
- [ ] Successfully recover 3 at-risk customers
- [ ] Create and send 1 marketing campaign
- [ ] Generate 1 weekly performance report
- [ ] Pass final assessment test

**Certification**: TrustCart CRM Specialist

---

**Quick Start Guide Version**: 1.0  
**For**: CRM Agents, Team Leads, Managers  
**Last Updated**: December 18, 2025
