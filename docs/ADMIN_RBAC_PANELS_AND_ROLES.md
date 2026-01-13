# TrustCart ERP — Admin Panels, Roles & Responsibilities (RBAC Structure Spec)

> **Purpose**: Define a scalable **role-based admin structure** so the platform stays manageable even as features grow.
>
> **Important scope note**: This document is a **specification** of the intended panels (navigation + responsibilities) and role capabilities. Actual enforcement (UI filtering + API guards + row-level scoping) can be implemented afterwards.

---

## 0) What this document answers

1. **Which roles exist** (and which ones are recommended to add for a ~20-role structure).
2. **Which “panel” each role should see** (Agent panel vs Team Leader panel vs Inventory panel, etc.).
3. **What each role can do** (responsibilities + module/page access boundaries).
4. **How permissions should be organized** to keep approvals and auditability clean.

---

## 1) Source of truth in this repo

This spec is based on **real repo artifacts**:

- Seeded roles + permission model: [backend/rbac-migration.sql](../backend/rbac-migration.sql)
- RBAC API endpoints (roles/permissions/assignment): [backend/src/modules/rbac/rbac.controller.ts](../backend/src/modules/rbac/rbac.controller.ts)
- Admin navigation (feature universe to split into panels): [frontend/src/layouts/AdminLayout.tsx](../frontend/src/layouts/AdminLayout.tsx)
- Existing RBAC baseline doc (older “12 roles” doc): [RBAC_IMPLEMENTATION_GUIDE.md](../RBAC_IMPLEMENTATION_GUIDE.md)
- CRM Team Ops / Call Center flows (Agent/TL operations):
  - [docs/TEAM_CALLCENTER_TEAMOPS_IMPLEMENTATION_BN.md](TEAM_CALLCENTER_TEAMOPS_IMPLEMENTATION_BN.md)
  - [TEAM_LEAD_QUICK_START.md](../TEAM_LEAD_QUICK_START.md)

---

## 2) RBAC model (how access is represented)

### 2.1 Database entities

Core tables (created/used by the RBAC system):

- `roles`
  - `name`, `slug`, `priority`, `is_active`, `description`
- `permissions`
  - `slug`, `module`, `action`, `name`, `description`
- `role_permissions`
  - many-to-many mapping: Role → Permissions
- `user_roles`
  - many-to-many mapping: User → Roles
- `user_permissions`
  - user-specific override (grant/revoke) on top of roles
- `activity_logs`
  - audit trail (who did what, where, when)

### 2.2 API surface

RBAC endpoints live under `/rbac/*`:

- `GET /rbac/roles`
- `GET /rbac/roles/:slug`
- `GET /rbac/permissions?module=...`
- `GET /rbac/users/:userId/roles`
- `GET /rbac/users/:userId/permissions`
- `GET /rbac/users/:userId/check/:permissionSlug`
- `POST /rbac/users/:userId/roles` (assign role)
- `DELETE /rbac/users/:userId/roles/:roleId` (remove role)
- `POST /rbac/users/:userId/permissions` (grant override)
- `DELETE /rbac/users/:userId/permissions/:permissionId` (revoke override)
- `GET /rbac/activity-logs` (audit query)

**Design principle**: Roles are stable and business-friendly (e.g., “Inventory Manager”), while permissions are granular and can evolve.

---

## 3) Admin feature universe (what currently exists in the Admin menu)

The current admin menu is defined centrally and currently shows *everything* to every admin user. These are the top-level modules and routes that the role-based panels should selectively show.

### 3.1 Current top-level areas (from AdminLayout)

- **Dashboard**
  - `/admin/dashboard`

- **Products**
  - `/admin/products`
  - `/admin/categories`
  - `/admin/combo-products`
  - `/admin/products/deal-of-the-day`
  - `/admin/offers`
  - `/admin/special-offers`

- **Sales**
  - `/admin/sales`
  - `/admin/sales/incomplete-orders`
  - `/admin/sales/late-delivery`

- **Reports**
  - `/admin/reports?tab=overview`
  - `/admin/reports?tab=sales`
  - `/admin/reports?tab=customers`
  - `/admin/reports?tab=products`
  - `/admin/reports?tab=inventory`
  - `/admin/reports?tab=marketing`

- **Customers**
  - `/admin/customers`

