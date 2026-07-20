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
chrome.sidePanel.setOptions({ path: "dist/index.html", enabled: true }).catch(() => {});

// Enable side panel on Google Meet room tabs (but don't force open)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("meet.google.com")) {
    chrome.sidePanel.setOptions({ tabId, path: "dist/index.html", enabled: true }).catch(() => {});
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
    const meetCode = msg.meetCode || "";
    let title = msg.title || "";
    if (meetCode && meetCode.length >= 3 && !title.startsWith("Meet - ")) {
      title = `Meet - ${meetCode}`;
    } else if (!title || title === "Google Meet") {
      title = meetCode ? `Meet - ${meetCode}` : "Meet - Live Session";
    }

    activeMeetingId = msg.fallbackId || (meetCode ? meetCode : "live_" + Date.now());
    activeMeetTabId = sender?.tab?.id || null;

    // Enable side panel on meeting start
    const tabId = sender?.tab?.id || activeMeetTabId;
    if (tabId) {
      chrome.sidePanel.setOptions({ tabId, path: "dist/index.html", enabled: true }).catch(() => {});
    }

    chrome.storage.local.get(["meetCodeMap"], (res) => {
      const meetCodeMap = res.meetCodeMap || {};
      const now = Date.now();
      const existing = meetCode ? meetCodeMap[meetCode] : null;

      // Reuse meeting if within 12 hours (43,200,000 ms)
      if (existing && existing.id && (now - existing.timestamp < 43200000)) {
        activeMeetingId = existing.id;
        console.log(`[MeetMaxxing Background] Reusing meeting ${activeMeetingId} for code ${meetCode}`);
        
        chrome.storage.local.set({ currentMeetingId: activeMeetingId, meetingTitle: title, meetCode });
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
        body: JSON.stringify({ title, attendees: [], meet_code: meetCode, google_meet_link: meetCode }),
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
    if (tabId) {
      chrome.sidePanel.setOptions({ tabId, path: "dist/index.html", enabled: true }).catch(() => {});
      try {
        if (sender?.tab?.windowId) {
          chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {});
        }
      } catch (e) {}
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

    const chunkMeetingId = msg.meetingId || activeMeetingId;
    
    const handleSend = (id) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ ...chunk, meeting_id: id })); } catch(e){}
        sendResponse({ success: true });
      } else if (id) {
        if (!ws) connectWebSocket(id);
        fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/ingest/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
          body: JSON.stringify({ ...chunk, meeting_id: id }),
        }).then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
      } else {
        sendResponse({ success: false });
      }
    };

    if (chunkMeetingId) {
      handleSend(chunkMeetingId);
    } else {
      chrome.storage.local.get(["currentMeetingId"], (r) => {
        if (r && r.currentMeetingId) {
          activeMeetingId = r.currentMeetingId;
          handleSend(activeMeetingId);
        } else {
          sendResponse({ success: false });
        }
      });
    }
    return true; // Keep service worker alive until sendResponse is called
  }

  // ── END_MEETING ──
  if (msg.type === "END_MEETING" || msg.type === "REQUEST_END_MEETING") {
    stopTabCapture();
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    const meetingIdToEnd = activeMeetingId || msg.meetingId;

    const finishEnd = () => {
      activeMeetingId = null;
      activeMeetTabId = null;
      chrome.storage.local.remove("currentMeetingId");
      chrome.runtime.sendMessage({ type: "MEETING_ENDED", meetingId: meetingIdToEnd }, () => { let _ = chrome.runtime.lastError; });
      sendResponse({ success: true });
    };

    if (meetingIdToEnd) {
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/meeting/${meetingIdToEnd}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title: msg.title || "Google Meet", attendees: [] }),
      }).then(finishEnd).catch(finishEnd);
      return true; // Keep service worker alive during fetch
    } else {
      finishEnd();
      return false;
    }
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
      const isRecap = msg.type === "REQUEST_RECAP";
      const endpoint = isRecap ? `/ingest/late-recap/${targetId}?force=true` : `/ingest/realtime/${targetId}?force=true`;
      const method = isRecap ? "GET" : "POST";
      
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}${endpoint}`, {
        method: method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      })
        .then((r) => r.json())
        .then((data) => {
          let updateData = data;
          if (isRecap) {
            let recapText = "";
            if (data.recap && data.recap.trim().length > 0) {
              recapText = `Recap:\n${data.recap}`;
            } else {
              recapText = "Meeting is still in early stages or no speech captured yet. Keep talking for a richer recap.";
            }

            if (data.current_topic && data.current_topic !== "Unknown") {
              recapText += `\n\nCurrent Topic:\n${data.current_topic}`;
            }
            if (data.key_decisions_so_far && data.key_decisions_so_far.length) {
              recapText += `\n\nDecisions:\n- ${data.key_decisions_so_far.join("\n- ")}`;
            }
            if (data.who_said_what && data.who_said_what.length) {
              recapText += `\n\nWho said what:\n- ${data.who_said_what.join("\n- ")}`;
            }
            updateData = { recap: recapText, meeting_id: data.meeting_id || targetId, powered_by: data.powered_by };
          }
          
          chrome.storage.local.get(["copilot_state"], (res) => {
            const prevState = res.copilot_state || {};
            const tagged = { ...prevState, ...updateData, meeting_id: updateData.meeting_id || targetId };
            chrome.storage.local.set({ lastCopilotUpdate: tagged, copilot_state: tagged, poweredBy: tagged.powered_by });
            chrome.runtime.sendMessage({ type: "COPILOT_UPDATE", data: tagged }, () => { let _ = chrome.runtime.lastError; });
          });
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
