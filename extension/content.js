/**
 * MeetMaxxing Content Script — Orchestrator & Meeting Lifecycle
 */
"use strict";

var meetingId = null;
var meetingStartTime = Date.now();
var maxParticipants = 1;
var isInCallSession = false;
var consecutiveLeaveChecks = 0;
var endCheckInterval = null;
var stateDetectInterval = null; // periodic re-check until in-call detected

window.meetingId = meetingId;
window.meetingStartTime = meetingStartTime;

function isActuallyInCall() {
  // If we are on an explicit leave page, not in call
  if (document.querySelector('[data-is-leave-page="true"]')) return false;

  // ── 1. Leave / hangup button (red button) ──────────────────────────────────
  // Check aria-labels, tooltips, jsname, class, and the universal red end-call SVG
  const leaveBtn = document.querySelector(
    'button[aria-label*="leave" i], button[data-tooltip*="leave" i],' +
    'button[aria-label*="end call" i], button[data-tooltip*="end call" i],' +
    'button[aria-label*="hang up" i], button[data-tooltip*="hang up" i],' +
    'button[jsname="CQyAgc"], button.ftVzxd'
  );
  if (leaveBtn) return true;

  // ── 2. Call controls bottom bar ───────────────────────────────────────────
  const callControls = document.querySelector(
    'div[role="region"][aria-label*="call controls" i],' +
    'div[jscontroller="kAPstf"], div[jscontroller="crqnQb"], div.crqnQb,' +
    '[data-call-ended="false"]'
  );
  const micOrCam = document.querySelector(
    'button[aria-label*="microphone" i], button[aria-label*="camera" i],' +
    'button[data-tooltip*="microphone" i], button[data-tooltip*="camera" i]'
  );
  if (callControls && micOrCam) return true;

  // ── 3. Room URL with active meeting controls and NO lobby elements ──────────
  // Meet room URLs follow /xxx-yyyy-zzz or similar format
  const isRoomUrl = /^\/[a-z0-9\-]{8,}/i.test(location.pathname)
    && !location.pathname.includes("landing")
    && !location.pathname.includes("home");

  if (isRoomUrl) {
    // Check if any lobby button is present
    let hasLobbyBtn = false;
    for (const b of document.querySelectorAll('button, div[role="button"]')) {
      const txt = (b.innerText || b.textContent || "").trim().toLowerCase();
      if (txt === "join now" || txt === "ask to join" || txt === "switch here") {
        hasLobbyBtn = true;
        break;
      }
    }
    // Check if any lobby heading is present
    let hasLobbyHeading = false;
    for (const h of document.querySelectorAll('h1, h2, h3, [role="heading"], [jsname="r4nke"]')) {
      const txt = (h.textContent || "").trim().toLowerCase();
      if (
        txt.includes("ready to join") ||
        txt.includes("check your audio and video") ||
        txt.includes("do you want people to see you") ||
        txt.includes("do you want people to hear you")
      ) {
        hasLobbyHeading = true;
        break;
      }
    }

    if (!hasLobbyBtn && !hasLobbyHeading) {
      // In-call buttons: mic, camera, captions, raise hand, chat, people, options
      const inCallButtons = document.querySelectorAll(
        'button[aria-label*="microphone" i], button[aria-label*="camera" i],' +
        'button[aria-label*="caption" i], button[aria-label*="hand" i],' +
        'button[aria-label*="chat" i], button[aria-label*="people" i],' +
        'button[data-tooltip*="microphone" i], button[data-tooltip*="camera" i],' +
        'button[data-tooltip*="caption" i], button[data-tooltip*="hand" i]'
      );
      if (inCallButtons.length >= 2) return true;
    }
  }

  // ── 4. Meeting timer visible (shown only during active call) ────────────────
  const timer = document.querySelector('[data-call-time], .r6xAKc');
  if (timer) return true;

  return false;
}

function isPreJoinLobby() {
  if (isActuallyInCall()) return false;
  // 1. Camera/mic permission dialog headings — "Do you want people to see/hear you?"
  const permDialogs = document.querySelectorAll('h1, h2, h3, [role="heading"], [jsname="r4nke"]');
  for (const el of permDialogs) {
    const txt = (el.textContent || "").trim().toLowerCase();
    if (
      txt.includes("do you want people to see you") ||
      txt.includes("do you want people to hear you") ||
      txt.includes("allow camera") ||
      txt.includes("allow microphone")
    ) return true;
  }
  // 2. Standard lobby buttons
  for (const b of document.querySelectorAll('button, div[role="button"]')) {
    const txt = (b.innerText || b.textContent || "").trim().toLowerCase();
    if (txt === "join now" || txt === "ask to join" || txt === "join and use a phone for audio" || txt === "switch here") return true;
  }
  // 3. Lobby headings
  for (const h of document.querySelectorAll('h1, h2, h3, div[role="heading"]')) {
    const txt = (h.textContent || "").trim().toLowerCase();
    if (txt.includes("ready to join?") || txt.includes("check your audio and video") || txt.includes("getting ready")) return true;
  }
  return Boolean(document.querySelector('div[data-is-prejoin="true"], div[jscontroller="H4pA6c"]'));
}

