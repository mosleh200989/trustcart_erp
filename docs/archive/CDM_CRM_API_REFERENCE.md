# 📌 CDM & CRM API Quick Reference Card

## Base URLs
```
CDM:  http://localhost:3001/cdm
CRM:  http://localhost:3001/crm-automation
```

---

## 🔵 CDM APIs

### Customer 360° View
```http
GET /cdm/customer360/:customerId
GET /cdm/customer360?customerType=vip&temperature=hot&limit=50

Response: {
  customer_id, name, email, phone,
  customer_type, lifecycle_stage, customer_temperature,
  lifetime_value, total_orders, days_since_last_order,
  family_members_count, total_interactions
}
```

### Family Members
```http
GET  /cdm/family-members/:customerId
POST /cdm/family-member
Body: { customerId, name, relationship, dateOfBirth, phone }

DELETE /cdm/family-member/:id
```

### Interactions
```http
GET  /cdm/interactions/:customerId?limit=20
POST /cdm/interaction
Body: {
  customerId, interactionType, direction, subject,
  details, outcome, agentId, followUpDate
}

Types: call, whatsapp, sms, email, visit
Outcomes: successful, no_answer, follow_up_needed, not_interested
```

### Customer Behavior
```http
GET /cdm/behavior/:customerId

Response: {
  avg_order_value, preferred_categories,
  preferred_payment_method, avg_days_between_orders,
  peak_order_time, has_abandoned_cart
}
```

### At-Risk Customers
```http
GET /cdm/dropoff?riskLevel=high&limit=50

Response: [{
  customer_id, name, last_active_date,
  days_inactive, risk_level, lifetime_value
}]

Risk Levels: low (30-60d), medium (60-90d), high (90-120d), critical (120+d)
```

### Upcoming Events
```http
GET /cdm/upcoming-events?days=30

Response: [{
  customer_id, name, email,
  event_type: 'birthday' | 'anniversary' | 'family_birthday',
  event_date, days_until
}]
```

---

## 🟢 CRM APIs

### Call Tasks
```http
GET  /crm-automation/call-tasks/today?agentId=5
PUT  /crm-automation/call-task/:id/status
Body: { status, outcome, notes }

POST /crm-automation/generate-call-tasks
Body: { taskDate: "2025-12-19" }

Status: pending, completed, skipped
Outcome: successful, no_answer, follow_up_needed
```

### Product Recommendations
```http
GET /crm-automation/recommendations/:customerId

Response: [{
  product_id, product_name, recommended_price,
  discount_percentage, reason
}]
```

### Customer Engagement
```http
POST /crm-automation/engagement
Body: {
  customerId, engagementType, channel,
  content, response
}

Types: call, message, email, offer_sent
Channels: phone, whatsapp, sms, email
Response: positive, negative, no_response
```

### Marketing Campaigns
```http
GET  /crm-automation/campaigns?status=active
POST /crm-automation/campaign
Body: {
  campaignName, campaignType, targetSegment,
  messageTemplate, discountCode,
  startDate, endDate
}

POST /crm-automation/campaign/:id/send
Response: { sent_count, failed_count }

Types: sms, whatsapp, email, push
Segments: all, new, repeat, vip, inactive
```

### Agent Performance
```http
GET /crm-automation/agent-performance?agentId=5&startDate=2025-12-01&endDate=2025-12-18

Response: {
  agent_id, agent_name,
  total_tasks, completed_tasks, successful_calls,
  completion_rate, success_rate, avg_call_duration
}
```

---

## 📊 Common Queries

### Get VIP Customers (Hot)
```http
GET /cdm/customer360?customerType=vip&temperature=hot&limit=20
```

### Get At-Risk VIP Customers
```http
GET /cdm/customer360?customerType=vip&lifecycleStage=at_risk
```

### Today's Birthday Customers
```http
GET /cdm/upcoming-events?days=1
```

### Inactive Customers (90+ days)
```http
GET /cdm/dropoff?riskLevel=high&limit=100
```

---

## 🎯 Status Codes

```
200 - Success
201 - Created
400 - Bad Request (validation error)
401 - Unauthorized (login required)
403 - Forbidden (no access)
404 - Not Found
500 - Server Error
```

---

## 🔐 Authentication

```javascript
// All requests require JWT token
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📝 Data Types

### Customer Type
```
new      - First order only
repeat   - 2-5 orders
vip      - 6+ orders or high spend
inactive - 90+ days no order
```

### Lifecycle Stage
```
prospect - Registered, no order
new      - First order placed
active   - Regular orders
at_risk  - 60-90 days no order
churned  - 90+ days no order
```

### Temperature/Priority
```
hot  🔥 - Last 7 days
warm 🟡 - Last 30 days
cold ❄️ - 30+ days
```

### Relationship Types
```
spouse, child, parent, sibling, other
```

---

## ⚡ Quick Examples

### Example 1: Get Customer Profile
```bash
curl http://localhost:3001/cdm/customer360/123
```

### Example 2: Log Phone Call
```bash
curl -X POST http://localhost:3001/cdm/interaction \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 123,
    "interactionType": "call",
    "direction": "outbound",
    "subject": "Follow-up",
    "outcome": "successful"
  }'
```

### Example 3: Complete Call Task
```bash
curl -X PUT http://localhost:3001/crm-automation/call-task/456/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "outcome": "successful - placed order",
    "notes": "Customer ordered 2kg honey"
  }'
```

### Example 4: Create Campaign
```bash
curl -X POST http://localhost:3001/crm-automation/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "Eid Sale",
    "campaignType": "whatsapp",
    "targetSegment": "all",
    "messageTemplate": "Eid Mubarak! 20% off",
    "discountCode": "EID20",
    "startDate": "2026-03-30",
    "endDate": "2026-04-05"
  }'
```

---

## 🔄 Frontend Integration

### React/Next.js Example
```typescript
// Fetch customer 360
const [customer, setCustomer] = useState(null);

useEffect(() => {
  fetch(`http://localhost:3001/cdm/customer360/${customerId}`)
    .then(res => res.json())
    .then(data => setCustomer(data));
}, [customerId]);

// Log interaction
const logCall = async () => {
  await fetch('http://localhost:3001/cdm/interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      interactionType: 'call',
      outcome: 'successful'
    })
  });
};
```

---

## 📞 Support

**Backend Health Check:**
```
http://localhost:3001/health
```

**Documentation:**
- Full Guide: [CDM_CRM_USER_GUIDE.md](CDM_CRM_USER_GUIDE.md)
- Quick Start: [CDM_CRM_QUICK_START.md](CDM_CRM_QUICK_START.md)

---

**Last Updated**: December 18, 2025  
**Print this card for quick reference!**
