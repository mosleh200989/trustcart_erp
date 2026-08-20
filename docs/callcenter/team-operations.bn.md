# TrustCart CRM Team Ops (Call Center) — Implementation (BN)

এই ডকুমেন্টটা Team Structure → Customer Segmentation → Call Allocation → Customer Journey → Marketing Script Style — এগুলো **TrustCart ERP কোডবেসে যেভাবে ইমপ্লিমেন্ট করা হলো** সেটা ব্যাখ্যা করে।

## 1) Team Structure (TL → 5 Teams A–E)

### TL (Team Leader)
- TL হলো অপারেশনাল ওনার: টিম গঠন, এজেন্ট অ্যাসাইন, দৈনিক কল প্ল্যান জেনারেট, KPI মনিটর।
- কোডে TL হিসেবে ইউজারের `users.team_leader_id` সম্পর্ক ব্যবহার করা হয়।

### 5 Teams (A–E)
এই ইমপ্লিমেন্টেশনে **CRM Team** ফিচারের `SalesTeam.code` ফিল্ডকে Team Code হিসেবে ব্যবহার করা হয়েছে:
- `A` = New Customers (1st order)
- `B` = Repeat-2
- `C` = Repeat-3
- `D` = Regular / Medium / Normal
- `E` = VIP / Permanent

Admin UI থেকে TL নিজের টিম তৈরি করে `code` সেট করতে পারে, এরপর এজেন্টদের ওই টিমে অ্যাসাইন করে।

## 2) Customer Segmentation (Purchase Stage + Value Stage)

### Purchase Stage (অর্ডার কাউন্ট থেকে)
ইমপ্লিমেন্টেড রুল:
- `new`: 1 বা কম অর্ডার
- `repeat_2`: 2 অর্ডার
- `repeat_3`: 3 অর্ডার
- `regular`: 4–7 অর্ডার
- `permanent`: 8+ অর্ডার

### Value Stage (Spend/AOV থেকে)
ডিফল্ট থ্রেশহোল্ড (পরবর্তীতে টিউন করা যাবে):
- `vip`: Total Spend ≥ 20000 অথবা Avg Order Value ≥ 3000
- `medium`: Total Spend ≥ 8000 অথবা Avg Order Value ≥ 1500
- `normal`: বাকিগুলো

### Segment = Purchase Stage + Value Stage
উদাহরণ:
- `repeat_3 + medium`
- `regular + normal`
- `permanent + vip`

## 3) Auto Call Allocation (Max 200 calls/day/agent)

### Daily quotas (recommended split)
ইমপ্লিমেন্টেড ডিফল্ট quota:
- `120` = Product Reminder
- `50` = Offer / Cross-sell
- `30` = Follow-up / Support

### Routing rule (Team mapping)
- VIP বা Permanent → `Team E`
- New → `Team A`
- Repeat-2 → `Team B`
- Repeat-3 → `Team C`
- Regular/others → `Team D`

### Idempotency (একই দিনে ডুপ্লিকেট না হয়)
একই দিনে একই customer+reason থাকলে নতুন করে টাস্ক তৈরি হবে না।

### Where tasks are created
কল-টাস্ক তৈরি হয় `crm_call_tasks` টেবিলে (CRM Automation subsystem)।

## 4) TL Dashboard Metrics
TL Dashboard এখন placeholder না—এগুলো দেখায়:
- Total Customers (TL coverage)
- Repeat Rate (%)
- VIP/Permanent Active (last 30 days)
- Pending tasks from previous days
- Segmentation counts (Purchase Stage + Value Stage)
- Agent-wise calls today (total/completed/failed)

## 5) Marketing & Convincing Script Style
ইমপ্লিমেন্টেশনে TL Dashboard-এ **script playbook** দেখানো হয়:
- Team A: Friendly + Educative + No pressure
- Team B: Solution based + Consumption reminder
- Team C: Benefit driven + Membership intro
- Team D: Value comparison + Combo offer
- Team E: Respectful + Exclusive
- Universal: AIDA flow (Opener → Reminder → Problem → Offer → Soft close)

## 6) কীভাবে ব্যবহার করবেন (Admin)

### A) টিম তৈরি ও এজেন্ট অ্যাসাইন
1) Admin panel → CRM → Teams
2) ৫টি টিম তৈরি করুন এবং `code` দিন: `A`, `B`, `C`, `D`, `E`
3) এজেন্টদের টিমে অ্যাসাইন করুন

### B) Daily Auto Calls Generate
- Admin panel → CRM → Team Dashboard
- ক্লিক: **Generate Today's Auto Calls**

Backend endpoint:
- `POST /api/crm/team/ops/generate-calls`

Body (optional):
```json
{
  "date": "2026-01-03",
  "perAgentLimit": 200,
  "reminderQuota": 120,
  "offerQuota": 50,
  "followupQuota": 30
}
```

## 7) Notes / Assumptions
- Sales analytics (order count/spend) ফোন নম্বর (`customer_phone`) ভিত্তিক করা হয়েছে যাতে বিভিন্ন DB schema mismatch হলেও segmentation কাজ করে।
- Team coverage গণনা হয়: `customers.assigned_supervisor_id = TL` অথবা customer-এর `assigned_to` এ এমন agent যার `teamLeaderId = TL`.

---

## Reference
- Backend: `backend/src/modules/crm/crm-team.service.ts`
- Backend: `backend/src/modules/crm/crm-team.controller.ts`
- Frontend: `frontend/src/pages/admin/crm/team-dashboard.tsx`
