# Database backups

**To pull a copy of the live database onto your machine:**

```powershell
powershell -ExecutionPolicy Bypass -File "E:\TrustCart\trustcart_erp2\trustcart_erp\scripts\fetch-backup.ps1"
```

It lands in `E:\TrustCart\backups`. That is the whole thing — the rest of this
page is detail for when you need it.

---

## What happens automatically

A cron job on the VPS backs up the database every night.

| | |
| --- | --- |
| When | 20:30 UTC = **02:30 Asia/Dhaka**, nightly |
| Script | `backend/scripts/backup-db.sh` |
| Lands in | `/home/samin/db_backups/` on the VPS |
| Named | `trustcart_trustcart_erp_YYYY-MM-DD_HHMM.dump` |
| Format | `pg_dump -Fc` (compressed custom format, ~440 MB) |
| Kept for | 14 days, then deleted |
| Log | `/home/samin/db_backups/backup.log` |

The script will not let a bad dump replace a good one. It dumps to a temp file,
checks the size is sane, and confirms `pg_restore` can read it. Only then does
it become a backup. A dump that fails those checks is kept as `.BAD` and the
run exits non-zero.

Two backups never overlap — a slow dump cannot collide with the next night's run.

## Pulling a copy to your machine

`scripts/fetch-backup.ps1` copies the newest backup off the VPS.

```powershell
cd E:\TrustCart\trustcart_erp2\trustcart_erp\scripts

.\fetch-backup.ps1            # download the newest backup
.\fetch-backup.ps1 -Fresh     # take a NEW backup on the VPS first, then download
.\fetch-backup.ps1 -List      # show both ends, download nothing
```

Other flags: `-Force` re-downloads something you already have, `-KeepLocal 5`
deletes older local copies keeping the newest 5, `-Destination <path>` saves
somewhere other than `E:\TrustCart\backups`.

**Run `-Fresh` before anything risky** — a migration, a deploy, a bulk data
change. Use the plain form for routine copies.

The script downloads to a `.partial` file and only renames it into place once
the size *and* a SHA-256 checksum both match the VPS. A transfer that fails
verification is kept as `.BAD`, never under a normal filename. Re-running skips
a backup you already hold rather than re-transferring 440 MB.

## Checking the backups are actually healthy

A backup system that fails silently is worse than none, because you think you
are covered. Check occasionally:

```bash
ssh samin@72.62.244.67 'ls -lah ~/db_backups/*.dump | tail -5; echo; tail -20 ~/db_backups/backup.log'
```

What you want to see: a new file each morning, ~440 MB, and log lines reading
`ok:`. Warning signs:

- **No file from last night** — cron did not run, or the script failed. Check
  `~/db_backups/cron.log`.
- **A `.BAD` file** — the dump was produced but could not be verified.
- **A dump much smaller than ~440 MB** — investigate before trusting it.

`.\fetch-backup.ps1 -List` also warns if the newest backup on the VPS is more
than a day old.

## Restoring

### Test a backup without touching anything live

The only way to know a backup works is to restore it. Worth doing occasionally.

```bash
createdb trustcart_restore_test
pg_restore -d trustcart_restore_test --no-owner --no-privileges -j 4 "E:\TrustCart\backups\<file>.dump"
psql -d trustcart_restore_test -c "select count(*) from pg_tables where schemaname='public'"
```

Expect **266+ tables**. Drop it afterwards with `dropdb trustcart_restore_test`.

> The VPS runs PostgreSQL 18 and your machine has 17. PG17 tools can read these
> dumps, but restore into **PG18** where you can — a full restore into 17 may
> trip on newer syntax.

### Restore over the live database

Destructive and takes the site down. Do not do this to fix a small mistake —
prefer a targeted `UPDATE`, or restore into a scratch database and copy the rows
you need across.

```bash
ssh samin@72.62.244.67
pm2 stop nest-backend                          # stop writes first
pg_dump -Fc -d trustcart_erp -f ~/db_backups/before_restore_$(date +%F_%H%M).dump
dropdb trustcart_erp && createdb trustcart_erp
pg_restore -d trustcart_erp --no-owner --no-privileges -j 4 ~/db_backups/<file>.dump
pm2 start nest-backend
```

Take that pre-restore dump. If the backup turns out to be older or worse than
you thought, it is the only way back.

### Rebuild on a new server

```bash
createdb trustcart_erp
pg_restore -d trustcart_erp --no-owner --no-privileges -j 4 <newest>.dump
cd backend && npm run db:status     # expect: all applied, 0 pending
```

The dump contains the `schema_migrations` ledger, so migration tracking comes
back with it. See [MIGRATIONS.md](MIGRATIONS.md).

If you only have the schema and no data, `db/baseline/2026-08-20-schema.sql`
rebuilds the structure — but it is schema only, no rows.

## Known gaps

**Backups live on the same machine as the database.** The nightly job writes to
the VPS itself. If that server is lost, the backups go with it. Running
`fetch-backup.ps1` is what currently protects you against that — and it only
protects you as often as you remember to run it.

Closing this properly means either a scheduled task on a machine that is always
on, or pushing dumps to object storage from the VPS. Both need credentials and a
decision about where the data is allowed to live.

**Backups are not encrypted.** They contain customer names, phone numbers and
order history. Treat the files accordingly — and think about that before copying
them anywhere shared.
