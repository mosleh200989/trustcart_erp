@echo off
echo ================================================
echo Running Phase 1 CRM Enhancements Migration
echo ================================================
echo.

cd /d %~dp0backend
node run-phase1-crm-enhancements-migration.js

echo.
echo ================================================
echo Done
echo ================================================
pause
