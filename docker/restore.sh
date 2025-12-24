# PostgreSQL Database Restore Script
# Usage: bash restore.sh backups/trustcart_erp_backup.sql.gz

if [ -z "$1" ]; then
    echo "Usage: bash restore.sh <backup_file>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "♻️  Restoring PostgreSQL database..."

# Check if file is gzipped
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -U trustcart_user -d trustcart_erp
else
    psql -U trustcart_user -d trustcart_erp < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ Restore successful"
else
    echo "❌ Restore failed"
    exit 1
fi
