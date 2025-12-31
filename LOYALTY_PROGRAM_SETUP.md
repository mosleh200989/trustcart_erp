# 🥇 Customer Membership & Loyalty Program Setup Guide

## ✅ What's Completed

### 1. Database Schema (✅ Ready to Execute)
- **File**: `backend/membership-loyalty-migration.sql`
- **Contains**:
  - 9 tables (memberships, wallet, referrals, grocery lists, price locks, gifts, reminders)
  - 2 views (KPI metrics, member benefits summary)
  - 3 automation functions (tier upgrade, referral rewards, repeat reminders)

### 2. Backend API (✅ Complete)
- **Entities**: 7 TypeScript classes in `backend/src/modules/loyalty/entities/`
- **Service**: `loyalty.service.ts` (350+ lines, 30+ methods)
- **Controller**: `loyalty.controller.ts` (25+ REST endpoints)
- **Module**: Registered in `app.module.ts`

### 3. Frontend Pages (✅ Complete)
- **KPI Dashboard**: `/admin/loyalty/index.tsx` - Shows all metrics
- **Member Dashboard**: `/admin/loyalty/member/[customerId].tsx` - Individual customer view

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

**Option A: Using Docker (Recommended)**
```powershell
cd c:\xampp\htdocs\trustcart_erp
docker-compose up -d
docker cp backend/membership-loyalty-migration.sql trustcart_erp_db_1:/tmp/
docker exec -i trustcart_erp_db_1 psql -U postgres -d trustcart_erp -f /tmp/membership-loyalty-migration.sql
```

**Option B: Using psql Directly**
```powershell
cd c:\xampp\htdocs\trustcart_erp\backend
psql -U postgres -d trustcart_erp -f membership-loyalty-migration.sql
```

**Option C: Using pgAdmin**
1. Open pgAdmin
2. Connect to `trustcart_erp` database
3. Open Query Tool
4. Load `backend/membership-loyalty-migration.sql`
5. Execute (F5)

### Step 2: Verify Tables Created

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'customer_%'
  OR table_name IN ('monthly_grocery_lists', 'grocery_list_items', 'price_locks', 'repeat_order_reminders');

