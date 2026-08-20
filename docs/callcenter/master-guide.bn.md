# TrustCart CRM Call Center + Bracknet Integration — Master Guide (BN)

তারিখ: 2026-01-03

এই ডকুমেন্টটি আজ তৈরি হওয়া নিচের ৬টি ডককে একত্রে **একটি master guide** হিসেবে সাজিয়েছে—যাতে Team Ops, CRM+CDM pipeline, agent script/training, softphone UI এবং Bracknet PBX integration—সবকিছু এক জায়গায় থাকে।

## Included sources (আজকের ৬টি ফাইল)
1. `docs/agent-call-script.bn.md`
2. `docs/agent-training-roleplay.bn.md`
3. `docs/bracknet-crm-api.bn.md`
4. `docs/offer-pipeline-12-month.bn.md`
5. `docs/team-operations.bn.md`
6. `docs/webrtc-softphone.bn.md`

## Table of contents
- [Agent Call Script (BN)](#agent-call-script-bn)
- [Agent Training Role Play (BN)](#agent-training-role-play-bn)
- [Bracknet ↔ CRM API Contract + Implementation (BN)](#bracknet-crm-api-contract--implementation-bn)
- [CRM + CDM 12-Month Offer Pipeline (BN)](#crm--cdm-12-month-offer-pipeline-bn)
- [CRM Team Ops (Call Center) Implementation (BN)](#crm-team-ops-call-center-implementation-bn)
- [WebRTC Softphone UI Guide (BN)](#webrtc-softphone-ui-guide-bn)

---

<a id="agent-call-script-bn"></a>

# TrustCart – Agent Call Script (Bangla, Ready-to-use)

এই ডকুমেন্টটা এজেন্টরা সরাসরি পড়ে কল করতে পারবে—এমনভাবে লেখা।

## Placeholders (ফোনে বলার সময় যেগুলো বসবে)
- `[Customer Name]`
- `[Product Name]`
- `[Product + Quantity]`
- `[X]` = আনুমানিক ব্যবহার দিন (consumption cycle)
- `[Related Product]`

---

## Common Call Opening (সব কলের শুরুতে)
**Agent:**
1) আসসালামু আলাইকুম। আমি TrustCart Organic Grocery থেকে বলছি।
2) আমি কি **[Customer Name]** ভাই/আপু কথা বলছি?
3) (Yes হলে) ধন্যবাদ। ১ মিনিট সময় দিলে ভালো লাগবে।

---

## 1) New Customer (১ম অর্ডার)
**Goal:** Trust build + 2nd order

**Script:**
- আপনি সম্প্রতি আমাদের থেকে **[Product Name]** নিয়েছিলেন।
- জানতে চাইছিলাম—প্রোডাক্টের কোয়ালিটি কেমন লেগেছে?

(Positive response হলে)
- আলহামদুলিল্লাহ। আমরা আসলে খাঁটি অর্গানিক প্রোডাক্ট নিয়ে কাজ করি, যেন বাজারের ভেজাল থেকে পরিবারকে নিরাপদ রাখা যায়।

**Soft Offer:**
- আপনি যেহেতু নতুন কাস্টমার, আপনার জন্য একটা ছোট বিশেষ ছাড় চালু আছে। চাইলে আজই আবার অর্ডার করতে পারেন।

---

## 2) Second-Time Customer (২য় অর্ডার)
**Goal:** Habit build + reminder

**Script:**
- আপনি গতবার **[Product + Quantity]** নিয়েছিলেন। সাধারণত এই পরিমাণে প্রায় **[X] দিন** ব্যবহার হয়।
- তাই ভাবলাম সময়মতো মনে করিয়ে দেই, যেন হঠাৎ শেষ হয়ে না যায়।

**Cross-sell:**
- এই প্রোডাক্টের সাথে অনেক কাস্টমার **[Related Product]** নিচ্ছেন। চাইলে আপনাকে কম্বো অফার দিতে পারি।

---

## 3) Third-Time Customer (৩য় অর্ডার)
**Goal:** Loyalty entry + membership intro

**Script:**
- আপনি আমাদের নিয়মিত কাস্টমার হয়ে যাচ্ছেন, এজন্য আপনাকে ধন্যবাদ।
- আমরা এমন কাস্টমারদের জন্য Membership সুবিধা দেই।

**Benefit Explain:**
- মেম্বার হলে নিয়মিত ডিসকাউন্ট, বিশেষ অফার আর অগ্রাধিকার ডেলিভারি পাবেন।

**Close:**
- আজকের অর্ডারের সাথে এই সুবিধাটা নিতে চান?

---

## 4) Regular / Medium Customer
**Goal:** Upsell + combo

**Script:**
- আপনি নিয়মিত আমাদের থেকে কেনাকাটা করেন, এজন্য আমরা আপনাকে আলাদা করে গুরুত্ব দেই।
- বাজারে যেসব পণ্যে ভেজাল বেশি, আমরা সেগুলো নিয়েই বেশি কাজ করছি।

**Combo Offer:**
- এই মাসে আপনার জন্য একটা **Save More Combo** আছে। একসাথে নিলে খরচ কম পড়বে।

---

## 5) VIP / Permanent Customer
**Goal:** Retention + exclusivity

**Script:**
- আপনি আমাদের প্রিমিয়াম কাস্টমার, এজন্য ধন্যবাদ। এই অফারটা সাধারণ কাস্টমারের জন্য না।

**Exclusive Tone:**
- আপনার জন্য আমরা Early Access দিচ্ছি নতুন প্রোডাক্টে।

**Respectful Close:**
- আপনি চাইলে আজকেই অর্ডার কনফার্ম করে রাখছি।

---

## 6) Inactive / Lost Customer (Win-back)
**Goal:** Re-engage

**Script:**
- কিছুদিন ধরে আপনার কোনো অর্ডার পাইনি। ভাবলাম খোঁজ নিই—কোনো সমস্যা হয়েছিল কি?

**Empathy:**
- আমরা চাই আপনি ভালো সার্ভিস পান।

**Win-back Offer:**
- এই সপ্তাহে আপনার জন্য একটা **Comeback Discount** আছে। চাইলে আজকেই অর্ডার করতে পারেন।

---

## 7) Permanent Customer Declaration Call
**Goal:** Celebrate + retention lock-in

**Script:**
- অভিনন্দন! আপনি এখন TrustCart Permanent Customer।
- এর মানে আপনি আজীবন বিশেষ ছাড়, প্রাইওরিটি ডেলিভারি আর এক্সক্লুসিভ অফার পাবেন।
- আমরা আপনাকে শুধু কাস্টমার না, পরিবারের একজন মনে করি।

---

## Objection Handling (কমন আপত্তি)

### 1) “দাম বেশি”
**Agent:**
- বুঝতে পারছি। তবে আমরা ভেজালমুক্ত অর্গানিক দেই—লং টার্মে এটা আসলে সাশ্রয়ী।

### 2) “পরে নিব”
**Agent:**
- সমস্যা নেই। আমি আপনার জন্য রিমাইন্ডার সেট করে দিচ্ছি।

---

## Call Ending (সব কলের শেষে)
**Agent:**
- ধন্যবাদ আপনার সময় দেওয়ার জন্য।
- কোনো প্রশ্ন থাকলে যেকোনো সময় TrustCart-এ কল করতে পারেন।

---

<a id="agent-training-role-play-bn"></a>

# TrustCart – Agent Training Script (Role Play) (BN)

এই ফিচারটি TL (Trainer) এবং Agent-দের জন্য একটি **Role Play training module** — যাতে নতুন এজেন্ট ট্রেনিংয়ে Mock Call প্র্যাকটিস করা যায়, TL সহজে স্কিল গ্যাপ ধরতে পারে, এবং এজেন্টদের ভয়/জড়তা/ভুল কথা বলার প্রবণতা কমে।

## Feature status (Implementation)
এই Role Play স্ক্রিপ্টগুলো এখন **সিস্টেমের ভিতরে ইমপ্লিমেন্টেড**:
- Backend Team Leader Dashboard API তে `trainingRolePlays` নামে ডাটা আসে
- Frontend Team Dashboard UI তে “Agent Training (Role Play)” সেকশনে দেখায়

## কোথায় ইমপ্লিমেন্ট করা হয়েছে
- Backend: [backend/src/modules/crm/crm-team.service.ts](../../backend/src/modules/crm/crm-team.service.ts)
  - `getTeamLeaderDashboard()` রেসপন্সে `trainingRolePlays` যোগ করা হয়েছে
- Frontend: [frontend/src/pages/admin/crm/team-dashboard.tsx](../../frontend/src/pages/admin/crm/team-dashboard.tsx)
  - নতুন UI সেকশন যোগ করা হয়েছে

## API
- Endpoint: `GET /api/crm/team/dashboard`
- Response includes:
  - `trainingRolePlays.title`
  - `trainingRolePlays.rolePlays[]` (RP1–RP6)
  - `trainingRolePlays.commonMistakes[]`
  - `trainingRolePlays.goldenRules[]`

## UI
- Admin panel → CRM → Team Dashboard
- সেখানেই Role Play কার্ডগুলো দেখা যাবে

## Training Format (স্ট্যান্ডার্ড)
প্রতিটা Role Play-এ থাকবে:
- 🎭 Trainer (TL) = Customer হিসেবে কথা বলবে
- ☎️ Agent = এজেন্ট প্র্যাকটিস করবে
- 👤 Customer = TL যে কথাগুলো বলছে সেটাই Customer response

প্রতিটা স্ক্রিপ্টে:
- Training Goal
- Role Play Script (speaker + line)
- Training Notes (Do/Don’t)

## Role Plays (BN)

### 🟢 RP1: New Customer (1st Order)
**Goal:** চাপ না দেওয়া, Trust build, 2nd order-এর দরজা খোলা
- TL: “হ্যালো, কে বলছেন?”
- Agent: Opening + নাম কনফার্ম
- Agent: “কোয়ালিটি কেমন লেগেছে?”
- Agent: Soft ডিসকাউন্ট mention (চাপ না দিয়ে)

### 🟡 RP2: Second-Time Customer (Reminder)
**Goal:** Natural reminder + helpful tone
- “সময়মতো মনে করিয়ে দিচ্ছি” ফ্রেজ ব্যবহার
- Cross-sell/Combo mention

### 🟠 RP3: Third-Time Customer (Membership Intro)
**Goal:** Special feel + membership explain
- “আজ অর্ডারের জন্য চাপ দিচ্ছি না” → resistance কমায়

### 🔵 RP4: Regular/Medium (Upsell)
**Goal:** value-based selling
- price objection handle
- market badmouthing না করে purity/health value highlight

### ⭐ RP5: VIP/Permanent
**Goal:** respect + exclusivity
- কম কথা, বেশি সম্মান
- early access/priority framing

### 🔁 RP6: Inactive/Win-back
**Goal:** blame না, empathy
- “বিক্রির জন্য না” দিয়ে শুরু
- comeback discount offer

## Common Training Mistakes
- জোর করে অর্ডার নেওয়া
- বেশি কথা বলা
- দাম নিয়ে তর্ক
- “আজই শেষ” বলে ভয় দেখানো

## Golden Rules
- আগে সম্পর্ক, পরে বিক্রি
- কাস্টমারের সমস্যা বলাতে দাও
- নিজের মতামত চাপিও না
- CRM নোট অবশ্যই আপডেট করো

## TL কীভাবে ট্রেনিং চালাবে (Recommended)
- ১৫–২০ মিনিটে RP1 → RP6 দ্রুত run
- প্রতিটা role play শেষে TL ২টা ফিডব্যাক দেবে:
  - ১টা Strength
  - ১টা Improvement
- সপ্তাহে ২ দিন ১০ মিনিট objection handling drill

---

## Notes
এই ফিচারটি স্ক্রিপ্ট ডেটা + UI প্রদর্শন হিসেবে ইমপ্লিমেন্ট করা হয়েছে (এজেন্টরা dashboard থেকে দেখে role play করতে পারবে)। ভবিষ্যতে চাইলে training completion tracking (score/notes) যোগ করা যাবে।

---

<a id="bracknet-crm-api-contract--implementation-bn"></a>

# Bracknet IP PBX ↔ TrustCart CRM — API Contract (JSON) + Implementation Guide (BN)

তারিখ: 2026-01-03

এই ডকুমেন্টে ২টা জিনিস একসাথে আছে:
1) **Contract (JSON)** — Bracknet Team + Dev Team একই ভাষায় কথা বলবে
2) **TrustCart Implementation** — আমাদের backend-এ কোন endpoint আছে, কী কাজ করে, DB/CRM task কীভাবে আপডেট হয়

> গুরুত্বপূর্ণ: TrustCart backend-এ global prefix `/api` আছে। তাই এখানে লেখা webhook path গুলো বাস্তবে হবে `/api/webhook/...`.

---

## 1) CRM → Bracknet (Call Control APIs)

### 1.1 Click-to-Call (Outbound Call)
**Endpoint (TrustCart side / Contract-compatible)**
- `POST /api/call/start`

**Purpose**
- CRM থেকে agent → customer কল initiate করা

**Request JSON**
```json
{
  "agent_extension": "201",
  "agent_id": "A102",
  "customer_number": "017XXXXXXXX",
  "caller_id": "TrustCart",
  "call_type": "outbound",
  "crm_call_id": "CRM-CALL-987654"
}
```

**Behavior in TrustCart**
- `telephony_calls` টেবিলে একটি outbound row তৈরি হয়
- Bracknet API credentials না থাকলে **mock mode** response দেয় (যাতে UI/dev testing block না হয়)
- `crm_call_id` যদি numeric হয় (যেমন `"123"`) তাহলে সেটাকে CRM task id হিসেবে ধরে link করে

**Response JSON (Typical)**
```json
{
  "status": "success",
  "bracknet_call_id": "BN-CALL-456789",
  "message": "Call initiated",
  "telephonyCallId": 55
}
```

---

### 1.2 Hangup Call
**Endpoint**
- `POST /api/call/hangup`

**Request**
```json
{ "bracknet_call_id": "BN-CALL-456789" }
```

**Response**
```json
{ "status": "ended", "mode": "live" }
```

---

### 1.3 Transfer Call (Optional)
**Endpoint**
- `POST /api/call/transfer`

**Request**
```json
{
  "bracknet_call_id": "BN-CALL-456789",
  "transfer_extension": "301"
}
```

**Response**
```json
{ "status": "success", "mode": "live" }
```

---

## 2) Bracknet → CRM (Webhook Events)

TrustCart এ event-wise endpoints implement করা হয়েছে যাতে Bracknet team সহজে hook করতে পারে।

### 2.1 Incoming Call Event
**Endpoint (CRM side)**
- `POST /api/webhook/bracknet/incoming-call`

**Payload**
```json
{
  "event": "incoming_call",
  "from": "017XXXXXXXX",
  "to_extension": "201",
  "bracknet_call_id": "BN-CALL-111222",
  "timestamp": "2026-01-03T10:30:00Z"
}
```

**CRM Action (বর্তমান)**
- `telephony_calls` এ inbound record তৈরি হয়
- (Future) realtime screen-pop / websocket push

---

### 2.2 Call Answered
**Endpoint**
- `POST /api/webhook/bracknet/call-answered`

**Payload**
```json
{
  "event": "call_answered",
  "bracknet_call_id": "BN-CALL-456789",
  "agent_extension": "201",
  "timestamp": "2026-01-03T10:30:10Z"
}
```

**CRM Action**
- call status `answered`
- `answeredAt` সেট হয়

---

### 2.3 Call Ended
**Endpoint**
- `POST /api/webhook/bracknet/call-ended`

**Payload**
```json
{
  "event": "call_ended",
  "bracknet_call_id": "BN-CALL-456789",
  "duration": 135,
  "end_reason": "completed",
  "timestamp": "2026-01-03T10:32:25Z"
}
```

**CRM Action**
- call status `completed`
- duration সেট হয়
- যদি call টি কোনো CRM task এর সাথে linked থাকে, task notes এ telephony summary append হয়

---

### 2.4 Call Recording Ready
**Endpoint**
- `POST /api/webhook/bracknet/call-recording`

**Payload**
```json
{
  "event": "call_recording_ready",
  "bracknet_call_id": "BN-CALL-456789",
  "recording_url": "https://bracknet.com/records/BN-CALL-456789.mp3",
  "recording_duration": 135
}
```

**CRM Action**
- `telephony_calls.recording_url` সেভ হয়

---

### 2.5 Missed Call
**Endpoint**
- `POST /api/webhook/bracknet/call-missed`

**Payload**
```json
{
  "event": "call_missed",
  "from": "017XXXXXXXX",
  "to_extension": "201",
  "timestamp": "2026-01-03T11:05:00Z"
}
```

**CRM Action (Implemented)**
- CRM এ একটি `crm_call_tasks` pending task তৈরি হয় (reason: `missed_call`)
- Duplicate avoid করা হয় (একই customer+reason pending থাকলে নতুন তৈরি হয় না)

---

## 3) One-shot Webhook (Backward Compatible)
আগের endpoint এখনও আছে:
- `POST /api/telephony/webhook/bracknet`

যদি Bracknet team event-wise endpoints না করে এক endpoint-এ সব পাঠায়, এই generic receiver কাজ করবে।

---

## 4) DB Schema (Call Log)
Telephony call log টেবিল:
- `telephony_calls`

Core fields:
- `external_call_id` (Bracknet call id)
- `customer_phone`
- `agent_phone` (extension/store করা হয়)
- `status`, `answered_at`, `ended_at`, `duration_seconds`, `recording_url`
- `meta` (raw payload/debug)

---

## 5) Security Rules (Recommended)
বর্তমান implementation ন্যূনতম নিরাপদ রাখা হয়েছে, কিন্তু production-এর জন্য strongly recommend:
- HTTPS only
- Bracknet → CRM webhook IP allowlist
- Webhook signature verification (HMAC-SHA256)
- Replay protection via timestamp/nonce

> Signature scheme Bracknet spec অনুযায়ী finalize করতে হবে, এরপর backend-এ strict verify যোগ করা হবে।

---

## 6) Bracknet Config (ENV)
Backend env vars:
- `TELEPHONY_PROVIDER=bracknet`
- `BRACKNET_API_BASE_URL=...`
- `BRACKNET_API_KEY=...`
- `BRACKNET_WEBHOOK_SECRET=...` (future signature verify)

Mock mode behavior:
- baseUrl/apiKey না থাকলে call control endpoints successful response দেয় কিন্তু external call initiate করে না

---

## 7) Implementation Notes (TrustCart Code)
Backend files:
- `backend/src/modules/telephony/telephony.service.ts`
  - `bracknetStartCall()`
  - `bracknetHangup()`
  - `bracknetTransfer()`
  - `handleBracknetEvent()`
- `backend/src/modules/telephony/bracknet-contract.controller.ts`
  - `/api/call/*`
  - `/api/webhook/bracknet/*`

---

## 8) Quick Testing (Curl)

### Start call
```bash
curl -X POST "http://localhost:3000/api/call/start" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"agent_extension":"201","agent_id":"A102","customer_number":"01700000000","caller_id":"TrustCart","call_type":"outbound","crm_call_id":"CRM-CALL-987654"}'
```

### Webhook call ended
```bash
curl -X POST "http://localhost:3000/api/webhook/bracknet/call-ended" \
  -H "Content-Type: application/json" \
  -d '{"event":"call_ended","bracknet_call_id":"BN-CALL-456789","duration":135,"end_reason":"completed"}'
```

---

## 9) Next Improvements (If you want)
- Webhook → WebSocket push: Agent UI তে realtime ringing/connected/ended
- Incoming call screen-pop: phone number match করে customer profile open
- Recording playback button in UI
- Signature verification finalize

---

<a id="crm--cdm-12-month-offer-pipeline-bn"></a>

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

---

<a id="crm-team-ops-call-center-implementation-bn"></a>

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

---

<a id="webrtc-softphone-ui-guide-bn"></a>

# TrustCart CRM — WebRTC Softphone UI (Agent) — Detailed Guide (BN)

তারিখ: 2026-01-03

## 0) এই ফিচারটা কী?
এই ফিচারটি TrustCart CRM-এর **Agent Dashboard**-এ একটি **Web Softphone UI** যুক্ত করে, যাতে এজেন্ট:

- কাস্টমার কল করার সময় একই স্ক্রিনে **Customer Info + Call Control + AI Script + Notes/Outcome** দেখতে পারে
- **Click-to-Call** দিয়ে CRM Task থেকে কল initiate করতে পারে
- কল শেষে **Outcome/Notes বাধ্যতামূলকভাবে** দিয়ে Task complete করতে পারে

> নোট: বর্তমান ইমপ্লিমেন্টেশনটি UI/UX + Backend Initiate Call-এর সাথে ইন্টিগ্রেটেড।
> প্রকৃত WebRTC/SIP calling (SIP.js) ভবিষ্যৎ ধাপে যোগ করা হবে (এই গাইডের শেষ অংশে “Future: Real WebRTC (SIP.js)” দেখুন)।

---

## 1) কোথায় আছে (Files)

### Frontend
- Agent Dashboard page: `frontend/src/pages/admin/crm/agent-dashboard.tsx`
  - এখানে “Customer Call” modal আপগ্রেড করে 3-panel Softphone UI করা হয়েছে

### Backend (আগেই যোগ করা ছিল)
- Telephony initiation endpoint:
  - `POST /api/telephony/calls/initiate`
- AI-style suggested script endpoint:
  - `GET /api/crm/automation/call-tasks/:taskId/suggested-script`

---

## 2) UX Layout (যেটা আপনি চেয়েছেন)

Agent call modal এখন এইভাবে কাজ করে:

### (A) Top Bar (Always Visible)
Top bar এ থাকে:
- Agent Status: `Online / On Call / Break`
- Mic status: `unknown / granted / denied`
- Call Timer (UI timer)

**Break** থাকলে “Call” button disabled থাকে (Zero confusion)।

### (B) 3-Column Main Layout
#### 1) Customer Info Panel (Left)
Auto screen-pop তথ্য:
- Name, Phone, Orders, LTV, Last purchase days
- Segment label (simple derived): `New-1 / Repeat-2 / Repeat-3 / Regular / Permanent`
- VIP badge (simple derived)
- AI Alert (simple rules): inactive, high AOV, new customer ইত্যাদি
- Recommended Products list (existing recommendations endpoint থেকে)

#### 2) Softphone Panel (Center)
- Dial input (auto-filled customer phone)
- Dial pad (0–9, *, #)
- Primary actions:
  - `Call` (initiate)
  - `Hangup` (UI end)
- Secondary controls (UI toggles): `Mute / Hold / Record`

> এগুলো এখন UI-state হিসেবে আছে। বাস্তব PBX control (mute/hold/record) future integration এ provider/WebRTC এর মাধ্যমে হবে।

#### 3) AI Script Panel (Right)
- Backend থেকে suggested script লোড হয় (task-based)
- Sections:
  - Script title + goal
  - Opening lines
  - Main lines
  - Objection helper
  - Closing lines

### (C) Bottom Panel — Notes & Outcome
- Outcome radio (required): Ordered / Follow-up / Not Interested / Price Issue / No Response
- Notes textarea
- Follow-up datetime (শুধু outcome=Follow-up হলে)

**Outcome না দিলে Complete Task button disabled থাকে** (spec অনুযায়ী mandatory)।

---

## 3) User Flow (Agent)

1) Agent dashboard থেকে `Call` চাপলে
   - CRM task `in_progress` হয়
   - Customer intelligence + recommendations load হয়
   - Suggested script load হয়
   - Softphone modal open হয়

2) Softphone modal এ `Call` চাপলে
   - Backend এ `POST /api/telephony/calls/initiate` কল হয়
   - Response এ mock/live mode দেখা যায়