- **Loyalty**
  - `/admin/loyalty`
  - `/admin/loyalty/members`
  - `/admin/loyalty/referrals`
  - `/admin/loyalty/referrals/campaigns`
  - `/admin/loyalty/referrals/partners`
  - `/admin/loyalty/subscriptions`

- **Tagging**
  - `/admin/tagging?tab=manage`
  - `/admin/tagging?tab=filter`

- **Inventory**
  - `/admin/inventory`

- **Purchase**
  - `/admin/purchase`

- **HR Management** (very large)
  - `/admin/hrm/...` (branches, departments, designations, payroll, attendance, recruitment, etc.)

- **Accounting**
  - `/admin/accounting`

- **Projects**
  - `/admin/projects`

- **Tasks**
  - `/admin/tasks`

- **CRM**
  - `/admin/crm`
  - `/admin/crm/customers`
  - `/admin/crm/team-dashboard`
  - `/admin/crm/lead-assignment`
  - `/admin/crm/team-data-collection`
  - `/admin/crm/customer-tier-management`
  - `/admin/crm/pipeline`
  - `/admin/crm/tasks`
  - `/admin/crm/analytics`
  - `/admin/crm/quotes`
  - `/admin/crm/meetings`
  - `/admin/crm/emails`
  - **Phase 1 Features**
    - `/admin/crm/pipeline-settings`
    - `/admin/crm/activity-templates`
    - `/admin/crm/segments`
    - `/admin/crm/email-templates`
    - `/admin/crm/workflows`
    - `/admin/crm/quote-templates`
    - `/admin/crm/quote-approvals`
    - `/admin/crm/forecasts`

- **Support**
  - `/admin/support`

- **Users**
  - `/admin/users`

- **Settings**
  - `/admin/settings/courier-configuration`

### 3.2 Menu → permission modules mapping (current vs recommended)

This helps translate “panel navigation” into enforceable RBAC.

**Already represented in `permissions` seed** (see `backend/rbac-migration.sql`):

- **Dashboard** → `dashboard:*` (e.g., `view-dashboard`)
- **Users** → `users:*` (create/view/edit/delete users, assign roles)
- **Products** → `products:*` (products + categories + pricing)
- **Sales** → `sales:*`
- **Inventory** → `inventory:*`
- **Purchase** → `purchase:*`
- **CRM** → `crm:*` (+ enhanced TL perms like `assign-leads-to-team`, `view-call-summary`)
- **Accounting** → `accounts:*`
- **HR Management** → `hr:*`
- **Recruitment** → `recruitment:*`
- **Delivery** (backend perms exist) → `delivery:*`
- **Marketing** (offers/campaigns/banners) → `marketing:*`
- **MLM / Member portal capabilities** (referrals, wallet, tickets) → `mlm:*`
- **Supplier portal** → `supplier:*`
- **System** → `system:*`

**Admin menu areas that currently lack dedicated permission modules** (recommended to add):

- **Tagging**
  - Recommended module: `tagging`
  - Suggested permission slugs:
    - `view-tags` (read)
    - `manage-tags` (create/update)
    - `apply-tags` (update)

- **Projects**
  - Recommended module: `projects`
  - Suggested permission slugs:
    - `view-projects` (read)
    - `create-projects` (create)
    - `edit-projects` (update)
    - `delete-projects` (delete)

- **Tasks**
  - Recommended module: `tasks`
  - Suggested permission slugs:
    - `view-tasks` (read)
    - `create-tasks` (create)
    - `edit-tasks` (update)
    - `delete-tasks` (delete)
    - `assign-tasks` (update)

- **Support** (admin support desk; different from MLM “create-support-tickets”)
  - Recommended module: `support`
  - Suggested permission slugs:
    - `view-support-tickets` (read)
    - `manage-support-tickets` (update)
    - `assign-support-tickets` (update)
    - `close-support-tickets` (update)

- **Settings → Courier Configuration**
  - Recommended module: `settings`
  - Suggested permission slugs:
    - `view-courier-configuration` (read)
    - `manage-courier-configuration` (update)

---

## 4) Panels: what a “panel” means in TrustCart ERP

A **panel** is the *role-specific experience*:

- **Navigation subset**: only the relevant menu items for that role are shown.
- **Role dashboard**: default landing page for the role (KPIs + next actions).
- **Approved workflows**: role can draft, submit, execute, approve, or only view.
- **Data scope rules**: role sees only what they are assigned to (team/branch/warehouse/delivery assignments) unless the role explicitly includes global visibility.

