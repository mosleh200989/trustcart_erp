# CRM Lead Flow Guide (End-to-End)

This guide explains how TrustCart ERP’s CRM lead lifecycle works from setup → lead intake → assignment → follow-up → conversion.

> **Key concept:** In this project, **Leads are stored in the `customers` table**.
> A “lead” is simply a customer record where `lifecycle_stage = 'lead'`.

---

## 1) What counts as a Lead?

A record is treated as a **CRM Lead** when:

- `customers.lifecycle_stage = 'lead'`
- and the record is **not deleted** and **active**

When a lead is “converted”, the backend changes:

- `lifecycle_stage: 'lead' → 'customer'`

### Where the Leads page fetches from

Frontend page:
- `/admin/crm/leads`

Backend API:
- `GET /crm/team/leads`

This API reads from the **same `customers` table** as the Customers list, but filtered by `lifecycle_stage='lead'`.

---

## 2) Roles and who does what

Typical CRM team setup:

- **Team Leader (Supervisor / Sales Team Leader)**
  - Creates teams
  - Assigns agents to teams
  - Assigns leads to agents
  - Monitors performance and escalations

- **Agent (Sales Executive / Tele-sales Agent)**
  - Works assigned leads
  - Updates outcomes (calls, followups, notes)
  - Converts qualified leads to customers (if allowed)

- **Admin**
  - Manages roles/permissions
  - Oversees everything

### Permissions (high-level)
Exact names can vary by role, but commonly used permissions in the CRM Team module are:

- `receive-new-leads` (view the leads feed)
- `assign-leads-to-team` (assign agents to teams and/or leads to agents)
- `reassign-customers`
- `set-lead-priority`
- `edit-leads` (convert lead)
- `view-team-leader-dashboard`
- `view-team-follow-ups`
- `handle-escalations`

If you can open the pages but buttons/actions fail, it’s almost always a **permission** issue.

---

## 3) Step-by-step workflow

### Step 0 — Create/confirm user roles

1. Go to **Roles → Manage Roles**
2. Ensure you have roles like:
   - Sales Team Leader / Supervisor
   - Sales Executive / Agent
3. Go to **Roles → Assign Roles** and assign roles to your staff users.

---

### Step 1 — Create Teams (Team Leader)

Page:
- `/admin/crm/teams`

What to do:

1. Click **Create Team**
2. Set:
   - **Team Name** (e.g., “Telesales Team A”)
   - **Team Code** (optional)

The backend endpoint used:
- `POST /crm/team/teams`

---

### Step 2 — Assign Agents to a Team (Team Leader)

Page:
- `/admin/crm/teams`

What to do:

1. Click **Assign Agent** on the team row
2. Choose an agent
3. Submit

Backend endpoint:
- `POST /crm/team/teams/:teamId/assign-agent`

---

### Step 3 — Verify Leads are coming in

Page:
- `/admin/crm/leads`

You should now see the **Team Leads** list.

Notes:
- Leads are customers where `lifecycleStage = 'lead'`
- If you have only a few customers and see many leads, see the **Troubleshooting** section below.

---

### Step 4 — Assign Leads to Agents (Team Leader)

Page:
- `/admin/crm/team/assign`

What to do:

1. Open the “Unassigned Leads” list
2. Select a lead
3. Select an agent
4. Click **Assign**

Backend endpoint:
- `POST /crm/team/leads/:customerId/assign` with `{ agentId }`

After assigning:
- the lead record is updated:
  - `assigned_to = <agentId>`
  - `assigned_supervisor_id = <teamLeaderId>`

---

### Step 5 — Agent works the lead (followups / calls)

Pages (commonly used):
- `/admin/crm/agent-dashboard`
- `/admin/crm/team/followups` (team followups)

Typical actions:

1. Call the lead
2. Log outcome / update status and notes
3. Set next follow-up date

---

### Step 6 — Convert Lead to Customer

Page:
- `/admin/crm/leads`

What to do:

1. Open the lead
2. Click **Convert**

Backend endpoint:
- `POST /crm/team/leads/:customerId/convert`

Result:
- `lifecycle_stage` becomes `customer`
- lead should disappear from Leads view and appear as a normal customer lifecycle record

---

### Step 7 — Reassign or Escalate (when needed)

- Reassign (Team Leader):
  - `PUT /crm/team/leads/:customerId/reassign` with `{ newAgentId }`

- Escalation and monitoring (Team Leader):
  - `/admin/crm/team-dashboard`
  - `/admin/crm/reports`

---

## 4) Troubleshooting / FAQ

### A) “Customers list shows only 3 customers, but CRM Leads shows many”

Cause:
- Leads are stored in `customers` table too, and previously the Leads API could include soft-deleted/inactive rows.

Fix:
- The Leads API is now aligned to exclude deleted/inactive records.

If you still see unexpected leads:

1. Check if the records are truly deleted vs. just inactive.
2. Confirm the lead `lifecycle_stage` values in DB.
3. Confirm you’re not using any demo seed data.

### B) “I can’t assign leads / buttons do nothing”

Usually permissions.

- Ensure your role has `assign-leads-to-team`
- Ensure you’re logged in as a staff user (not customer/supplier account)

### C) “Convert button fails”

- Ensure permission `edit-leads` exists for your role.

---

## 5) Quick checklist (recommended first run)

1. Admin creates roles + assigns roles to users
2. Team Leader creates at least 1 team
3. Team Leader assigns 1–2 agents to the team
4. Confirm leads appear in `/admin/crm/leads`
5. Assign a lead to an agent in `/admin/crm/team/assign`
6. Agent follows up
7. Convert lead when ready

---

## 6) Notes for developers (optional)

- Leads API: `GET /crm/team/leads`
- Team management: `GET/POST /crm/team/teams` and `POST /crm/team/teams/:teamId/assign-agent`
- Assign lead: `POST /crm/team/leads/:customerId/assign`
- Convert lead: `POST /crm/team/leads/:customerId/convert`

If you want, I can also add a small “Create Lead” UI action (so you can create a lead without creating a full customer), but that would require agreeing on the required fields.
