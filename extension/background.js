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

const BASE = MEETMAXXING_CONFIG.BASE_URL_BACKEND;
const WS_BASE = MEETMAXXING_CONFIG.WS_URL;
const STORAGE_CLEAR_KEYS = ["currentMeetingId", "lastCopilotUpdate", "copilot_state", "transcript"];

// ─── Auth state machine ─────────────────────────────────────────────────────
// The background worker is the single source of truth for auth. Content scripts
// and the sidebar read tokens from storage but never write/refresh them — they
// request via messages and the worker serializes refreshes.
//
// States:
//   "loading"       — worker just started, rehydrating from storage
//   "authenticated" — valid (non-expired) access token present
//   "anonymous"     — no token stored (user never signed in)
//   "expired"       — refresh failed; tokens cleared, user must log in again
let authState = "loading";
let activeAuthToken = "";
let activeRefreshToken = "";

let refreshInFlight = null;          // single-flight lock (Promise|null)
let lastRefreshAttempt = 0;          // ms timestamp, rate-limits refresh HTTP calls
const REFRESH_MIN_INTERVAL = 10 * 1000;      // min 10s between refresh attempts
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;  // proactively refresh when <2min left

// WebSocket reconnect with exponential backoff (max ~5 attempts)
let wsReconnectAttempts = 0;
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_BASE_DELAY = 2000;

// Cold-start detection (Render free tier sleeps; boot takes 30-60s)
let coldStartNotifiedAt = 0;
const COLD_START_NOTIFY_INTERVAL = 30 * 1000;

// ─── JWT helpers ─────────────────────────────────────────────────────────────
function base64UrlDecode(str) {
  str = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function parseJwtExp(token) {
  if (!token) return NaN;
  try {
    const payload = token.split(".")[1];
    if (!payload) return NaN;
    const json = JSON.parse(base64UrlDecode(payload));
    return typeof json.exp === "number" ? json.exp * 1000 : NaN;
  } catch (e) {
    return NaN;
  }
}

function isTokenExpired(token) {
  const exp = parseJwtExp(token);
  return !isNaN(exp) && Date.now() >= exp;
}

function tokenIsExpiringSoon(token) {
  const exp = parseJwtExp(token);
  return !isNaN(exp) && (exp - Date.now()) < REFRESH_THRESHOLD_MS;
}

// ─── Auth state persistence + broadcast ──────────────────────────────────────
async function setAuthState(nextState) {
  authState = nextState;
  await ext.storage.set({ authState: nextState });
  ext.broadcast({ type: "AUTH_STATE_CHANGED", state: nextState });
}

async function clearAuth() {
  activeAuthToken = "";
  activeRefreshToken = "";
  await ext.storage.remove(["authToken", "authRefreshToken"]);
  await setAuthState("expired");
}

// Exchange the stored refresh token for a new access token via the backend.
// Single-flight: concurrent 401s share one refresh; others wait and reuse it.
async function refreshAuthToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function doRefresh() {
  const r = await ext.storage.get(["authRefreshToken"]);
  if (!r.authRefreshToken) {
    // No refresh token: not a refreshable session.
    await setAuthState(activeAuthToken ? "authenticated" : "anonymous");
    return false;
  }

  // Rate-limit refresh attempts to avoid error loops. If the current access
  // token is still valid (only expiring soon), keep using it.
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_MIN_INTERVAL) {
    if (activeAuthToken && !isTokenExpired(activeAuthToken)) return true;
    return false;
  }
  lastRefreshAttempt = now;

  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: r.authRefreshToken }),
    });
    if (!res.ok) throw new Error("refresh failed: " + res.status);
    const data = await res.json();
    if (!data.access_token) throw new Error("refresh response missing access_token");

    activeAuthToken = data.access_token;
    const updates = { authToken: data.access_token };
    if (data.refresh_token) {
      activeRefreshToken = data.refresh_token;
      updates.authRefreshToken = data.refresh_token;
    }
    await ext.storage.set(updates);
    await setAuthState("authenticated");
    return true;
  } catch (e) {
    // Refresh failed → session is genuinely expired.
    await clearAuth();
    return false;
  }
}

// ─── Cold-start UX helpers ───────────────────────────────────────────────────
function notifyColdStart() {
  const now = Date.now();
  if (now - coldStartNotifiedAt < COLD_START_NOTIFY_INTERVAL) return;
  coldStartNotifiedAt = now;
  ext.storage.set({ backendStarting: true });
  ext.broadcast({ type: "BACKEND_STARTING" });
}

function notifyColdStartResolved() {
  coldStartNotifiedAt = 0;
  ext.storage.remove(["backendStarting"]);
  ext.broadcast({ type: "BACKEND_READY" });
}

function isColdStartStatus(status) {
  return status === 502 || status === 503 || status === 504;
}

