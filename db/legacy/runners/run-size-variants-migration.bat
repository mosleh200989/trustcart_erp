@echo off
echo Running migration: Add size_variants column to products table
echo ================================================

cd /d "%~dp0"

REM Load environment variables from .env file if exists
if exist "..\backend\.env" (
    for /f "tokens=1,2 delims==" %%a in (..\backend\.env) do (
        if "%%a"=="DB_HOST" set DB_HOST=%%b
        if "%%a"=="DB_PORT" set DB_PORT=%%b
        if "%%a"=="DB_USERNAME" set DB_USERNAME=%%b
        if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
        if "%%a"=="DB_DATABASE" set DB_DATABASE=%%b
    )
)

REM Use defaults if not set
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_USERNAME%"=="" set DB_USERNAME=postgres
if "%DB_DATABASE%"=="" set DB_DATABASE=trustcart_erp

echo.
echo Database: %DB_DATABASE%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USERNAME%
echo.

REM Set PGPASSWORD for psql
set PGPASSWORD=%DB_PASSWORD%

REM Run the migration
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USERNAME% -d %DB_DATABASE% -f "db\migrations\add-size-variants-column.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo Migration completed successfully!
) else (
    echo.
    echo ================================================
    echo Migration failed. Please check the error messages above.
)

echo.
pause
