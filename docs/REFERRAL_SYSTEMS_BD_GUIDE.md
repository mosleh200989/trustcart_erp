# Referral Systems (Bangladesh Focus) — Detailed Guide + TrustCart Status

This document explains 12+ practical referral system ideas (Bangladesh-focused), gives example messages/scripts, and maps each idea to whether it is already implemented in this TrustCart ERP codebase.

The goal is to create multiple “small referral machines” that your team can consistently run across channels (WhatsApp, Facebook, call agents, delivery team, loyalty/wallet, etc.).

## 1) Quick definitions

### Referral system means
A referral system is:

- A **rule** (who qualifies, when reward is earned)
- A **tracking mechanism** (who invited whom)
- A **reward** (discount, wallet credit, points, product gift, VIP status)
- A **delivery workflow** (WhatsApp/SMS/app notification + admin reporting)
- Abuse prevention (duplicate accounts, self-referrals, fake orders)

### What “12+ systems” actually means
Not 12 separate complex projects.

It usually means:

- 1 shared tracking layer (codes, attribution, events)
- Different “front ends” for different channels and motivations
- Different rewards depending on segment and cost

## 2) What’s already in TrustCart (current codebase status)

This repo already contains a **baseline referral program** in the Loyalty module.

### Already implemented (backend)

- Referral entity/table: `customer_referrals`
  - Migration creates this table in [backend/membership-loyalty-migration.sql](../backend/membership-loyalty-migration.sql)
  - Entity: [backend/src/modules/loyalty/entities/customer-referral.entity.ts](../backend/src/modules/loyalty/entities/customer-referral.entity.ts)
- Referral APIs in Loyalty controller:
  - [backend/src/modules/loyalty/loyalty.controller.ts](../backend/src/modules/loyalty/loyalty.controller.ts)
  - Create referral, get referrals, get referral-code, mark complete, stats
- Wallet reward credit path exists:
  - DB trigger `credit_referral_reward()` in [backend/membership-loyalty-migration.sql](../backend/membership-loyalty-migration.sql)
  - Service fallback credits wallet idempotently in [backend/src/modules/loyalty/loyalty.service.ts](../backend/src/modules/loyalty/loyalty.service.ts)

### Already implemented (frontend)

- Frontend API wrapper for referrals exists in [frontend/src/services/api.ts](../frontend/src/services/api.ts)
- Admin loyalty dashboard references referral KPIs (completed referrals, average referrals, total rewards paid) in [frontend/src/pages/admin/loyalty/index.tsx](../frontend/src/pages/admin/loyalty/index.tsx)
- Customer portal has a dedicated “Refer & Earn” page with share UI (copy link + WhatsApp/Facebook/Email share) in [frontend/src/pages/customer/referrals.tsx](../frontend/src/pages/customer/referrals.tsx)
- Referral attribution capture exists for signup/checkout:
  - Local storage helper: [frontend/src/utils/referralAttribution.ts](../frontend/src/utils/referralAttribution.ts)
  - Signup pages capture `?ref=`: [frontend/src/pages/register.tsx](../frontend/src/pages/register.tsx), [frontend/src/pages/customer/register.tsx](../frontend/src/pages/customer/register.tsx)
  - Guest checkout attaches referral attribution when creating a customer: [frontend/src/pages/checkout.tsx](../frontend/src/pages/checkout.tsx)
  - Offline/QR landing route stores the code then redirects: [frontend/src/pages/r/[code].tsx](../frontend/src/pages/r/[code].tsx)

### Likely missing / incomplete (based on current code)

- Automatic completion is wired to the order lifecycle (completion on `delivered`), but “first-order only” enforcement is not fully guaranteed unless explicitly checked
- No channel-specific automation (WhatsApp/SMS sending, agent scripts, delivery team QR card tracking)
- Campaign/partner/event tables exist, but there is no complete campaign management UI (multiple reward types, limits, time windows, A/B tests)
- Fraud controls are still minimal (device/IP limits, duplicate account heuristics, review queues)

### Important note about your database
In your DB, `customers.id` is `integer` and `customers.uuid` is `uuid`.
Referral tables and `sales_orders.customer_id` are also `integer`.
Any referral implementation should stay consistent with this.

## 3) Core referral architecture (recommended)

To support all 12+ ideas, use one shared backbone.

### Minimal backbone (good starting point)

1. **Customer share code** (already exists)
   - Example: `REF000123` via `GET /api/loyalty/referral-code/:customerId`
2. **Referral record** (already exists)
   - Who referred + referred contact (email/phone) + status
3. **Reward ledger** (already exists)
   - Wallet credit transaction with idempotency
4. **Attribution points (implemented, basic)**
  - Where/how referral code was used (captured via customer attribution fields + referral event logs)
  - Which order qualified (captured in referral events)

