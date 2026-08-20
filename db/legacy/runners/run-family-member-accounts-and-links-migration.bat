@echo off
echo ================================================
echo Running Family Member Accounts + Links Migration
echo ================================================
echo.

echo Step 1: Copying migration file to PostgreSQL container...
docker cp backend\family-member-accounts-and-bidirectional-links.sql trustcart_erp-postgres-1:/tmp/
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy migration file
    pause
    exit /b 1
)
echo ^✓ Migration file copied successfully
echo.

echo Step 2: Running migration...
docker-compose exec -T postgres psql -U postgres -d trustcart_erp -f /tmp/family-member-accounts-and-bidirectional-links.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration failed
    pause
    exit /b 1
)
echo ^✓ Migration completed successfully
echo.

echo ================================================
echo Migration Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Start backend: cd backend ^&^& npm run start:dev
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo.
pause
