// MeetMaxxing Extension Config
// Detect environment: dev if unpacked extension, prod otherwise
const isDevMode = () => {
  if (typeof location !== 'undefined' && location.hostname === 'localhost') {
    return true;
  }
  const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest;
  if (!isFirefox && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    return !chrome.runtime.getManifest().update_url;
  }
  return false;
};

const _isDevHost = false;

const MEETMAXXING_CONFIG = {
  BASE_URL_BACKEND: "https://meetmaxxing-api.onrender.com",
  BASE_URL_WEB: "https://meetmaxxing.vercel.app",
  WS_URL: "wss://meetmaxxing-api.onrender.com",
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
