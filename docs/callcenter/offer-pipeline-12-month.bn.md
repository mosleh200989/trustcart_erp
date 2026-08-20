# TrustCart CRM + CDM Pipeline (Organic Grocery)
## Team Management + ১২ মাসে ১২ অফার + Consumption-based Reminder + Membership

> লক্ষ্য: একবারের কাস্টমারকে “Repeat → Loyal → Permanent” কাস্টমারে রূপান্তর করা — অটো রিমাইন্ডার, নিয়মিত অফার, নতুন প্রোডাক্ট মার্কেটিং, এবং টিম-ভিত্তিক ফলোআপ দিয়ে।

---

## 1) Business Goal (What we are building)
TrustCart Organic Grocery কাস্টমারদের ক্ষেত্রে সবচেয়ে শক্তিশালী গ্রোথ আসে **Repeat Purchase** থেকে। তাই এই pipeline ৪টা মূল ফলাফল দেয়:

1. **Consumption-based Reminder**: কাস্টমার যে পণ্য কিনেছে, গড় ব্যবহারের সময় অনুযায়ী নির্দিষ্ট দিনের পর আবার কিনতে মনে করিয়ে দেওয়া।
2. **১২ মাসে ১২ অফার**: পুরো বছরের জন্য একটি অফার ক্যালেন্ডার; প্রতিমাসে নতুন অফার/ক্যাম্পেইন, যাতে নতুন ও পুরনো কাস্টমার—দুই দিক থেকেই লিড আসে।
3. **New Product Marketing (Cross-sell / Upsell)**: যে ক্যাটাগরি/পণ্য কিনেছে তার ভিত্তিতে পরের X দিনে নতুন/কমপ্লিমেন্টারি প্রোডাক্ট অফার।
4. **Membership → Permanent Customer**: সদস্যপদ, কুপন, ওয়ালেট/ক্যাশব্যাক, এবং নির্দিষ্ট শর্ত পূরণ হলে পারমানেন্ট কার্ড।

---

## 2) System Overview (CDM → CRM → Offer Engine)
TrustCart ERP-এ আপনার বর্তমান ডকুমেন্টেশন অনুযায়ী CDM + CRM Automation ইতোমধ্যেই আছে (Customer 360, interactions, behavior, drop-off, call task automation, marketing campaigns, recommendation rules)।

এই প্রজেক্টে সবচেয়ে পরিষ্কার ফ্লো হবে:

```
Orders/Transactions ─┐
Customer Profile     ├─► CDM (Customer 360 + Segmentation) ─► CRM Automation (Tasks) ─► Offers/Campaigns ─► Repeat Sales
Interactions/Behavior ┘
```

### CDM কী দেয়
- Customer 360 View (প্রোফাইল + অর্ডার হিস্টরি + LTV + লাস্ট অর্ডার)
- Segmentation (hot/warm/cold, lifecycle_stage, customer_type)
- Behavior & Drop-off signals

### CRM Automation কী করে
- Daily call task generate
- Agent assignment
- Engagement tracking (sms/whatsapp/call)
- Marketing campaign trigger
- Recommendation rules engine

এই ডকের লক্ষ্য: **Consumption-based reminder + ১২ মাসে ১২ অফার + Membership**—এই তিনটি স্তরকে CDM/CRM Automation-এর ওপর বসানো।

---

## 3) Data Model (What data you must track)
### 3.1 Customer Profile (CDM Enhanced Customer)
CDM গাইড অনুযায়ী `customers` টেবিলে যেসব মূল ফিল্ড দরকার:
- `last_order_date`
- `total_spend`
- `customer_type` (new/repeat/vip/inactive)
- `lifecycle_stage` (prospect/new/active/at_risk/churned)
- `priority_level` বা temperature (hot/warm/cold)

এগুলো থেকে আমরা determine করব:
- কে “অ্যাক্টিভ রিপিট কাস্টমার”, কে “at-risk”, কে “win-back”
- কাকে কোন channel-এ (call vs whatsapp vs sms) যোগাযোগ করা হবে

