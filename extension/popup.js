/**
 * MeetMaxxing Popup Script
 * Complies with Chrome Manifest V3 CSP (no inline scripts).
 */

const CONFIG = window.MEETMAXXING_CONFIG || window.MEETMIND_CONFIG || { BASE_URL_WEB: "http://localhost:3000" };

document.addEventListener("DOMContentLoaded", () => {
  // Check meeting status from storage or current active tab
  chrome.storage.local.get(["currentMeetingId"], (r) => {
    const statusEl = document.getElementById("status-val");
    if (statusEl && r.currentMeetingId) {
      statusEl.textContent = "Live";
      statusEl.className = "status-val status-live";
    } else if (statusEl) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab && tab.url && tab.url.includes("meet.google.com") && !tab.url.includes("landing") && tab.url.length > 24) {
          statusEl.textContent = "Live";
          statusEl.className = "status-val status-live";
          const fallbackId = "live_" + Date.now();
          chrome.storage.local.set({ currentMeetingId: fallbackId, meetingTitle: tab.title || "Google Meet" });
          chrome.runtime.sendMessage({ type: "START_MEETING", title: tab.title || "Google Meet", fallbackId });
        }
      });
    }
  });

  // Open Copilot Side Panel immediately inside user click gesture
  const openSidepanelBtn = document.getElementById("open-sidepanel-btn");
  if (openSidepanelBtn) {
    openSidepanelBtn.addEventListener("click", () => {
      try {
        // Pass windowId directly to preserve user gesture token
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      } catch (e) {
        console.error("Side panel open error:", e);
      }
      window.close();
    });
  }

  // Open Dashboard
  const openDashboardBtn = document.getElementById("open-dashboard-btn");
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: CONFIG.BASE_URL_WEB });
      window.close();
    });
  }
});
