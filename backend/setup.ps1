#!/usr/bin/env powershell
# TrustCart ERP Backend Setup Script
# This script automates the backend setup process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TrustCart ERP - Backend Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node -v
if ($nodeVersion) {
    Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
}
else {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Write-Host ""
Write-Host "Navigating to backend directory..." -ForegroundColor Yellow
Set-Location -Path "c:\xampp\htdocs\trustcart_erp\backend"
Write-Host "✓ Current directory: $(Get-Location)" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Display next steps
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ensure PostgreSQL is running:"
Write-Host "   - Create database: trustcart_erp"
Write-Host "   - Create user: trustcart_user / trustcart_secure_password"
Write-Host ""
Write-Host "2. Load the database schema (optional, TypeORM will sync):"
Write-Host "   psql -U trustcart_user -d trustcart_erp -f docs\trustcart-erp-schema.sql"
Write-Host ""
Write-Host "3. Start the backend development server:"
Write-Host "   npm run start:dev"
Write-Host ""
Write-Host "4. Backend will be available at:"
Write-Host "   http://localhost:3000"
Write-Host ""
Write-Host "For more details, see: BACKEND_SETUP_GUIDE.md"
Write-Host ""
