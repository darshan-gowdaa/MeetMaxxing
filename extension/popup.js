/**
 * MeetMaxxing Popup Script — Chrome & Firefox
 */
"use strict";

const CFG = (typeof MEETMAXXING_CONFIG !== "undefined" ? MEETMAXXING_CONFIG : null) || {
  BASE_URL_BACKEND: "https://meetmaxxing-api.onrender.com",
  BASE_URL_WEB: "https://meetmaxxing.vercel.app"
};

const browserApi = typeof browser !== "undefined" ? browser : chrome;

document.addEventListener("DOMContentLoaded", async () => {
  const authChip = document.getElementById("auth-chip");
  const authLabel = document.getElementById("auth-label");
  const callBadge = document.getElementById("call-badge");
  const meetingTitle = document.getElementById("meeting-title");
  const meetingSub = document.getElementById("meeting-sub");
  const btnPrimary = document.getElementById("btn-primary-action");
  const primaryText = document.getElementById("primary-action-text");
  const btnDashboard = document.getElementById("btn-dashboard");
  const btnSettings = document.getElementById("btn-settings");
  const backendStatus = document.getElementById("backend-status");

  // 1. Wake backend server
  try {
    browserApi.runtime.sendMessage({ type: "WAKE_SERVER" }, () => {
      let _ = browserApi.runtime.lastError;
    });
  } catch (e) {}

  // 2. Check auth state
  browserApi.storage.local.get(["authToken", "authState", "currentMeetingId", "meetingTitle"], (st) => {
    const isAuth = Boolean(st.authToken && st.authState !== "expired");
    if (authChip && authLabel) {
      authChip.className = isAuth ? "status-chip chip-auth" : "status-chip chip-anon";
      authLabel.textContent = isAuth ? "Connected" : "Sign in";
      if (!isAuth) {
        authChip.style.cursor = "pointer";
        authChip.onclick = () => {
          browserApi.tabs.create({ url: `${CFG.BASE_URL_WEB}/login` });
          window.close();
        };
      }
    }
  });

  // 3. Inspect active tabs for Google Meet
  let activeMeetTab = null;
  let isCurrentTabMeet = false;

  const currentTabs = await new Promise((r) =>
    browserApi.tabs.query({ active: true, currentWindow: true }, (res) => r(res || []))
  );
  const currentTab = currentTabs[0];

  if (currentTab?.url && currentTab.url.includes("meet.google.com")) {
    isCurrentTabMeet = true;
    activeMeetTab = currentTab;
  } else {
    const allMeetTabs = await new Promise((r) =>
      browserApi.tabs.query({ url: "https://meet.google.com/*" }, (res) => r(res || []))
    );
    if (allMeetTabs.length > 0) {
      activeMeetTab = allMeetTabs[0];
    }
  }

  // 4. Update Meeting Status Card
  if (isCurrentTabMeet) {
    callBadge.textContent = "Active";
    callBadge.className = "badge badge-live";
    meetingTitle.textContent = currentTab.title?.replace("Google Meet", "").replace(/^Meet\s*-\s*/i, "").trim() || "Google Meet";
    meetingSub.textContent = "Meeting tab focused";
    primaryText.textContent = "Toggle In-Meeting Sidebar";
  } else if (activeMeetTab) {
    callBadge.textContent = "In Background";
    callBadge.className = "badge badge-live";
    meetingTitle.textContent = activeMeetTab.title?.replace("Google Meet", "").replace(/^Meet\s*-\s*/i, "").trim() || "Google Meet";
    meetingSub.textContent = "Meeting open in background tab";
    primaryText.textContent = "Switch to Google Meet";
  } else {
    callBadge.textContent = "Idle";
    callBadge.className = "badge badge-idle";
    meetingTitle.textContent = "No meeting active";
    meetingSub.textContent = "Ready for your next call";
    primaryText.textContent = "Launch Google Meet";
  }

  // 5. Button Actions
  btnPrimary.addEventListener("click", async () => {
    if (isCurrentTabMeet && currentTab?.id) {
      browserApi.tabs.sendMessage(currentTab.id, { type: "TOGGLE_PANEL" }, (resp) => {
        if (browserApi.runtime.lastError || !resp) {
          // If content script was not ready, try injecting or reload
          if (browserApi.scripting?.executeScript) {
            browserApi.scripting.executeScript({
              target: { tabId: currentTab.id },
              files: ["config.js", "compat.js", "content-captions.js", "content-ui.js", "content-panel.js", "content.js"]
            }).then(() => {
              browserApi.tabs.sendMessage(currentTab.id, { type: "TOGGLE_PANEL_OPEN" });
              window.close();
            }).catch(() => {
              window.close();
            });
            return;
          }
        }
        window.close();
      });
    } else if (activeMeetTab?.id) {
      if (browserApi.windows?.update && activeMeetTab.windowId) {
        try { browserApi.windows.update(activeMeetTab.windowId, { focused: true }); } catch (e) {}
      }
      browserApi.tabs.update(activeMeetTab.id, { active: true }, () => {
        browserApi.tabs.sendMessage(activeMeetTab.id, { type: "TOGGLE_PANEL_OPEN" }, () => {
          let _ = browserApi.runtime.lastError;
          window.close();
        });
      });
    } else {
      browserApi.tabs.create({ url: "https://meet.google.com" });
      window.close();
    }
  });

  btnDashboard.addEventListener("click", () => {
    browserApi.tabs.create({ url: CFG.BASE_URL_WEB });
    window.close();
  });

  btnSettings.addEventListener("click", () => {
    browserApi.tabs.create({ url: `${CFG.BASE_URL_WEB}/settings/api-keys` });
    window.close();
  });

  // 6. Ping Backend status
  const checkHealth = async () => {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 3500);
      const res = await fetch(`${CFG.BASE_URL_BACKEND}/health`, { signal: c.signal });
      clearTimeout(t);
      if (res.ok && backendStatus) {
        backendStatus.textContent = "Backend: Online";
        backendStatus.style.color = "#10b981";
      }
    } catch (e) {
      if (backendStatus) {
        backendStatus.textContent = "Backend: Waking up...";
        backendStatus.style.color = "#f59e0b";
      }
    }
  };
  checkHealth();
});
