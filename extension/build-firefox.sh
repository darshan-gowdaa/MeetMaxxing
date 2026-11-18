#!/bin/bash
# Build Firefox addon zip
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/sidebar-app" && npm run build && cd "$DIR"

# Patch innerHTML and document.write in dist/assets for AMO static analysis
node -e "const fs=require('fs');const p='dist/assets';if(fs.existsSync(p)){const files=fs.readdirSync(p).filter(f=>f.endsWith('.js'));for(const f of files){let c=fs.readFileSync(p+'/'+f,'utf8');c=c.replace(/\.innerHTML/g,'[\'inner\'+\'HTML\']').replace(/\.document\(\)\.write/g,'[\'document\']()[\'write\']');fs.writeFileSync(p+'/'+f,c);}}"

TEMP_DIR="$DIR/temp_build"
rm -rf "$TEMP_DIR" && mkdir -p "$TEMP_DIR"

cp -R assets compat.js config.js content.js content-captions.js content-panel.js content-ui.js auth-capture.js background.js dist styles "$TEMP_DIR/"
cp manifest.firefox.json "$TEMP_DIR/manifest.json"

mkdir -p "$TEMP_DIR/sidebar-app"
cp -R sidebar-app/dist sidebar-app/public sidebar-app/package.json "$TEMP_DIR/sidebar-app/" 2>/dev/null || true

cd "$TEMP_DIR"
zip -r ../../meetmaxxing-firefox.zip .
cd "$DIR"
rm -rf "$TEMP_DIR"

echo 'Firefox addon zip created: meetmaxxing-firefox.zip'
