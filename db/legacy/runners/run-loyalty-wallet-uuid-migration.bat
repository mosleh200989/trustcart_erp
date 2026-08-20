@echo off
setlocal

echo Running loyalty wallet UUID migration...
echo File: loyalty-wallet-uuid-migration.sql
echo Database: trustcart_erp

REM If you need a password, set it before running:
REM   set PGPASSWORD=your_password

psql -U postgres -d trustcart_erp -f loyalty-wallet-uuid-migration.sql

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Migration failed. If you're using Docker, try the PowerShell runner:
  echo   powershell -ExecutionPolicy Bypass -File run-loyalty-wallet-uuid-migration.ps1
  exit /b %ERRORLEVEL%
)

echo.
echo Migration completed successfully.
endlocal
