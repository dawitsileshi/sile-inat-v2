# scripts/migrate_prod.ps1 — Guided production migration runner.
#
# Wraps scripts/migrate_drop_daily_log_unique.py so you don't have to
# remember the env-var dance. Prompts for the External Database URL
# from Render, shows the host it's about to touch, asks for an explicit
# "yes", then runs the migration. Clears the env var on the way out so
# the shell doesn't keep pointing at prod.
#
# Unlike reset_prod.ps1, this is non-destructive: the migration drops
# a unique constraint, no rows are touched.
#
# Usage (from the project root):
#     .\scripts\migrate_prod.ps1

$ErrorActionPreference = 'Stop'

# Resolve the project root from this script's location so it works
# regardless of which directory the user invoked it from.
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot 'venv\Scripts\python.exe'
$migrateScript = Join-Path $projectRoot 'scripts\migrate_drop_daily_log_unique.py'

if (-not (Test-Path $python)) {
    Write-Host "Could not find venv Python at: $python" -ForegroundColor Red
    Write-Host "Activate or recreate the venv first."          -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $migrateScript)) {
    Write-Host "Could not find $migrateScript" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== ስለ እናት — production migration ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Migration: drop daily_logs.uq_user_date so multiple check-ins"
Write-Host "per day are allowed."
Write-Host ""
Write-Host "Non-destructive — no rows are touched. Idempotent, so re-running"
Write-Host "after a successful run is a clean no-op."
Write-Host ""

# Prompt for the External Database URL. SecureString hides it from the
# terminal scrollback while still letting us pass the plain value into
# the child process via an env var.
$secureUrl = Read-Host "Paste the External Database URL from Render" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
try {
    $databaseUrl = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Host "No URL entered. Aborting." -ForegroundColor Yellow
    exit 1
}
if (-not ($databaseUrl.StartsWith('postgres://') -or $databaseUrl.StartsWith('postgresql://'))) {
    Write-Host "That doesn't look like a Postgres URL (expected postgres:// or postgresql://)." -ForegroundColor Red
    Write-Host "Aborting without touching anything."                                              -ForegroundColor Red
    exit 1
}

# Show the host portion only — never echo the password.
try {
    $uri = [System.Uri]$databaseUrl
    $hostShown = "$($uri.Host):$($uri.Port)$($uri.AbsolutePath)"
} catch {
    $hostShown = '(could not parse host)'
}

Write-Host ""
Write-Host "About to migrate: $hostShown" -ForegroundColor Yellow
$confirm = Read-Host "Type MIGRATE to continue, anything else to abort"
if ($confirm -ne 'MIGRATE') {
    Write-Host "Aborted. Nothing changed." -ForegroundColor Yellow
    exit 0
}

try {
    $env:DATABASE_URL = $databaseUrl
    & $python $migrateScript
    $exitCode = $LASTEXITCODE
} finally {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "Migration exited with code $exitCode." -ForegroundColor Red
    exit $exitCode
}

Write-Host ""
Write-Host "Done. Multiple check-ins per day are now allowed on prod." -ForegroundColor Green
