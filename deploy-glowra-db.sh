#!/bin/bash
# ============================================
# Deploy Natural Glowra Database on VPS
# Run once after pulling the multi-tenant code
#
# Usage:  chmod +x deploy-glowra-db.sh && ./deploy-glowra-db.sh
# ============================================

set -e

DB_USER="${DB_USER:-postgres}"
SOURCE_DB="trustcart_erp"
TARGET_DB="natural_glowra"

echo "=== Step 1: Create database '$TARGET_DB' (if not exists) ==="
if sudo -u "$DB_USER" psql -lqt | cut -d \| -f 1 | grep -qw "$TARGET_DB"; then
    echo "Database '$TARGET_DB' already exists — skipping creation."
else
    sudo -u "$DB_USER" createdb "$TARGET_DB"
    echo "Database '$TARGET_DB' created."
fi

echo ""
echo "=== Step 2: Check if schema already exists ==="
TABLE_COUNT=$(sudo -u "$DB_USER" psql -d "$TARGET_DB" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "Database '$TARGET_DB' already has $TABLE_COUNT tables — skipping schema copy."
    echo "If you want to re-copy, drop and recreate the DB first."
else
    echo "Copying schema from '$SOURCE_DB' to '$TARGET_DB'..."
    sudo -u "$DB_USER" pg_dump "$SOURCE_DB" --schema-only --no-owner --no-acl \
        | sudo -u "$DB_USER" psql -d "$TARGET_DB" -q
    
    NEW_COUNT=$(sudo -u "$DB_USER" psql -d "$TARGET_DB" -tAc \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
    echo "Done — $NEW_COUNT tables created in '$TARGET_DB'."
fi

echo ""
echo "=== Step 3: Ensure uuid-ossp extension ==="
sudo -u "$DB_USER" psql -d "$TARGET_DB" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

echo ""
echo "✅ Natural Glowra database is ready."
echo ""
echo "Next steps:"
echo "  1. Update backend/.env on VPS with GLOWRA_DB_* variables"
echo "  2. Restart the backend: pm2 restart backend"
echo "  3. Start glowra frontend on port 3002: PORT=3002 pm2 start npm --name glowra-frontend -- start"
