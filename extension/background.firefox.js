/**
 * MeetMaxxing Service Worker (Background Script) for Firefox
 */

const isDevMode = () => {
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest) {
    return !browser.runtime.getManifest().update_url;
  }
  return false;
};
const _isDevHost = isDevMode();

const MEETMAXXING_CONFIG = {
  BASE_URL_BACKEND: _isDevHost ? "http://localhost:8000" : "https://meetmaxxing-api.onrender.com",
  BASE_URL_WEB: _isDevHost ? "http://localhost:3000" : "https://meetmaxxing.vercel.app",
  WS_URL: _isDevHost ? "ws://localhost:8000" : "wss://meetmaxxing-api.onrender.com",
};

let ws = null;
let activeMeetingId = null;
let activeMeetTabId = null;
let activeMeetingMaxParticipants = 1;
let activeAuthToken = '';

// Init auth token
browser.storage.local.get(["authToken"], (r) => {
  if (r.authToken) activeAuthToken = r.authToken;
});

// Send toggle message to content script on browser action click
browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" }).catch(() => {});
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeMeetTabId === tabId) {
    handleMeetingEnd(tabId);
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && activeMeetTabId === tabId && !changeInfo.url.includes("meet.google.com")) {
    handleMeetingEnd(tabId);
  }
});

function handleMeetingEnd(tabId) {
  const meetingIdToEnd = activeMeetingId;
  const maxPart = activeMeetingMaxParticipants;
  if (meetingIdToEnd) {
    fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/meeting/${meetingIdToEnd}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      body: JSON.stringify({ title: "Google Meet", attendees: [], max_participants: maxPart }),
    }).catch(() => {});
  }
  if (ws) { try { ws.close(); } catch (e) {} ws = null; }
  activeMeetingId = null;
  activeMeetTabId = null;
  activeMeetingMaxParticipants = 1;
  browser.storage.local.remove(["currentMeetingId", "lastCopilotUpdate", "copilot_state", "transcript"]);
  browser.runtime.sendMessage({ type: "MEETING_ENDED", meetingId: meetingIdToEnd }).catch(() => {});
}

