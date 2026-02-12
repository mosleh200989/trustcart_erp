@echo off
echo Running Landing Pages migration...
cd /d "%~dp0"
set PGPASSWORD=c0mm0n
psql -U postgres -d trustcart_erp -f db\migrations\create_landing_pages.sql
echo Done!
pause
