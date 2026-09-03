# Data Access (who reads customer data)

Insider-risk controls over the customer base: a cap on how much can be pulled in
one request, exporting as a permissioned and recorded action, and a log of every
read. Lives in the Users module: `/admin/users/data-access`.

## What it was protecting against

As of September 2026 production held **95,004 customer records, every one with a
phone number**, and **34 active staff held `view-customers`** through their role
(plus `admin`/`super-admin`, who bypass permission checks). Three things lined up
badly:

- `GET /api/customers?limit=…` passed `limit` straight to the query, so
  `?limit=95000` returned the entire base in one response.
- The CSV export was built **in the browser** from rows already fetched, so it
  needed no permission and the server saw nothing.
- `audit_logs` only records mutations — reads were invisible.

A leaving agent could take everything in one request and leave no trace. That is
what these three changes close.

## The three controls

| Control | Where |
|---|---|
| Page-size cap (500) | `CustomersController.MAX_PAGE_SIZE` |
| Permissioned, recorded export | `GET /api/customers/export/csv`, `CustomersService.exportCsv()` |
| Read logging | `@LogDataAccess` + `DataAccessInterceptor` -> `data_access_log` |

**500** is not arbitrary: it is the largest page any screen actually asks for
(`/admin/customers` requests 500), and it turns a full harvest into ~190
separate requests, each one a logged row. The CRM page's size selector is capped
to match, since asking for more would return 500 rows while the pager stepped by
the larger number and quietly skipped customers between pages.

**Export** requires `export-customers`, capped at 20,000 rows per download, and
lands in the log with the filters used and the row count. Cells beginning `=`,
`+`, `-` or `@` are prefixed with an apostrophe so exported data cannot execute
as a formula in Excel, and the file carries a UTF-8 BOM so Bangla names survive.

**Reads** are recorded by a global interceptor that stays inert unless a handler
carries `@LogDataAccess({ resource, action })` — so adding a new sensitive
endpoint to the log is one line on that handler, and ordinary traffic is
untouched. The write is fire-and-forget; a logging failure never fails the read.

Currently marked: customer list (`list`), single customer (`view`), export
(`export`).

## Reading the log

`/admin/users/data-access` shows, for the chosen period:

- **Totals** — records read today, distinct readers, exports today, biggest
  single read, rows exported.
- **By reader** — records, today's count, **their own daily average**, biggest
  single read, exports. Today's figure turns red when it is more than triple
  that person's own norm; that ratio is the signal, not the raw number.
- **The log itself** — one row per read: when, who, what, how many records,
  which filters, from which IP. Filterable by action and by size ("500+
  records"), and by reader.

The log is append-only from the application's side: nothing in the code updates
or deletes a row except the nightly prune of entries older than a year.

## Permissions

Both appear on the Role Permissions page:

| Slug | Module | Grants |
|---|---|---|
| `export-customers` | `customers` | Download customer CSVs; every export is recorded |
| `view-data-access-log` | `data-access` | See who has been reading and exporting, and how much |

Granted to `super-admin` and `admin` only by the migration. **This is a change in
behaviour**: exporting used to be available to anyone who could open the CRM
customers page. If a team genuinely needs it, grant `export-customers` to that
role from the Role Permissions page — deliberately, and knowing every download
is now attributable.

## What this does not do

It does not stop someone reading customers one page at a time, and it never
will — that is the job they do. What it changes is that bulk collection now
looks different from normal work: hundreds of logged requests, or an export with
a name attached. Pair it with the least-privilege question the numbers raise —
whether 34 people need the whole customer base at all.
