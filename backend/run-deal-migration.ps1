# Deal of the Day Migration Script
# Run this script to create the deal_of_the_day table

Write-Host "Running Deal of the Day migration..." -ForegroundColor Cyan

# Try to find PostgreSQL
$pgPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin",
    "C:\Program Files (x86)\PostgreSQL\16\bin",
    "C:\Program Files (x86)\PostgreSQL\15\bin"
)

$psqlPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path "$path\psql.exe") {
        $psqlPath = "$path\psql.exe"
        break
    }
}

if ($psqlPath) {
    Write-Host "Found PostgreSQL at: $psqlPath" -ForegroundColor Green
    & $psqlPath -U postgres -d trustcart_erp -f deal-of-the-day-migration.sql
    Write-Host "Migration completed!" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL not found. Trying Docker..." -ForegroundColor Yellow
    
    # Try Docker
    try {
        Get-Content deal-of-the-day-migration.sql | docker exec -i trustcart_postgres psql -U postgres -d trustcart_erp
        Write-Host "Migration completed via Docker!" -ForegroundColor Green
    } catch {
        Write-Host "Error: Could not find PostgreSQL or Docker." -ForegroundColor Red
        Write-Host "Please run this SQL manually in your database:" -ForegroundColor Yellow
        Write-Host "File: deal-of-the-day-migration.sql" -ForegroundColor Yellow
    }
}

pause
