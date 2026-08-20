# Contributing

## Branching

`main` is deployed to production by a manual `git pull` on the VPS. There is no
staging environment, so anything merged to `main` is one command away from
customers.

Work on a branch, open a pull request, merge when reviewed.

```bash
git checkout -b short-description-of-the-change origin/main
```

## Changing the database schema

**Never** run SQL against a database by hand, and never add a loose `.sql` file.
Schema history is tracked in a ledger; anything applied outside it is invisible
to every other environment.

```bash
cd backend
npm run db:new -- add-brand-id-to-orders   # creates db/migrations/YYYY-MM-DD-NN-*.sql
# write the SQL
npm run db:up -- --dry-run                 # check what would run
npm run db:up                              # apply locally
```

Write migrations to be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) so
a partial failure can be retried. Prefer additive changes — code can be rolled
back by checking out an older commit, but a migration that dropped a column
cannot.

**Never edit a migration that has already been applied.** Environments have
already run it; changing the file makes them silently disagree. Write a new one.
`npm run db:status` reports this as *drifted* and `db:up` refuses to run.

Full detail in [docs/operations/migrations.md](docs/operations/migrations.md).

## Before deploying anything risky

```powershell
.\scripts\fetch-backup.ps1 -Fresh
```

Takes a fresh backup on the server and pulls a verified copy to your machine.

## Documentation

Write documents in the present tense, describing how the system **is**. What you
*did* belongs in the commit message and the pull request — those are dated,
attributed, and attached to the diff.

If a document needs a date or a phase number in its filename to make sense, it is
a report. It does not belong in `docs/`.

Add new documents under the right folder in `docs/` and link them from
[docs/README.md](docs/README.md). Then:

```bash
node scripts/check-doc-links.js
```

This fails on any broken relative link outside the archive. Run it after moving
or renaming anything.

## Things that will bite you

**One backend serves every brand.** Allowed origins are a hardcoded list in
`backend/src/main.ts`. Adding a storefront means editing that file, not just
nginx.

**The Pathao webhook is strict.** It verifies a secret header verbatim and
expects a fixed response body. Read
`backend/src/common/constants/pathao-webhook.constants.ts` and the guard beside
it before touching it.

**`assalamah-api` and `assalamah-web` in pm2 are a different product.** They
share the VPS with TrustCart. Do not restart them by reflex.

**Build artefacts are not tracked.** `frontend/tsconfig.tsbuildinfo`, dumps,
`nohup.out` and `.env` files are gitignored so the deployed checkout stays
byte-identical to the repo. Keep it that way — a modified tracked file on the
server means code was changed in production outside git.

## Checks

```bash
cd backend  && npm run lint && npm test
cd frontend && npm run type-check && npm run lint
cd backend  && npm run db:check          # no .sql outside db/migrations
node scripts/check-doc-links.js          # no broken doc links
```

There is no CI yet, so these are worth running by hand before opening a pull
request.
