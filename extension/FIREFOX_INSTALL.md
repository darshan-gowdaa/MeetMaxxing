# Installing MeetMaxxing on Firefox

## Method 1: Temporary Install (Development)
1. Open Firefox → navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on..."
4. Select `extension/manifest.firefox.json`

## Method 2: Firefox Add-ons (AMO) Submission
1. Zip the extension folder (use manifest.firefox.json renamed to manifest.json)
2. Go to https://addons.mozilla.org/developers/
3. Submit new add-on

## Packaging Script
Run from extension directory:
```bash
cp manifest.firefox.json manifest.json
zip -r meetmaxxing-firefox.zip . -x 'node_modules/*' -x 'sidebar-app/node_modules/*' -x '*.sh'
cp manifest.json.bak manifest.json  # restore Chrome manifest
```
