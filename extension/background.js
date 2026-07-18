/**
 * MeetMaxxing Service Worker (Background Script)
 *
 * Handles:
 * - Tab audio capture via chrome.tabCapture + offscreen document
 * - WebSocket connection to backend for copilot_update stream
 * - Forwarding base64 audio chunks to backend /ingest/audio
 * - Routing messages between content script, side panel, and backend
 */

const MEETMAXXING_CONFIG = {
  BASE_URL_BACKEND: "http://localhost:8000",
  BASE_URL_WEB: "http://localhost:3000",
  WS_URL: "ws://localhost:8000",
};

let ws = null;
let activeMeetingId = null;
let activeMeetTabId = null;
let activeAuthToken = "dev_token";

// Init auth token
chrome.storage.local.get(["authToken"], (r) => {
  if (r.authToken) activeAuthToken = r.authToken;
  else chrome.storage.local.set({ authToken: "dev_token" });
});

// Configure side panel to open on action icon click by default across all tabs
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.sidePanel.setOptions({ path: "sidepanel.html", enabled: true }).catch(() => {});

// Enable and auto-open side panel on Google Meet room tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("meet.google.com")) {
    chrome.sidePanel.setOptions({ tabId, path: "sidepanel.html", enabled: true }).catch(() => {});
    const pathname = new URL(tab.url).pathname;
    if (pathname.length > 4 && !pathname.includes("landing") && !pathname.includes("home")) {
      chrome.sidePanel.open({ tabId }).catch(() => {});
      if (tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeMeetTabId === tabId) {
    console.log("[MeetMaxxing Background] Meet tab closed, triggering END_MEETING");
    const meetingIdToEnd = activeMeetingId;
    if (meetingIdToEnd) {
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/meeting/${meetingIdToEnd}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title: "Google Meet", attendees: [] }),
      }).catch(() => {});
    }
    stopTabCapture();
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    activeMeetingId = null;
    activeMeetTabId = null;
    chrome.storage.local.remove("currentMeetingId");
    chrome.runtime.sendMessage({ type: "MEETING_ENDED", meetingId: meetingIdToEnd }, () => { let _ = chrome.runtime.lastError; });
  }
});

// ─── WebSocket ──────────────────────────────────────────────────────────────────
function connectWebSocket(meetingId) {
  if (ws) { try { ws.close(); } catch (e) {} }
  const wsUrl = `${MEETMAXXING_CONFIG.WS_URL}/ingest/ws/${meetingId}`;
  try { ws = new WebSocket(wsUrl); } catch (e) { return; }

  ws.onopen = () => {
    chrome.runtime.sendMessage({ type: "WS_CONNECTED" }, () => { let _ = chrome.runtime.lastError; });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "copilot_update" && msg.data) {
        console.log("[MeetMaxxing Background] Copilot update received:", msg.data);
        const update = { ...msg.data, meeting_id: msg.data.meeting_id || activeMeetingId };
        chrome.storage.local.set({ lastCopilotUpdate: update, copilot_state: update, poweredBy: update.powered_by });
        chrome.runtime.sendMessage({ type: "COPILOT_UPDATE", data: update }, () => { let _ = chrome.runtime.lastError; });
      } else if (msg.type === "live_caption_chunk" && msg.chunk) {
        chrome.runtime.sendMessage({ type: "LIVE_CAPTION_CHUNK", chunk: msg.chunk }, () => { let _ = chrome.runtime.lastError; });
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    setTimeout(() => {
      if (activeMeetingId && activeMeetingId === meetingId) connectWebSocket(meetingId);
    }, 4000);
  };

  ws.onerror = () => {};
}

// ─── Tab Audio Capture (all participants) ──────────────────────────────────────
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Capture Google Meet tab audio for real-time AI transcription",
  });
}

async function startTabCapture(tabId, meetingId) {
  try {
    await ensureOffscreenDocument();

    // Get stream ID for the target tab
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(id);
      });
    });

    // Tell offscreen to start recording
    chrome.runtime.sendMessage({
      target: "offscreen",
      type: "START_CAPTURE",
      streamId,
      meetingId,
    }, () => { let _ = chrome.runtime.lastError; });

    console.log("[MeetMaxxing Background] Tab capture started for tab", tabId);
  } catch (err) {
    console.error("[MeetMaxxing Background] Tab capture failed:", err.message);
  }
}

function stopTabCapture() {
  chrome.runtime.sendMessage(
    { target: "offscreen", type: "STOP_CAPTURE" },
    () => { let _ = chrome.runtime.lastError; }
  );
}