3) Agent কল শেষ করে outcome + notes দেয়
   - `Complete Task` চাপলে CRM task `completed` হয়

---

## 4) API Contracts (Frontend কীভাবে কল করে)

### 4.1 Suggested Script
**Request**
- `GET /api/crm/automation/call-tasks/:taskId/suggested-script`

**Response (example shape)**
```json
{
  "taskId": 123,
  "scriptKey": "winBack",
  "opening": ["..."],
  "main": { "title": "...", "goal": "...", "lines": ["..."] },
  "objectionHandling": [{"objection":"...","reply":"..."}],
  "ending": ["..."],
  "context": {"callReason":"...","customerIntel":{},"recommendations":[]}
}
```

### 4.2 Click-to-Call (Telephony Initiate)
**Request**
- `POST /api/telephony/calls/initiate`

Body:
```json
{
  "taskId": 123,
  "agentUserId": 1
}
```

**Response**
- Live mode (provider configured)
```json
{ "telephonyCallId": 55, "provider": "bracknet", "externalCallId": "abc123", "mode": "live" }
```
- Mock mode (provider creds missing)
```json
{ "telephonyCallId": 55, "provider": "bracknet", "mode": "mock", "message": "..." }
```

---

## 5) Configuration (Telephony/Bracknet)
Backend environment variables (আগের telephony module অনুযায়ী):