function isActuallyLeftMeeting() {
  // Never treat pre-join or in-call states as "left meeting"
  if (isActuallyInCall() || isPreJoinLobby()) return false;
  // Explicit leave page indicator
  if (document.querySelector('[data-is-leave-page="true"]')) return true;
  for (const h of document.querySelectorAll('h1, h2, .roSPhc, div[role="heading"]')) {
    const txt = (h.textContent || "").trim().toLowerCase();
    if (
      txt.includes("you left the meeting") ||
      txt.includes("you've been removed from the meeting") ||
      txt.includes("you are no longer in the meeting") ||
      txt.includes("the meeting has ended")
    ) {
      return true;
    }
  }
  // If none of the above conditions triggered, we are still on a Meet room URL —
  // treat as NOT left (could be loading, lobby, permission screen, etc.)
  const onMeetRoom = location.hostname.includes("meet.google.com")
    && location.pathname.length > 4
    && !location.pathname.includes("landing")
    && !location.pathname.includes("home");
  // Only return true (left) if we are definitively off the Meet room page
  return !onMeetRoom;
}

function startMeeting() {
  const match = location.pathname.match(/^\/([a-z0-9\-]+)/i);
  const meetCode = match ? match[1] : "";

  if (!isConsentGiven()) {
    if (chrome?.runtime?.id) {
      chrome.storage.local.set({ meetingDetected: true, meetCode });
    }
    showConsentUI(() => startMeeting());
    return;
  }

  if (chrome?.runtime?.id) {
    chrome.storage.local.remove("meetingDetected");
  }

  isInCallSession = true;
  consecutiveLeaveChecks = 0;
  window.meetingStartTime = meetingStartTime = Date.now();
  maxParticipants = 1;
  autoEnableCC();
  injectVisibilityButton();

  let title = document.title.replace("Google Meet", "").replace(/^Meet\s*-\s*/i, "").trim();
  title = meetCode && meetCode.length >= 3 ? `Meet - ${meetCode}` : (!title ? "Meet - Live Session" : `Meet - ${title}`);

  if (!meetingId) window.meetingId = meetingId = meetCode || ("live_" + Math.random().toString(36).slice(2, 9));
  if (chrome?.runtime?.id) chrome.storage.local.set({ currentMeetingId: meetingId, meetingTitle: title, meetCode });

  startCaptionObserver();

  safeSendMessage({ type: "START_MEETING", title, fallbackId: meetingId, meetCode }, (resp) => {
    if (resp?.meetingId) {
      window.meetingId = meetingId = resp.meetingId;
      if (chrome?.runtime?.id) chrome.storage.local.set({ currentMeetingId: meetingId, meetingTitle: title, meetCode });
    }
  });

  console.log("[MeetMaxxing] Meeting started:", meetingId, "(Code:", meetCode, ")");

  if (endCheckInterval) clearInterval(endCheckInterval);
  endCheckInterval = setInterval(() => {
    if (!meetingId || !isInCallSession) return;
    const pEl = document.querySelector('.uGOf1d') || document.querySelector('[jsname="Nqj9L"]');
    if (pEl?.innerText) {
      const count = parseInt(pEl.innerText, 10);
      if (!isNaN(count) && count > maxParticipants) {
        maxParticipants = count;
        safeSendMessage({ type: "UPDATE_PARTICIPANTS", maxParticipants });
      }
    }
    if (isActuallyLeftMeeting()) {
      consecutiveLeaveChecks++;
      if (consecutiveLeaveChecks >= 3) {
        console.log("[MeetMaxxing] Confirmed meeting end screen across multiple checks.");
        clearInterval(endCheckInterval);
        endCheckInterval = null;
        endMeeting();
      }
    } else {
      consecutiveLeaveChecks = 0;
    }
  }, 2000);
}

