@echo off
cd /d C:\xampp\htdocs\trustcart_erp\backend
start "TrustCart Backend" cmd /k "npm run start:dev"

timeout /t 10

cd /d C:\xampp\htdocs\trustcart_erp\frontend
start "TrustCart Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo TrustCart ERP Services Starting...
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo ========================================
