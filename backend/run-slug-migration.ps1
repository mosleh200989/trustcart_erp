# Slug Migration Script
Set-Location "c:\xampp\htdocs\trustcart_erp\backend"

Write-Host "Running slug migration..." -ForegroundColor Cyan

$env:PGPASSWORD = "c0mm0n"
& "psql" "-U" "postgres" "-d" "trustcart_erp" "-f" "add-slug-migration.sql"

Write-Host "`nMigration complete! Checking slug column..." -ForegroundColor Green

& "psql" "-U" "postgres" "-d" "trustcart_erp" "-c" "SELECT id, name_en, slug FROM products LIMIT 5;"

$env:PGPASSWORD = ""
