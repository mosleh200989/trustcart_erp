<#
.SYNOPSIS
    Copy the newest TrustCart database backup from the VPS to this machine.

.DESCRIPTION
    Finds the most recent dump in the VPS backup directory, copies it down,
    and verifies the local copy byte for byte with a SHA-256 comparison. A
    transfer that does not verify is kept as .BAD rather than being mistaken
    for a good backup.

    Downloads to a .partial file and only renames it into place once verified,
    so an interrupted run can never leave a half-file that looks complete.

.PARAMETER Destination
    Local folder to store backups in. Created if missing.

.PARAMETER Fresh
    Run a new backup on the VPS first, then download that. Takes ~75 seconds
    longer. Without this, the newest existing backup is downloaded (normally
    from last night's 02:30 run).

.PARAMETER Force
    Download even if a verified local copy of that backup already exists.

.PARAMETER KeepLocal
    Delete older local backups, keeping this many newest. Default 0 = keep
    everything and delete nothing.

.PARAMETER List
    Show what is on the VPS and what is held locally, then exit. Downloads
    nothing.

.PARAMETER Uploads
    Also download the newest uploads archive (product images, issue
    attachments and voice notes) alongside the database dump.

.EXAMPLE
    .\fetch-backup.ps1
    Download last night's backup.

.EXAMPLE
    .\fetch-backup.ps1 -Fresh
    Take a brand new backup on the VPS, then download it.

.EXAMPLE
    .\fetch-backup.ps1 -List
    See what exists on both ends without transferring.
#>

[CmdletBinding()]
param(
    [string]$Destination = 'E:\TrustCart\backups',
    [string]$RemoteHost  = 'samin@72.62.244.67',
    [string]$RemoteDir   = '/home/samin/db_backups',
    [int]$KeepLocal      = 0,
    [switch]$Fresh,
    [switch]$Force,
    [switch]$List,
    [switch]$Uploads
)

$ErrorActionPreference = 'Stop'
$BackupScript = '/var/www/trustcart/trustcart_erp/backend/scripts/backup-db.sh'
$Pattern      = 'trustcart_trustcart_erp_*.dump'

function Write-Step  { param($m) Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok    { param($m) Write-Host "    $m" -ForegroundColor Green }
function Write-Warn2 { param($m) Write-Host "    $m" -ForegroundColor Yellow }
function Write-Err   { param($m) Write-Host "    $m" -ForegroundColor Red }

function Format-Size {
    param([long]$Bytes)
    if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    return ('{0:N0} KB' -f ($Bytes / 1KB))
}

function Invoke-Remote {
    param([string]$Command)
    $out = & ssh -o BatchMode=yes $RemoteHost $Command 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "ssh failed (exit $LASTEXITCODE): $out"
    }
    return $out
}

# --- preflight ----------------------------------------------------------

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Err 'ssh was not found on PATH. Install the Windows OpenSSH client.'
    exit 1
}
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Err 'scp was not found on PATH. Install the Windows OpenSSH client.'
    exit 1
}