// ─── Auth-aware fetch with 401 auto-retry ────────────────────────────────────
async function authFetch(url, options = {}) {
  if (!activeAuthToken) {
    const ok = await refreshAuthToken();
    if (!ok) {
      return { status: 401, ok: false, __authFailed: true, json: async () => ({ detail: "Session expired" }) };
    }
  }

  const headers = { ...options.headers, Authorization: `Bearer ${activeAuthToken}` };
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const ok = await refreshAuthToken();
    if (ok && activeAuthToken) {
      headers.Authorization = `Bearer ${activeAuthToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  if (res.ok) notifyColdStartResolved();
  else if (isColdStartStatus(res.status)) notifyColdStart();

  return res;
}

// ─── WebSocket ───────────────────────────────────────────────────────────────
function connectWebSocket(meetingId) {
  if (ws) { try { ws.close(); } catch (e) {} ws = null; }

  // Both Chrome and Firefox append the token as a query param. (The old
  // comment claiming Firefox MV2 can't do this was stale — Firefox supports
  // query params on WebSocket URLs fine.)
  const wsUrl = `${WS_BASE}/ingest/ws/${meetingId}?token=${encodeURIComponent(activeAuthToken || "")}`;
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

  ws.onopen = () => {
    wsReconnectAttempts = 0;
    notifyColdStartResolved();
  };

  ws.onclose = (event) => {
    ws = null;
    // 4401 = backend rejected the token → refresh (or expire) rather than spin.
    if (event && event.code === 4401) {
      refreshAuthToken();
      return;
    }
    if (activeMeetingId !== meetingId) return; // meeting ended or changed
    if (wsReconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      wsReconnectAttempts = 0;
      ext.broadcast({ type: "WS_RECONNECT_FAILED", meetingId });
      return;
    }
    const delay = WS_RECONNECT_BASE_DELAY * Math.pow(2, wsReconnectAttempts);
    wsReconnectAttempts++;
    setTimeout(() => {
      if (activeMeetingId === meetingId) connectWebSocket(meetingId);
    }, delay);
  };

  ws.onerror = () => {
    // Network errors / 503 during Render boot surface as a cold start.
    notifyColdStart();
  };
}

// ─── Keepalive alarm (keep Render awake while a meeting is live) ─────────────
function setupKeepaliveAlarm() {
  if (!ext.api.alarms || !ext.api.alarms.onAlarm) return;
  ext.api.alarms.create("meetingKeepalive", { periodInMinutes: 13 });
  ext.api.alarms.onAlarm.addListener((a) => {
    if (a.name === "meetingKeepalive" && activeMeetingId) {
      // Cheap ping — /health does not hit Qdrant.
      fetch(`${BASE}/health`).catch(() => {});
    }
  });
}

// ─── Meeting lifecycle ───────────────────────────────────────────────────────
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
  wsReconnectAttempts = 0;
  activeMeetingId = null;
  activeMeetTabId = null;
  activeMeetingMaxParticipants = 1;
  ext.storage.remove(STORAGE_CLEAR_KEYS);
  ext.broadcast({ type: "MEETING_ENDED", meetingId: meetingIdToEnd });
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

// ─── Rehydrate in-memory state from storage (worker cold start) ──────────────
async function rehydrateState() {
  // Auth: single source of truth lives here.
  const auth = await ext.storage.get(["authToken", "authRefreshToken"]);
  activeAuthToken = auth.authToken || "";
  activeRefreshToken = auth.authRefreshToken || "";

  if (!activeAuthToken && !activeRefreshToken) {
    await setAuthState("anonymous");
  } else if (activeAuthToken && !isTokenExpired(activeAuthToken)) {
    await setAuthState("authenticated");
    // Proactively refresh a token that is about to expire.
    if (tokenIsExpiringSoon(activeAuthToken) && activeRefreshToken) refreshAuthToken();
  } else {
    // Expired/missing access token with a refresh token → try to refresh.
    const ok = await refreshAuthToken();
    if (!ok && !(activeAuthToken && !isTokenExpired(activeAuthToken))) {
      await setAuthState("expired");
    }
  }

  // Meeting: re-attach only if a Meet tab is actually still open; otherwise the
  // stored id is stale from a crash and would leave the worker confused.
  const meet = await ext.storage.get(["currentMeetingId"]);
  if (meet.currentMeetingId) {
    ext.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        ext.storage.remove(STORAGE_CLEAR_KEYS);
      } else {
        activeMeetingId = meet.currentMeetingId;
        // Re-establish the WS connection for the still-live meeting.
        connectWebSocket(activeMeetingId);
      }
    });
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
setupKeepaliveAlarm();
ext.setRefreshAlarm(refreshAuthToken);
rehydrateState();

if (ext.runtime.onStartup) ext.runtime.onStartup.addListener(rehydrateState);
if (ext.runtime.onInstalled) ext.runtime.onInstalled.addListener(rehydrateState);

ext.storageOnChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.authToken) {
    activeAuthToken = changes.authToken.newValue || "";
    // New token arrived from auth-capture → mark authenticated if valid.
    if (activeAuthToken && !isTokenExpired(activeAuthToken)) setAuthState("authenticated");
  }
  if (changes.authRefreshToken) {
    activeRefreshToken = changes.authRefreshToken.newValue || "";
  }
});

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

// ─── Message router ──────────────────────────────────────────────────────────
ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return false;

  // ── Auth messages (single source of truth) ────────────────────────────────
  if (msg.type === "GET_AUTH_STATE") {
    sendResponse({ state: authState, authenticated: authState === "authenticated" });
    return false;
  }

  if (msg.type === "REFRESH_AUTH") {
    refreshAuthToken().then((ok) => {
      sendResponse({ ok, state: authState, authenticated: authState === "authenticated" });
    });
    return true;
  }

  if (msg.type === "REPORT_401" || msg.type === "AUTH_EXPIRED") {
    // Sidebar/content hit a 401 — trigger refresh; if it fails the state
    // machine flips to "expired" and all contexts are notified.
    refreshAuthToken();
    sendResponse({ state: authState });
    return false;
  }

  // ── Meeting messages ───────────────────────────────────────────────────────
  if (msg.type === "START_MEETING") {
    const meetCode = msg.meetCode || "";
    let title = msg.title || "";
    if (meetCode.length >= 3 && !title.startsWith("Meet - ")) title = `Meet - ${meetCode}`;
    else if (!title || title === "Google Meet") title = meetCode ? `Meet - ${meetCode}` : "Meet - Live Session";

    activeMeetingId = msg.fallbackId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "live_" + Date.now());
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
      wsReconnectAttempts = 0;
      ext.storage.remove(STORAGE_CLEAR_KEYS);
      ext.broadcast({ type: "MEETING_ENDED", meetingId: meetingIdToEnd });
      sendResponse({ success: true });
    };

    if (activeMeetingId) {
      activeMeetingId = null;
      authFetch(`${BASE}/meeting/${meetingIdToEnd}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    // Need to resolve meeting id from message, memory, or local storage
    const resolveTargetId = async () => {
      if (msg.meetingId) return msg.meetingId;
      if (activeMeetingId) return activeMeetingId;
      const res = await ext.storage.get(["currentMeetingId"]);
      return res?.currentMeetingId || null;
    };

    if (msg.type === "GENERATE_INSIGHTS") {
      (async () => {
        const targetId = await resolveTargetId();
        if (!targetId) {
          sendResponse({ success: false, error: "No active meeting found" });
          return;
        }

        try {
          const [realtimeRes, recapRes] = await Promise.all([
            authFetch(`${BASE}/ingest/realtime/${targetId}?force=true`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }),
            authFetch(`${BASE}/ingest/late-recap/${targetId}?force=true`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            }),
          ]);

          let realtimeData = {};
          try {
            if (realtimeRes && realtimeRes.ok) {
              realtimeData = await realtimeRes.json();
            }
          } catch (e) {}

          let recapData = {};
          try {
            if (recapRes && recapRes.ok) {
              recapData = await recapRes.json();
            }
          } catch (e) {}

          let recapText = recapData.recap?.trim()
            ? `**Recap**\n${recapData.recap}`
            : "Meeting is still in early stages or no speech captured yet. Keep talking for a richer recap.";
          if (recapData.current_topic && recapData.current_topic !== "Unknown") {
            recapText += `\n\n**Current Topic**\n${recapData.current_topic}`;
          }
          if (recapData.key_decisions_so_far?.length) {
            recapText += `\n\n**Decisions**\n- ${recapData.key_decisions_so_far.join("\n- ")}`;
          }
          if (recapData.who_said_what?.length) {
            recapText += `\n\n**Who said what**\n- ${recapData.who_said_what.join("\n- ")}`;
          }

          realtimeData.recap = recapText;
          await pushUpdate(realtimeData, targetId);
          sendResponse({ success: true, data: realtimeData });
        } catch (err) {
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }

    (async () => {
      const targetId = await resolveTargetId();
      if (!targetId) {
        sendResponse({ success: false, error: "No active meeting found" });
        return;
      }

      if (ws?.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: "ping" })); } catch (e) {}
      } else {
        connectWebSocket(targetId);
      }

      const isRecap = msg.type === "REQUEST_RECAP";
      const endpoint = isRecap ? `/ingest/late-recap/${targetId}?force=true` : `/ingest/realtime/${targetId}?force=true`;
      try {
        const res = await authFetch(`${BASE}${endpoint}`, {
          method: isRecap ? "GET" : "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        const update = isRecap ? buildRecapText(data, targetId) : data;
        await pushUpdate(update, targetId);
        sendResponse({ success: true, data: update });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
    })();
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

  return false;
});
