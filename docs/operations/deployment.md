# Deployment

There is no CI/CD. Deploying is a manual `git pull` and restart on the VPS.

## The server

| | |
| --- | --- |
| Host | `samin@72.62.244.67` (Ubuntu 24.04) |
| Repo | `/var/www/trustcart/trustcart_erp`, tracking `main` |
| Process manager | pm2, enabled at boot via systemd |
| Web server | nginx, one config per domain in `/etc/nginx/sites-enabled/` |
| Database | PostgreSQL 18, local to the box |
| Node | v20 |

pm2 runs four processes. **Two of them are a different product** — `assalamah-api`
and `assalamah-web` live in `/var/www/assalamah` and have nothing to do with
TrustCart. Do not restart them by reflex.

```
nest-backend    TrustCart API      /var/www/trustcart/trustcart_erp/backend   port 3001
next-frontend   TrustCart web      /var/www/trustcart/trustcart_erp/frontend
assalamah-api   unrelated product  /var/www/assalamah/current/backend
assalamah-web   unrelated product  /var/www/assalamah/current
```

One backend serves every brand domain — trustcart.com.bd, herbolin.com,
veshoj.site, kasrioil.com, naturalglowra.com, arabiankhalta.com and others. The
allowed origins are a hardcoded list in [backend/src/main.ts](../../backend/src/main.ts),
so **adding a brand means editing that file**, not just nginx.

## Deploying

```bash
ssh samin@72.62.244.67
cd /var/www/trustcart/trustcart_erp
git pull

# only if backend dependencies or source changed
cd backend && npm install && npm run build

# only if frontend changed
cd ../frontend && npm install && npm run build

cd ../backend && npm run db:status     # confirm no unexpected pending migrations
npm run db:up                          # apply any that are pending

pm2 restart nest-backend
pm2 restart next-frontend
pm2 logs nest-backend --lines 50       # watch for a clean boot
```

Check `db:status` **before** restarting. If migrations are pending, the new code
may expect columns that do not exist yet.

## Before you deploy anything risky

```powershell
.\scripts\fetch-backup.ps1 -Fresh
```

Takes a fresh database backup and pulls a copy to your machine. See
[backups.md](backups.md).

## Rolling back

```bash
cd /var/www/trustcart/trustcart_erp
git log --oneline -5
git checkout <previous-commit>
cd backend && npm run build && pm2 restart nest-backend
```

Code rolls back cleanly. **Migrations do not.** A migration that dropped or
rewrote data is not undone by checking out an older commit — that needs a
database restore. This is why migrations should be additive wherever possible;
see [migrations.md](migrations.md).

## Keeping the checkout clean

The deployed tree must match the repo exactly, `.env` files aside. Check with:

```bash
ssh samin@72.62.244.67 'cd /var/www/trustcart/trustcart_erp && git status --porcelain'
```

Anything other than `.env` entries means something was edited on the server or
left behind — investigate rather than ignoring it. Dumps, logs and editor
leftovers are gitignored, so they will not appear; a modified tracked file is a
real signal that code was changed in production without going through git.

## Known fragilities

**pm2 processes were started ad hoc**, not from an ecosystem file. The process
list survives reboot because `pm2 save` was run and the systemd unit is enabled,
but the exact start commands are not recorded anywhere in the repo. If the pm2
state is ever lost, they have to be reconstructed by hand. An
`ecosystem.config.js` would fix this.

**Everything shares one box** — database, both applications, nginx. There is no
staging environment, so `main` goes straight to production.

**No health check or alerting.** Nothing tells you the backend is down except a
customer noticing.