### Added for scale (present in DB)

- `referral_campaigns` table (campaign definition) — added via SQL migration
- `referral_partners` table (partner/affiliate codes) — added via SQL migration
- `referral_events` table (audit log: invited, registered, first_order_paid, delivered, reward_credited) — added via SQL migration
- Migration file: [backend/migrations/2026-01-12_referral_backbone_and_automation.sql](../backend/migrations/2026-01-12_referral_backbone_and_automation.sql)
- Anti-abuse checks (phone/email uniqueness, device fingerprint, IP limits)

## 4) 12+ referral system ideas (Bangladesh-focused)

Each idea includes:

- What it is
- Example message/script (Bangla-friendly)
- TrustCart status
- How to implement cleanly

### 4.1 WhatsApp Referral

**What it is:** After delivery (or order completion), send the customer a WhatsApp message with a referral code/link.

**Example WhatsApp message:**

"আপনার অর্ডারটি কেমন লাগলো? এই কোডটি বন্ধুকে পাঠান: REF000123
বন্ধু প্রথম অর্ডার করলে আপনি ৫০ টাকা ওয়ালেট বোনাস পাবেন।"

**TrustCart status:** Partially implemented.

- Customer portal includes a “Share on WhatsApp” button (opens `wa.me` with a prefilled message)
- WhatsApp automation (WhatsApp Business API sending on delivery) is not implemented

**How to implement:**

- Backend
  - Create a messaging integration service (WhatsApp Business API provider)
  - Trigger send on `order delivered` status update
  - Message template includes referral code from `getShareReferralCode(customerId)`
- Frontend
  - Add “Share on WhatsApp” button in customer portal
  - Use `wa.me` URL + prefilled message
- Anti-abuse
  - Reward only after referred customer’s **first successful order** (paid + delivered)

### 4.2 Discount-Based Referral (both sides discount)

**What it is:** Both referrer and referred get a % discount.

**Example copy:**
"বন্ধু আনুন, দুজনেই ১০% ছাড়"

**TrustCart status:** Not implemented as a coupon/discount issuance tied to referral completion.

**How to implement:**

- Use Offers module to generate a single-use coupon for the referred customer
- Apply coupon only on first order and only if they are new
- Credit referrer reward after referred’s order is delivered

### 4.3 Wallet / Point Referral (CRM-based)

**What it is:** Reward is stored in wallet or points.

**TrustCart status:** Partially implemented.

- Wallet exists and referral credits are supported
- Points system exists too, but referral reward currently credits wallet (not points)

**How to improve:**

- Add campaign setting: reward type = wallet credit or points
- Ensure idempotency by storing a stable idempotency key per referral reward

### 4.4 Cash Reward Referral

**What it is:** "Refer 3 people = 100৳ cash".

**TrustCart status:** Not fully implemented as real cash-out. Wallet ledger exists.

**Implementation suggestion:**

- Keep reward in wallet by default (safer)
- If you enable cash-out:
  - Add withdrawal rules (KYC phone verification)
  - Add minimum balance threshold
  - Add fraud checks (same phone/device)

### 4.5 VIP / Loyalty Referral

**What it is:** Referrals unlock tier benefits.

**Example:**
"৫ জন রেফার করলে আপনি VIP — ফ্রি ডেলিভারি + early offers"

**TrustCart status:** Loyalty/membership exists, but referral-to-tier automation is not clearly wired.

**How to implement:**

- Create a rule: when `completed_referrals >= 5` then set membership tier or attach a VIP tag
- Use either:
  - Membership tier update logic, or
  - Tagging system (recommended for flexibility)

### 4.6 Product Bonus Referral

**What it is:** Reward is a free product on next order.

**Bangladesh-friendly example:**
"বন্ধু প্রথম অর্ডার করলে আপনার পরের অর্ডারে ১টা ফ্রি ডিম (১২ পিস)"

**TrustCart status:** Not implemented.

**How to implement:**

- Add `reward_type = free_product` + `reward_product_id` to referral campaign
- On reward trigger, create a cart/checkout credit line or an order item with 100% discount
- Only apply on next order to reduce fraud

### 4.7 Review → Referral System

**What it is:** Reviewers are encouraged to share their review + referral link.

**Example:**
"রিভিউ দেওয়ার জন্য ধন্যবাদ। এই লিংকটি বন্ধুকে পাঠান, সে অর্ডার করলে আপনি ওয়ালেট বোনাস পাবেন।"

**TrustCart status:** Reviews exist, but review-to-referral automation is not implemented.

**How to implement:**

- On review creation:
  - Generate or fetch share code
  - Show share CTA in UI
- Track channel = `review_share`

### 4.8 Agent / Call Referral

