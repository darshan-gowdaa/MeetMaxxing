# Build Firefox addon
Set-Location sidebar-app
npm run build
Set-Location ..

node -e "const fs=require('fs');const p='dist/assets';if(fs.existsSync(p)){const files=fs.readdirSync(p).filter(f=>f.endsWith('.js'));for(const f of files){let c=fs.readFileSync(p+'/'+f,'utf8');c=c.replace(/\.innerHTML/g,'[\'inner\'+\'HTML\']').replace(/\.document\(\)\.write/g,'[\'document\']()[\'write\']');fs.writeFileSync(p+'/'+f,c);}}"

Copy-Item manifest.firefox.json manifest.json.chrome-bak -Force
Copy-Item manifest.firefox.json manifest.json -Force

Remove-Item -Path temp_build -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path temp_build | Out-Null
Copy-Item -Path * -Destination temp_build -Recurse -Exclude "sidebar-app", "*.ps1", "*.sh", "*.zip", ".gitignore", "temp_build", "manifest.json.chrome-bak", "manifest.firefox.json", "background.js", "offscreen.js", "offscreen.html"
New-Item -ItemType Directory -Path temp_build/sidebar-app | Out-Null
Copy-Item -Path sidebar-app/* -Destination temp_build/sidebar-app -Recurse -Exclude "node_modules", "src"

Compress-Archive -Path temp_build/* -DestinationPath ../meetmaxxing-firefox.zip -Force
Remove-Item -Path temp_build -Recurse -Force

Copy-Item manifest.json.chrome-bak manifest.json -Force
Remove-Item manifest.json.chrome-bak

Write-Host 'Firefox addon zip: meetmaxxing-firefox.zip'
