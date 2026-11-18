# Build Chrome extension zip
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Build sidebar-app
Set-Location sidebar-app
npm run build
Set-Location $ScriptDir

# 2. Prepare Chrome package with manifest.json
$TempDir = "$ScriptDir/temp_chrome"
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $TempDir | Out-Null

Copy-Item -Path * -Destination $TempDir -Recurse -Exclude "sidebar-app", "*.ps1", "*.sh", "*.zip", ".gitignore", "temp_chrome", "manifest.firefox.json", "manifest.json.chrome-bak"

New-Item -ItemType Directory -Path "$TempDir/sidebar-app" | Out-Null
Copy-Item -Path sidebar-app/* -Destination "$TempDir/sidebar-app" -Recurse -Exclude "node_modules", "src"

$DestZip = Join-Path (Split-Path -Parent $ScriptDir) "meetmaxxing-chrome.zip"
Remove-Item -Path $DestZip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path "$TempDir/*" -DestinationPath $DestZip -Force
Remove-Item -Path $TempDir -Recurse -Force

Write-Host "Chrome extension zip: $DestZip"
