@echo off
title TrustCart ERP - Quick Test
color 0A

echo.
echo ================================
echo   TRUSTCART ERP - QUICK TEST
echo ================================
echo.

echo Testing Backend...
curl -s http://localhost:3001/api/products/test
echo.

echo.
echo Testing Customers API...
powershell -Command "try { $r = Invoke-RestMethod 'http://localhost:3001/api/customers'; Write-Host 'SUCCESS: Found' $r.Count 'customers' -ForegroundColor Green } catch { Write-Host 'ERROR: API not responding' -ForegroundColor Red }"

echo.
echo ================================
echo   ACCESS POINTS
echo ================================
echo Frontend:      http://localhost:3000
echo Backend:       http://localhost:3001/api
echo Customer Login: http://localhost:3000/customer/login
echo.

echo.
echo ================================
echo   CUSTOMER PORTAL MENU
echo ================================
echo 1. Dashboard        /customer/dashboard
echo 2. My Profile       /customer/profile
echo 3. My Addresses     /customer/addresses
echo 4. Wallet ^& Points  /customer/wallet
echo 5. My Orders        /customer/orders
echo 6. Support Tickets  /customer/support
echo 7. Referral Link    /customer/referrals
echo.

echo Test Customers:
echo - ahmed.karim@email.com
echo - john.doe@example.com
echo - sarah.khan@example.com
echo.

pause
