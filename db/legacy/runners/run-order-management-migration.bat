@echo off
echo =====================================================
echo Running Order Management Enhancement Migration
echo =====================================================
echo.

cd /d "%~dp0"

echo Connecting to PostgreSQL and running migration...
psql -h 127.0.0.1 -U postgres -d trustcart_erp -f order-management-enhancement-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================
    echo Migration completed successfully!
    echo =====================================================
    echo.
    echo New features added:
    echo - Order product management (add/edit/delete)
    echo - Courier integration and tracking
    echo - User source tracking (IP, geo, browser, device)
    echo - Internal notes management
    echo - Complete activity log/audit trail
    echo - Order status management (approve/hold/cancel)
    echo =====================================================
) else (
    echo.
    echo =====================================================
    echo Migration failed! Please check the error above.
    echo =====================================================
)

pause
