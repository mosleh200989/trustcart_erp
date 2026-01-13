# TrustCart ERP — Permissions (RBAC) Features Checklist

Reference: [docs/ADMIN_RBAC_PANELS_AND_ROLES.md](ADMIN_RBAC_PANELS_AND_ROLES.md)

This is a **simple** inventory of permission-related features and a checklist of whether each is already implemented in the repo.

---

## 1) Data model (database)

- [x] `roles` table exists (name/slug/priority/is_active)
- [x] `permissions` table exists (slug/module/action/name/description)
- [x] `role_permissions` join table exists (role → permissions)
- [x] `user_roles` join table exists (user → roles)
- [x] `user_permissions` override table exists (direct grants/revokes)
- [x] `activity_logs` table exists (audit trail)
- [x] Migration/seed file exists to create + seed roles/permissions
  - Source: [backend/rbac-migration.sql](../backend/rbac-migration.sql)

---

## 2) Seeded roles and permissions

### 2.1 Roles

- [x] Roles are seeded in migration (currently 15 roles)
  - Includes Super Admin, Admin, Sales Executive, Sales Team Leader, Inventory Manager, Purchase Manager, Accounts, HR Manager, Brand Manager, Delivery Partner, Viewer, Customer Account, Supplier Account, Recruiter, Job Applicant

### 2.2 Permission catalog

- [x] Permission catalog seeded and grouped by module (system/users/products/inventory/sales/purchase/crm/accounts/hr/delivery/marketing/mlm/recruitment/supplier/dashboard)
- [x] Enhanced CRM Team Leader permissions exist (e.g., `assign-leads-to-team`, `view-call-summary`)

---

## 3) Backend enforcement (guards, decorators, API)

### 3.1 Permission enforcement building blocks

- [x] Permission decorator exists: `@RequirePermissions(...slugs)`
  - Source: [backend/src/common/decorators/permissions.decorator.ts](../backend/src/common/decorators/permissions.decorator.ts)
- [x] Permission guard exists: `PermissionsGuard`
  - Source: [backend/src/common/guards/permissions.guard.ts](../backend/src/common/guards/permissions.guard.ts)
- [x] Guard checks permissions using the DB-driven RBAC service
  - Uses `rbacService.checkPermission(user.id, permissionSlug)`

### 3.2 RBAC service capability

- [x] `checkPermission(userId, permissionSlug)` implemented
- [x] Effective permissions resolution implemented (roles + role_permissions + user_permissions overrides)

### 3.3 RBAC admin API endpoints

- [x] List roles: `GET /rbac/roles`
- [x] Role details by slug: `GET /rbac/roles/:slug`
- [x] List permissions: `GET /rbac/permissions` (optional `?module=...`)
- [x] Get user roles: `GET /rbac/users/:userId/roles`
- [x] Get user permissions: `GET /rbac/users/:userId/permissions`
- [x] Check permission: `GET /rbac/users/:userId/check/:permissionSlug`
- [x] Assign/remove role: `POST /rbac/users/:userId/roles`, `DELETE /rbac/users/:userId/roles/:roleId`
- [x] Grant/revoke user override permission: `POST /rbac/users/:userId/permissions`, `DELETE /rbac/users/:userId/permissions/:permissionId`
- [x] Activity logs: `GET /rbac/activity-logs`, `POST /rbac/activity-logs`
  - Source: [backend/src/modules/rbac/rbac.controller.ts](../backend/src/modules/rbac/rbac.controller.ts)

### 3.4 Where permissions are actually enforced today

- [x] Recruitment module endpoints use `PermissionsGuard` + `@RequirePermissions(...)`
- [x] CRM module endpoints use `PermissionsGuard` + `@RequirePermissions(...)`

Additional backend modules that **now** use `PermissionsGuard` + `@RequirePermissions(...)`:

