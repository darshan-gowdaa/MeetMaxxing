/**
 * MeetMaxxing Background Script — Chrome + Firefox
 * Depends on: config.js (loaded first), compat.js (loaded second)
 * `ext` and `MEETMAXXING_CONFIG` are globals from those files.
 */
"use strict";

let ws = null;
let activeMeetingId = null;
let activeMeetTabId = null;
let activeMeetingMaxParticipants = 1;
let activeAuthToken = "";

const BASE = MEETMAXXING_CONFIG.BASE_URL_BACKEND;
const WS_BASE = MEETMAXXING_CONFIG.WS_URL;
const SUPABASE_URL = "https://gcslaozkazuhdqctefpn.supabase.co";
const SUPABASE_KEY = "sb_publishable_vgpAoeKLmTotYUKQwVBKng_O0rqqE5i";
const STORAGE_CLEAR_KEYS = ["currentMeetingId", "lastCopilotUpdate", "copilot_state", "transcript"];

// Init token from storage
ext.storage.get(["authToken", "currentMeetingId"]).then((r) => {
  if (r.authToken) activeAuthToken = r.authToken;
  if (r.currentMeetingId) {
    // Check if any meet tabs are actually open, otherwise we have a stuck state from a browser crash
    ext.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        ext.storage.remove(STORAGE_CLEAR_KEYS);
      } else {
        activeMeetingId = r.currentMeetingId;
      }
    });
  }
});

ext.storageOnChanged.addListener((changes, area) => {
  if (area === "local" && changes.authToken?.newValue) {
    activeAuthToken = changes.authToken.newValue;
  }
});

// Refresh Supabase token
async function refreshAuthToken() {
  const r = await ext.storage.get(["authRefreshToken"]);
  if (!r.authRefreshToken) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: r.authRefreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      activeAuthToken = data.access_token;
      const updates = { authToken: data.access_token };
      if (data.refresh_token) updates.authRefreshToken = data.refresh_token;
      await ext.storage.set(updates);
      return true;
    }
  } catch (e) {}
  return false;
}

ext.setRefreshAlarm(refreshAuthToken);

// Fetch with 401 auto-retry
async function authFetch(url, options = {}) {
  const headers = { ...options.headers, Authorization: `Bearer ${activeAuthToken}` };
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    const ok = await refreshAuthToken();
    if (ok) {
      headers.Authorization = `Bearer ${activeAuthToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }
  return res;
}

ext.onActionClicked((tab) => {
  if (tab.id) ext.sendTabMessage(tab.id, { type: "TOGGLE_PANEL" });
});

ext.tabs.onRemoved.addListener((tabId) => {
  if (activeMeetTabId === tabId) handleMeetingEnd();
});

ext.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && activeMeetTabId === tabId && !changeInfo.url.includes("meet.google.com")) {
    handleMeetingEnd();
  }
});

function handleMeetingEnd() {
  const meetingIdToEnd = activeMeetingId;
  if (meetingIdToEnd) {
    fetch(`${BASE}/meeting/${meetingIdToEnd}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      body: JSON.stringify({ title: "Google Meet", attendees: [], max_participants: activeMeetingMaxParticipants }),
    }).catch(() => {});
  }
  if (ws) { try { ws.close(); } catch (e) {} ws = null; }
  activeMeetingId = null;
  activeMeetTabId = null;
  activeMeetingMaxParticipants = 1;
  ext.storage.remove(STORAGE_CLEAR_KEYS);
  ext.broadcast({ type: "MEETING_ENDED", meetingId: meetingIdToEnd });
}