- `TELEPHONY_PROVIDER=bracknet`
- `BRACKNET_API_BASE_URL=...`
- `BRACKNET_API_KEY=...`
- `BRACKNET_WEBHOOK_SECRET=...` (optional)

> যদি `BRACKNET_API_BASE_URL` / `BRACKNET_API_KEY` না থাকে, initiate endpoint mock mode রিটার্ন করবে (UI তে “mock mode” দেখাবে)।

---

## 6) Security Notes
- Suggested script endpoint JWT guard দিয়ে protected (internal agent use)
- Telephony initiate endpointও auth protected হওয়া উচিত (backend controller এ guard থাকলে)
- Webhook endpoint (provider → CRM) future hardening:
  - signature verification
  - IP allowlist
  - request replay protection

---

## 7) TL Live Monitor (এই UI তে কী আছে/কি নেই)
এই কাজের scope অনুযায়ী **Agent softphone UI** implemented হয়েছে।
TL লাইভ মনিটর UI (Live listen/whisper/force break) এই ডেলিভারেবল-এ যোগ করা হয়নি, কারণ আপনার অনুরোধ ছিল “WebRTC softphone UI design” + implement that feature only.

---

## 8) Future: Real WebRTC Softphone (SIP.js) — How to extend
এখনকার UI টি intentionally provider-agnostic। পরের ধাপে WebRTC/SIP.js যোগ করতে চাইলে:

