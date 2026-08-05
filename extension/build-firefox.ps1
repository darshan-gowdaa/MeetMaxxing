# Build Firefox addon
Set-Location sidebar-app
npm run build
Set-Location ..

Copy-Item manifest.firefox.json manifest.json.chrome-bak -Force
Copy-Item manifest.firefox.json manifest.json -Force

$exclude = @('sidebar-app/node_modules', 'sidebar-app/src', '*.ps1', '*.sh')
# Use 7-zip or Compress-Archive
Compress-Archive -Path . -DestinationPath ../meetmaxxing-firefox.zip -Force

Copy-Item manifest.json.chrome-bak manifest.json -Force
Remove-Item manifest.json.chrome-bak

Write-Host 'Firefox addon zip: meetmaxxing-firefox.zip'
