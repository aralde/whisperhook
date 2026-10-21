# install.ps1
$ErrorActionPreference = "Stop"

Write-Host "Fetching latest release of WhisperHook..." -ForegroundColor Cyan

# Define the repo
$repo = "aralde/whisperhook"

# Get latest release from GitHub API
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
} catch {
    Write-Host "Error fetching latest release. It is possible that no releases have been published yet." -ForegroundColor Red
    exit 1
}

# Find the Windows installer asset (.msi or .exe)
$asset = $release.assets | Where-Object { $_.name -match "\.msi`$|\.exe`$" } | Select-Object -First 1

if (-not $asset) {
    Write-Host "Error: Could not find a Windows installer (.msi or .exe) in the latest release." -ForegroundColor Red
    exit 1
}

$downloadUrl = $asset.browser_download_url
$fileName = $asset.name
$tempPath = Join-Path $env:TEMP $fileName

Write-Host "Downloading $fileName..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath

Write-Host "Running installer..." -ForegroundColor Cyan
Start-Process -FilePath $tempPath -Wait

Write-Host "Installation complete!" -ForegroundColor Green
