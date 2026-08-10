// MeetMaxxing Extension Config
// Detect environment: dev if unpacked extension, prod otherwise
const isDevMode = () => {
  if (typeof location !== 'undefined' && location.hostname === 'localhost') {
    return true;
  }
  const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest;
  if (isFirefox) {
    return !browser.runtime.getManifest().update_url;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    return !chrome.runtime.getManifest().update_url;
  }
  return false;
};

const _isDevHost = isDevMode();

const MEETMAXXING_CONFIG = {
  BASE_URL_BACKEND: _isDevHost ? "http://localhost:8000" : "https://meetmaxxing-api.onrender.com",
  BASE_URL_WEB: _isDevHost ? "http://localhost:3000" : "https://meetmaxxing.vercel.app",
  WS_URL: _isDevHost ? "ws://localhost:8000" : "wss://meetmaxxing-api.onrender.com",
};
const MEETMIND_CONFIG = MEETMAXXING_CONFIG;
if (typeof globalThis !== 'undefined') {
  globalThis.MEETMAXXING_CONFIG = MEETMAXXING_CONFIG;
  globalThis.MEETMIND_CONFIG = MEETMAXXING_CONFIG;
}
if (typeof window !== 'undefined') {
  window.MEETMAXXING_CONFIG = MEETMAXXING_CONFIG;
  window.MEETMIND_CONFIG = MEETMAXXING_CONFIG;
}
