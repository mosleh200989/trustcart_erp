# Database migrations

One directory of ordered `.sql` files, one ledger table, one command.

```
db/migrations/     the only place migrations live. Never edit an applied file.
db/baseline/       schema-only dumps, used to build a fresh database.
db/legacy/         pre-2026-08 one-off scripts. Kept for reference. Never run.
```

## Day-to-day

```bash
cd backend
npm run db:status                       # what is applied, pending, or drifted
npm run db:new -- add-brand-id-to-orders  # scaffold a migration
npm run db:up -- --dry-run              # show what would run
npm run db:up                           # apply it
```

`db:new` creates `db/migrations/YYYY-MM-DD-NN-slug.sql`. The date and sequence
number are what order migrations, so never rename a file after committing it.

Write migrations to be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
A migration that fails halfway should be safe to re-run once you have fixed it.

### Transactions

The runner wraps each migration in a transaction and records the ledger row
inside that same transaction, so a failure can never leave a migration
half-applied but marked done. It runs a file **unwrapped** when the file:

- contains its own `BEGIN;`,
- uses `CREATE INDEX CONCURRENTLY` (Postgres forbids it inside a transaction), or
- carries the directive `-- migrate: no-transaction`.

Comments and string literals are ignored when detecting this, so a comment that
merely mentions `CONCURRENTLY` will not change how the file runs.

If an unwrapped migration fails it may be partially applied — the runner says so
explicitly. Prefer wrapped migrations.

### Never edit an applied migration

Editing a file that is already recorded as applied means environments have
silently diverged. `db:status` reports it as **drifted** and `db:up` refuses to
run. Fix it with a *new* migration. If the change was genuinely cosmetic (a
comment, whitespace):

```bash
npm run db:repair -- 2026-08-20-01-add-brand-id-to-orders.sql
```

Run `db:repair` against **every** environment, or they will drift apart again.

## How it works

`schema_migrations` records one row per applied file:

| column | meaning |
| --- | --- |
| `filename` | primary key; matches the file in `db/migrations` |
| `checksum` | first 16 hex chars of the SHA-256 of the file, CRLF-normalised |
| `applied_at`, `applied_by`, `duration_ms` | audit trail |
| `adopted` | `true` = assumed applied at cutover, never actually executed |

A concurrent-run guard (`pg_advisory_lock`) means two runners can never overlap,
so a deploy and a manual run cannot collide.

The runner refuses to touch a non-localhost database unless you pass `--yes`.

## Building a fresh database

```bash
createdb trustcart_erp
psql -d trustcart_erp -f db/baseline/<latest>-schema.sql
cd backend && npm run db:adopt   # mark everything in the baseline as applied
npm run db:up                    # apply anything newer than the baseline
```

Refresh the baseline occasionally (`npm run db:baseline`) so new environments do
not have to replay a long tail of migrations.

> The baseline is **schema only**. Reference data that the app needs to boot —
> RBAC permissions, roles, statuses — currently lives inside individual
> migrations, so a fresh database gets it only by replaying them. Extracting a
> proper `db/seed/` is worth doing separately.

---

# The cutover (one time)

Production already contains the result of years of ad-hoc scripts, and there is
no record of which ones ran. Rather than reconstruct that history, **the
production database is taken as the source of truth**: we snapshot its schema,
create the ledger, and mark every migration currently on disk as already
applied.

**The tradeoff, stated plainly:** if some migration file was never actually
applied to production, marking it adopted means it will now never run. That gap
already exists today — this makes it permanent for those files, in exchange for
every *future* change being tracked. Step 5 is how you find any such gap.

### 1. Back up production

Not a schema dump — a full backup you have restored at least once.

```bash
ssh samin@72.62.244.67
pg_dump -Fc -d trustcart_erp -f ~/trustcart_pre_cutover_$(date +%F).dump
```

### 2. Rehearse on a copy, not on production

```bash
createdb trustcart_cutover_test
pg_restore -d trustcart_cutover_test ~/trustcart_pre_cutover_*.dump
DB_NAME=trustcart_cutover_test npm run db:status
DB_NAME=trustcart_cutover_test npm run db:adopt
DB_NAME=trustcart_cutover_test npm run db:status   # expect: all applied, 0 pending
```

### 3. Consolidate the files

```bash
cd backend
node scripts/consolidate-migrations.js            # dry run, prints the plan
node scripts/consolidate-migrations.js --apply    # git mv, history preserved
```

This moves `backend/migrations/*` into `db/migrations/`, and everything else
into `db/legacy/`. Nothing is deleted, and no application code reads these files
at runtime, so nothing breaks. Commit this on its own branch.

### 4. Take the baseline and adopt, on production

```bash
npm run db:baseline               # writes db/baseline/<today>-schema.sql
npm run db:adopt -- --yes
npm run db:status                 # expect: N applied, 0 pending, 0 drifted
```

Commit the baseline file.

### 5. Find what production is actually missing

Adoption assumes the database matches the migrations. Verify that assumption
rather than trusting it — compare the 166 TypeORM entities against the live
schema and look for columns the code expects but the database lacks. Anything
you find becomes a new, ordinary migration.

This is also the check worth automating later: a CI job that boots the app
against a database built from `baseline + migrations` will catch this class of
drift permanently.

### 6. Close the old doors

Delete the `run-*.bat` / `run-*.ps1` / `run-*.js` one-off runners once step 3
has landed, so nobody applies a schema change outside the runner again.
