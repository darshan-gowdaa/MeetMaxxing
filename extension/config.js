// MeetMaxxing Extension Config
// Detect environment: dev if localhost, prod otherwise
const _isDevHost = typeof location !== 'undefined' && location.hostname === 'localhost';

const MEETMAXXING_CONFIG = {
  BASE_URL_BACKEND: _isDevHost ? "http://localhost:8000" : "https://meetmaxxing-api.onrender.com",
  BASE_URL_WEB: _isDevHost ? "http://localhost:3000" : "https://meetmaxxing.vercel.app",
  WS_URL: _isDevHost ? "ws://localhost:8000" : "wss://meetmaxxing-api.onrender.com",
};
window.MEETMAXXING_CONFIG = MEETMAXXING_CONFIG;
window.MEETMIND_CONFIG = MEETMAXXING_CONFIG;
const MEETMIND_CONFIG = MEETMAXXING_CONFIG;
