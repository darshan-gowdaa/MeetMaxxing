/**
 * compat.js — unified browser API shim for Chrome + Firefox MV2
 * Loaded before background.js in both manifests.
 * Provides `ext.*` as a promise-based API regardless of browser.
 */
"use strict";

const ext = (() => {
  const isFx = typeof browser !== "undefined";
  const api = isFx ? browser : chrome;

  // Wrap chrome's callback-based storage in promises to match Firefox
  const storage = {
    get: (keys) =>
      isFx
        ? api.storage.local.get(keys)
        : new Promise((r) => api.storage.local.get(keys, r)),
    set: (data) =>
      isFx
        ? api.storage.local.set(data)
        : new Promise((r) => api.storage.local.set(data, r)),
    remove: (keys) =>
      isFx
        ? api.storage.local.remove(keys)
        : new Promise((r) => api.storage.local.remove(keys, r)),
  };

  // Wrap tabs.sendMessage — Firefox returns a promise, Chrome uses callback
  const sendTabMessage = (tabId, msg) =>
    isFx
      ? api.tabs.sendMessage(tabId, msg).catch(() => {})
      : new Promise((r) => {
          try {
            api.tabs.sendMessage(tabId, msg, () => {
              let _ = api.runtime.lastError;
              r();
            });
          } catch (e) {
            r();
          }
        });

  // Wrap runtime.sendMessage — silences "no receiver" errors
  const broadcast = (msg) => {
    if (isFx) {
      api.runtime.sendMessage(msg).catch(() => {});
    } else {
      try {
        api.runtime.sendMessage(msg, () => {
          let _ = api.runtime.lastError;
        });
      } catch (e) {}
    }
  };

  // Token-refresh alarm/interval abstraction
  const setRefreshAlarm = (cb) => {
    const MS = 45 * 60 * 1000;
    if (!isFx && api.alarms) {
      api.alarms.create("refreshToken", { periodInMinutes: 45 });
      api.alarms.onAlarm.addListener((a) => {
        if (a.name === "refreshToken") cb();
      });
    } else {
      setInterval(cb, MS);
    }
  };

  // Browser action click listener — chrome.action (MV3) or chrome.browserAction (MV2)
  const onActionClicked = (cb) => {
    const actionApi = isFx
      ? api.browserAction
      : api.action || api.browserAction;
    if (actionApi?.onClicked) actionApi.onClicked.addListener(cb);
  };

  return {
    isFx,
    api,
    storage,
    sendTabMessage,
    broadcast,
    setRefreshAlarm,
    onActionClicked,
    runtime: api.runtime,
    tabs: api.tabs,
    storageOnChanged: api.storage.onChanged,
  };
})();
