# Legacy SQL

One-off scripts from before migrations were consolidated into `db/migrations`.

**Do not run anything in here.** These are kept only so the reasoning behind old
schema changes stays searchable. Their effects are already baked into the
production database and into `db/baseline/`.

New schema changes go through `npm run db:new` — see [docs/MIGRATIONS.md](../../docs/MIGRATIONS.md).
