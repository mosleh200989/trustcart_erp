@echo off
psql -U postgres -d trustcart_erp -f add-slug-migration.sql
pause
