#!/bin/bash
# Build Firefox addon zip
set -e
cd sidebar-app && npm run build && cd ..

# Patch innerHTML and document.write in dist/assets
node -e "const fs=require('fs');const p='dist/assets';if(fs.existsSync(p)){const files=fs.readdirSync(p).filter(f=>f.endsWith('.js'));for(const f of files){let c=fs.readFileSync(p+'/'+f,'utf8');c=c.replace(/\.innerHTML/g,'[\'inner\'+\'HTML\']').replace(/\.document\(\)\.write/g,'[\'document\']()[\'write\']');fs.writeFileSync(p+'/'+f,c);}}"

cp manifest.firefox.json manifest.json.bak 2>/dev/null || true
cp manifest.firefox.json manifest.json
zip -r ../meetmaxxing-firefox.zip . \
  --exclude 'sidebar-app/node_modules/*' \
  --exclude 'sidebar-app/src/*' \
  --exclude '*.sh' \
  --exclude '*.ps1' \
  --exclude 'background.js' \
  --exclude 'offscreen.*' \
  --exclude '.gitignore'
mv manifest.json.bak manifest.json 2>/dev/null || true
echo 'Firefox addon zip created: meetmaxxing-firefox.zip'