-- Should return 9 tables:
-- ✅ customer_memberships
-- ✅ customer_wallets
-- ✅ wallet_transactions
-- ✅ customer_referrals
-- ✅ monthly_grocery_lists
-- ✅ grocery_list_items
-- ✅ price_locks
-- ✅ repeat_order_reminders
-- ✅ customer_gifts
```

### Step 3: Start Backend Server

```powershell
cd c:\xampp\htdocs\trustcart_erp\backend
npm install
npm run start:dev
```

Backend will start at: http://localhost:3001

### Step 4: Start Frontend

```powershell
cd c:\xampp\htdocs\trustcart_erp\frontend
npm install
npm run dev
```

Frontend will start at: http://localhost:3000

---

## 📊 Features Overview

### 🥈 Silver Membership
- **Requirement**: Monthly purchase ৳5,000
- **Benefits**:
  - ৩%-৫% lifetime discount (default 4%)
  - Member-only deals
  - Priority support

### 🥇 Gold Membership
- **Requirement**: Monthly purchase >৳5,000
- **Benefits**:
  - ৮%-১২% lifetime discount (default 10%)
  - 1 free delivery per month
  - Birthday & Eid gifts
  - Price lock protection (old price even after hikes)
  - Early access to new products

### 🎁 Referral Program
- **1 referral** → ৳100 wallet credit
- **5 referrals** → Free product
- Auto-credit when referred customer places first order

### 🔁 Monthly Grocery System
- Create monthly shopping lists
- Set subscription day (1-31)
- Auto-reorder on scheduled date
- One-click reorder anytime
- Price history tracking

### 💰 Customer Wallet
- Stores referral rewards
- Can be used for purchases
- Full transaction history
- Auto-credit for completed referrals

### 📈 KPI Tracking
- First → Repeat Order %
- Member Conversion Rate
- Avg Orders per Customer
- Avg Referrals per Customer
- Customer Lifetime Value (CLV)

---

## 🌐 API Endpoints

### Membership
- `GET /loyalty/membership/:customerId` - Get membership details
- `GET /loyalty/memberships?tier=silver` - List all members
- `PUT /loyalty/membership/:customerId/tier` - Update tier

### Wallet
- `GET /loyalty/wallet/:customerId` - Get wallet balance
- `POST /loyalty/wallet/:customerId/credit` - Add funds
- `POST /loyalty/wallet/:customerId/debit` - Deduct funds
- `GET /loyalty/wallet/:customerId/transactions` - Transaction history

### Referrals
- `POST /loyalty/referral` - Create referral
- `GET /loyalty/referrals/:customerId` - List referrals
- `PUT /loyalty/referral/:referralId/complete` - Mark complete
- `GET /loyalty/referrals/:customerId/stats` - Get stats

### Grocery Lists
- `GET /loyalty/grocery-lists/:customerId` - List all grocery lists
- `POST /loyalty/grocery-list` - Create new list
- `POST /loyalty/grocery-list/:listId/item` - Add item
- `PUT /loyalty/grocery-list/:listId/subscription` - Toggle subscription
- `GET /loyalty/subscriptions/due-today` - Get due subscriptions

### Price Locks (Gold Only)
- `POST /loyalty/price-lock` - Lock product price
- `GET /loyalty/price-locks/:customerId` - List locked prices
- `GET /loyalty/price-locks/:customerId/savings` - Calculate savings

### KPIs
- `GET /loyalty/kpis` - Get all KPI metrics
- `GET /loyalty/dashboard` - Complete dashboard data

---

## 🎯 Frontend Pages

### 1. KPI Dashboard (`/admin/loyalty`)
- Total customers, silver/gold members
- Member conversion rate
- First → Repeat order %
- Avg orders per customer
- Customer lifetime value
- Referral program stats
- Active subscriptions
- Membership distribution charts

### 2. Member Dashboard (`/admin/loyalty/member/[customerId]`)
- Tier badge with progress bars
- Wallet balance & stats
- 3 tabs:
  - **Overview**: Membership & wallet details
  - **Referrals**: List with invite button
  - **Grocery**: Monthly lists with reorder

---

## 🔄 Automation

### 1. Auto Tier Upgrade
**Trigger**: After every order
```sql
-- Calculates current month spend
-- Upgrades None → Silver (≥৳5,000)
-- Upgrades Silver → Gold (>৳5,000)
-- Updates discount percentage automatically
```

### 2. Auto Referral Reward
**Trigger**: When referred customer places first order
```sql
-- Auto-creates wallet if not exists
-- Credits ৳100 to referrer's wallet
-- Logs transaction with referral ID
-- Marks referral as completed
```

### 3. Repeat Order Reminders
**Scheduled**: Daily cron job
```sql
-- Finds orders 25-30 days old
-- Creates reminder records
-- Triggers WhatsApp/Call system
-- Tracks reminder status
```

---

## 🧪 Testing

### Test Membership Tier Upgrade
```sql
-- Create test customer
INSERT INTO customers (name, email, phone) 
VALUES ('Test Customer', 'test@example.com', '01700000000');

-- Place order to trigger tier upgrade
INSERT INTO sales_orders (customer_id, total_amount, order_date)
VALUES (1, 6000, NOW());

-- Check membership (should be Gold)
SELECT * FROM customer_memberships WHERE customer_id = 1;
```

### Test Referral System
```sql
-- Customer 1 refers Customer 2
INSERT INTO customer_referrals (referrer_customer_id, referred_email, referral_code)
VALUES (1, 'friend@example.com', 'REF1ABC');

