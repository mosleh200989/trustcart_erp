# 🚀 Team-Based Lead Management - Quick Start Guide

## Overview

This system enables comprehensive customer tracking from initial visit through team-based data collection and tier management.

---

## 🎯 What's New

### 1. **Session Tracking**
- Track source (Google, Facebook, etc.)
- Campaign ID tracking
- Session time and page visits
- Device and browser tracking

### 2. **Incomplete Order Recovery**
- Track abandoned carts
- Email/SMS recovery campaigns
- Discount code generation

### 3. **Team-Based Lead Assignment**
- Unassigned leads dashboard
- Team leader assigns to 5 teams (A, B, C, D, E)
- Each team collects specific customer data

### 4. **Customer Tier Management**
- Active/Inactive status
- Silver, Gold, Platinum, VIP tiers
- Engagement scoring

---

## ⚡ Quick Setup

### Step 1: Run Migration

```bash
# Windows
run-team-lead-migration.bat

# Or manually:
docker cp backend/team-based-lead-management-migration.sql trustcart_erp-postgres-1:/tmp/
docker-compose exec postgres psql -U postgres -d trustcart_erp -f /tmp/team-based-lead-management-migration.sql
```

### Step 2: Start Servers

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 3: Access Features

1. **Lead Assignment**: [http://localhost:3000/admin/crm/lead-assignment](http://localhost:3000/admin/crm/lead-assignment)
2. **Team Data Collection**: [http://localhost:3000/admin/crm/team-data-collection](http://localhost:3000/admin/crm/team-data-collection)
3. **Tier Management**: [http://localhost:3000/admin/crm/customer-tier-management](http://localhost:3000/admin/crm/customer-tier-management)

---

## 📋 Team Responsibilities

### Team A
- **Collects**: Gender, Profession, Product Interest, Order details
- **Purpose**: Demographic targeting

### Team B
- **Collects**: Date of Birth, Marriage Day, Product Interest, Order details
- **Purpose**: Birthday and anniversary campaigns

### Team C
- **Collects**: Family Members (Name, Mobile, DoB, Profession), Product Interest, Order details
- **Purpose**: Family-based marketing

### Team D
- **Collects**: Health Card, Membership Card, Coupon, Product Interest, Order details
- **Purpose**: Loyalty and discount programs

### Team E
- **Collects**: Permanent Membership Number, Tier, Benefits
- **Purpose**: VIP customer management

---

## 🔄 Customer Flow

```
1. Customer Order
   ↓
2. System Check: Existing customer?
   ├─ Yes → Use existing ID
   └─ No → Create new customer
   ↓
3. Lead Created (unassigned)
   ↓
4. Team Leader Assigns to Team (A/B/C/D/E)
   ↓
5. Team Member Collects Data
   ↓
6. Tier Team Assigns: Silver/Gold/Platinum/VIP
   ↓
7. Active/Inactive Status Set
```

---

## 🎓 How to Use

### For Team Leaders

1. Go to **CRM → Lead Assignment**
2. View unassigned leads (sorted by lead score)
3. Click **Assign** on a lead
4. Select Team (A, B, C, D, or E)
5. Select Team Member
6. Add notes (optional)
7. Click **Assign Lead**

### For Team Members

1. Go to **CRM → Team Data Collection**
2. Select your team tab (A, B, C, D, or E)
3. View pending assignments
4. Click **Collect Data**
5. Fill team-specific form
6. Click **Save & Complete**

### For Tier Management

1. Go to **CRM → Customer Tier Management**
2. Filter by tier or status
3. Click **Manage** on a customer
4. Update tier (Silver/Gold/Platinum/VIP)
5. Set status (Active/Inactive)
6. Add notes
7. Click **Save Changes**

---

## 📊 API Endpoints

### Session Tracking
- `POST /lead-management/session/track` - Track customer session
- `GET /lead-management/session/customer/:id` - Get customer sessions

### Lead Management
- `GET /lead-management/leads/unassigned` - Get unassigned leads
- `POST /lead-management/assignment` - Assign lead to team
- `GET /lead-management/assignment` - Get team assignments

### Team Data Collection
- `POST /lead-management/team-a` - Save Team A data
- `POST /lead-management/team-b` - Save Team B data
- `POST /lead-management/team-c` - Save Team C data
- `POST /lead-management/team-d` - Save Team D data
- `POST /lead-management/team-e` - Save Team E data

### Tier Management
- `POST /lead-management/tier` - Update customer tier
- `GET /lead-management/tier/:customerId` - Get customer tier
- `GET /lead-management/tier/by-tier/:tier` - Get customers by tier

---

## 🔍 Database Tables

**New Tables Created:**
1. `customer_sessions` - Session tracking
2. `customer_page_visits` - Page visit tracking
3. `incomplete_orders` - Abandoned cart tracking
4. `team_assignments` - Lead assignments
5. `team_a_data` - Team A collected data
6. `team_b_data` - Team B collected data
7. `team_c_data` - Team C collected data
8. `team_d_data` - Team D collected data
9. `team_e_data` - Team E collected data
10. `customer_tiers` - Tier management
11. `team_members` - Team member mapping
12. `customer_tier_history` - Tier change audit

**Views Created:**
1. `unassigned_leads` - List of unassigned leads
2. `team_leader_dashboard` - Team leader stats
3. `customer_complete_profile` - Complete customer data

---

## ✅ Features Checklist

- ✅ Session and campaign tracking
- ✅ Source attribution (Google, Facebook, etc.)
- ✅ Page visit time tracking
- ✅ Incomplete order recovery
- ✅ Lead scoring and prioritization
- ✅ Team-based lead assignment (5 teams)
- ✅ Team-specific data collection forms
- ✅ Customer tier management (4 tiers)
- ✅ Active/Inactive status tracking
- ✅ Engagement score calculation
- ✅ Auto-update triggers
- ✅ Complete REST API
- ✅ 3 frontend pages
- ✅ Navigation menu integration

---

## 🎉 Success!

Your team-based lead management system is now ready!

**Quick Links:**
- 📖 Full Documentation: `TEAM_BASED_LEAD_MANAGEMENT_GUIDE.md`
- 🗄️ Migration File: `backend/team-based-lead-management-migration.sql`
- 🖥️ Frontend Pages: `frontend/src/pages/admin/crm/`
- 🔧 Backend Module: `backend/src/modules/lead-management/`

---

**Need Help?**

Check the complete guide in `TEAM_BASED_LEAD_MANAGEMENT_GUIDE.md` for detailed documentation, API references, and workflows.