function endMeeting() {
  if (!meetingId && !isInCallSession) return;
  isInCallSession = false;
  consecutiveLeaveChecks = 0;
  if (endCheckInterval) { clearInterval(endCheckInterval); endCheckInterval = null; }

  stopCaptionObserver();
  cleanupUI();

  const endingId = meetingId;
  window.meetingId = meetingId = null;
  if (endingId) safeSendMessage({ type: "END_MEETING", meetingId: endingId, title: document.title, maxParticipants });
  if (chrome?.runtime?.id) {
    chrome.storage.local.remove(["currentMeetingId", "meetingDetected"]);
  }
  console.log("[MeetMaxxing] Meeting ended cleanly.");
}

function detectMeetingState() {
  const onMeetRoom = location.hostname.includes("meet.google.com") && location.pathname.length > 4 &&
                     !location.pathname.includes("landing") && !location.pathname.includes("home");
  if (!onMeetRoom) {
    stopStatePolling();
    if (isInCallSession || meetingId) endMeeting();
    return;
  }

  // Camera/mic permission screen or pre-join lobby
  if (isPreJoinLobby()) {
    console.log("[MeetMaxxing] Pre-join / permission screen active. Awaiting user entrance...");
    if (typeof tryInjectPanel === "function") tryInjectPanel();
    // Keep polling — user may grant permission and enter call soon
    startStatePolling();
    return;
  }

  if (isActuallyInCall()) {
    stopStatePolling(); // found it — no more polling needed
    consecutiveLeaveChecks = 0;
    if (!isInCallSession || !meetingId) {
      console.log("[MeetMaxxing] In-call controls active! Starting session...");
      startMeeting();
    } else if (!isCaptionObserverActive()) {
      startCaptionObserver();
    }
    safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
    if (typeof tryInjectPanel === "function") tryInjectPanel();
  } else {
    // On a meet room URL but state not yet detected — keep polling for the UI to render
    startStatePolling();
  }
}

// Periodic polling — detects call state when Meet SPA renders asynchronously.
// Stops automatically once isInCallSession is confirmed.
function startStatePolling() {
  if (stateDetectInterval) return;
  let attempts = 0;
  stateDetectInterval = setInterval(() => {
    attempts++;
    // Give up after 90s (45 × 2s) — avoids permanent interval on non-call pages
    if (attempts > 45) { stopStatePolling(); return; }
    if (!isInCallSession) {
      detectMeetingState();
    } else {
      stopStatePolling();
    }
  }, 2000);
}

function stopStatePolling() {
  if (stateDetectInterval) {
    clearInterval(stateDetectInterval);
    stateDetectInterval = null;
  }
}

document.addEventListener("click", (e) => {
  const target = e.target;
  const btn = target?.closest?.('button, [role="button"]');
  if (btn) {
    const txt = (btn.innerText || btn.textContent || "").trim().toLowerCase();
    if (txt === "join now" || txt === "ask to join" || txt === "switch here") {
      console.log("[MeetMaxxing] User clicked Join Now. Polling for in-call state...");
      stopStatePolling();
      setTimeout(() => { detectMeetingState(); startStatePolling(); }, 1500);
    }
  }
  if (target?.closest?.('[aria-label*="Leave call" i], [data-tooltip*="Leave call" i], button[aria-label*="Leave" i], button[data-tooltip*="Leave" i], .VfPpkd-Bz112c-LgbsSe.yHy1rc.eT1oJ.ftVzxd, i[aria-label*="Leave call" i]')) {
    console.log("[MeetMaxxing] User clicked Leave call.");
    if (meetingId || isInCallSession) {
      setTimeout(() => { if (isActuallyLeftMeeting()) endMeeting(); }, 1500);
    }
  }
  if (isInCallSession && location.hostname.includes("meet.google.com") && location.pathname.length > 4 && !location.pathname.includes("landing")) {
    safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
  }
}, { capture: true });

const extRuntime = typeof chrome !== "undefined" && chrome.runtime?.id ? chrome.runtime : (typeof browser !== "undefined" && browser.runtime?.id ? browser.runtime : null);
if (extRuntime?.onMessage) {
  extRuntime.onMessage.addListener((msg) => {
    if (msg.type === "REQUEST_END_MEETING") endMeeting();
    if (msg.type === "GRANT_CONSENT" || msg.type === "CONSENT_GRANTED") {
      consentGiven = true;
      window.consentGiven = true;
      try { localStorage.setItem("mm_consent_granted", "true"); } catch (e) {}
      const overlay = document.getElementById("meetmaxxing-consent-overlay");
      if (overlay) overlay.remove();
      if (isActuallyInCall() && !isInCallSession) {
        startMeeting();
      }
    }
  });
}
detectMeetingState();

let lastUrl = location.href;
function handleUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    stopStatePolling();
    detectMeetingState();
  }
}
window.addEventListener("popstate", handleUrlChange);
window.addEventListener("hashchange", handleUrlChange);
setInterval(handleUrlChange, 1000);
