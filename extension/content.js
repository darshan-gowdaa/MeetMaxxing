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
var authToken = null;

window.meetingId = meetingId;
window.meetingStartTime = meetingStartTime;

function isActuallyInCall() {
  const leaveBtn = document.querySelector('button[aria-label*="Leave call" i], button[data-tooltip*="Leave call" i], button[jsname="CQyAgc"]');
  if (leaveBtn && leaveBtn.offsetParent !== null) return true;
  const callControls = document.querySelector('div[role="region"][aria-label*="Call controls" i], div[jscontroller="kAPstf"], div.crqnQb');
  const micOrCam = document.querySelector('button[aria-label*="microphone" i], button[aria-label*="camera" i], button[data-tooltip*="microphone" i], button[data-tooltip*="camera" i]');
  const participantCount = document.querySelector('.uGOf1d, [jsname="Nqj9L"]');
  return Boolean((callControls && micOrCam) || (participantCount && micOrCam) || leaveBtn);
}

function isPreJoinLobby() {
  if (isActuallyInCall()) return false;
  for (const b of document.querySelectorAll('button, div[role="button"]')) {
    const txt = (b.innerText || b.textContent || "").trim().toLowerCase();
    if (txt === "join now" || txt === "ask to join" || txt === "join and use a phone for audio" || txt === "switch here") return true;
  }
  for (const h of document.querySelectorAll('h1, h2, h3, div[role="heading"]')) {
    const txt = (h.textContent || "").trim().toLowerCase();
    if (txt.includes("ready to join?") || txt.includes("check your audio and video") || txt.includes("getting ready")) return true;
  }
  return Boolean(document.querySelector('div[data-is-prejoin="true"], div[jscontroller="H4pA6c"]'));
}

function isActuallyLeftMeeting() {
  if (isActuallyInCall() || isPreJoinLobby()) return false;
  if (document.querySelector('[data-is-leave-page="true"]')) return true;
  for (const h of document.querySelectorAll('h1, h2, .roSPhc, div[role="heading"]')) {
    const txt = (h.textContent || "").trim().toLowerCase();
    if (txt.includes("you left the meeting") || txt.includes("you've been removed from the meeting") ||
        txt.includes("you are no longer in the meeting") || txt.includes("the meeting has ended")) {
      return true;
    }
  }
  const onMeetRoom = location.hostname.includes("meet.google.com") && location.pathname.length > 4 &&
                     !location.pathname.includes("landing") && !location.pathname.includes("home");
  return !onMeetRoom;
}

function startMeeting() {
  if (!isConsentGiven()) {
    showConsentUI(() => startMeeting());
    return;
  }

  isInCallSession = true;
  consecutiveLeaveChecks = 0;
  window.meetingStartTime = meetingStartTime = Date.now();
  maxParticipants = 1;
  autoEnableCC();
  injectVisibilityButton();

  const match = location.pathname.match(/^\/([a-z0-9\-]+)/i);
  const meetCode = match ? match[1] : "";
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
  if (chrome?.runtime?.id) chrome.storage.local.remove("currentMeetingId");
  console.log("[MeetMaxxing] Meeting ended cleanly.");
}

function detectMeetingState() {
  const onMeetRoom = location.hostname.includes("meet.google.com") && location.pathname.length > 4 &&
                     !location.pathname.includes("landing") && !location.pathname.includes("home");
  if (!onMeetRoom) {
    if (isInCallSession || meetingId) endMeeting();
    return;
  }
  if (isPreJoinLobby()) {
    console.log("[MeetMaxxing] Pre-join lobby active. Awaiting user entrance...");
    tryInjectPanel();
    return;
  }
  if (isActuallyInCall()) {
    consecutiveLeaveChecks = 0;
    if (!isInCallSession || !meetingId) {
      console.log("[MeetMaxxing] In-call controls active! Starting session...");
      startMeeting();
    } else if (!isCaptionObserverActive()) {
      startCaptionObserver();
    }
    safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
    tryInjectPanel();
  }
}

document.addEventListener("click", (e) => {
  const target = e.target;
  const btn = target?.closest?.('button, [role="button"]');
  if (btn) {
    const txt = (btn.innerText || btn.textContent || "").trim().toLowerCase();
    if (txt === "join now" || txt === "ask to join" || txt === "switch here") {
      console.log("[MeetMaxxing] User clicked Join Now. Polling for in-call state...");
      setTimeout(detectMeetingState, 1500);
      setTimeout(detectMeetingState, 3500);
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

if (chrome?.runtime?.id) {
  chrome.storage.local.get(["authToken"], (r) => {
    authToken = r?.authToken;
    detectMeetingState();
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "AUTH_TOKEN_UPDATED") authToken = msg.token;
    if (msg.type === "REQUEST_END_MEETING") endMeeting();
  });
} else {
  detectMeetingState();
}

let lastUrl = location.href;
function handleUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    detectMeetingState();
  }
}
window.addEventListener("popstate", handleUrlChange);
window.addEventListener("hashchange", handleUrlChange);
setInterval(handleUrlChange, 1000);
