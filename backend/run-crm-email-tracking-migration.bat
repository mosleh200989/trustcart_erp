@echo off
echo =====================================================
echo Running CRM Email Tracking Migration
echo =====================================================
echo.

cd /d "%~dp0"

echo Connecting to PostgreSQL and running migration...
psql -h 127.0.0.1 -U postgres -d trustcart_erp -f crm-email-tracking-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================
    echo Migration completed successfully!
    echo =====================================================
) else (
    echo.
    echo =====================================================
    echo Migration failed! Please check the error above.
    echo =====================================================
)

pause
