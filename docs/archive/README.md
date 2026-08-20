# Archive

**Nothing in this folder is maintained. Do not trust it as a description of how
the system works today.**

These files were accurate for roughly a day each. They are kept because they
sometimes record *why* a decision was made, which the code cannot tell you — but
every factual claim in them should be verified against the code before you act
on it.

## What is in here

**Completion and status reports** — `IMPLEMENTATION_COMPLETE.md`,
`CRM_PHASE1_FRONTEND_COMPLETE.md`, `PHASE1_BACKEND_COMPLETE.md`,
`COMPLETION_REPORT.md`, `PROJECT_STATUS.md` and similar. Written at the end of a
piece of work, never updated afterwards.

**Daily reports and audits** — `DAILY_REPORT_2025-12-30.md`,
`DAILY_REPORT_2026-03-22.md`, `UX_AUDIT_REPORT.md`, `TL_DASHBOARD_AUDIT.md`,
`INVENTORY_MANAGEMENT_AUDIT_REPORT_2026-05-19.md`. Point-in-time snapshots.

**Superseded API documentation** — `COMPLETE_API_DOCUMENTATION.md` (2,547
lines), `API_QUICK_REFERENCE.md`, `CDM_CRM_API_REFERENCE.md`. Replaced by
Swagger at `/api/docs`, which is generated from the controllers and therefore
cannot drift. These were already inaccurate when they were archived.

**Competing entry points** — `START_HERE.md`, `QUICK_START.md`,
`QUICK_START_NEW.md`, `CRM_QUICK_START.md`, `CDM_CRM_QUICK_START.md`,
`TEAM_LEAD_QUICK_START.md`, `DOCUMENTATION_INDEX.md`, `INDEX.md` and others.
At one point nineteen files competed to be the first thing you read. There is
now one: the root [README](../../README.md).

**Stale setup guides** — `SETUP_GUIDE.md`, `DATABASE_SETUP.md`,
`BACKEND_SETUP_GUIDE.md`, `FRONTEND_SETUP.md`, `PROJECT_STRUCTURE.md`. These
describe a repository layout that no longer exists, and a database setup that
predates the migration ledger.

**Roadmaps and plans** — `CRM_PERFECTION_ROADMAP.md`,
`ORDERS_SUPPORT_REFERRALS_NEXT_STEPS.md`. Intentions, not records.

## Why keep them at all

Git already has the history, so nothing here is strictly necessary. They are
retained because searching a folder is easier than searching commit history when
you are trying to work out why something was built a particular way — and
because deleting a colleague's work outright is a poor trade for the small
tidiness it buys.

Links inside these files are **not** checked by `scripts/check-doc-links.js`,
and many point at paths that have since moved. That is expected: they are
records of the repository as it was.

## The rule going forward

> Documents describe how the system **is**. What you **did** goes in the commit
> message and the pull request.

A commit is dated, attributed, and attached to the exact diff it describes. A
`*_COMPLETE.md` file is a worse version of that which can never be corrected.
