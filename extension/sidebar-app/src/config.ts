export function getDevMode(): boolean {
  let isDev = false;
  const w = window as any;
  if (typeof w.chrome !== 'undefined' && w.chrome.runtime && w.chrome.runtime.getManifest) {
    isDev = !w.chrome.runtime.getManifest().update_url;
  } else if (typeof w.browser !== 'undefined' && w.browser.runtime && w.browser.runtime.getManifest) {
    isDev = !w.browser.runtime.getManifest().update_url;
  }
  return isDev;
}

export function getWebUrl(): string {
  return getDevMode() ? "http://localhost:3000" : "https://meetmaxxing.vercel.app";
}