// WebSocket
function connectWebSocket(meetingId) {
  if (ws) { try { ws.close(); } catch (e) {} }
  // Chrome passes auth in query param; Firefox doesn't support it the same way in MV2
  const wsUrl = ext.isFx
    ? `${WS_BASE}/ingest/ws/${meetingId}`
    : `${WS_BASE}/ingest/ws/${meetingId}?token=${activeAuthToken}`;
  try { ws = new WebSocket(wsUrl); } catch (e) { return; }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "copilot_update" && msg.data) {
        const update = { ...msg.data, meeting_id: msg.data.meeting_id || activeMeetingId };
        ext.storage.set({ lastCopilotUpdate: update, copilot_state: update, poweredBy: update.powered_by });
        ext.broadcast({ type: "COPILOT_UPDATE", data: update });
      } else if (msg.type === "live_caption_chunk" && msg.chunk) {
        ext.broadcast({ type: "LIVE_CAPTION_CHUNK", chunk: msg.chunk });
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    setTimeout(() => {
      if (activeMeetingId === meetingId) connectWebSocket(meetingId);
    }, 4000);
  };

  ws.onerror = () => {};
}

// Chrome-only: offscreen tab audio capture
async function ensureOffscreenDocument() {
  if (ext.isFx || !ext.api.offscreen) return;
  if (ext.runtime.getContexts) {
    const existing = await ext.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
    if (existing.length > 0) return;
  }
  await ext.api.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Capture Google Meet tab audio for real-time AI transcription",
  });
}

// Persist + forward transcript chunk to storage
async function persistChunk(chunk) {
  const res = await ext.storage.get(["transcript"]);
  const prev = Array.isArray(res.transcript) ? res.transcript : [];
  const now = Date.now();
  const updated = [...prev];
  if (updated.length > 0) {
    const last = updated[updated.length - 1];
    if (last.speaker === (chunk.speaker || "Speaker") && now - (last.timestamp || 0) < 60000) {
      const newText = (chunk.text || "").trim();
      if (newText.startsWith(last.text) || last.text.startsWith(newText) || newText.includes(last.text)) {
        updated[updated.length - 1] = {
          ...last,
          text: newText.length > last.text.length ? newText : last.text,
          timestamp: now,
        };
        return ext.storage.set({ transcript: updated });
      }
    }
  }
  updated.push({ speaker: chunk.speaker || "Speaker", text: (chunk.text || "").trim(), timestamp: now, source: chunk.source });
  return ext.storage.set({ transcript: updated });
}

// Build recap text from raw backend response
function buildRecapText(data, targetId) {
  let recapText = data.recap?.trim()
    ? `**Recap**\n${data.recap}`
    : "Meeting is still in early stages or no speech captured yet. Keep talking for a richer recap.";
  if (data.current_topic && data.current_topic !== "Unknown")
    recapText += `\n\n**Current Topic**\n${data.current_topic}`;
  if (data.key_decisions_so_far?.length)
    recapText += `\n\n**Decisions**\n- ${data.key_decisions_so_far.join("\n- ")}`;
  if (data.who_said_what?.length)
    recapText += `\n\n**Who said what**\n- ${data.who_said_what.join("\n- ")}`;
  return { recap: recapText, meeting_id: data.meeting_id || targetId, powered_by: data.powered_by };
}

// Push update to storage + broadcast
async function pushUpdate(updateData, targetId) {
  const res = await ext.storage.get(["copilot_state"]);
  const tagged = { ...(res.copilot_state || {}), ...updateData, meeting_id: updateData.meeting_id || targetId };
  await ext.storage.set({ lastCopilotUpdate: tagged, copilot_state: tagged, poweredBy: tagged.powered_by });
  ext.broadcast({ type: "COPILOT_UPDATE", data: tagged });
}

