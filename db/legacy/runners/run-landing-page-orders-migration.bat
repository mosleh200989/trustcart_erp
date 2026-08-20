@echo off
echo Running Landing Page Orders migration...
cd /d "%~dp0"
set PGPASSWORD=c0mm0n
psql -U postgres -d trustcart_erp -f db\migrations\create_landing_page_orders.sql
echo.
echo Migration complete!
pause