**What it is:** Call agent asks for referrals; agent logs leads.

**Agent script:**
"আপনার পরিচিত কেউ অর্গানিক বাজার করেন? নাম্বার দিলে আমরা তাকে ১০% ছাড় দেব, আর আপনিও বোনাস পাবেন।"

**TrustCart status:** CRM exists, but referral capture via call agent is not integrated.

**How to implement:**

- Add a CRM form that creates:
  - a `customer_referrals` record
  - a CRM task for follow-up
- Track attribution as `agent_referral` with agent user id

### 4.9 Community Referral (Facebook/WhatsApp Group)

**What it is:** Run a branded group; reward members for inviting new joiners who become customers.

**TrustCart status:** Not implemented.

**How to implement:**

- Use a “community campaign” referral code per group/admin
- Use UTM + referral code to attribute signups and orders

### 4.10 Influencer Micro-Referral

**What it is:** Small local pages/influencers get a unique code.

**TrustCart status:** Partially implemented.

- Partner/affiliate codes and partner records exist in the database (via referral backbone migration)
- Backend supports resolving partner codes for attribution
- Missing: partner dashboards, payouts, and reporting (orders/LTV by partner)

**How to implement:**

- Create “partner” records with codes like `NILOY10`
- Store code on order as `traffic_source`/`utm_source` plus referral attribution
- Reporting dashboard: orders and LTV by partner code

### 4.11 Offline Referral (Delivery Man Card)

**What it is:** Delivery person hands a printed card/QR.

**TrustCart status:** Implemented (basic).

- Landing page exists to capture referral code and persist it before signup: `/r/[code]`
- Signup/checkout uses stored referral attribution and sends it to the backend

**How to implement:**

- Generate printable QR that encodes `ref=REF000123`
- Landing page captures the code and stores it in localStorage
- On signup/checkout, attach the code

### 4.12 Contest Referral

**What it is:** Campaign-based referral contest (“tag 3 friends”, lucky draw).

**TrustCart status:** Not implemented.

**How to implement:**

- Campaign definition table + time window
- Referral event log for each qualifying action
- Draw winner from eligible participants

### 4.13 CRM Auto Referral (advanced)

**What it is:** Every customer automatically has a referral identity; attribution is tracked end-to-end.

**TrustCart status:** Partially implemented.

- Stable share code exists (`REF000123`)
- Referral records and wallet rewards exist

**Missing to make it “advanced”:**

- Full campaign management UI + multi-channel automation
- Fraud controls + reporting

## 5) How to make referrals actually work (practical implementation plan)

### Step 1: Decide the single source of truth for “successful referral”

Recommended definition:

- Referred customer is new (by phone/email)
- Their first order is paid (or COD delivered)
- Not canceled/refunded
- Reward credited once

### Step 2: Capture referral code at the right moments

Where to capture:

- Signup
- Checkout
- First order creation

Store:

- referral_code used
- referrer_customer_id (resolved server-side)
- channel (whatsapp, agent, influencer, offline)

### Step 3: Automate completion

Two good patterns:

1) Event-driven: when an order transitions to `delivered`, check if it is the referred customer’s first order and complete referral
2) Scheduled reconciliation: nightly job to find any missed completions and fix them

### Step 4: Anti-abuse (Bangladesh reality)

Common abuse patterns:

- Same phone used across multiple accounts
- One person creates multiple accounts to farm rewards
- COD orders placed then canceled

Defenses:

- Reward only after delivered
- Device/IP rate limits
- One reward per household phone
- Manual review queue for suspicious volume

## 6) My point of view (what to do first)

If you want fast ROI with low complexity:

1) WhatsApp share CTA + stable referral code
2) Wallet credit reward after delivered first order
3) Agent referral capture inside CRM
4) Influencer micro-referrals for local pages

Avoid early-stage mistakes:

- Paying “cash” too early (use wallet credit first)
- Rewarding before delivery (invite fraud)
- Making 12 systems without a single tracking backbone

## 7) References in this repo

- Referrals audit notes: [docs/ORDERS_SUPPORT_REFERRALS_NEXT_STEPS.md](ORDERS_SUPPORT_REFERRALS_NEXT_STEPS.md)
- Referral entity: [backend/src/modules/loyalty/entities/customer-referral.entity.ts](../backend/src/modules/loyalty/entities/customer-referral.entity.ts)
- Referral API controller: [backend/src/modules/loyalty/loyalty.controller.ts](../backend/src/modules/loyalty/loyalty.controller.ts)
- Referral logic: [backend/src/modules/loyalty/loyalty.service.ts](../backend/src/modules/loyalty/loyalty.service.ts)
- Frontend API wrapper: [frontend/src/services/api.ts](../frontend/src/services/api.ts)
