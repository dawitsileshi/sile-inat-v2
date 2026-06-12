# scripts/reset_prod.ps1 -- Guided production schema reset.
#
# Prompts for the External Database URL from Render, shows what it's about
# to drop, asks for an explicit "yes", then runs scripts/reset_db.py.
# Clears the env var on the way out so the prompt doesn't keep prod
# pointed at this shell.
#
# Usage (from the project root):
#     .\scripts\reset_prod.ps1

$ErrorActionPreference = 'Stop'

# Resolve the project root from this script's location so it works
# regardless of which directory the user invoked it from.
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot 'venv\Scripts\python.exe'
$resetScript = Join-Path $projectRoot 'scripts\reset_db.py'

if (-not (Test-Path $python)) {
    Write-Host "Could not find venv Python at: $python" -ForegroundColor Red
    Write-Host "Activate or recreate the venv first."          -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $resetScript)) {
    Write-Host "Could not find $resetScript" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== sile inat -- production database reset ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will DROP every table on the database you point it at,"
Write-Host "then recreate empty tables matching the current models. The"
Write-Host "next app boot on Render will reseed circles + forum content."
Write-Host ""
Write-Host "Only safe while there is no real user data."
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

# Show the host portion only -- never echo the password.
try {
    $uri = [System.Uri]$databaseUrl
    $hostShown = "$($uri.Host):$($uri.Port)$($uri.AbsolutePath)"
} catch {
    $hostShown = '(could not parse host)'
}

Write-Host ""
Write-Host "About to reset: $hostShown" -ForegroundColor Yellow
$confirm = Read-Host "Type RESET to continue, anything else to abort"
if ($confirm -ne 'RESET') {
    Write-Host "Aborted. Nothing changed." -ForegroundColor Yellow
    exit 0
}

try {
    $env:DATABASE_URL = $databaseUrl
    & $python $resetScript --yes-i-mean-it
    $exitCode = $LASTEXITCODE
} finally {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "reset_db.py exited with code $exitCode." -ForegroundColor Red
    exit $exitCode
}

Write-Host ""
Write-Host "Done. Hit the deployed Render URL once to trigger reseed." -ForegroundColor Green
