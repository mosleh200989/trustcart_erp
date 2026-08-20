# TrustCart ERP

ERP and e-commerce platform for an organic grocery business in Bangladesh:
storefront, order management, CRM and call centre, inventory, HR, payroll and
accounting in one system.

One backend serves several brand storefronts — trustcart.com.bd, herbolin.com,
veshoj.site, kasrioil.com, naturalglowra.com and others — from a single
database.

## Operations — start here

The things you will need and will not remember:

| I want to... | Do this | Details |
| --- | --- | --- |
| **Pull a copy of the live database** | `powershell -ExecutionPolicy Bypass -File scripts\fetch-backup.ps1` | [backups](docs/operations/backups.md) |
| **Change the database schema** | `cd backend && npm run db:new -- <name>`, then `npm run db:up` | [migrations](docs/operations/migrations.md) |
| **Deploy to production** | `git pull`, build, `npm run db:up`, `pm2 restart` | [deployment](docs/operations/deployment.md) |

Backups run nightly at **02:30 Dhaka time** and are kept for 14 days. They sit
on the same server as the database, so pulling a copy down is what protects you
if that server is lost.

**Never apply a schema change by hand.** Migrations are tracked in a ledger;
anything applied outside it goes unrecorded and the next environment silently
diverges. `npm run db:check` fails if a `.sql` file appears outside
`db/migrations`.

## Stack

**Backend** — NestJS 10 (TypeScript), PostgreSQL 18 in production, TypeORM 0.3,
Redis with Bull for queues, Socket.IO for realtime, JWT auth via Passport.
41 modules, 166 entities. Swagger at `/api/docs`.

**Frontend** — Next.js 14 using the Pages Router, React 18, Tailwind CSS 3,
TypeScript 5, axios. 256 pages.

**Infrastructure** — a single Ubuntu VPS running pm2 and nginx. No CI/CD; deploys
are a manual `git pull` and restart.

## Getting started

Requires Node 20, PostgreSQL and Redis.

```bash
git clone git@github.com:mosleh200989/trustcart_erp.git
cd trustcart_erp
cp .env.example .env          # then fill in real values
```

Create the database and load the schema:

```bash
createdb trustcart_erp
psql -d trustcart_erp -f db/baseline/2026-08-20-schema.sql
cd backend && npm install && npm run db:adopt   # record the baseline as applied
npm run db:up                                   # apply anything newer
```

Run the two applications:

```bash
cd backend  && npm run start:dev     # API on :3001, docs at /api/docs
cd frontend && npm run dev           # web on :3000
```

> The baseline is schema only — no rows. Reference data the app needs to boot
> (RBAC permissions, roles, statuses) currently lives inside individual
> migrations, so `db:up` is what populates it.

## Repository layout

```
backend/      NestJS API — 41 modules under src/modules
frontend/     Next.js storefront and admin panel
db/
  migrations/ the single source of schema history (145 files)
  baseline/   schema snapshot for building a fresh database
  legacy/     pre-consolidation SQL, kept for reference, never run
docs/         documentation — see docs/README.md
scripts/      operational scripts (backup fetch, link check, page generators)
nginx/        nginx configuration
docker/       Docker and compose files
sapi/         SAPI plugin
```

## Documentation

**[docs/README.md](docs/README.md)** indexes everything — operations, per-module
guides, integration contracts, and the Bengali call-centre material.

Two conventions keep it usable:

**Documents describe the present tense.** What you *did* goes in the commit
message and the pull request, not into a `*_COMPLETE.md` file that can never be
corrected. Reports, daily updates and status snapshots live in
[docs/archive/](docs/archive/) and are not maintained.

**There is one entry point.** This file orients, `docs/README.md` routes. The
repository once had nineteen documents competing to be read first; please do not
add a twentieth.

There is no hand-written API reference on purpose — Swagger is generated from
the controllers and cannot drift.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching, schema changes and what to
check before deploying.

## License

© 2026 TrustCart. All rights reserved.
