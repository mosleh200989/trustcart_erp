@echo off
echo =====================================================
echo Running Telephony Advanced Reporting Migration
echo =====================================================
echo.

cd /d "%~dp0"

echo Connecting to PostgreSQL and running migration...
psql -h 127.0.0.1 -U postgres -d trustcart_erp -f telephony-integration-migration.sql
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =====================================================
    echo Base telephony migration failed! Please check above.
    echo =====================================================
    pause
    exit /b 1
)

psql -h 127.0.0.1 -U postgres -d trustcart_erp -f telephony-advanced-reporting-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================
    echo Migration completed successfully!
    echo =====================================================
    echo.
    echo Updates:
    echo - telephony_calls: queue_name, trunk_name, wait_seconds, hold_seconds, disposition
    echo - telephony_agent_presence_events: created for login/logout/break reporting
    echo =====================================================
) else (
    echo.
    echo =====================================================
    echo Migration failed! Please check the error above.
    echo =====================================================
)

pause