- [x] Users (`backend/src/modules/users`)
- [x] Products (`backend/src/modules/products`)
- [x] Sales + Order Management (`backend/src/modules/sales`)
- [x] Inventory (`backend/src/modules/inventory`)
- [x] Purchase (`backend/src/modules/purchase`)
- [x] Accounting/Accounts (`backend/src/modules/accounting`)
- [x] Loyalty/MLM (`backend/src/modules/loyalty`)
- [x] Marketing: Banners (`backend/src/modules/banners`)
- [x] Marketing: Offers + Special Offers (`backend/src/modules/offers`, `backend/src/modules/special-offers`)
- [x] Categories + Combos (`backend/src/modules/categories`, `backend/src/modules/combos`)
- [x] Customer admin APIs (`backend/src/modules/customers`)
- [x] Courier configuration (Settings) (`backend/src/modules/settings`)
- [x] Tagging (currently gated via CRM permission `customer-segmentation`) (`backend/src/modules/tagging`)

Backend modules present in this repo that **do not currently show permission-guard usage** (so they are not fully gated yet):

- [ ] HRM (`backend/src/modules/hrm`)
- [ ] Payroll (`backend/src/modules/payroll`)
- [ ] Support (JWT-protected, but not permission-gated) (`backend/src/modules/support`)
- [ ] Projects (`backend/src/modules/project`)
- [ ] Tasks (`backend/src/modules/task`)

---

## 4) Authentication integration

- [x] `/auth/me` returns the logged-in user’s roles + permissions
  - This is the key endpoint for the frontend to build role-based panels.
  - Source: [backend/src/modules/auth/auth.controller.ts](../backend/src/modules/auth/auth.controller.ts)

---

## 5) Frontend: role-based panels (navigation + route gating)

### 5.1 Admin navigation definition

- [x] Central admin menu exists (drives all admin routes)
  - Source: [frontend/src/layouts/AdminLayout.tsx](../frontend/src/layouts/AdminLayout.tsx)

### 5.2 UI enforcement status

- [x] Menu filtering by permissions (role-based panels)
- [x] Route-level protection in the admin UI (client-side redirect / not-authorized)
- [ ] Consistent “default landing page per role/panel”
- [ ] Hide/disable buttons/actions based on permissions (create/edit/delete/approve)

---

## 6) Audit logging

- [x] RBAC activity logging supported via `activity_logs` + API
- [ ] Automatic audit logging across business modules (most actions)
  - Some modules may log their own activity separately (e.g., orders), but a consistent RBAC audit trail is not yet universal.

---

## 7) Permission coverage gaps vs Admin menu

These menu areas exist in the admin UI but do not have clearly defined permission modules in the current RBAC seed (so enforcement will be incomplete until added):

- [ ] Tagging permissions (`tagging:*` like `view-tags`, `manage-tags`)
- [ ] Projects permissions (`projects:*`)
- [ ] Tasks permissions (`tasks:*`)
- [ ] Support desk permissions (`support:*`) (separate from MLM member “create-support-tickets”)
- [x] Settings permissions exist (system settings are covered via `view-system-settings` / `manage-system-settings`)

---

## 8) Optional / future enhancements (recommended)

- [ ] Role-based panel “preset templates” (one-click assign a bundle of permissions)
- [ ] Row-level scoping enforcement for sensitive areas (CRM assigned customers, delivery assigned orders, warehouse scope)
- [ ] Approval workflows mapped to explicit permission actions (`approve:*`) and logged in `activity_logs`
- [ ] Admin UI: Role & Permission management screens (create roles, manage role_permissions) beyond just listing roles

---

## Quick summary

- **Implemented**: DB schema, seeding, RBAC APIs, permission resolution, guard/decorator, and backend enforcement across core admin modules (Users/Products/Sales/Inventory/Purchase/Accounting/Marketing/Loyalty/Customers) + CRM + Recruitment.
- **Implemented (UI)**: role-based panels via menu filtering + route-level protection.
- **Still pending**: full RBAC coverage for HRM/Payroll/Projects/Tasks; dedicated permission modules for Tagging/Projects/Tasks/Support; consistent per-action button gating and a default landing per role.

---

## Implementation plan (answer to: “How to make Agent/Team Leader/other panels?”)

You do **not** need to build separate frontend apps to create separate panels. In TrustCart ERP, a “panel” can be implemented as:

1) **One Admin app** (same `/admin/*` routes) with **role/permission-based navigation + route gating**, and
2) Optionally **different default landing pages/dashboards** per role.

This approach is the most maintainable because **your panels automatically update** when you change role→permission mappings in the database.

### A) Is it possible to update a `${role}` Panel?

Yes — if “panel” means “what menu/pages/actions the role can see/do”, you can update it in two ways:

