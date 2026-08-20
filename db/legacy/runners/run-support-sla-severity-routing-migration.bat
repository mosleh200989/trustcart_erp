@echo off
echo =====================================================
echo Running Support SLA/Severity/Group Routing Migration
echo =====================================================
echo.

cd /d "%~dp0"

echo Connecting to PostgreSQL and running migration...
psql -h 127.0.0.1 -U postgres -d trustcart_erp -f support-sla-severity-routing-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================
    echo Migration completed successfully!
    echo =====================================================
    echo.
    echo New fields added to support_tickets:
    echo - severity
    echo - support_group
    echo - first_response_due_at
    echo - resolution_due_at
    echo - resolved_at
    echo - sla_breached
    echo =====================================================
) else (
    echo.
    echo =====================================================
    echo Migration failed! Please check the error above.
    echo =====================================================
)

pause