### 3.2 Transaction / Order Data (Repeat logic এর মেরুদণ্ড)
Repeat reminder ও consumption logic চালানোর জন্য অর্ডার লাইনের তথ্য দরকার:
- `customer_id`
- `order_date`
- `product_id`
- `quantity`

> Tip: Grocery-তে একই প্রোডাক্ট বিভিন্ন pack-size হয়। তাই quantity + unit (kg/litre/pcs) normalization গুরুত্বপূর্ণ।

### 3.3 Product Consumption Profile (নতুন কনফিগ টেবিল/কনফিগ ফাইল)
Consumption reminder নির্ভুল করার জন্য একটি কনফিগ দরকার:

- Category/পণ্যভিত্তিক গড় ব্যবহার (days)
- buffer days (আগে মনে করিয়ে দেওয়ার জন্য)
- min/max clamp (খুব কম বা বেশি না হয়ে যায়)

Suggested structure (Conceptual):

| key | value |
|---|---|
| product_id বা category_id | mapping |
| avg_consumption_days | যেমন 30 |
| buffer_days | যেমন 7 |
| min_days | যেমন 10 |
| max_days | যেমন 90 |

এটা database টেবিল হতে পারে অথবা admin-config এ।

### 3.4 Cross-sell / Upsell Rules
CRM automation guide-এ `product_recommendation_rules` আছে। আমরা সেটাই ব্যবহার করব:
- trigger_product_id ⇒ recommended_product_id
- min_days_passed/max_days_passed
- min_order_value
- priority

---

## 4) Core Algorithm: Consumption-based Reminder
### 4.1 Concept
প্রতিটি purchase line থেকে একটি “next reminder date” বের হবে।

Formula:

$$
\text{nextReminderDate} = \text{orderDate} + \text{consumptionDays} - \text{bufferDays}
$$

যেখানে:
- `consumptionDays`: পণ্য/ক্যাটাগরির গড় ব্যবহার সময়
- `bufferDays`: কাস্টমারকে আগে জানানোর buffer

### 4.2 Practical Example Table
| Product | Typical Pack | Avg Usage | Reminder |
|---|---:|---:|---:|
| চাল ৫ কেজি | 5kg | 25–30 দিন | 22 দিন পরে |
| তেল ১ লিটার | 1L | 20–25 দিন | 18 দিন পরে |
| মশলা ২০০g | 200g | 30–40 দিন | 28 দিন পরে |
| মধু | 500g | 45–60 দিন | 40 দিন পরে |

> বাস্তবে consumptionDays quantity-ভিত্তিক স্কেলিং করা যায় (যেমন 10kg চাল হলে দিন বেশি), কিন্তু MVP-তে category/product defaults দিয়েই শুরু করা যায়।

### 4.3 Reminder Task Type (Call task vs SMS/WhatsApp)
Remind করার সময় channel নির্বাচন করুন segmentation অনুযায়ী:
- **HOT / VIP / High LTV** → Call task + WhatsApp follow-up
- **WARM** → WhatsApp or SMS + optional call
- **COLD / Low LTV** → SMS only + win-back offer

এই segmentation CDM-এর `priority_level`/temperature থেকে আসে।

### 4.4 Output of the Reminder Engine
প্রতিদিন সকালে (বা প্রতি ২ ঘণ্টায়) এই কাজ হবে:
1. আজকের তারিখে যাদের reminder due
2. তাদের জন্য CRM call task/engagement তৈরি
3. task-এ “কেন কল” এবং “কোন প্রোডাক্ট সাজেস্ট” যুক্ত থাকবে

---

## 5) ১২ মাসে ১২ অফার (Annual Offer Calendar)
এখানে লক্ষ্য দুইটা:
- **Monthly predictable rhythm**: কাস্টমার জানবে “প্রতি মাসে নতুন অফার”
- **Lead generation**: নতুন লিড + পুরনো কাস্টমার reactivation

