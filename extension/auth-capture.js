"use strict";

window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data) return;

  if (event.data.type === "MEETMAXXING_AUTH_TOKEN" && event.data.token) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ authToken: event.data.token }, () => {
        // Send a message back to the page so it knows it succeeded
        window.postMessage({ type: "MEETMAXXING_AUTH_SUCCESS" }, "*");
      });
    } else if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      browser.storage.local.set({ authToken: event.data.token }).then(() => {
        window.postMessage({ type: "MEETMAXXING_AUTH_SUCCESS" }, "*");
      }).catch(e => console.error(e));
    }
  }
});
