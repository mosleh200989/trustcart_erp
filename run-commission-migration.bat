@echo off
echo Running Commission System Migration...
echo.

REM Set your PostgreSQL connection details here
SET PGHOST=localhost
SET PGPORT=5432
SET PGDATABASE=trustcart
SET PGUSER=postgres

echo Database: %PGDATABASE%
echo Host: %PGHOST%:%PGPORT%
echo.

cd /d "%~dp0backend"
psql -f commission-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Migration completed successfully!
    echo.
    echo Commission tables created:
    echo   - commission_settings: Stores commission rate configurations
    echo   - agent_commissions: Tracks commission earnings for each sale
    echo.
    echo RBAC permissions added:
    echo   - manage-commission-settings
    echo   - view-commission-reports
    echo   - approve-commissions
) else (
    echo.
    echo Migration failed! Please check your database connection.
)

pause
