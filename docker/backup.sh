# PostgreSQL Database Backup Script
# Usage: bash backup.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/trustcart_erp_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up PostgreSQL database..."
pg_dump -U trustcart_user -d trustcart_erp > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    gzip "$BACKUP_FILE"
    echo "📦 Compressed: ${BACKUP_FILE}.gz"
else
    echo "❌ Backup failed"
    exit 1
fi
