@echo off
echo Running Fraud Checks Table Migration...
cd /d "%~dp0"
psql -U postgres -d trustcart_local -f "db\migrations\2026-02-05-create-fraud-checks-table.sql"
echo Migration complete!
pause
