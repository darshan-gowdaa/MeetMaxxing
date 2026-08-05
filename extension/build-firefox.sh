#!/bin/bash
# Build Firefox addon zip
set -e
cd sidebar-app && npm run build && cd ..
cp manifest.firefox.json manifest.json.bak 2>/dev/null || true
cp manifest.firefox.json manifest.json
zip -r ../meetmaxxing-firefox.zip . \
  --exclude 'sidebar-app/node_modules/*' \
  --exclude 'sidebar-app/src/*' \
  --exclude '*.sh' \
  --exclude '.gitignore'
mv manifest.json.bak manifest.json 2>/dev/null || true
echo 'Firefox addon zip created: meetmaxxing-firefox.zip'
