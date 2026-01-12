@echo off
echo ================================================
echo Running Sales Orders Schema Catch-up Migration
echo File: backend\migrations\2026-01-12_sales_orders_schema_catchup.sql
echo ================================================
echo.

echo Step 1: Copying migration file to PostgreSQL container...
docker cp backend\migrations\2026-01-12_sales_orders_schema_catchup.sql trustcart_erp-postgres-1:/tmp/
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy migration file
    echo - Is Docker running?
    echo - Is the container name correct? (trustcart_erp-postgres-1)
    pause
    exit /b 1
)
echo Migration file copied successfully
echo.

echo Step 2: Running migration...
docker-compose exec -T postgres psql -U postgres -d trustcart_erp -f /tmp/2026-01-12_sales_orders_schema_catchup.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration failed
    echo - Is docker-compose up running?
    echo - Does the DB name/user match? (trustcart_erp/postgres)
    pause
    exit /b 1
)
echo Migration completed successfully
echo.

echo ================================================
echo Migration Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Start backend: cd backend ^&^& npm run start:dev
echo.
pause
