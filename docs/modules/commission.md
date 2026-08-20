# Agent Commission System - Implementation Guide

## Overview

The Agent Commission System allows Sales Executives to earn commissions on sales from customers assigned to them. Admins can configure commission rates (fixed amount or percentage), and agents can view their commission earnings directly in their dashboard.

## Features

### For Administrators

1. **Commission Settings Management** (`/admin/crm/commission-settings`)
   - Configure global commission rates for all agents
   - Set agent-specific commission rates (overrides global settings)
   - Choose between fixed amount per sale or percentage-based commission
   - Set minimum order value requirement for commission eligibility
   - Set maximum commission cap per sale
   - Set effective date ranges for commission policies

2. **Commission Approval Workflow**
   - View all pending commissions
   - Approve/reject individual commissions
   - Bulk approve multiple commissions
   - Mark approved commissions as paid
   - Cancel commissions with reason

3. **Commission Reports**
   - View total commissions by agent
   - Filter by date range
   - See breakdown by status (pending/approved/paid)

### For Sales Executives

1. **Commission Dashboard** (in Agent Dashboard)
   - View current commission rate
   - Total commission earned
   - Current month commission
   - Number of sales made
   - Status breakdown (pending/approved/paid)
   - Recent commission records

2. **Automatic Commission Tracking**
   - Commissions are automatically created when orders from assigned customers are delivered
   - No manual entry required

## How It Works

### Commission Flow

1. **Lead Assignment**: Team Leader assigns leads (customers) to Sales Executives
2. **Customer Purchase**: When an assigned customer places an order
3. **Order Delivery**: When the order status changes to "delivered"
4. **Commission Created**: System automatically creates a commission record
5. **Admin Approval**: Admin reviews and approves the commission
6. **Payment**: Admin marks commission as paid after actual payment

### Commission Calculation

```
If commission_type = 'fixed':
    commission = fixed_amount

If commission_type = 'percentage':
    commission = order_amount * (percentage_rate / 100)

If max_commission is set:
    commission = MIN(commission, max_commission)

If order_amount < min_order_value:
    commission = 0 (no commission)
```

## Database Schema

### commission_settings

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| setting_type | VARCHAR(20) | 'global' or 'agent_specific' |
| agent_id | INTEGER | FK to users (null for global) |
| commission_type | VARCHAR(20) | 'fixed' or 'percentage' |
| fixed_amount | DECIMAL(12,2) | Fixed amount per sale |
| percentage_rate | DECIMAL(5,2) | Percentage of sale |
| min_order_value | DECIMAL(12,2) | Minimum order value |
| max_commission | DECIMAL(12,2) | Cap on commission |
| is_active | BOOLEAN | Whether setting is active |
| effective_from | TIMESTAMP | Start date |
| effective_until | TIMESTAMP | End date |

### agent_commissions

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| agent_id | INTEGER | FK to users |
| customer_id | INTEGER | Customer who placed order |
| sales_order_id | INTEGER | The delivered order |
| order_amount | DECIMAL(12,2) | Order total |
| commission_rate | DECIMAL(5,2) | Rate at time of sale |
| commission_amount | DECIMAL(12,2) | Calculated commission |
| commission_type | VARCHAR(20) | 'fixed' or 'percentage' |
| status | VARCHAR(20) | pending/approved/paid/cancelled |
| approved_by | INTEGER | Admin who approved |
| approved_at | TIMESTAMP | Approval timestamp |
| paid_at | TIMESTAMP | Payment timestamp |

## API Endpoints

### Admin Endpoints

```
GET    /crm/commissions/settings         - Get all commission settings
POST   /crm/commissions/settings         - Create/update settings
DELETE /crm/commissions/settings/:id     - Delete settings

GET    /crm/commissions                  - Get all commissions (paginated)
GET    /crm/commissions/report           - Get commission report by agent

PUT    /crm/commissions/:id/approve      - Approve a commission
PUT    /crm/commissions/:id/paid         - Mark as paid
PUT    /crm/commissions/:id/cancel       - Cancel a commission
POST   /crm/commissions/bulk-approve     - Bulk approve commissions
```

### Agent Endpoints

```
GET    /crm/commissions/my/summary       - Get commission summary
GET    /crm/commissions/my/settings      - Get effective commission settings
GET    /crm/commissions/my               - Get commission records (paginated)
```

## RBAC Permissions

| Permission | Description |
|------------|-------------|
| manage-commission-settings | Create/edit/delete commission settings |
| view-commission-reports | View commission reports and all commissions |
| approve-commissions | Approve/reject/cancel commissions |

## Setup Instructions

### 1. Run the Migration

```bash
# Windows
run-commission-migration.bat

# Or manually
cd backend
psql -f commission-migration.sql
```

### 2. Configure Default Commission

1. Log in as Admin
2. Navigate to CRM → Commission Settings
3. Set up global commission rate (e.g., ৳50 per sale)

### 3. Assign Leads to Agents

1. Navigate to CRM → Lead Assignment
2. Assign customers to Sales Executives
3. Agents will see assigned customers in their dashboard

### 4. Monitor Commissions

1. When orders are delivered, commissions are auto-created
2. Review pending commissions in Commission Settings page
3. Approve and mark as paid after actual payment

## Testing the System

1. Create a test Sales Executive user
2. Assign a customer to the Sales Executive
3. Place an order from that customer
4. Change order status to "delivered"
5. Check commission record was created
6. Verify Sales Executive sees commission in their dashboard
7. Approve and pay the commission as Admin

## Troubleshooting

### Commission not created?

- Check if customer is assigned to the agent (`customers.assigned_to`)
- Check if commission settings are configured and active
- Check if order was actually marked as "delivered"
- Check if order meets minimum order value requirement

### Agent can't see commissions?

- Ensure agent is logged in with correct account
- Check browser console for API errors
- Verify the `/crm/commissions/my/*` endpoints are working

### Permission denied?

- Check user has the required RBAC permissions
- Run the migration to add commission permissions
- Assign permissions to user's role