### 5.1 অফার ক্যালেন্ডার (Template)
| Month | Offer Theme | Target Segment | Primary KPI |
|---:|---|---|---|
| 1 | First Order 10% | New lead / first-time | First order conversion |
| 2 | Rice buyer → Spice discount | Repeat seed | Cross-sell rate |
| 3 | Oil combo offer | Active | AOV increase |
| 4 | Ramadan/Seasonal pack | All | Order volume |
| 5 | Referral bonus | Active + loyal | New leads |
| 6 | Membership card launch | Repeat | Membership adoption |
| 7 | New product trial | Active | Trial-to-repeat |
| 8 | Buy more save more | All | Basket size |
| 9 | Free delivery month | Warm/at-risk | Reactivation |
| 10 | Festival combo | All | Revenue |
| 11 | Loyal customer coupon | Loyal/VIP | Retention |
| 12 | Permanent customer card | Loyal/VIP | Upgrade rate |

> Note: এই ক্যালেন্ডার আপনার বাজার/সিজন অনুযায়ী কাস্টমাইজ হবে। ERP-তে আপনি এটাকে `marketing_campaigns`-এর scheduled campaigns হিসেবে রাখবেন।

### 5.2 Campaign Trigger Structure (Simple)
প্রতি ক্যাম্পেইনে:
- target_segment (CDM filters)
- channel (sms/whatsapp/email)
- message_template
- offer_code / coupon_rule
- start_date/end_date

---

## 6) New Product Marketing (Cross-sell / Upsell)
### 6.1 Cross-sell Map (Organic Grocery)
কিছু practical mapping:
- চাল → ডাল / তেল / মশলা
- তেল → মশলা / ঘি
- মশলা → ঘি / মধু
- মধু → হারবাল টি / ড্রাই ফ্রুট (যদি থাকে)

### 6.2 Rule-based Offer
Rules engine approach:

IF customer buys Category A
THEN after X days offer Category B

উদাহরণ:
- Trigger: Rice purchase
- After: 7 days
- Offer: Spice discount coupon
- Channel: WhatsApp

এটা `product_recommendation_rules` এবং `marketing_campaigns` দিয়ে implement করা যায়।

---

## 7) Membership + Coupon + Permanent Customer
### 7.1 Membership Levels (Suggested)
সাধারণত ৩ স্তর রাখলে সবচেয়ে সহজ:

**Silver**
- Criteria: 3 orders OR 5,000৳ spend
- Benefit: 5% discount + birthday coupon

**Gold**
- Criteria: 6 orders OR 12,000৳ spend
- Benefit: 7–10% discount + free delivery (selected days)

**Permanent**
- Criteria: 12+ orders OR 25,000৳ spend
- Benefit: lifetime discount + priority delivery + exclusive offer

### 7.2 Upgrade Automation
প্রতিদিন/প্রতি সপ্তাহে একটি job:
- customer.total_orders, customer.total_spend দেখে level upgrade
- upgrade হলে:
  - customer interaction log
  - notification / message
  - “card generation task” (manual/auto)

### 7.3 Coupon Strategy (Minimal but effective)
- Welcome coupon (first order)
- Repeat coupon (2nd/3rd order trigger)
- Win-back coupon (30/60/90 days inactive)
- Referral coupon

> Wallet/Cashback থাকলে coupon-এর সাথে wallet credit ব্যবহার করতে পারেন (docs এ wallet logic গাইড আছে)।

---

## 8) Team Management (CRM Role Based)
### 8.1 Team Roles
Recommended roles:
- **Admin**: config + reporting
- **Sales Manager**: pipeline owner, assigns tasks, weekly review
- **Tele-sales Agent**: daily calls + follow-up
- **Support**: issues/returns/complaints
- **Delivery Coordinator**: delivery exceptions

### 8.2 Auto Task Assignment
Daily task generation-এর সময় assign policy:
- District/City অনুযায়ী agent mapping
- VIP/HOT leads senior agent কে
- Workload balancing (agent per day capacity)

Task types:
- Reminder call task (consumption-based)
- Offer follow-up task (monthly campaign)
- Inactive win-back task
- Membership upgrade call

### 8.3 Agent Dashboard Must Show
- Today tasks count
- HOT/WARM/COLD split
- Pending vs completed
- Recommended product to push
- Script (short call script)

