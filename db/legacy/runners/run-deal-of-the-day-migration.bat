@echo off
echo Running Deal of the Day migration...
psql -U postgres -d trustcart_erp -f deal-of-the-day-migration.sql
echo Migration completed!
pause
