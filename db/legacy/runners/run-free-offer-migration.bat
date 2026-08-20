@echo off
echo Running Free Offer Landing Page Migration...

SET PGPASSWORD=postgres
psql -U postgres -d trustcart_erp -f db\migrations\seed_free_offer_landing_page.sql

if %ERRORLEVEL% equ 0 (
    echo Migration completed successfully!
) else (
    echo Migration failed with error code %ERRORLEVEL%.
)
pause