### 4.1 Panel layers (recommended)

1. **Platform Admin Layer**: system-wide owners/operators
2. **Operations Layer**: sales + purchase + inventory + accounting day-to-day
3. **Department Panels**: CRM, HR, Marketing, Inventory, Accounts, Purchase
4. **External Panels (Portals)**: Supplier portal, Customer portal, Delivery partner portal

---

## 5) Roles currently seeded in DB (15 roles)

These roles exist in the RBAC seed and should be treated as the official baseline.

> Why 15 (not 12)? The older RBAC guide describes the original 12 roles, but the current seed/migration also includes **Recruiter**, **Job Applicant**, and **Sales Team Leader**.

> Notes:
> - A single user can have multiple roles (via `user_roles`).
> - `priority` helps resolve “primary role” for UI panel selection.

### 5.1 Super Admin (`super-admin`, priority 1000)

**Panel**: Super Admin Panel

**Responsibilities**
- Full system ownership: configuration, security, integrations, backups, and global approvals.

**Navigation (show all)**
- All modules from section 3.

**Approvals & risk**
- Can approve or override any action.
- Should be a very small group (ideally 1–3 accounts).

---

### 5.2 Admin (`admin`, priority 900)

**Panel**: Operations Admin Panel

**Responsibilities**
- Run day-to-day operations across Sales/CRM/Inventory/Purchase/Accounts.
- Manage most business data but avoid platform-critical config.

**Navigation (recommended)**
- Dashboard, Products, Sales, Reports, Customers, Loyalty, Tagging, Inventory, Purchase, Accounting, CRM, Support, Users
- Settings: limited (only business settings, not security keys/backups)

**Not allowed (recommended)**
- API keys / backups / deep system settings.

---

### 5.3 Sales Executive (`sales-executive`, priority 500)

**Panel**: CRM Agent Panel (Call Center / Sales Agent)

**Responsibilities**
- Handle assigned leads/customers.
- Log calls, follow-ups, tasks.
- Create sales orders *without* approval authority.

**Navigation (recommended)**
- CRM
  - Dashboard
  - Customers (assigned scope)
  - Tasks
  - Pipeline
  - Meetings
  - Emails (if enabled)
- Customers (read-only or assigned-only)
- Sales (create/view own or assigned orders)
- Loyalty (view/referral context for customer)

**Not allowed (recommended)**
- Product price edits, inventory edits, purchase creation, accounting ledgers.

---

### 5.4 Sales Team Leader (`sales-team-leader`, priority 520)

**Panel**: CRM Team Leader Panel

**Responsibilities**
- Assign leads to teams/agents.
- Monitor team performance and escalation.
- Review call summaries and flag non-performing agents.

**Navigation (recommended)**
- CRM
  - Team Dashboard
  - Lead Assignment
  - Team Data Collection (review)
  - Tier Management
  - Analytics
  - Pipeline (overview)
  - Tasks (team)
  - Quotes (review)
  - Meetings
  - Phase 1 Features (read-only or partially)

**Not allowed (recommended)**
- Accounting, inventory, system settings.

---

### 5.5 Inventory Manager (`inventory-manager`, priority 600)

**Panel**: Inventory Panel

**Responsibilities**
- Stock control, goods receiving, transfers, adjustments.
- Ensure accurate inventory reporting.

**Navigation (recommended)**
- Inventory
- Products (view-only; category updates may be restricted)
- Reports (inventory + product reports)
- Purchase (view-only PO/GRN references)

**Not allowed (recommended)**
- Financial ledgers, supplier payments, marketing campaigns.

---

### 5.6 Purchase Manager (`purchase-manager`, priority 600)

**Panel**: Procurement Panel

**Responsibilities**
- Manage suppliers, quotations, draft purchase orders.
- Coordinate with inventory for receiving.

**Navigation (recommended)**
- Purchase
- Inventory (view-only stock to plan procurement)
- Products (view-only catalog)
- Reports (purchase + inventory)

**Not allowed (recommended)**
- Approve POs (unless explicitly enabled), accounting ledgers.

---

### 5.7 Accounts (`accounts`, priority 700)

**Panel**: Accounts Panel

**Responsibilities**
- Invoices, payments, reconciliation, financial reporting.

**Navigation (recommended)**
- Accounting
- Sales (view orders/invoices)
- Purchase (view supplier bills)
- Reports (sales + finance)