1. **RBAC-driven (recommended)**: Update `role_permissions` in DB (or via admin tooling later). The frontend reads permissions (via `/auth/me`) and automatically shows/hides menu items and actions.
2. **UI-driven (secondary)**: Update a frontend config mapping (role → panel menu groups). This is useful for UX ordering/labels, but should still be permission-based underneath to avoid security gaps.

Best practice: **Use permissions as the source of truth**, and treat “panel configs” as a presentation layer.

### B) Do we need multiple panels in the frontend?

You have two valid options:

**Option 1 (recommended): Single AdminLayout + dynamic filtering**
- Keep [frontend/src/layouts/AdminLayout.tsx](../frontend/src/layouts/AdminLayout.tsx) as the single layout.
- Add `requiredPermissions?: string[]` (and/or `requiredAnyPermissions?: string[]`) to each menu item.
- Filter `menuItems` based on the logged-in user’s permissions.
- Also protect each page route (redirect to “Not Authorized” if missing permission).

This gives you “different panels” without duplicating UIs.

**Option 2: Separate route prefixes/layouts (only if you want a hard UX separation)**
- Example: `/admin/*` for Admin, `/agent/*` for Sales Executive, `/tl/*` for Team Leader.
- Still must use the same backend permission enforcement; otherwise it becomes “security by UI”.

This is useful only when you want totally different navigation and dashboards, but it increases code duplication.

### C) Plan before implementation (step-by-step)

#### Step 1 — Get user permissions into a global frontend auth context
- On login (or app load), call `GET /auth/me`.
- Store `roles[]` and `permissions[]` in a global store/context.
- Add helper utilities:
  - `hasPermission('view-sales-orders')`
  - `hasAllPermissions([...])`
  - `hasAnyPermission([...])`

#### Step 2 — Define “panel profiles” (presentation-only)
- Create a small config file (example concept: `panelProfiles`) that maps a **primary role** to:
  - default landing route (dashboard)
  - which menu groups should be shown (by module)

Important: even if a menu group is shown, each item still checks permissions.

#### Step 3 — Add required permission metadata to menu items
- Extend menu item definitions with `requiredPermissions`.
- Example mapping idea:
  - CRM → `view-customers`, `view-leads`, `manage-call-logs` etc.
  - Recruitment pages → `view-job-posts`, `view-applicants`, …
  - Users → `view-users`, `assign-roles`, …

If a menu item doesn’t have a permission yet (like Tagging/Projects/Tasks/Support/Settings), either:
- temporarily gate by a broader permission (not ideal), or
- add the missing permission slugs in RBAC seed and wire them through later.

#### Step 4 — Route-level guarding (must-have)
- Create a small wrapper/HOC (or `withAuth` + `requirePermissions`) for admin pages.
- If a user manually navigates to `/admin/users` but lacks permission, redirect to a `403` page.

Why this matters: menu filtering alone is not security.

#### Step 5 — Button/action gating inside pages
- For each page, hide/disable actions like Create/Edit/Delete/Approve unless permission allows.
- Still rely on backend guards for final enforcement.

#### Step 6 — Backend enforcement expansion (parallel track)
- You already have `PermissionsGuard` + `@RequirePermissions`.
- Most core modules are now gated; remaining high-ROI items are HRM/Payroll/Projects/Tasks and making Support permission-based (not just JWT).

This ensures even if someone bypasses the UI, the API remains protected.

#### Step 7 — Panel selection when user has multiple roles
- Rule: pick the “primary panel role” by `priority` (already a role field) or by `users.primary_role_id`.
- Allow Super Admin/Admin to optionally “switch panel view” for testing.

### D) Practical recommendation for TrustCart ERP

- Start with **Option 1 (single admin app)**.
- Implement 3 core panels first:
  - **CRM Agent panel** (Sales Executive)
  - **CRM Team Leader panel** (Sales Team Leader)
  - **Operations Admin panel** (Admin)

Once these work smoothly, replicate the same pattern for Inventory/Purchase/Accounts/HR.

### E) What will be configurable later (without code changes)

After the above structure exists, changing a panel becomes mostly data:

- Add/remove permissions in `role_permissions` → the UI automatically updates.
- Add a new role → assign permissions → it immediately gets a “panel” (menu filtered by permissions).

