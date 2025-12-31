# Wallet Section — Current Logic & Implementable Features (TrustCart ERP)

তারিখ: 2025-12-31

এই ডকুমেন্টটি TrustCart ERP-র **Customer Wallet** সেকশনে বর্তমানে কীভাবে কাজ হচ্ছে (Backend + Frontend + DB) তা পরিষ্কারভাবে ব্যাখ্যা করে এবং ERP-তে বাস্তবসম্মতভাবে আর কী কী ফিচার যোগ করা যায়—সেগুলো implementation-ready আকারে তালিকা করে।

> লক্ষ্য: বড় সুপারশপ/রিটেইল ERP প্রেক্ষিতে **Purchase → Points → Wallet → Referral** হিসাব “লজিক্যাল অর্ডার” এবং “ডাটা মডেল” বুঝে ইমপ্লিমেন্ট করা।

---

## 1) Important Concept

### 1.1 Point ≠ Wallet
- **Point (Loyalty Point)**: প্রোমোশন/মোটিভেশন-ভিত্তিক ইউনিট (সাধারণত non-cash), রিডিম রুল থাকে, expiry থাকতে পারে।
- **Wallet (Money Balance)**: বাস্তব টাকা/ক্রেডিট ব্যালান্স (৳), refund/cashback/referral bonus ইত্যাদি থেকে আসে; purchase-এ partial payment হিসেবে ব্যবহার করা যায়।

বর্তমান কোডে **Wallet আছে**, কিন্তু **Points ledger/earn/redeem** এখনো আলাদা টেবিল/সার্ভিস হিসেবে implement করা নেই (Frontend header-এ “Wallet & Points” লেখা থাকলেও UI/logic মূলত wallet-এ সীমিত)।

---

## 2) Current Backend Implementation (What exists now)

### 2.1 Module
- Loyalty module এর মধ্যে wallet/referral/membership/grocery-list/price-lock আছে।
- Wallet সম্পর্কিত endpoint গুলো: `loyalty.controller.ts` + `loyalty.service.ts`

### 2.2 Wallet APIs (Current)
Base route: `/loyalty`

1) **Get wallet summary**
- `GET /loyalty/wallet/:customerId`
- সার্ভিস: `getCustomerWallet(customerIdOrUuid)`
- Behavior:
  - Wallet না থাকলে auto-create করে (balance = 0)

2) **Credit wallet**
- `POST /loyalty/wallet/:customerId/credit`
- Body:
  - `amount: number`
  - `source: string` (code-level union: `'referral' | 'bonus' | 'refund' | 'purchase' | 'withdrawal'`)
  - `description?: string`
  - `referenceId?: number`
- Behavior:
  - Wallet balance += amount
  - totalEarned += amount
  - Transaction log insert হয়

3) **Debit wallet**
- `POST /loyalty/wallet/:customerId/debit`
- Body:
  - `amount: number`
  - `source: string`
  - `description?: string`
- Behavior:
  - Insufficient balance হলে error
  - Wallet balance -= amount
  - totalSpent += amount
  - Transaction log insert হয়

4) **Get recent transactions**
- `GET /loyalty/wallet/:customerId/transactions?limit=50`
- Default limit: 50
- Order: newest first

### 2.3 Customer Identifier Handling (Legacy INT + UUID)
Backend এ `resolveCustomerSelector(customerIdOrUuid)` আছে:
- যদি param UUID ফরম্যাট হয় → selector.kind = `uuid` → query by `customer_uuid`
- নাহলে integer হিসেবে parse করে → selector.kind = `legacy-int` → query by `customer_id`

অর্থাৎ backend ডিজাইন করা হয়েছে যেন **একই endpoint**-এ legacy numeric customer_id এবং portal UUID—দুইটাই কাজ করে।

> বাস্তবে কাজ করতে হলে DB টেবিলে `customer_uuid` কলাম থাকতে হবে।

---

## 3) Current Database Model (What exists / what is expected)

### 3.1 Tables
Wallet-এ ২টা টেবিল গুরুত্বপূর্ণ:
- `customer_wallets`
- `wallet_transactions`

TypeORM entities:
- CustomerWallet entity
  - `customer_id` (nullable)
  - `customer_uuid` (nullable, uuid)
  - `balance`, `total_earned`, `total_spent`, timestamps
- WalletTransaction entity
  - `wallet_id`
  - `customer_id` (nullable)
  - `customer_uuid` (nullable, uuid)
  - `transaction_type` (`credit`/`debit`)
  - `amount`, `source`, `reference_id`, `description`, `balance_after`, `created_at`

### 3.2 Migration (UUID wallet support)
যদি আপনার DB তে `customer_uuid` না থাকে তাহলে এই error হয়:
- `column CustomerWallet.customer_uuid does not exist`

Fix migration:
- `backend/loyalty-wallet-uuid-migration.sql`
- What it does:
  - `customer_wallets.customer_uuid` যোগ করে
  - `wallet_transactions.customer_uuid` যোগ করে
  - legacy `customer_id` কে nullable করে
  - partial unique indexes যোগ করে (customer_id/customer_uuid দুদিকেই)

---

## 4) Current Frontend Wallet Page (What exists now)

File: `frontend/src/pages/customer/wallet.tsx`

### 4.1 Flow
- On mount:
  1) `auth.getCurrentUser()`
  2) `loyalty.getWallet(user.id)`
  3) `loyalty.getWalletTransactions(user.id, 20)`

### 4.2 Data shown
- Wallet balance
- total earned
- total spent
- Recent transactions table (date/type/amount/source)

### 4.3 Current limitation
- Frontend `user.id` যদি UUID হয়, backend UUID support on থাকলেও DB migration না থাকলে 500 হবে।
- Points UI/logic নেই (শুধু heading-এ “Wallet & Points”)।

