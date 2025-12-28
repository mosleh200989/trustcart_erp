@echo off
echo ================================================
echo Running Team-Based Lead Management Migration
echo ================================================
echo.

echo Step 1: Copying migration file to PostgreSQL container...
docker cp backend\team-based-lead-management-migration.sql trustcart_erp-postgres-1:/tmp/
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy migration file
    pause
    exit /b 1
)
echo ✓ Migration file copied successfully
echo.

echo Step 2: Running migration...
docker-compose exec -T postgres psql -U postgres -d trustcart_erp -f /tmp/team-based-lead-management-migration.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration failed
    pause
    exit /b 1
)
echo ✓ Migration completed successfully
echo.

echo ================================================
echo Migration Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Start backend: cd backend && npm run start:dev
echo 2. Start frontend: cd frontend && npm run dev
echo 3. Access features:
echo    - Lead Assignment: http://localhost:3000/admin/crm/lead-assignment
echo    - Team Data Collection: http://localhost:3000/admin/crm/team-data-collection
echo    - Tier Management: http://localhost:3000/admin/crm/customer-tier-management
echo.
pause