1) Install SIP.js in frontend
   - `npm i sip.js`
2) Add a small “Softphone engine” wrapper
   - create `frontend/src/services/softphone/`
   - manage:
     - `getUserMedia` audio stream
     - SIP registration
     - outgoing call invite
     - events → update UI state (`ringing/connected/ended`)
3) Replace current `handleInitiateCall()` behavior
   - option A: keep backend initiate as “logging + PBX bridge” and use SIP.js only for media
   - option B: use SIP.js fully, and backend only stores call logs + webhook
4) Add WebSocket / webhook-based realtime status
   - connect telephony status updates to UI so `callStatus` becomes real-time (not optimistic)

---

## 9) Quick Test Checklist
- Agent Dashboard এ task থেকে `Call` → modal open হয়
- Left panel এ customer data + recommendations আসে
- Right panel এ suggested script আসে
- Center panel এ `Call` চাপলে telephony initiate hits
- Outcome না দিলে Complete disabled থাকে
- Outcome + notes দিয়ে Complete করলে task completed হয়

---

## 10) Known Limitations (বর্তমান implementation)
- UI call timer বাস্তব call duration নয় (realtime events যোগ করলে ঠিক হবে)
- Mute/Hold/Record এখন UI toggles; PBX/WebRTC control later
- Dial input change করলে এখনো backend এ customer phone override পাঠানো হয় না (taskId-based flow)

---

## 11) Summary
এই ফিচারটি Agent workflow কে “single-screen calling” করে দিয়েছে:
- Customer Info + AI Script + Call Control + Outcome/Notes
- Click-to-call integration via backend telephony module

পরবর্তী ধাপে চাইলে আমি:
- realtime call status (webhook→ws)
- SIP.js based real WebRTC calling engine
- TL live monitor view
যোগ করে দিতে পারি।
