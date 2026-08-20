@echo off
echo ========================================
echo Product Images Migration
echo ========================================
echo.
echo This will add:
echo - product_images table for multiple images
echo - additional_info column to products table
echo - Migrate existing images to new table
echo.
pause

psql -U postgres -d trustcart_erp -f product-images-migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Migration failed! Please check errors above.
    echo ========================================
)

pause
