@echo off
echo ================================================
echo  Banner System Migration
echo ================================================
echo.
echo This will create banner and category tables
echo and populate them with real product data.
echo.
pause

cd backend

echo.
echo Running migration...
echo.

psql -U postgres -d trustcart_erp -f banner-system-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo  Migration completed successfully!
    echo ================================================
    echo.
    echo Next steps:
    echo 1. Restart the backend server
    echo 2. Visit http://localhost:3000/admin/banners to manage banners
    echo 3. Visit http://localhost:3000 to see the new carousel
    echo.
) else (
    echo.
    echo ================================================
    echo  Migration failed!
    echo ================================================
    echo.
    echo Please check:
    echo 1. PostgreSQL is running
    echo 2. Database 'trustcart_erp' exists
    echo 3. User 'postgres' has correct permissions
    echo.
)

pause
