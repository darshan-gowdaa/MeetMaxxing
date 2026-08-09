"use strict";

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === "MEETMAXXING_AUTH_TOKEN" && event.data.token) {
    const storage = (typeof chrome !== 'undefined' && chrome.storage?.local) 
      ? chrome.storage.local 
      : (typeof browser !== 'undefined' && browser.storage?.local ? browser.storage.local : null);
    
    if (!storage) return;
    
    const data = { authToken: event.data.token };
    // also store refresh token if provided (for background.js to use)
    if (event.data.refreshToken) data.authRefreshToken = event.data.refreshToken;
    
    const onSet = () => window.postMessage({ type: "MEETMAXXING_AUTH_SUCCESS" }, window.location.origin);
    
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set(data, onSet);
    } else {
      browser.storage.local.set(data).then(onSet).catch(e => console.error(e));
    }
  }
});
