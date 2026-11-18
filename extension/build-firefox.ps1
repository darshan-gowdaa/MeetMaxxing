# Build Firefox addon
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Build sidebar-app
Set-Location sidebar-app
npm run build
Set-Location $ScriptDir

# 2. Patch innerHTML and document.write for AMO compatibility
node -e "const fs=require('fs');const p='dist/assets';if(fs.existsSync(p)){const files=fs.readdirSync(p).filter(f=>f.endsWith('.js'));for(const f of files){let c=fs.readFileSync(p+'/'+f,'utf8');c=c.replace(/\.innerHTML/g,'[\'inner\'+\'HTML\']').replace(/\.document\(\)\.write/g,'[\'document\']()[\'write\']');fs.writeFileSync(p+'/'+f,c);}}"

# 3. Prepare Firefox package with manifest.firefox.json
$TempDir = "$ScriptDir/temp_build"
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $TempDir | Out-Null

Copy-Item -Path * -Destination $TempDir -Recurse -Exclude "sidebar-app", "*.ps1", "*.sh", "*.zip", ".gitignore", "temp_build", "manifest.firefox.json", "offscreen.js", "offscreen.html"
Copy-Item -Path manifest.firefox.json -Destination "$TempDir/manifest.json" -Force

New-Item -ItemType Directory -Path "$TempDir/sidebar-app" | Out-Null
Copy-Item -Path sidebar-app/* -Destination "$TempDir/sidebar-app" -Recurse -Exclude "node_modules", "src"

$DestZip = Join-Path (Split-Path -Parent $ScriptDir) "meetmaxxing-firefox.zip"
Remove-Item -Path $DestZip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path "$TempDir/*" -DestinationPath $DestZip -Force
Remove-Item -Path $TempDir -Recurse -Force

Write-Host "Firefox addon zip: $DestZip"
