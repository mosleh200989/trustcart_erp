@echo off
setlocal
pushd %~dp0

REM Ensure Docker is running (otherwise docker-compose exec will fail)
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Docker engine is not running.
    echo Please start Docker Desktop (Linux containers) and try again.
    popd
    pause
    exit /b 1
)
echo ================================================
echo Running Courier Configuration Migration
echo ================================================
echo.
echo Running migration...
docker-compose exec -T postgres psql -U postgres -d trustcart_erp < backend\courier-configuration-migration.sql
if %errorlevel% neq 0 (
    echo ERROR: Migration failed
    popd
    pause
    exit /b 1
)
echo ✓ Migration completed successfully
echo.
echo ================================================
echo Migration Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Start backend: cd backend ^&^& npm run start:dev
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo 3. Go to: http://localhost:3000/admin/settings/courier-configuration
echo.
popd
pause