The only time you need frontend code changes is when you introduce **new modules/pages** or want a different UX grouping.

---

## Manual verification guide (how to check the whole system)

This is a practical checklist to verify RBAC end-to-end: database → backend enforcement → frontend panels → public storefront/customer portal behavior.

### A) Prerequisites

1) Database has roles + permissions seeded
- Ensure the RBAC seed has been applied: [backend/rbac-migration.sql](../backend/rbac-migration.sql)
- Confirm tables exist: `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions`, `activity_logs`

2) Start backend and frontend
- Backend:
  - `cd backend`
  - `npm install`
  - `npm run build`
  - `npm run start:dev` (or your normal start command)
- Frontend:
  - `cd frontend`
  - `npm install`
  - `npm run dev`

3) Prepare test users (recommended)
- Create at least 3 users and assign roles:
  - **Super Admin** (full access)
  - **Restricted Admin** (only 1–2 permissions, e.g. `view-users` but not `assign-roles`)
  - **Customer Account** (customer portal + loyalty “self” endpoints)

You can assign roles via RBAC APIs (see section D), or via DB for quick testing.

---

### B) Verify `/auth/me` is the “source of truth”

1) Login as each test user
- Use the frontend login, or call the backend login endpoint (depends on your auth setup).

2) Call `GET /auth/me`
- Confirm the response includes:
  - the user
  - `roles[]`
  - `permissions[]` (permission slugs)

Expected behavior:
- Super Admin: many permissions
- Restricted Admin: only the small subset you assigned
- Customer: customer-safe permissions (e.g. loyalty “self” permissions)

---

### C) Verify backend enforcement (401 vs 403)

Pick a representative protected endpoint from each module and test 3 cases:

1) No token → should be `401 Unauthorized`
2) Token but missing permission → should be `403 Forbidden`
3) Token with permission → should be `200 OK`

Suggested endpoints to test (examples; adjust as needed):
- Users: `GET /users`
- RBAC: `GET /rbac/roles`
- Products: `GET /products` and `POST /products`
- Sales: `GET /sales/orders` (or the equivalent in your controller)
- Inventory: `GET /inventory`
- Purchase: `GET /purchase`
- Accounting: `GET /accounting/ledgers` (or similar)
- Loyalty admin/report: `GET /loyalty/admin/reports` (or similar)

Also confirm public endpoints still work without a token (storefront/checkout stability):
- Banners (public)
- Offers (public)
- Customer registration/lookup endpoints used by checkout/customer portal

---

### D) Verify RBAC management is secured

1) As Restricted Admin, call RBAC endpoints
- `GET /rbac/roles` should require at least a view permission (commonly `view-users`)
- Assign role/permission endpoints should require `assign-roles`

2) As Super Admin, confirm RBAC endpoints work
- List roles, list permissions
- Assign a role to a user, then re-check `GET /auth/me` for that user

3) Confirm audit logs endpoints are protected
- `GET /rbac/activity-logs` should require `view-audit-logs`

---

### E) Verify frontend “panels” (menu filtering + route guard)

1) Login as Super Admin
- You should see the full admin menu.

2) Login as Restricted Admin
- You should see a reduced menu.
- Try manually navigating to a route you do not have permission for (paste the URL): you should see a Not Authorized / 403 experience.

3) Confirm admin pages are not accessible when logged out
- Visiting `/admin/*` routes should redirect to login.

---

### F) Verify customer portal safety (Loyalty “self” endpoints)

1) Login as a Customer Account
- Open customer wallet and referrals pages.
- Confirm data loads without passing `customerId` from the client.

2) Call these endpoints with customer token
- `GET /loyalty/me/wallet`
- `GET /loyalty/me/wallet/transactions`
- `GET /loyalty/me/referrals`
- `GET /loyalty/me/referral-code`
- `GET /loyalty/me/referrals/stats`

Expected behavior:
- Customer should only be able to access **their own** wallet/referrals.
- A customer should NOT be able to access admin/report endpoints.

---

### G) Verify user override permissions

1) Pick a user who has a role permission
2) Add a `user_permissions` override to revoke that permission
3) Re-check:
- `GET /auth/me`
- the relevant admin page/menu visibility
- the protected API endpoint response

Expected behavior:
- Overrides should take effect immediately (after refresh / new `/auth/me` fetch).

