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
