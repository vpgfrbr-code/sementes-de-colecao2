# deploy.ps1 - Generates a deploy.zip with source for Hostinger Node.js hosting
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$archiveName = "deploy.zip"
$archivePath = Join-Path $root $archiveName
$tempDir = Join-Path $root ".deploy-temp"

function Assert-LastExitCode($stepName) {
    if ($LASTEXITCODE -ne 0) {
        throw "$stepName failed with exit code $LASTEXITCODE"
    }
}

# Clean previous artifacts
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }

Write-Host "Validating build..." -ForegroundColor Cyan
Push-Location $root
pnpm install --frozen-lockfile
Assert-LastExitCode "pnpm install"
pnpm build
Assert-LastExitCode "pnpm build"
Pop-Location

Write-Host "Preparing deploy package..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Root config files
$rootFiles = @(
    "package.json",
    "pnpm-lock.yaml",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "components.json",
    "next-env.d.ts"
)

foreach ($file in $rootFiles) {
    $src = Join-Path $root $file
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $tempDir $file)
    }
}

# Source directories
$dirs = @("src", "public", "messages", "scripts")
foreach ($dir in $dirs) {
    $src = Join-Path $root $dir
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $tempDir $dir) -Recurse
    }
}

# Create zip using tar (much faster than Compress-Archive)
Write-Host "Creating $archiveName..." -ForegroundColor Cyan
Push-Location $tempDir
tar -a -cf $archivePath *
Pop-Location

# Cleanup temp
Remove-Item $tempDir -Recurse -Force

$size = (Get-Item $archivePath).Length / 1MB
Write-Host ""
Write-Host "Done! Created $archiveName ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
Write-Host ""
Write-Host "Hostinger setup:" -ForegroundColor Yellow
Write-Host "  1. Upload $archiveName to Hostinger"
Write-Host "  2. Set environment variables (see .env for names)"
Write-Host "  3. Build command: pnpm install --frozen-lockfile && pnpm build"
Write-Host "  4. Start command: pnpm start"
Write-Host "  5. Node.js version: 20.x"
Write-Host "  6. Set NEXT_PUBLIC_APP_URL=https://sementesdecolecao.com"
Write-Host "  7. Set Woovi webhook: https://sementesdecolecao.com/api/webhook/woovi"
