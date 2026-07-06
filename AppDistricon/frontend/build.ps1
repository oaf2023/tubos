<# .SYNOPSIS
  Builds the Next.js frontend as static export for Flask serving.
  Safely modifies next.config.ts and injects generateStaticParams stubs
  for dynamic routes, then restores everything to original.
#>

param(
    [string]$SourceDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\")),
    [string]$OutputDir = (Join-Path (Split-Path $PSScriptRoot -Parent) "backend\static")
)

$ErrorActionPreference = "Stop"
$StubsDir = Join-Path $PSScriptRoot "stubs"
$BackupDir = Join-Path $SourceDir ".export-backup"

# ── Functions ────────────────────────────────────────────────

function Write-Step($msg) { Write-Host "`n🚀 $msg" -ForegroundColor Cyan }
function Write-OK($msg) { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }

function Backup-File($path) {
    $rel = $path.Substring($SourceDir.Length + 1)
    $dest = Join-Path $BackupDir $rel
    $destDir = Split-Path $dest -Parent
    if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item -Path $path -Destination $dest -Force
    Write-OK "Backed up $rel"
}

function Restore-Backup() {
    if (!(Test-Path $BackupDir)) { return }
    Get-ChildItem -Recurse -File $BackupDir | ForEach-Object {
        $rel = $_.FullName.Substring($BackupDir.Length + 1)
        $orig = Join-Path $SourceDir $rel
        Copy-Item -Path $_.FullName -Destination $orig -Force
    }
    Remove-Item -Path $BackupDir -Recurse -Force
    Write-OK "Original files restored"
}

# ── Step 0: Validate ─────────────────────────────────────────

if (!(Test-Path (Join-Path $SourceDir "package.json"))) {
    throw "SourceDir does not contain package.json: $SourceDir"
}
if (!(Test-Path (Join-Path $SourceDir "next.config.ts"))) {
    throw "next.config.ts not found in $SourceDir"
}

Write-Host "Source: $SourceDir"
Write-Host "Output: $OutputDir"

# ── Step 1: Backup originals ─────────────────────────────────

Write-Step "Backing up original configuration"

if (Test-Path $BackupDir) { Remove-Item -Path $BackupDir -Recurse -Force }

Backup-File (Join-Path $SourceDir "next.config.ts")

# Backup all [param] pages that need generateStaticParams
$dynamicRoutes = Get-ChildItem -Path (Join-Path $SourceDir "src\app") -Directory -Recurse |
    Where-Object { $_.Name -match '^\[.*\]$' -and (Test-Path (Join-Path $_.FullName "page.tsx")) }

$modifiedPages = @()
foreach ($route in $dynamicRoutes) {
    $pagePath = Join-Path $route.FullName "page.tsx"
    $content = Get-Content $pagePath -Raw
    if ($content -notmatch 'generateStaticParams') {
        Backup-File $pagePath
        $modifiedPages += $pagePath
        Write-OK "Dynamic route marked: $($route.FullName.Substring($SourceDir.Length + 1))"
    }
}

# ── Step 2: Inject export config ─────────────────────────────

Write-Step "Injecting static export configuration"

# Replace next.config.ts
$exportConfig = @"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
"@
Set-Content -Path (Join-Path $SourceDir "next.config.ts") -Value $exportConfig -Encoding UTF8
Write-OK "next.config.ts set to static export"

# Inject generateStaticParams into dynamic route pages
$stub = @"

export function generateStaticParams() {
  return [];
}
"@
foreach ($pagePath in $modifiedPages) {
    $content = Get-Content $pagePath -Raw
    if ($content -notmatch 'generateStaticParams') {
        Add-Content -Path $pagePath -Value $stub -Encoding UTF8
        $rel = $pagePath.Substring($SourceDir.Length + 1)
        Write-OK "Injected generateStaticParams into $rel"
    }
}

# ── Step 3: Build ────────────────────────────────────────────

Write-Step "Building Next.js static export"

Push-Location $SourceDir
try {
    $buildOutput = npm run build 2>&1
    $buildOutput | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }
    Write-OK "Next.js build completed"
} finally {
    Pop-Location
}

# ── Step 4: Copy output to Flask static dir ──────────────────

Write-Step "Copying static export to Flask"

$outDir = Join-Path $SourceDir "out"
if (!(Test-Path $outDir)) {
    throw "Build output directory not found: $outDir"
}

if (Test-Path $OutputDir) {
    Remove-Item -Path "$OutputDir\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Copy-Item -Path "$outDir\*" -Destination $OutputDir -Recurse -Force
$fileCount = (Get-ChildItem -Recurse -File $OutputDir).Count
Write-OK "Copied $fileCount files to $OutputDir"

# ── Step 5: Restore originals ────────────────────────────────

Write-Step "Restoring original project files"
Restore-Backup

Write-Host "`n🎉 Frontend build complete!" -ForegroundColor Green
Write-Host "   Static files ready at: $OutputDir"
Write-Host "   Run Flask with: python backend/app.py"