// ─── Message Router ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── START_MEETING ──
  if (msg.type === "START_MEETING") {
    const title = msg.title || "Google Meet";
    const meetCode = msg.meetCode || "live_" + Date.now();
    activeMeetingId = msg.fallbackId || "live_" + Date.now();
    activeMeetTabId = sender?.tab?.id || null;

    // Auto-open side panel on meeting start
    const tabId = sender?.tab?.id || activeMeetTabId;
    const windowId = sender?.tab?.windowId;
    if (tabId) {
      chrome.sidePanel.setOptions({ tabId, path: "sidepanel.html", enabled: true }).catch(() => {});
      chrome.sidePanel.open({ tabId }).catch(() => {});
    }
    if (windowId) {
      chrome.sidePanel.open({ windowId }).catch(() => {});
    }

    chrome.storage.local.get(["meetCodeMap"], (res) => {
      const meetCodeMap = res.meetCodeMap || {};
      const now = Date.now();
      const existing = meetCodeMap[meetCode];

      // Reuse meeting if within 12 hours (43,200,000 ms)
      if (existing && existing.id && (now - existing.timestamp < 43200000)) {
        activeMeetingId = existing.id;
        console.log(`[MeetMaxxing Background] Reusing meeting ${activeMeetingId} for code ${meetCode}`);
        
        chrome.storage.local.set({ currentMeetingId: activeMeetingId, meetingTitle: title });
        connectWebSocket(activeMeetingId);
        chrome.runtime.sendMessage({ type: "MEETING_STARTED", meetingId: activeMeetingId, title }, () => { let _ = chrome.runtime.lastError; });
        
        sendResponse({ success: true, meetingId: activeMeetingId });
        if (activeMeetTabId) startTabCapture(activeMeetTabId, activeMeetingId);
        return;
      }

      // Otherwise, register with backend
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/ingest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title, attendees: [] }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.meeting_id) {
            activeMeetingId = data.meeting_id;
            meetCodeMap[meetCode] = { id: activeMeetingId, timestamp: now };
            chrome.storage.local.set({ meetCodeMap, currentMeetingId: activeMeetingId, meetingTitle: title });
            connectWebSocket(activeMeetingId);
          }
          chrome.runtime.sendMessage({ type: "MEETING_STARTED", meetingId: activeMeetingId, title }, () => { let _ = chrome.runtime.lastError; });
          sendResponse({ success: true, meetingId: activeMeetingId });
          if (activeMeetTabId) startTabCapture(activeMeetTabId, activeMeetingId);
        })
        .catch(() => {
          meetCodeMap[meetCode] = { id: activeMeetingId, timestamp: now };
          chrome.storage.local.set({ meetCodeMap, currentMeetingId: activeMeetingId, meetingTitle: title });
          connectWebSocket(activeMeetingId);
          chrome.runtime.sendMessage({ type: "MEETING_STARTED", meetingId: activeMeetingId, title }, () => { let _ = chrome.runtime.lastError; });
          sendResponse({ success: true, meetingId: activeMeetingId });
          if (activeMeetTabId) startTabCapture(activeMeetTabId, activeMeetingId);
        });
    });

    return true;
  }

  // ── ENSURE_SIDE_PANEL_OPEN ──
  if (msg.type === "ENSURE_SIDE_PANEL_OPEN") {
    const tabId = sender?.tab?.id || activeMeetTabId;
    const windowId = sender?.tab?.windowId;
    if (tabId) {
      chrome.sidePanel.setOptions({ tabId, path: "sidepanel.html", enabled: true }).catch(() => {});
      chrome.sidePanel.open({ tabId }).catch(() => {});
    }
    if (windowId) {
      chrome.sidePanel.open({ windowId }).catch(() => {});
    }
    return false;
  }

  // ── AUDIO_CHUNK (from offscreen.js) — send to backend for Gemini transcription ──
  if (msg.type === "AUDIO_CHUNK") {
    if (!activeMeetingId) { sendResponse({ success: false }); return false; }
    fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/ingest/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      body: JSON.stringify({
        meeting_id: activeMeetingId,
        audio_base64: msg.base64,
        mime_type: msg.mimeType || "audio/webm",
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        // If Gemini returned a copilot_update, push to sidepanel
        if (data.copilot_update) {
          const tagged = { ...data.copilot_update, meeting_id: data.copilot_update.meeting_id || activeMeetingId };
          chrome.storage.local.set({ lastCopilotUpdate: tagged, copilot_state: tagged, poweredBy: tagged.powered_by });
          chrome.runtime.sendMessage({ type: "COPILOT_UPDATE", data: tagged },
            () => { let _ = chrome.runtime.lastError; });
        }
      })
      .catch(() => {});
    sendResponse({ success: true });
    return false;
  }

  // ── INGEST_CHUNK (text transcript, fallback path) ──
  if (msg.type === "INGEST_CHUNK") {
    const chunk = msg.chunk;
    chrome.runtime.sendMessage({ type: "LIVE_CAPTION_CHUNK", chunk: chunk }, () => { let _ = chrome.runtime.lastError; });
    
    // Persist chunk to local storage for sidepanel recovery/initial load
    chrome.storage.local.get(["transcript"], (res) => {
      const prev = res.transcript && Array.isArray(res.transcript) ? res.transcript : [];
      const now = Date.now();
      let updated = [...prev];
      if (updated.length > 0) {
        const last = updated[updated.length - 1];
        if (last.speaker === (chunk.speaker || "Speaker") && (now - (last.timestamp || 0) < 4500)) {
          const newText = (chunk.text || "").trim();
          if (newText.startsWith(last.text) || last.text.startsWith(newText) || newText.includes(last.text)) {
            updated[updated.length - 1] = { ...last, text: newText.length > last.text.length ? newText : last.text, timestamp: now };
            chrome.storage.local.set({ transcript: updated });
            return;
          }
        }
      }
      updated.push({ speaker: chunk.speaker || "Speaker", text: (chunk.text || "").trim(), timestamp: now });
      chrome.storage.local.set({ transcript: updated });
    });

    const sendToBackend = (meetingId) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ ...chunk, meeting_id: meetingId })); } catch(e){}
      } else if (meetingId) {
        if (!ws) connectWebSocket(meetingId);
        fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/ingest/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
          body: JSON.stringify({ ...chunk, meeting_id: meetingId }),
        }).catch(() => {});
      }
    };

    if (activeMeetingId) {
      sendToBackend(activeMeetingId);
    } else {
      chrome.storage.local.get(["currentMeetingId"], (r) => {
        if (r && r.currentMeetingId) {
          activeMeetingId = r.currentMeetingId;
          sendToBackend(activeMeetingId);
        }
      });
    }
    sendResponse({ success: true });
    return false;
  }

  // ── END_MEETING ──
  if (msg.type === "END_MEETING" || msg.type === "REQUEST_END_MEETING") {
    stopTabCapture();
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    const meetingIdToEnd = activeMeetingId || msg.meetingId;
    if (meetingIdToEnd) {
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/meeting/${meetingIdToEnd}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title: msg.title || "Google Meet", attendees: [] }),
      }).catch(() => {});
    }
    activeMeetingId = null;
    activeMeetTabId = null;
    chrome.storage.local.remove("currentMeetingId");
    chrome.runtime.sendMessage({ type: "MEETING_ENDED", meetingId: meetingIdToEnd },
      () => { let _ = chrome.runtime.lastError; });
    sendResponse({ success: true });
    return false;
  }

  // ── FORCE_TEST_UPDATE / ASK_SUGGESTIONS / ASK_NEXT_QUESTION / REQUEST_RECAP ──
  if (["FORCE_TEST_UPDATE", "ASK_SUGGESTIONS", "ASK_NEXT_QUESTION", "REQUEST_RECAP"].includes(msg.type)) {
    const targetId = msg.meetingId || activeMeetingId;
    if (targetId && ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "ping" })); } catch (e) {}
    } else if (targetId) {
      connectWebSocket(targetId);
    }
    if (targetId) {
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/ingest/realtime/${targetId}?force=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const tagged = { ...data, meeting_id: data.meeting_id || targetId };
          chrome.storage.local.set({ lastCopilotUpdate: tagged, copilot_state: tagged, poweredBy: tagged.powered_by });
          chrome.runtime.sendMessage({ type: "COPILOT_UPDATE", data: tagged }, () => { let _ = chrome.runtime.lastError; });
        })
        .catch(() => {});
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === "GET_CONFIG") { sendResponse(MEETMAXXING_CONFIG); return false; }
  if (msg.type === "MEETING_STARTED") {
    activeMeetingId = msg.meetingId;
    activeMeetTabId = sender.tab ? sender.tab.id : null;
    chrome.storage.local.set({ currentMeetingId: activeMeetingId, meetingTitle: msg.title });
    // Don't re-broadcast — background already sent MEETING_STARTED upstream
    sendResponse({ success: true }); return false;
  }
  // Note: MEETING_ENDED re-broadcast removed — would cause self-loop;
  // sidepanel uses storage.onChanged as reliable fallback.
});
