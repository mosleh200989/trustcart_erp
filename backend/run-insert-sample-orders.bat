@echo off
echo =====================================================
echo Inserting Sample Order Data
echo =====================================================
echo.

cd /d "%~dp0"

echo Connecting to PostgreSQL and inserting sample data...
psql -h 127.0.0.1 -U postgres -d trustcart_erp -f insert-sample-orders.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================
    echo Sample orders inserted successfully!
    echo =====================================================
    echo.
    echo 5 Sample Orders Created:
    echo 1. Pending Order - From Facebook Ads (Mobile)
    echo 2. Approved Order - From Google Ads (Desktop)  
    echo 3. Shipped Order - With Steadfast courier tracking
    echo 4. Hold Order - Fraud investigation (Same IP)
    echo 5. Delivered Order - Complete delivery history
    echo.
    echo All orders have:
    echo - Multiple products with quantities
    echo - Complete user tracking (IP, location, browser)
    echo - Activity logs with timestamps
    echo - Courier tracking history
    echo =====================================================
    echo.
    echo Now go to: http://localhost:3000/admin/sales
    echo Click "View" on any order to see the new features!
    echo =====================================================
) else (
    echo.
    echo =====================================================
    echo Failed to insert sample data! 
    echo Check the error above.
    echo =====================================================
)

pause