**Not allowed (recommended)**
- Editing CRM pipeline/leads, inventory adjustments, product price edits.

---

### 5.8 Viewer (`viewer`, priority 100)

**Panel**: Analytics / Read-Only Panel

**Responsibilities**
- View-only dashboards, analytics, reports.

**Navigation (recommended)**
- Dashboard
- Reports
- Read-only access to Products / Sales / CRM analytics as needed

**Not allowed**
- Any create/edit/delete.

---

### 5.9 HR Manager (`hr-manager`, priority 650)

**Panel**: HR Panel

**Responsibilities**
- Employee lifecycle, attendance, leave, payroll, performance.

**Navigation (recommended)**
- HR Management
- Reports (HR reports if available)

**Not allowed (recommended)**
- Accounting, purchase, inventory (unless explicitly required).

---

### 5.10 Recruiter (`recruiter`, priority 640)

**Panel**: Recruitment Panel

**Responsibilities**
- Job posting & candidate pipeline management.
- Interview scheduling & tracking.

**Navigation (recommended)**
- HR Management → Recruitment
- HR Management → Meetings (if used for interviews)

**Not allowed (recommended)**
- Payroll approval, employee termination, finance.

---

### 5.11 Job Applicant (`job-applicant`, priority 150)

**Panel**: Candidate Portal (External)

**Responsibilities**
- Apply for jobs and manage candidate profile.

**Navigation**
- Candidate-only routes (not the Admin menu)

**Data scope rule**
- Only own applications, interviews, offers.

---

### 5.12 Brand Manager (`brand-manager`, priority 550)

**Panel**: Marketing / Brand Panel

**Responsibilities**
- Campaigns, offers, banners, segmentation, marketing analytics.

**Navigation (recommended)**
- Products (Offers & Promotions, Special Offers, Deal of the Day)
- Reports (marketing)
- Loyalty (campaigns, partners)
- Tagging

**Not allowed (recommended)**
- Accounting ledgers, inventory adjustments, user management.

---

### 5.13 Delivery Partner (`delivery-partner`, priority 300)

**Panel**: Delivery Partner Panel (Operations)

**Responsibilities**
- Update delivery status, handle POD, manage assigned deliveries.

**Navigation (recommended)**
- Sales (Late Delivery + assigned orders view)
- Settings (Courier configuration: view-only)

**Data scope rule**
- Only assigned deliveries.

---

### 5.14 Customer Account (`customer-account`, priority 200)

**Panel**: Customer Portal (External)

**Responsibilities**
- Profile, orders, wallet/points, referral sharing, support tickets.

**Navigation**
- Customer-facing site routes (not the Admin menu)

---

### 5.15 Supplier Account (`supplier-account`, priority 250)

**Panel**: Supplier Portal (External)

**Responsibilities**
- Supplier profile + PO/invoice/payment tracking.

**Navigation**
- Supplier-facing routes (not the Admin menu)

---

## 6) Recommended additional roles to reach a clean ~20-role structure

The seeded roles cover many needs, but the admin UX becomes much cleaner if a few **specialized roles** are added (especially for Support, Store/Warehouse operations, and approvals).

> These are **recommended** roles for panel separation. If your database already contains similar roles, align names/slugs accordingly.

### 6.1 Support Agent (`support-agent`) — recommended

**Panel**: Support Panel

**Responsibilities**
- Manage support tickets, customer issues, refunds escalation.

**Navigation**
- Support
- Customers (read-only)
- Sales (read-only order lookup)

**Not allowed**
- Accounting refunds approval (escalate to Accounts/Support Lead).

---

### 6.2 Support Lead (`support-lead`) — recommended

**Panel**: Support Lead Panel

**Responsibilities**
- Assign tickets to agents, define SOPs, review quality.

**Navigation**
- Support
- Reports (support KPIs if available)
- CRM (read-only for escalation context)

---

### 6.3 Warehouse Staff (`warehouse-staff`) — recommended

**Panel**: Warehouse Operations Panel

**Responsibilities**
- Execute picking/packing/receiving tasks under Inventory Manager supervision.

**Navigation**
- Inventory (limited actions)
- Sales (read-only fulfillment lists)

---

### 6.4 Finance Manager (`finance-manager`) — recommended

**Panel**: Finance Approval Panel

**Responsibilities**
- Approve refunds, large payments, month-end close.

**Navigation**
- Accounting
- Reports

---

### 6.5 System Operator (`system-operator`) — recommended

