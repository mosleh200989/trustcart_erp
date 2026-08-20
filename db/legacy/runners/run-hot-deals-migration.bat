@echo off
echo Running Hot Deals Migration...
cd /d "%~dp0backend"
psql -U postgres -d trustcart_erp -f migrations/hot-deals-migration.sql
echo Migration complete!
pause
