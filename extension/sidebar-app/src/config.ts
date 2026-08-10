declare const chrome: any;
declare const browser: any;

export function getDevMode(): boolean {
  return false;
}

export function getWebUrl(): string {
  return getDevMode() ? "http://localhost:3000" : "https://meetmaxxing.vercel.app";
}

export function getBaseUrlBackend(): string {
  return getDevMode() ? "http://localhost:8000" : "https://meetmaxxing-api.onrender.com";
}
