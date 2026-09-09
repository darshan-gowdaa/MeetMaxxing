"use strict";

// Last token we captured, to make the handshake idempotent (e.g. React StrictMode
// double-effects, a duplicated tab, or the "Retry auto-connect" button re-posting
// the same token). We still reply success so the page finishes connecting.
let lastCaptured = { token: "", at: 0 };
const CAPTURE_DEDUP_MS = 2000;

window.addEventListener("message", (event) => {
  // Only accept messages from this same page's origin. This rejects spoofed
  // tokens injected by cross-origin iframes or other windows.
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (!event.data || typeof event.data !== "object") return;

  if (event.data.type !== "MEETMAXXING_AUTH_TOKEN") return;
  if (typeof event.data.token !== "string" || !event.data.token) return;

  const storage = (typeof chrome !== 'undefined' && chrome.storage?.local)
    ? chrome.storage.local
    : (typeof browser !== 'undefined' && browser.storage?.local ? browser.storage.local : null);

  if (!storage) return;

  const token = event.data.token;
  const now = Date.now();
  const isDuplicate = token === lastCaptured.token && (now - lastCaptured.at) < CAPTURE_DEDUP_MS;

  const replySuccess = () => window.postMessage({ type: "MEETMAXXING_AUTH_SUCCESS" }, window.location.origin);

  // Idempotent: if we just wrote this exact token, acknowledge without rewriting.
  if (isDuplicate) {
    replySuccess();
    return;
  }
  lastCaptured = { token, at: now };

  const data = { authToken: token };
  // also store refresh token if provided (for background.js to use)
  if (typeof event.data.refreshToken === "string" && event.data.refreshToken) {
    data.authRefreshToken = event.data.refreshToken;
  }

  const onSet = replySuccess;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set(data, onSet);
  } else {
    browser.storage.local.set(data).then(onSet).catch(e => console.error(e));
  }
});