---

## 5) Purchase + Wallet + Points + Referral — Recommended Calculation Order (ERP Best Practice)

Checkout/Invoice finalize করার সময় হিসাবের order সাধারণত এমন হওয়া উচিত:

1) **Subtotal** (items total)
2) **Discount/Offer/Coupon**
3) **VAT/Tax** (আপনার policy অনুযায়ী)
4) **Point Redeem** (যদি allow থাকে)
5) **Wallet Deduction** (partial payment)
6) **Final Payable** (cash/card/online)
7) **Earn new points / cashback** (post-payment rule)

> Wallet debit সাধারণত “payment confirmation” এর পরই করা উচিত (বা pending hold → capture pattern)।

---

## 6) Referral Logic (What exists + what to implement)

### 6.1 Current backend referral state
- Referral create/mark-complete/stats API আছে।
- `markReferralComplete()` এ comment আছে: “Credit will be handled by database trigger”
  - অর্থাৎ referral complete হলে wallet credit DB trigger/SQL function দিয়ে দেওয়া হবে—এটা DB migration/trigger অংশে থাকা লাগবে।

### 6.2 Recommended referral reward rules (implementable)
Referral reward বাস্তবে safe রাখতে:
- Trigger: referee-এর **first paid order** (বা first delivered order)
- Min purchase amount: যেমন ৳500
- Return/cancel window passed: যেমন 7 দিন
- One-time per referee
- Fraud checks: same phone/email/device? suspicious patterns?

Wallet credit entries:
- Referrer: credit (source = `referral`, reference_id = referral_id বা order_id)
- Referee: credit (source = `referral`, reference_id = referral_id)

---

## 7) Features You Can Implement Next (Wallet Section)

নীচের ফিচারগুলো সুপারশপ ERP-তে “বাস্তবে লাগে” এবং এই প্রজেক্টের বর্তমান ডাটা মডেল/এন্ডপয়েন্টের সাথে স্বাভাবিকভাবে fit করে।

### 7.1 Wallet Ledger Hardening (Accounting-grade)
1) **Idempotency**
- একই event (refund/job retry) দুইবার আসলে double-credit/debit যেন না হয়।
- Solution: `wallet_transactions` এ `external_reference`/`idempotency_key` যোগ করে unique constraint।

2) **Atomic balance update**
- Race condition এ balance ভুল হতে পারে।
- Solution: DB transaction + row lock (`SELECT ... FOR UPDATE`) বা atomic update pattern।

3) **Decimal handling policy**
- Wallet amounts decimal(10,2) — JS number rounding এ সতর্ক থাকতে হবে।
- Solution: backend-এ amount validation + consistent rounding (2 decimals)।

### 7.2 Holds / Pending Transactions (Real payment flow)
- Use-case: order place করা হলো, payment confirm হয়নি—wallet থেকে তখনই কাটবেন?
- Best practice:
  - `hold` (pending debit)
  - payment success হলে `capture` (final debit)
  - cancel হলে `release`

Schema idea:
- `wallet_transactions.status`: pending/posted/reversed
- `wallet_holds` টেবিল (optional)

### 7.3 Refund Integration
- Refund হলে wallet credit (source=`refund`, reference_id=order_id)
- Partial refund support
- Audit trail mandatory

### 7.4 Wallet Usage Rules (ERP settings)
Configurable policies:
- Wallet দিয়ে VAT pay করা যাবে কি না
- Max wallet usage per order: যেমন 20% বা ৳X
- Min wallet usage threshold
- Wallet usable categories/brands restrictions

### 7.5 Admin Operations
- Manual credit/debit (with reason + approver)
- Statement export (date range)
- Customer wallet adjustment logs

### 7.6 Customer Experience (Frontend)
- Pagination / load more transactions
- Transaction details view (referenceId link to invoice/referral)
- Better error surfaces (show server message)

---

## 8) Features You Can Implement Next (Points System) — aligned with Wallet

Points system implement করতে চাইলে wallet-এর মতোই ledger-based করতে হবে।

### 8.1 Core tables
- `customer_points` (summary)
- `point_transactions` (ledger)
  - source: purchase/referral/adjustment
  - reference_id: invoice_id/referral_id
  - points: +/-
  - expiry_date
  - status

### 8.2 Earn formula (configurable)
- `earned_points = floor(payable_amount / conversion_rate)`
- VAT include/exclude policy

### 8.3 Redeem rules
- 1 point = ৳1 (বা configurable)
- min redeem
- max redeem (bill percentage)
- redeem allowed product/category rules

> Points redeem করলে invoice-এ discount হিসেবে apply করুন; wallet debit হলে payment হিসেবে treat করুন।

---

## 9) Example API Payloads

### 9.1 Credit wallet
`POST /loyalty/wallet/67/credit`
```json
{
  "amount": 100,
  "source": "referral",
  "description": "Referral bonus",
  "referenceId": 123
}
```

### 9.2 Debit wallet
`POST /loyalty/wallet/67/debit`
```json
{
  "amount": 50,
  "source": "purchase",
  "description": "Used in checkout"
}
```

---

## 10) Operational Notes (Common pitfalls)

- DB migration না হলে UUID customer wallet endpoint 500 দিতে পারে।
- Wallet credit/debit always needs auditability: who/what/why/reference.
- Referral reward “first order complete” rule না দিলে fraud/abuse বাড়ে।

---

## 11) Next Implementation Checklist (Recommended)

1) Run `backend/loyalty-wallet-uuid-migration.sql`
2) Add idempotency key for wallet transactions
3) Add transactional balance update (race-safe)
4) Add refund + referral triggers with clear reference IDs
5) Implement points ledger (separate from wallet)

