# Tagging (Customer Tags) Guide

This feature adds **customer tagging** in the Admin panel.

- A **Tag** is a reusable label (e.g. `VIP`, `COD Risk`, `Dormant 30d`).
- A **Customer** can have **multiple tags**.
- A **Tag** can be assigned to **many customers**.

## Admin UI

Path: `/admin/tagging`

### 1) Manage Tags

Capabilities:

- Create tag
- View tag details (includes assigned customer count)
- Edit tag
- Delete tag
- Bulk delete tags (checkbox selection)
- Pagination + search

### 2) Tagwise Filter

Capabilities:

- Pick a **Target Tag**
- Search customers (name / phone / email)
- (Optional) toggle **Show only customers in selected tag**
- Select customers via checkboxes
- **Add Selected** customers to the target tag
- **Remove Selected** customers from the target tag

## Backend API

Base prefix: `/api`

### Tags (CRUD)

- `GET /api/tags?page=&limit=&search=`
  - Returns `{ data, meta }`
  - Each tag includes `customersCount`
- `POST /api/tags`
  - Body: `{ name, description?, color? }`
- `GET /api/tags/:id`
- `PATCH /api/tags/:id`
- `DELETE /api/tags/:id`
- `POST /api/tags/bulk-delete`
  - Body: `{ ids: string[] }`

### Customers + assignment

- `GET /api/tags/customers?page=&limit=&search=&tagIds=&mode=any|all`
  - `tagIds` is a comma-separated list of tag UUIDs
  - Returns customers with a `tags: [{id,name,color}]` array

- `POST /api/tags/:id/customers`
  - Assign customers to a tag
  - Body: `{ customerIds: string[] }`

- `POST /api/tags/:id/customers/remove`
  - Remove customers from a tag
  - Body: `{ customerIds: string[] }`

## Database migration

Run: [backend/migrations/2026-01-12_customer_tagging_tables.sql](backend/migrations/2026-01-12_customer_tagging_tables.sql)

Creates:

- `customer_tags`
- `customer_tag_assignments` (PK: `(tag_id, customer_id)`, cascades on delete)

## Automation (Next Step)

Today, tags are **manual**. The next step is **automatic tagging** using rules.

### Option A: Scheduled rule evaluation (recommended first)

Add a background job (cron) that runs every N minutes/hours and:

1. Queries customers/orders
2. Evaluates rules
3. Upserts `customer_tag_assignments`

Examples of rules you can automate:

- **VIP**: lifetime spend >= X
- **Dormant 30d**: last order date older than 30 days
- **High COD Cancellation Risk**: cancellation rate >= X% for COD orders
- **High Frequency Buyer**: orders in last 30 days >= N

Implementation approach:

- Add a `tag_rules` table (rule definition + SQL or JSON DSL)
- Add a NestJS worker (or a separate worker process)
- Use a consistent “source of truth” for metrics (orders table, payments table)

### Option B: Event-driven tagging

Tag in real-time when important events happen:

- Order created
- Order canceled
- Payment completed
- Refund created

Approach:

- Publish domain events from order/payment services
- Consume events in a tagging worker
- Update assignments immediately

### Option C: Hybrid

- Event-driven for fast updates
- Scheduled job as a backstop/reconciliation

### Practical tips

- Keep tags simple (human-friendly names), put logic in rules
- Always make tagging idempotent (insert-if-missing, remove-if-not-matching)
- Log changes (who/when, rule id) so teams can audit segments