-- Customer 2 registers and places first order
UPDATE customer_referrals 
SET referred_customer_id = 2, status = 'registered'
WHERE id = 1;

-- Mark first order placed (auto-credits ৳100)
UPDATE customer_referrals 
SET first_order_placed = true
WHERE id = 1;

-- Check wallet (should have ৳100)
SELECT * FROM customer_wallets WHERE customer_id = 1;
```

### Test Monthly Grocery
```sql
-- Create grocery list
INSERT INTO monthly_grocery_lists (customer_id, list_name, is_subscription, subscription_day)
VALUES (1, 'Monthly Groceries', true, 15);

-- Add items
INSERT INTO grocery_list_items (list_id, product_id, quantity, last_purchase_price)
VALUES (1, 1, 2, 150.00), (1, 2, 1, 350.00);

-- Check next order date
SELECT * FROM monthly_grocery_lists WHERE customer_id = 1;
```

---

## 📝 Database Schema

### customer_memberships
```sql
id, customer_id, membership_tier (none/silver/gold), 
discount_percentage, current_month_spend, 
free_delivery_count, free_delivery_used,
price_lock_enabled, created_at, updated_at
```

### customer_wallets
```sql
id, customer_id, balance, total_earned, 
total_spent, created_at, updated_at
```

### wallet_transactions
```sql
id, wallet_id, customer_id, transaction_type (credit/debit),
amount, source, description, reference_id,
balance_after, created_at
```

### customer_referrals
```sql
id, referrer_customer_id, referred_customer_id,
referral_code, referred_email, referred_phone,
status (pending/registered/completed), 
reward_amount, first_order_placed, created_at
```

### monthly_grocery_lists
```sql
id, customer_id, list_name, is_subscription,
subscription_day, next_order_date, auto_reorder,
total_orders_placed, last_order_date, created_at
```

### grocery_list_items
```sql
id, list_id, product_id, quantity,
last_purchase_price, locked_price, created_at
```

### price_locks
```sql
id, customer_id, product_id, locked_price,
current_price, savings_amount, is_active,
locked_at, expires_at
```

---

## 🎨 UI Components

### Tier Badge Colors
- **None**: Gray (`bg-gray-100`)
- **Silver**: Silver gradient (`bg-gradient-to-r from-gray-300 to-gray-400`)
- **Gold**: Gold gradient (`bg-gradient-to-r from-yellow-400 to-yellow-600`)

### Status Badge Colors
- **Pending**: Gray (`bg-gray-100 text-gray-800`)
- **Registered**: Blue (`bg-blue-100 text-blue-800`)
- **Completed**: Green (`bg-green-100 text-green-800`)

---

## 🔐 Security Notes

1. **Wallet Transactions**: All credit/debit operations logged
2. **Tier Upgrades**: Auto-calculated, cannot be manually manipulated
3. **Referral Rewards**: Only credited after verified first order
4. **Price Locks**: Only available for Gold members
5. **Subscription Orders**: Require customer confirmation

---

## 📞 Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Check database: `SELECT * FROM loyalty_kpi_metrics;`
3. Test API endpoints: http://localhost:3001/loyalty/kpis
4. View frontend: http://localhost:3000/admin/loyalty

---

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Start backend & frontend servers

### Step 5: Run UUID Wallet Migration
If you are using wallet endpoints from the customer portal and you see errors like `column CustomerWallet.customer_uuid does not exist`, run the UUID wallet migration:
  - `backend/loyalty-wallet-uuid-migration.sql`
  - Windows runner: `backend/run-loyalty-wallet-uuid-migration.bat` (or `.ps1` if using Docker)
3. ✅ Test tier upgrade with sample order
4. ✅ Test referral system
5. ✅ Create first grocery list
7. 🔄 Integrate with WhatsApp API for reminders
8. 🔄 Set up daily cron for repeat reminders
9. 🔄 Add email notifications for tier upgrades
10. 🔄 Create customer-facing membership page

---

