#!/usr/bin/env bash
#
# Nightly TrustCart database backup.
#
# Dumps to a temp file, verifies the dump is readable before it counts as a
# backup, then rotates old ones. A dump that cannot be verified is kept with a
# .BAD suffix rather than silently replacing a good backup.
#
# Install (as the samin user):
#   crontab -e
#   30 20 * * * /var/www/trustcart/trustcart_erp/backend/scripts/backup-db.sh
#   # 20:30 UTC = 02:30 Asia/Dhaka. The server clock is UTC.
#
# NOTE: these backups live on the same machine as the database. If the server
# is lost, they are lost with it. An offsite copy is still needed.

set -euo pipefail

BACKEND_DIR="${BACKEND_DIR:-/var/www/trustcart/trustcart_erp/backend}"
BACKUP_DIR="${BACKUP_DIR:-/home/samin/db_backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MIN_BYTES="${MIN_BYTES:-52428800}"   # 50 MB; a healthy dump is ~440 MB
LOG="${BACKUP_DIR}/backup.log"
LOCK="${BACKUP_DIR}/.backup.lock"

mkdir -p "$BACKUP_DIR"

log() { echo "$(date -u '+%Y-%m-%d %H:%M:%SZ')  $*" | tee -a "$LOG"; }
die() { log "FAILED: $*"; exit 1; }

# Never let two backups overlap (a slow dump must not collide with the next run).
exec 9>"$LOCK"
flock -n 9 || { log "another backup is still running; skipping this run"; exit 0; }

[ -f "${BACKEND_DIR}/.env" ] || die "no .env at ${BACKEND_DIR}"

# Read connection settings without echoing the password anywhere.
envval() {
  grep -E "^${1}=" "${BACKEND_DIR}/.env" | tail -1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DB_HOST="$(envval DB_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(envval DB_PORT)"; DB_PORT="${DB_PORT:-5432}"
DB_USER="$(envval DB_USER)"; DB_USER="${DB_USER:-postgres}"
DB_NAME="$(envval DB_NAME)"; DB_NAME="${DB_NAME:-trustcart_erp}"
PGPASSWORD="$(envval DB_PASSWORD)"; export PGPASSWORD
[ -n "$PGPASSWORD" ] || die "DB_PASSWORD is empty in .env"

STAMP="$(date -u '+%Y-%m-%d_%H%M')"
FINAL="${BACKUP_DIR}/trustcart_${DB_NAME}_${STAMP}.dump"
TMP="${FINAL}.partial"

log "starting backup of ${DB_NAME} -> $(basename "$FINAL")"

trap 'rm -f "$TMP"' EXIT

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -Fc -f "$TMP" 2>>"$LOG" || die "pg_dump returned non-zero"

SIZE="$(stat -c %s "$TMP")"
[ "$SIZE" -ge "$MIN_BYTES" ] || die "dump is only ${SIZE} bytes (expected >= ${MIN_BYTES})"

# A dump that cannot be listed is not a backup.
if ! pg_restore -l "$TMP" >/dev/null 2>>"$LOG"; then
  mv "$TMP" "${FINAL}.BAD"
  trap - EXIT
  die "dump failed verification; kept as $(basename "${FINAL}.BAD")"
fi

mv "$TMP" "$FINAL"
trap - EXIT
log "ok: $(basename "$FINAL") ($(du -h "$FINAL" | cut -f1)), $(pg_restore -l "$FINAL" | wc -l) objects"

# Rotate. Only prune verified backups produced by this script.
DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name "trustcart_${DB_NAME}_*.dump" \
  -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)"
[ "$DELETED" -gt 0 ] && log "pruned ${DELETED} backup(s) older than ${RETENTION_DAYS} days"

log "free space: $(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')"
exit 0