// ─── WebSocket ──────────────────────────────────────────────────────────────────
function connectWebSocket(meetingId) {
  if (ws) { try { ws.close(); } catch (e) {} }
  const wsUrl = `${MEETMAXXING_CONFIG.WS_URL}/ingest/ws/${meetingId}`;
  try { ws = new WebSocket(wsUrl); } catch (e) { return; }

  ws.onopen = () => {
    browser.runtime.sendMessage({ type: "WS_CONNECTED" }).catch(() => {});
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "copilot_update" && msg.data) {
        const update = { ...msg.data, meeting_id: msg.data.meeting_id || activeMeetingId };
        browser.storage.local.set({ lastCopilotUpdate: update, copilot_state: update, poweredBy: update.powered_by });
        browser.runtime.sendMessage({ type: "COPILOT_UPDATE", data: update }).catch(() => {});
      } else if (msg.type === "live_caption_chunk" && msg.chunk) {
        browser.runtime.sendMessage({ type: "LIVE_CAPTION_CHUNK", chunk: msg.chunk }).catch(() => {});
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

// ─── Message Router ─────────────────────────────────────────────────────────────
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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

    browser.storage.local.get(["meetCodeMap"]).then((res) => {
      const meetCodeMap = res.meetCodeMap || {};
      const now = Date.now();
      const existing = meetCode ? meetCodeMap[meetCode] : null;

      if (existing && existing.id && (now - existing.timestamp < 43200000)) {
        activeMeetingId = existing.id;
        browser.storage.local.set({ currentMeetingId: activeMeetingId, meetingTitle: title, meetCode, meetingStartTime: now });
        connectWebSocket(activeMeetingId);
        browser.runtime.sendMessage({ type: "MEETING_STARTED", meetingId: activeMeetingId, title, startTime: now, reused: true }).catch(() => {});
        sendResponse({ success: true, meetingId: activeMeetingId });
        return;
      }

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
            browser.storage.local.set({ meetCodeMap, currentMeetingId: activeMeetingId, meetingTitle: title, meetingStartTime: now });
            connectWebSocket(activeMeetingId);
          }
          browser.runtime.sendMessage({ type: "MEETING_STARTED", meetingId: activeMeetingId, title, startTime: now }).catch(() => {});
          sendResponse({ success: true, meetingId: activeMeetingId });
        })
        .catch(() => {
          meetCodeMap[meetCode] = { id: activeMeetingId, timestamp: now };
          browser.storage.local.set({ meetCodeMap, currentMeetingId: activeMeetingId, meetingTitle: title, meetingStartTime: now });
          connectWebSocket(activeMeetingId);
          browser.runtime.sendMessage({ type: "MEETING_STARTED", meetingId: activeMeetingId, title, startTime: now }).catch(() => {});
          sendResponse({ success: true, meetingId: activeMeetingId });
        });
    });

    return true;
  }

  if (msg.type === "ENSURE_SIDE_PANEL_OPEN") {
    const tabId = sender?.tab?.id || activeMeetTabId;
    if (tabId) {
      browser.tabs.sendMessage(tabId, { type: "TOGGLE_PANEL_OPEN" }).catch(() => {});
    }
    return false;
  }

  if (msg.type === "INGEST_CHUNK") {
    const chunk = msg.chunk;
    browser.runtime.sendMessage({ type: "LIVE_CAPTION_CHUNK", chunk: chunk }).catch(() => {});
    
    browser.storage.local.get(["transcript"]).then((res) => {
      const prev = res.transcript && Array.isArray(res.transcript) ? res.transcript : [];
      const now = Date.now();
      let updated = [...prev];
      if (updated.length > 0) {
        const last = updated[updated.length - 1];
        if (last.speaker === (chunk.speaker || "Speaker") && (now - (last.timestamp || 0) < 60000)) {
          const newText = (chunk.text || "").trim();
          if (newText.startsWith(last.text) || last.text.startsWith(newText) || newText.includes(last.text)) {
            updated[updated.length - 1] = { ...last, text: newText.length > last.text.length ? newText : last.text, timestamp: now };
            browser.storage.local.set({ transcript: updated });
            return;
          }
        }
      }
      updated.push({ speaker: chunk.speaker || "Speaker", text: (chunk.text || "").trim(), timestamp: now });
      browser.storage.local.set({ transcript: updated });
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
      browser.storage.local.get(["currentMeetingId"]).then((r) => {
        if (r && r.currentMeetingId) {
          activeMeetingId = r.currentMeetingId;
          handleSend(activeMeetingId);
        } else {
          sendResponse({ success: false });
        }
      });
    }
    return true;
  }

  if (msg.type === "END_MEETING" || msg.type === "REQUEST_END_MEETING") {
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    const meetingIdToEnd = activeMeetingId || msg.meetingId;
    if (!meetingIdToEnd) {
      sendResponse({ success: true });
      return false;
    }

    const finishEnd = () => {
      activeMeetingId = null;
      activeMeetTabId = null;
      activeMeetingMaxParticipants = 1;
      browser.storage.local.remove(["currentMeetingId", "lastCopilotUpdate", "copilot_state", "transcript"]);
      browser.runtime.sendMessage({ type: "MEETING_ENDED", meetingId: meetingIdToEnd }).catch(() => {});
      sendResponse({ success: true });
    };

    if (activeMeetingId) {
      activeMeetingId = null; 
      const maxParticipants = msg.maxParticipants || activeMeetingMaxParticipants || 1;
      fetch(`${MEETMAXXING_CONFIG.BASE_URL_BACKEND}/meeting/${meetingIdToEnd}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title: msg.title || "Google Meet", attendees: [], max_participants: maxParticipants }),
      }).then(finishEnd).catch(finishEnd);
      return true;
    } else {
      finishEnd();
      return false;
    }
  }

  if (msg.type === "UPDATE_PARTICIPANTS") {
    activeMeetingMaxParticipants = msg.maxParticipants;
    sendResponse({ success: true });
    return false;
  }

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
              recapText = `**Recap**\n${data.recap}`;
            } else {
              recapText = "Meeting is still in early stages or no speech captured yet. Keep talking for a richer recap.";
            }

            if (data.current_topic && data.current_topic !== "Unknown") {
              recapText += `\n\n**Current Topic**\n${data.current_topic}`;
            }
            if (data.key_decisions_so_far && data.key_decisions_so_far.length) {
              recapText += `\n\n**Decisions**\n- ${data.key_decisions_so_far.join("\n- ")}`;
            }
            if (data.who_said_what && data.who_said_what.length) {
              recapText += `\n\n**Who said what**\n- ${data.who_said_what.join("\n- ")}`;
            }
            updateData = { recap: recapText, meeting_id: data.meeting_id || targetId, powered_by: data.powered_by };
          }
          
          browser.storage.local.get(["copilot_state"]).then((res) => {
            const prevState = res.copilot_state || {};
            const tagged = { ...prevState, ...updateData, meeting_id: updateData.meeting_id || targetId };
            browser.storage.local.set({ lastCopilotUpdate: tagged, copilot_state: tagged, poweredBy: tagged.powered_by });
            browser.runtime.sendMessage({ type: "COPILOT_UPDATE", data: tagged }).catch(() => {});
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
    browser.storage.local.set({ currentMeetingId: activeMeetingId, meetingTitle: msg.title });
    sendResponse({ success: true }); return false;
  }
});