---

## 9) Operational Cadence (Daily / Weekly / Monthly)
### Daily (Auto)
- Generate reminder tasks
- Generate call priority list
- Trigger marketing automations
- Collect engagement events

### Weekly (Manager)
- Agent performance review
- Campaign performance review
- Update rules (recommendation + consumption profile)

### Monthly
- Launch new offer campaign
- New product trial plan
- Membership promotions

---

## 10) KPIs (What to measure)
### Customer KPIs
- Repeat purchase rate
- Days between orders (avg)
- Churn/at-risk %
- Lifetime value (LTV)

### Campaign KPIs
- Delivery rate (sms/whatsapp)
- Response rate
- Conversion rate
- Offer redemption rate

### Team KPIs
- Calls per agent/day
- Conversion per agent
- Follow-up completion %
- Revenue influenced by agent tasks

---

## 11) Message Templates (Bangla examples)
### Reminder (Rice)
“আসসালামু আলাইকুম, আপনার আগের চাল প্রায় শেষ হওয়ার কথা। আজ অর্ডার দিলে ডেলিভারি দ্রুত পাবেন। আপনি কি আবার ৫ কেজি নেবেন?”

### Cross-sell (Rice → Spice)
“আপনি চাল নিয়েছেন—এই সপ্তাহে মশলায় বিশেষ ছাড় চলছে। চাইলে ২/৩টা মশলা কম্বো সাজেস্ট করতে পারি।”

### Win-back (30 days inactive)
“আপনাকে অনেকদিন অর্ডারে পাইনি। ফিরে আসার জন্য এই কুপনটি ব্যবহার করুন: WELCOME_BACK”

### Membership Upgrade
“অভিনন্দন! আপনি Silver Member হয়েছেন—পরের অর্ডারে ৫% ছাড় পাবেন।”

---

## 12) Implementation Mapping (How it fits existing TrustCart modules)
এই রিপোর ডক অনুযায়ী যা আছে:

### CDM (Customer 360 + segmentation)
- Customer 360 view
- Interactions
- Behavior
- Drop-off
- Events (birthdays/anniversaries)

### CRM Automation
- Daily tasks generation
- Engagement tracking
- Recommendation rules
- Marketing campaigns
- Agent dashboard

আপনার নতুন প্রয়োজনগুলো বসবে মূলত:
1) **Consumption Profile config** (product/category → days)
2) **Reminder Task generator** (due reminders → CRM call tasks/engagement)
3) **Offer Calendar** (12 campaigns scheduled)
4) **Membership/Permanent upgrade rules** (customer_type/lifecycle stage update)

---

## 13) Rollout Plan (MVP → Mature)
### Phase A (MVP, 2–4 weeks)
- Consumption defaults per category
- Reminder tasks generate (call + sms/whatsapp)
- 3 মাসের অফার ক্যালেন্ডার চালু

### Phase B (Growth, 1–2 months)
- More accurate quantity-based consumption
- Stronger segmentation
- 12-month calendar fully scheduled

### Phase C (Mature)
- Continuous optimization via KPI
- AI recommendations tuned (success_rate)
- Multi-channel orchestration

---

## 14) Quick Checklist
- [ ] Product/category consumption defaults set
- [ ] Daily reminder job runs
- [ ] Monthly campaign schedule exists
- [ ] Recommendation rules defined
- [ ] Membership thresholds set
- [ ] Agent assignment policy configured
- [ ] KPI dashboards reviewed weekly

---

### Next step (আপনি সিদ্ধান্ত দিন)
আপনি চাইলে আমি এই ডকটাকে আপনার TrustCart-এর **বর্তমান CDM/CRM API endpoints** (যেমন `/cdm/customer360`, `/crm/automation/...`) অনুযায়ী একেবারে “endpoint-by-endpoint” অপারেশন গাইড হিসেবেও সাজিয়ে দিতে পারি (যেখানে কোন API দিয়ে কোন কাজ করবেন, কিভাবে campaign create করবেন, কিভাবে task generate হবে ইত্যাদি)।
