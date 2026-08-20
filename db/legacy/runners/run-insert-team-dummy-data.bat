@echo off
echo ================================================
echo Inserting Team-Based Lead Management Dummy Data
echo ================================================
echo.
echo WARNING: This is DUMMY DATA for testing only!
echo You MUST delete this before going to production.
echo.
pause

echo Step 1: Copying SQL file to PostgreSQL container...
docker cp backend\insert-team-lead-dummy-data.sql trustcart_erp-postgres-1:/tmp/
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy SQL file
    pause
    exit /b 1
)
echo ✓ SQL file copied successfully
echo.

echo Step 2: Inserting dummy data...
docker-compose exec -T postgres psql -U postgres -d trustcart_erp -f /tmp/insert-team-lead-dummy-data.sql
if %errorlevel% neq 0 (
    echo ERROR: Failed to insert data
    pause
    exit /b 1
)
echo ✓ Dummy data inserted successfully
echo.

echo ================================================
echo Dummy Data Inserted!
echo ================================================
echo.
echo What you can now test:
echo.
echo 1. Lead Assignment Dashboard
echo    - View 5 unassigned leads (customers 1-5)
echo    - Different lead scores (5-9)
echo    - Various sources (Google, Facebook, Instagram, Direct)
echo.
echo 2. Team Data Collection
echo    - 5 pending assignments across different teams
echo    - 2 completed assignments
echo.
echo 3. Customer Tier Management
echo    - 7 customers with different tiers
echo    - Active/Inactive status
echo    - Engagement scores
echo.
echo 4. Incomplete Orders
echo    - 3 abandoned carts
echo    - Different abandonment stages
echo.
echo ⚠️  IMPORTANT: Delete this data before production!
echo     Instructions are in the SQL file at the bottom.
echo.
pause