if (-not (Test-Path $Destination)) {
    Write-Step "Creating $Destination"
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

Write-Step "Connecting to $RemoteHost"
try {
    Invoke-Remote 'true' | Out-Null
} catch {
    Write-Err 'Could not reach the VPS.'
    Write-Err $_.Exception.Message
    Write-Err 'Check your network, or that your SSH key is still loaded.'
    exit 1
}
Write-Ok 'Connected.'

# --- optionally take a fresh backup first -------------------------------

if ($Fresh) {
    Write-Step 'Running a new backup on the VPS (about 75 seconds)'
    $log = Invoke-Remote "/bin/bash $BackupScript"
    $log | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    if ($log -match 'FAILED') {
        Write-Err 'The remote backup reported a failure. Nothing was downloaded.'
        exit 1
    }
    Write-Ok 'Remote backup complete.'
}

# --- find the newest remote backup --------------------------------------

Write-Step 'Looking for the newest backup on the VPS'
$listing = Invoke-Remote "ls -1t $RemoteDir/$Pattern 2>/dev/null | head -1 | xargs -r stat -c '%n|%s|%Y'"

if ([string]::IsNullOrWhiteSpace($listing)) {
    Write-Err "No backups matching $Pattern found in $RemoteDir on the VPS."
    exit 1
}

$parts       = ($listing | Select-Object -First 1).ToString().Trim() -split '\|'
$remotePath  = $parts[0]
$remoteSize  = [long]$parts[1]
$remoteEpoch = [long]$parts[2]
$fileName    = Split-Path $remotePath -Leaf
$remoteTime  = [DateTimeOffset]::FromUnixTimeSeconds($remoteEpoch).ToLocalTime()
$ageHours    = [math]::Round(((Get-Date) - $remoteTime.LocalDateTime).TotalHours, 1)

Write-Ok "$fileName"
Write-Ok "$(Format-Size $remoteSize), taken $($remoteTime.ToString('yyyy-MM-dd HH:mm')) local time ($ageHours h ago)"

if ($ageHours -gt 30) {
    Write-Warn2 "This backup is more than a day old - the nightly job may not have run."
    Write-Warn2 "Use -Fresh to take a new one right now."
}

$localPath = Join-Path $Destination $fileName

# --- -List mode ---------------------------------------------------------

if ($List) {
    Write-Step "Local backups in $Destination"
    $local = Get-ChildItem -Path $Destination -Filter $Pattern -ErrorAction SilentlyContinue |
             Sort-Object LastWriteTime -Descending
    if ($local) {
        foreach ($f in $local) {
            $marker = '  '
            if ($f.Name -eq $fileName) { $marker = '->' }
            Write-Host ("    {0} {1,-46} {2,10}  {3}" -f $marker, $f.Name, (Format-Size $f.Length), $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))
        }
        $total = ($local | Measure-Object -Property Length -Sum).Sum
        Write-Ok "$($local.Count) backup(s), $(Format-Size $total) total"
    } else {
        Write-Warn2 'No local backups yet.'
    }
    Write-Host ''
    Write-Host '    (-> marks the newest backup on the VPS)' -ForegroundColor DarkGray
    exit 0
}

# --- skip if we already have it -----------------------------------------

if ((Test-Path $localPath) -and (-not $Force)) {
    $existing = Get-Item $localPath
    if ($existing.Length -eq $remoteSize) {
        Write-Step 'Already downloaded'
        Write-Ok "$fileName is already in $Destination and the size matches."
        Write-Ok 'Use -Force to download it again, or -Fresh to make a new backup.'
        exit 0
    }
    Write-Warn2 "A local copy exists but is a different size - re-downloading."
}

# --- download -----------------------------------------------------------

$partial = "$localPath.partial"
if (Test-Path $partial) { Remove-Item $partial -Force }

Write-Step "Downloading $(Format-Size $remoteSize)"
Write-Host '    (scp progress below; large files take a few minutes)' -ForegroundColor DarkGray

& scp -o BatchMode=yes "${RemoteHost}:${remotePath}" $partial
if ($LASTEXITCODE -ne 0) {
    Write-Err "scp failed with exit code $LASTEXITCODE. Nothing was saved."
    if (Test-Path $partial) { Remove-Item $partial -Force }
    exit 1
}

# --- verify -------------------------------------------------------------

Write-Step 'Verifying the copy'

$localSize = (Get-Item $partial).Length
if ($localSize -ne $remoteSize) {
    Move-Item $partial "$localPath.BAD" -Force
    Write-Err "Size mismatch: expected $remoteSize bytes, got $localSize."
    Write-Err "Kept as $fileName.BAD - do not rely on it."
    exit 1
}
Write-Ok "Size matches ($(Format-Size $localSize))."

Write-Host '    Comparing checksums...' -ForegroundColor DarkGray
$remoteHash = (Invoke-Remote "sha256sum '$remotePath' | cut -c1-64" | Select-Object -First 1).ToString().Trim()
$localHash  = (Get-FileHash -Path $partial -Algorithm SHA256).Hash.ToLower()

