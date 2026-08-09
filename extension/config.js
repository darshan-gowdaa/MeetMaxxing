// MeetMaxxing Extension Config
// Detect environment: dev if unpacked extension, prod otherwise
const isDevMode = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    return !chrome.runtime.getManifest().update_url;
  }
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest) {
    return !browser.runtime.getManifest().update_url;
  }
  return typeof location !== 'undefined' && location.hostname === 'localhost';
};

const _isDevHost = isDevMode();

const MEETMAXXING_CONFIG = {
  BASE_URL_BACKEND: _isDevHost ? "http://localhost:8000" : "https://meetmaxxing-api.onrender.com",
  BASE_URL_WEB: _isDevHost ? "http://localhost:3000" : "https://meetmaxxing.vercel.app",
  WS_URL: _isDevHost ? "ws://localhost:8000" : "wss://meetmaxxing-api.onrender.com",
};
window.MEETMAXXING_CONFIG = MEETMAXXING_CONFIG;
window.MEETMIND_CONFIG = MEETMAXXING_CONFIG;
const MEETMIND_CONFIG = MEETMAXXING_CONFIG;
