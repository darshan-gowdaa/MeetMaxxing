declare const chrome: any;
declare const browser: any;

export function getDevMode(): boolean {
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest) {
    return !browser.runtime.getManifest().update_url;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    return !chrome.runtime.getManifest().update_url;
  }
  return import.meta.env?.DEV || false;
}

export function getWebUrl(): string {
  return getDevMode() ? "http://localhost:3000" : "https://meetmaxxing.vercel.app";
}