// Message router
ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "START_MEETING") {
    const meetCode = msg.meetCode || "";
    let title = msg.title || "";
    if (meetCode.length >= 3 && !title.startsWith("Meet - ")) title = `Meet - ${meetCode}`;
    else if (!title || title === "Google Meet") title = meetCode ? `Meet - ${meetCode}` : "Meet - Live Session";

    activeMeetingId = msg.fallbackId || (meetCode || "live_" + Date.now());
    activeMeetTabId = sender?.tab?.id || null;

    const tabId = sender?.tab?.id || activeMeetTabId;
    if (tabId) ext.sendTabMessage(tabId, { type: "TOGGLE_PANEL_OPEN" });

    ext.storage.get(["meetCodeMap"]).then((res) => {
      const meetCodeMap = res.meetCodeMap || {};
      const now = Date.now();
      const existing = meetCode ? meetCodeMap[meetCode] : null;

      if (existing?.id && now - existing.timestamp < 43200000) {
        activeMeetingId = existing.id;
        ext.storage.set({ currentMeetingId: activeMeetingId, meetingTitle: title, meetCode, meetingStartTime: now });
        connectWebSocket(activeMeetingId);
        ext.broadcast({ type: "MEETING_STARTED", meetingId: activeMeetingId, title, startTime: now, reused: true });
        sendResponse({ success: true, meetingId: activeMeetingId });
        return;
      }

      const afterStart = (data) => {
        if (data?.meeting_id) {
          activeMeetingId = data.meeting_id;
          meetCodeMap[meetCode] = { id: activeMeetingId, timestamp: now };
          ext.storage.set({ meetCodeMap, currentMeetingId: activeMeetingId, meetingTitle: title, meetingStartTime: now });
          connectWebSocket(activeMeetingId);
        }
        ext.broadcast({ type: "MEETING_STARTED", meetingId: activeMeetingId, title, startTime: now });
        sendResponse({ success: true, meetingId: activeMeetingId });
      };

      const onFail = () => {
        meetCodeMap[meetCode] = { id: activeMeetingId, timestamp: now };
        ext.storage.set({ meetCodeMap, currentMeetingId: activeMeetingId, meetingTitle: title, meetingStartTime: now });
        connectWebSocket(activeMeetingId);
        ext.broadcast({ type: "MEETING_STARTED", meetingId: activeMeetingId, title, startTime: now });
        sendResponse({ success: true, meetingId: activeMeetingId });
      };

      fetch(`${BASE}/ingest/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title, attendees: [], meet_code: meetCode, google_meet_link: meetCode }),
      }).then((r) => r.json()).then(afterStart).catch(onFail);
    });
    return true;
  }

  if (msg.type === "ENSURE_SIDE_PANEL_OPEN") {
    const tabId = sender?.tab?.id || activeMeetTabId;
    if (tabId) ext.sendTabMessage(tabId, { type: "TOGGLE_PANEL_OPEN" });
    return false;
  }

  if (msg.type === "AUDIO_CHUNK") {
    if (!activeMeetingId) { sendResponse({ success: false }); return false; }
    fetch(`${BASE}/ingest/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      body: JSON.stringify({ meeting_id: activeMeetingId, audio_base64: msg.base64, mime_type: msg.mimeType || "audio/webm" }),
    }).then((r) => r.json()).then((data) => {
      if (data.copilot_update) {
        const tagged = { ...data.copilot_update, meeting_id: data.copilot_update.meeting_id || activeMeetingId };
        ext.storage.set({ lastCopilotUpdate: tagged, copilot_state: tagged, poweredBy: tagged.powered_by });
        ext.broadcast({ type: "COPILOT_UPDATE", data: tagged });
      }
    }).catch(() => {});
    sendResponse({ success: true });
    return false;
  }

  if (msg.type === "INGEST_CHUNK") {
    const chunk = msg.chunk;
    ext.broadcast({ type: "LIVE_CAPTION_CHUNK", chunk });
    persistChunk(chunk);

    const chunkMeetingId = msg.meetingId || activeMeetingId;
    const handleSend = (id) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ ...chunk, meeting_id: id })); } catch (e) {}
        sendResponse({ success: true });
      } else if (id) {
        if (!ws) connectWebSocket(id);
        authFetch(`${BASE}/ingest/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...chunk, meeting_id: id }),
        }).then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
      } else {
        sendResponse({ success: false });
      }
    };

    if (chunkMeetingId) {
      handleSend(chunkMeetingId);
    } else {
      ext.storage.get(["currentMeetingId"]).then((r) => {
        if (r?.currentMeetingId) { activeMeetingId = r.currentMeetingId; handleSend(activeMeetingId); }
        else sendResponse({ success: false });
      });
    }
    return true;
  }

  if (msg.type === "END_MEETING" || msg.type === "REQUEST_END_MEETING") {
    if (ws) { try { ws.close(); } catch (e) {} ws = null; }
    const meetingIdToEnd = activeMeetingId || msg.meetingId;
    if (!meetingIdToEnd) { sendResponse({ success: true }); return false; }

    const finishEnd = () => {
      activeMeetingId = null;
      activeMeetTabId = null;
      activeMeetingMaxParticipants = 1;
      ext.storage.remove(STORAGE_CLEAR_KEYS);
      ext.broadcast({ type: "MEETING_ENDED", meetingId: meetingIdToEnd });
      sendResponse({ success: true });
    };

    if (activeMeetingId) {
      activeMeetingId = null;
      fetch(`${BASE}/meeting/${meetingIdToEnd}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
        body: JSON.stringify({ title: msg.title || "Google Meet", attendees: [], max_participants: msg.maxParticipants || activeMeetingMaxParticipants || 1 }),
      }).then(finishEnd).catch(finishEnd);
      return true;
    }
    finishEnd();
    return false;
  }

  if (msg.type === "UPDATE_PARTICIPANTS") {
    activeMeetingMaxParticipants = msg.maxParticipants;
    sendResponse({ success: true });
    return false;
  }

  if (["FORCE_TEST_UPDATE", "ASK_SUGGESTIONS", "ASK_NEXT_QUESTION", "REQUEST_RECAP", "GENERATE_INSIGHTS"].includes(msg.type)) {
    const targetId = msg.meetingId || activeMeetingId;
    if (msg.type === "GENERATE_INSIGHTS") {
      Promise.all([
        fetch(`${BASE}/ingest/realtime/${targetId}?force=true`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` } }),
        fetch(`${BASE}/ingest/late-recap/${targetId}?force=true`, { method: "GET", headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` } })
      ]).then(async ([realtimeRes, recapRes]) => {
        const realtimeData = await realtimeRes.json();
        const recapData = await recapRes.json();
        let recapText = recapData.recap?.trim() ? `**Recap**\n${recapData.recap}` : "Meeting is still in early stages or no speech captured yet. Keep talking for a richer recap.";
        if (recapData.current_topic && recapData.current_topic !== "Unknown") recapText += `\n\n**Current Topic**\n${recapData.current_topic}`;
        if (recapData.key_decisions_so_far?.length) recapText += `\n\n**Decisions**\n- ${recapData.key_decisions_so_far.join("\n- ")}`;
        if (recapData.who_said_what?.length) recapText += `\n\n**Who said what**\n- ${recapData.who_said_what.join("\n- ")}`;
        realtimeData.recap = recapText;
        pushUpdate(realtimeData, targetId);
      }).catch(() => {});
      sendResponse({ success: true });
      return true;
    }

    if (targetId) {
      if (ws?.readyState === WebSocket.OPEN) { try { ws.send(JSON.stringify({ type: "ping" })); } catch (e) {} }
      else connectWebSocket(targetId);

      const isRecap = msg.type === "REQUEST_RECAP";
      const endpoint = isRecap ? `/ingest/late-recap/${targetId}?force=true` : `/ingest/realtime/${targetId}?force=true`;
      fetch(`${BASE}${endpoint}`, {
        method: isRecap ? "GET" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeAuthToken}` },
      }).then((r) => r.json()).then((data) => {
        pushUpdate(isRecap ? buildRecapText(data, targetId) : data, targetId);
      }).catch(() => {});
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === "GET_CONFIG") { sendResponse(MEETMAXXING_CONFIG); return false; }

  if (msg.type === "MEETING_STARTED") {
    activeMeetingId = msg.meetingId;
    activeMeetTabId = sender?.tab?.id ?? null;
    ext.storage.set({ currentMeetingId: activeMeetingId, meetingTitle: msg.title });
    sendResponse({ success: true });
    return false;
  }
});
