$ErrorActionPreference = 'Stop'

Write-Host "Running loyalty wallet UUID migration..." -ForegroundColor Cyan

$migrationFile = Join-Path $PSScriptRoot 'loyalty-wallet-uuid-migration.sql'
if (-not (Test-Path $migrationFile)) {
  throw "Migration file not found: $migrationFile"
}

function Invoke-LocalPsql {
  param([string]$PsqlPath)

  Write-Host "Using local psql: $PsqlPath" -ForegroundColor Green
  & $PsqlPath -U postgres -d trustcart_erp -f $migrationFile
}

# 1) Try local psql (PATH)
try {
  $psqlCmd = Get-Command psql -ErrorAction Stop
  Invoke-LocalPsql -PsqlPath $psqlCmd.Source
  Write-Host "Migration completed successfully." -ForegroundColor Green
  exit 0
} catch {
  Write-Host "Local psql not available or failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2) Try docker compose service 'postgres'
try {
  Write-Host "Trying docker-compose exec postgres..." -ForegroundColor Cyan
  Get-Content $migrationFile | docker-compose exec -T postgres psql -U postgres -d trustcart_erp
  Write-Host "Migration completed successfully (docker-compose)." -ForegroundColor Green
  exit 0
} catch {
  Write-Host "docker-compose exec failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3) Try docker exec known container names
$containerCandidates = @(
  'trustcart_postgres',
  'trustcart_erp_db_1',
  'trustcart_erp_postgres_1',
  'trustcart_erp-postgres-1'
)

foreach ($name in $containerCandidates) {
  try {
    Write-Host "Trying docker exec $name..." -ForegroundColor Cyan
    Get-Content $migrationFile | docker exec -i $name psql -U postgres -d trustcart_erp
    Write-Host "Migration completed successfully (docker exec $name)." -ForegroundColor Green
    exit 0
  } catch {
    # keep trying
  }
}

throw "Could not run migration via local psql or Docker. Ensure Postgres is reachable and try again."