**Panel**: Limited System Ops

**Responsibilities**
- Operational IT: view audit logs, rotate non-secret config, monitor jobs.

**Navigation**
- Dashboard
- Users (limited: reset passwords / lock accounts)
- System audit logs (if exposed in UI)

**Not allowed**
- API keys and backups unless explicitly granted.

---

## 7) Role → Panel mapping (quick matrix)

Legend:
- **RW** = create/edit/delete inside scope
- **R** = read-only
- **A** = approve
- **—** = hidden / no access

| Role | Dashboard | Products | Sales | CRM | Inventory | Purchase | Accounting | HR | Loyalty | Support | Users | Settings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Super Admin | RW | RW | RW | RW | RW | RW | RW | RW | RW | RW | RW | RW |
| Admin | RW | RW | RW | RW | RW | RW | RW | RW* | RW | RW | RW | R* |
| Sales Team Leader | RW | R | R | RW | — | — | — | — | R | — | — | — |
| Sales Executive | RW | R | RW* | RW* | — | — | — | — | R | — | — | — |
| Inventory Manager | RW | R | R | — | RW | R | — | — | — | — | — | — |
| Purchase Manager | RW | R | R | — | R | RW | — | — | — | — | — | — |
| Accounts | RW | R | R | — | — | R | RW | — | — | — | — | — |
| HR Manager | RW | — | — | — | — | — | — | RW | — | — | — | — |
| Recruiter | R | — | — | — | — | — | — | RW* | — | — | — | — |
| Brand Manager | RW | RW* | R | R | — | — | — | — | RW | — | — | — |
| Viewer | R | R | R | R | R | R | R | R | R | R | R | R |
| Delivery Partner | R | — | RW* | — | — | — | — | — | — | — | — | R |
| Customer Account | — | — | — | — | — | — | — | — | RW (portal) | RW (portal) | — | — |
| Supplier Account | — | — | — | — | — | RW (portal) | R (portal) | — | — | — | — | — |

`*` = limited scope / partial permissions.

---

## 8) Approval and escalation design (recommended)

To prevent “one admin can do everything” chaos, align approvals like this:

- **Pricing / discount approvals**: Admin or Super Admin
- **Purchase order approvals**: Admin or Finance Manager
- **Stock adjustment approvals**: Inventory Manager + Admin
- **Refund approvals**: Accounts + Finance Manager
- **CRM escalations**: Sales Team Leader → Admin
- **Support escalations**: Support Agent → Support Lead → Accounts/Admin

---

## 9) Implementation guidance (when you decide to enforce this)

### 9.1 Frontend (navigation and route gating)

- Filter `menuItems` based on **current user permissions**.
- Hide routes that the user cannot access (redirect to a “Not Authorized” page).
- Give each panel a default landing route:
  - CRM Agent → `/admin/crm/tasks`
  - CRM TL → `/admin/crm/team-dashboard`
  - Inventory → `/admin/inventory`
  - Accounts → `/admin/accounting`
  - HR → `/admin/hrm/employees`

### 9.2 Backend (permission guards)

- Add a `PermissionGuard` (or decorator like `@RequirePermission('view-products')`) to sensitive endpoints.
- Keep row-level scoping rules in services (e.g., delivery partner only sees assigned deliveries).

### 9.3 Auditability

- Log actions to `activity_logs` (already supported by RBAC module).
- Ensure approval events are logged as explicit actions.

---

## 10) Practical checklist for the business

- Decide your **final role list** (baseline 15 + recommended additions).
- Define each role’s **default panel** and default landing page.
- Confirm approval chains for: pricing, PO, stock adjustment, refunds.
- Confirm data scoping for CRM (team-based), inventory (warehouse-based), delivery (assignment-based).

---

## Appendix A — Current seeded role list (copy/paste)

- Super Admin (`super-admin`)
- Admin (`admin`)
- Sales Executive (`sales-executive`)
- Sales Team Leader (`sales-team-leader`)
- Inventory Manager (`inventory-manager`)
- Purchase Manager (`purchase-manager`)
- Accounts (`accounts`)
- HR Manager (`hr-manager`)
- Recruiter (`recruiter`)
- Job Applicant (`job-applicant`)
- Brand Manager (`brand-manager`)
- Delivery Partner (`delivery-partner`)
- Viewer (`viewer`)
- Customer Account (`customer-account`)
- Supplier Account (`supplier-account`)