if ($remoteHash -ne $localHash) {
    Move-Item $partial "$localPath.BAD" -Force
    Write-Err 'Checksum mismatch - the file was corrupted in transfer.'
    Write-Err "  VPS:   $remoteHash"
    Write-Err "  local: $localHash"
    Write-Err "Kept as $fileName.BAD - do not rely on it."
    exit 1
}

Move-Item $partial $localPath -Force
Write-Ok "Checksum matches: $($localHash.Substring(0,16))..."
Write-Ok "Saved to $localPath"

# --- optional retention -------------------------------------------------

if ($KeepLocal -gt 0) {
    $all = Get-ChildItem -Path $Destination -Filter $Pattern |
           Sort-Object LastWriteTime -Descending
    if ($all.Count -gt $KeepLocal) {
        $old = $all | Select-Object -Skip $KeepLocal
        Write-Step "Removing $($old.Count) old backup(s), keeping the newest $KeepLocal"
        foreach ($f in $old) {
            Write-Host "    deleting $($f.Name) ($(Format-Size $f.Length))" -ForegroundColor DarkGray
            Remove-Item $f.FullName -Force
        }
    }
}

# --- optional uploads archive -------------------------------------------

if ($Uploads) {
    Write-Step 'Looking for the newest uploads archive on the VPS'
    $upListing = Invoke-Remote "ls -1t $RemoteDir/trustcart_uploads_*.tar.gz 2>/dev/null | head -1 | xargs -r stat -c '%n|%s'"
    if ([string]::IsNullOrWhiteSpace($upListing)) {
        Write-Warn2 'No uploads archive found on the VPS (the nightly job creates one).'
    } else {
        $upParts = ($upListing | Select-Object -First 1).ToString().Trim() -split '\|'
        $upRemote = $upParts[0]
        $upSize   = [long]$upParts[1]
        $upName   = Split-Path $upRemote -Leaf
        $upLocal  = Join-Path $Destination $upName
        if ((Test-Path $upLocal) -and ((Get-Item $upLocal).Length -eq $upSize) -and (-not $Force)) {
            Write-Ok "$upName is already downloaded."
        } else {
            $upPartial = "$upLocal.partial"
            if (Test-Path $upPartial) { Remove-Item $upPartial -Force }
            Write-Step "Downloading uploads archive ($(Format-Size $upSize))"
            & scp -o BatchMode=yes "${RemoteHost}:${upRemote}" $upPartial
            if ($LASTEXITCODE -ne 0) {
                Write-Err 'scp failed for the uploads archive.'
                if (Test-Path $upPartial) { Remove-Item $upPartial -Force }
            } else {
                $upGot = (Get-Item $upPartial).Length
                $upRemoteHash = (Invoke-Remote "sha256sum '$upRemote' | cut -c1-64" | Select-Object -First 1).ToString().Trim()
                $upLocalHash  = (Get-FileHash -Path $upPartial -Algorithm SHA256).Hash.ToLower()
                if ($upGot -ne $upSize -or $upRemoteHash -ne $upLocalHash) {
                    Move-Item $upPartial "$upLocal.BAD" -Force
                    Write-Err "Uploads archive failed verification; kept as $upName.BAD."
                } else {
                    Move-Item $upPartial $upLocal -Force
                    Write-Ok "Uploads archive verified and saved to $upLocal"
                }
            }
        }
    }
}

# --- summary ------------------------------------------------------------

$all   = Get-ChildItem -Path $Destination -Filter $Pattern -ErrorAction SilentlyContinue
$total = ($all | Measure-Object -Property Length -Sum).Sum
$drive = (Get-PSDrive -Name (Split-Path $Destination -Qualifier).TrimEnd(':'))

Write-Host ''
Write-Ok "Done. $($all.Count) local backup(s), $(Format-Size $total) total."
Write-Ok "Free space on $($drive.Name): $(Format-Size $drive.Free)"
Write-Host ''
Write-Host '    To restore this backup somewhere:' -ForegroundColor DarkGray
Write-Host "    pg_restore -d <target_db> --no-owner --no-privileges `"$localPath`"" -ForegroundColor DarkGray
Write-Host ''
