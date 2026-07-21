// We are using react for this
/**
 * MeetMaxxing Side Panel JS v2 — Remix Icons, no emojis, ended = dashboard only
 */

"use strict";

const CONFIG = window.MEETMAXXING_CONFIG || window.MEETMIND_CONFIG || {
  BASE_URL_BACKEND: "http://localhost:8000",
  BASE_URL_WEB: "http://localhost:3000",
};

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const statusBadge       = $("status-badge");
const statusBadgeLabel  = statusBadge?.querySelector(".badge-label");
const statusBadgeDot    = statusBadge?.querySelector(".badge-dot");
const timerEl           = $("timer");
const endMeetingTopBtn  = $("end-meeting-top-btn");
const idleState         = $("idle-state");
const endedState        = $("ended-state");
const activeState       = $("active-state");
const suggestionsSection= $("suggestions-section");
const suggestionsList   = $("suggestions-list");
const nextQSection      = $("next-question-section");
const nextQText         = $("next-question-text");
const recapBtn          = $("recap-btn");
const toggleTranscriptBtn= $("toggle-transcript-btn");
const testCopilotBtn    = $("test-copilot-btn");
const askNextBtn        = $("ask-next-btn");
const recapContent      = $("recap-content");
const transcriptFeed    = $("transcript-feed");
const transcriptCount   = $("transcript-count");
const transcriptEmpty   = $("transcript-empty");
const llmStatusText     = $("llm-status-text");
const llmStatusChip     = $("llm-status-chip");
const activeFooter      = $("active-footer");
const endedTranscriptCount = $("ended-transcript-count");
const meetingTitleHint  = $("meeting-title-hint");

// End state buttons
const openDashboardBtn  = $("open-dashboard-btn");
const activeDashboardBtn= $("active-dashboard-btn");
const idleDashboardBtn  = $("idle-dashboard-btn");

// ─── State ───────────────────────────────────────────────────────────────────
let meetingActive       = false;
let timerInterval       = null;
let meetingStart        = null;
let currentMeetingId    = null;
let currentMeetingTitle = null;
let lastRecap           = "";
let totalTranscriptLines= 0;
let calendarPollTimer   = null;

// ─── Badge helpers ────────────────────────────────────────────────────────────
function setBadge(text, live) {
  if (!statusBadge) return;
  statusBadge.className = live ? "badge badge-live" : "badge badge-idle";
  if (statusBadgeLabel) statusBadgeLabel.textContent = text;
}

// ─── Button helpers ───────────────────────────────────────────────────────────
function setButtonSuccess(btn, text) {
  if (!btn) return;
  btn.innerHTML = `<i class="ri-checkbox-circle-line"></i> ${text}`;
  btn.style.borderColor = "var(--success)";
  btn.style.color = "var(--success)";
  btn.disabled = true;
}

function setButtonError(btn, text) {
  if (!btn) return;
  btn.innerHTML = `<i class="ri-alert-line"></i> ${text}`;
  btn.style.borderColor = "var(--risk)";
  btn.style.color = "var(--risk)";
  btn.disabled = false;
}

function setButtonLoading(btn, text) {
  if (!btn) return;
  btn.innerHTML = `<span class="btn-spinner"></span> ${text}`;
  btn.disabled = true;
}

// ─── Live Caption Feed ───────────────────────────────────────────────────────
function appendLiveCaption(chunk) {
  if (!chunk || !chunk.text) return;
  if (transcriptEmpty) transcriptEmpty.style.display = "none";
  if (!transcriptFeed) return;

  const speaker = chunk.speaker || "Speaker";
  const text = chunk.text.trim();
  if (!text) return;

  const lastLine = transcriptFeed.lastElementChild;
  if (
    lastLine &&
    lastLine._speaker === speaker &&
    Date.now() - (lastLine._timestamp || 0) < 4500
  ) {
    const lastText = lastLine._text || "";
    if (text === lastText) return;
    if (
      text.startsWith(lastText) ||
      lastText.startsWith(text) ||
      text.includes(lastText) ||
      lastText.includes(text)
    ) {
      const textSpan = lastLine.querySelector(".transcript-text");
      if (textSpan) {
        if (text.length > lastText.length || text !== lastText) {
          textSpan.textContent = text;
          lastLine._text = text;
          lastLine._timestamp = Date.now();
        }
        transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
        return;
      }
    }
  }

  const line = document.createElement("div");
  line.className = "transcript-line";
  line._speaker = speaker;
  line._text = text;
  line._timestamp = Date.now();

  const initial = speaker.charAt(0).toUpperCase();

  const speakerSpan = document.createElement("span");
  speakerSpan.className = "transcript-speaker";
  speakerSpan.innerHTML = `<span class="transcript-speaker-avatar">${initial}</span>${speaker}`;

  const textSpan = document.createElement("span");
  textSpan.className = "transcript-text";
  textSpan.textContent = text;

  line.appendChild(speakerSpan);
  line.appendChild(textSpan);
  transcriptFeed.appendChild(line);

  totalTranscriptLines++;
  if (transcriptCount) transcriptCount.textContent = totalTranscriptLines;

  while (transcriptFeed.children.length > 60) {
    transcriptFeed.removeChild(transcriptFeed.firstChild);
  }
  transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
}

// ─── Timer ───────────────────────────────────────────────────────────────────
function startTimer() {
  meetingStart = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - meetingStart;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    if (timerEl) timerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  if (timerEl) timerEl.textContent = "--:--";
}

// ─── State transitions ───────────────────────────────────────────────────────
function showActive(meetingId) {
  if (currentMeetingId && currentMeetingId !== meetingId) {
    chrome.storage.local.remove(["lastCopilotUpdate", "copilot_state", "transcript"]);
  }

  meetingActive = true;
  currentMeetingId = meetingId;

  idleState.classList.add("hidden");
  if (endedState) endedState.classList.add("hidden");
  activeState.classList.remove("hidden");
  if (activeFooter) activeFooter.style.display = "";

  setBadge("LIVE", true);

  if (endMeetingTopBtn) endMeetingTopBtn.classList.remove("hidden");
  if (timerEl) timerEl.style.display = "";

  // Load title from storage
  chrome.storage.local.get(["meetingTitle"], (res) => {
    if (res.meetingTitle) currentMeetingTitle = res.meetingTitle;
  });

  clearSuggestions();
  startTimer();
}

function showIdle() {
  meetingActive = false;

  if (totalTranscriptLines > 0) {
    showEnded();
    return;
  }

  currentMeetingId = null;
  currentMeetingTitle = null;
  idleState.classList.remove("hidden");
  if (endedState) endedState.classList.add("hidden");
  activeState.classList.add("hidden");
  if (activeFooter) activeFooter.style.display = "none";

  setBadge("Idle", false);

  if (endMeetingTopBtn) endMeetingTopBtn.classList.add("hidden");
  if (timerEl) timerEl.textContent = "--:--";

  stopTimer();
  clearSuggestions();
}

function showEnded() {
  meetingActive = false;

  idleState.classList.add("hidden");
  if (endedState) endedState.classList.remove("hidden");
  activeState.classList.add("hidden");
  if (activeFooter) activeFooter.style.display = "none";

  setBadge("Ended", false);

  if (endMeetingTopBtn) endMeetingTopBtn.classList.add("hidden");
  if (timerEl) timerEl.textContent = "--:--";

  stopTimer();

  // Update transcript count in ended stats
  if (endedTranscriptCount) endedTranscriptCount.textContent = totalTranscriptLines;

  // Update meeting title hint
  if (meetingTitleHint) {
    const title = currentMeetingTitle || "your meeting";
    meetingTitleHint.textContent = `Opening report for: ${title}`;
  }

  // Auto-poll backend for processing status
  if (currentMeetingId) {
    _pollMeetingStatus(currentMeetingId);
  }
}

function clearSuggestions() {
  lastRecap = "";

  if (suggestionsList) {
    suggestionsList.innerHTML = '<p class="empty-text">Click Suggestions when ready for AI insights</p>';
  }
  if (nextQSection) nextQSection.classList.add("collapsed");
  if (nextQText) nextQText.textContent = "Click Next Q above to generate what to ask right now.";
  if (recapContent) { recapContent.textContent = ""; }
  const recapWrapper = document.getElementById("recap-wrapper");
  if (recapWrapper) recapWrapper.classList.add("collapsed");
  
  const transcriptWrapper = document.getElementById("transcript-feed-wrapper");
  if (transcriptFeed) {
    transcriptFeed.innerHTML = '<p id="transcript-empty" class="empty-text">Enable Captions (CC) — live speech will appear here</p>';
    if (transcriptWrapper) transcriptWrapper.classList.add("collapsed");
  }
  if (toggleTranscriptBtn) toggleTranscriptBtn.innerHTML = '<i class="ri-arrow-down-s-line" style="font-size: 16px;"></i>';

  const sections = ["suggestions-list-wrapper", "next-question-wrapper", "recap-wrapper"];
  const toggles = ["toggle-suggestions-btn", "toggle-nextq-btn", "toggle-recap-btn"];
  for (let i = 0; i < sections.length; i++) {
    const el = $(sections[i]);
    const btn = $(toggles[i]);
    if (el) el.classList.remove("collapsed");
    if (btn) btn.innerHTML = '<i class="ri-arrow-up-s-line" style="font-size: 16px;"></i>';
  }

  totalTranscriptLines = 0;
  if (transcriptCount) transcriptCount.textContent = "0";
  if (llmStatusChip) llmStatusChip.classList.add("hidden");
  if (llmStatusText) llmStatusText.textContent = "";
}

// ─── Backend polling ─────────────────────────────────────────────────────────
function _pollMeetingStatus(meetingId) {
  if (calendarPollTimer) clearInterval(calendarPollTimer);
  let attempts = 0;

  calendarPollTimer = setInterval(() => {
    attempts++;
    if (attempts > 25) {
      clearInterval(calendarPollTimer);
      return;
    }

    fetch(`${CONFIG.BASE_URL_BACKEND}/meeting/${meetingId}`, {
      headers: { Authorization: "Bearer dev_token" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.status !== "completed") return;
        clearInterval(calendarPollTimer);

        if (llmStatusChip) llmStatusChip.classList.remove("hidden");
        if (llmStatusText && data.powered_by) {
          llmStatusText.textContent = `Processed by ${data.powered_by}`;
        }
      })
      .catch(() => {});
  }, 2500);
}

// ─── Open Dashboard ───────────────────────────────────────────────────────────
if (openDashboardBtn) {
  openDashboardBtn.addEventListener("click", () => {
    const url = currentMeetingId
      ? `${CONFIG.BASE_URL_WEB}/meetings/${currentMeetingId}`
      : CONFIG.BASE_URL_WEB;
    chrome.tabs.create({ url });
  });
}

if (activeDashboardBtn) {
  activeDashboardBtn.addEventListener("click", () => {
    const url = currentMeetingId
      ? `${CONFIG.BASE_URL_WEB}/meetings/${currentMeetingId}`
      : CONFIG.BASE_URL_WEB;
    chrome.tabs.create({ url });
  });
}

if (idleDashboardBtn) {
  idleDashboardBtn.addEventListener("click", () => {
    const url = CONFIG.BASE_URL_WEB; // Idle means no active meeting, go to main dashboard
    chrome.tabs.create({ url });
  });
}

// ─── Stop Meeting button ──────────────────────────────────────────────────────
if (endMeetingTopBtn) {
  endMeetingTopBtn.addEventListener("click", () => {
    if (!currentMeetingId) return;

    endMeetingTopBtn.disabled = true;
    endMeetingTopBtn.innerHTML = `<span class="btn-spinner"></span> Stopping…`;

    chrome.runtime.sendMessage({
      type: "REQUEST_END_MEETING",
      meetingId: currentMeetingId,
    });

    setTimeout(() => {
      endMeetingTopBtn.disabled = false;
      showEnded();
    }, 1500);
  });
}

// ─── Test Copilot / Ask Suggestions ──────────────────────────────────────────
if (testCopilotBtn) {
  testCopilotBtn.addEventListener("click", () => {
    testCopilotBtn.innerHTML = `<span class="md3-loading-indicator md3-loading-indicator-sm" style="border-color:transparent; border-top-color:currentColor; border-right-color:currentColor;"></span> Suggest`;
    testCopilotBtn.disabled = true;
    testCopilotBtn.style.pointerEvents = "none";
    if (suggestionsList) {
      suggestionsList.innerHTML = `<div style="display:flex; justify-content:center; padding: 12px;"><span class="md3-loading-indicator md3-loading-indicator-md"></span></div>`;
    }

    chrome.runtime.sendMessage({ type: "FORCE_TEST_UPDATE", meetingId: currentMeetingId });
    if (currentMeetingId) {
      fetch(
        `${CONFIG.BASE_URL_BACKEND}/ingest/realtime/${currentMeetingId}?force=true`,
        { method: "POST" }
      )
        .then((r) => r.json())
        .then((data) => renderCopilotUpdate(data))
        .catch(() => {});
    }

    setTimeout(() => {
      testCopilotBtn.innerHTML = `<i class="ri-refresh-line"></i> Suggest`;
      testCopilotBtn.disabled = false;
      testCopilotBtn.style.pointerEvents = "auto";
    }, 2500);
  });
}

// ─── Ask Next Question ────────────────────────────────────────────────────────
if (askNextBtn) {
  askNextBtn.addEventListener("click", () => {
    askNextBtn.innerHTML = `<span class="md3-loading-indicator md3-loading-indicator-sm" style="border-color:transparent; border-top-color:currentColor; border-right-color:currentColor;"></span> Generate`;
    askNextBtn.disabled = true;
    askNextBtn.style.pointerEvents = "none";
    if (nextQText) {
      nextQText.innerHTML = `<div style="display:flex; justify-content:center; padding: 12px;"><span class="md3-loading-indicator md3-loading-indicator-md"></span></div>`;
    }

    if (currentMeetingId) {
      fetch(
        `${CONFIG.BASE_URL_BACKEND}/ingest/realtime/${currentMeetingId}?force=true`,
        { method: "POST" }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.next_question) {
            nextQText.textContent = data.next_question;
            if (nextQSection) nextQSection.classList.remove("collapsed");
          } else if (data.error) {
            nextQText.innerHTML = `<span style="color:var(--risk)">${data.error}</span>`;
            if (nextQSection) nextQSection.classList.remove("collapsed");
          } else {
            nextQText.textContent = "Waiting for more conversation context…";
          }
          renderCopilotUpdate(data);
        })
        .catch(() => {
          nextQText.textContent = "Backend unreachable. Ensure FastAPI server is running on port 8000.";
        })
        .finally(() => {
          setTimeout(() => {
            askNextBtn.innerHTML = `<i class="ri-refresh-line"></i> Generate`;
            askNextBtn.disabled = false;
            askNextBtn.style.pointerEvents = "auto";
          }, 2000);
        });
    } else {
      nextQText.textContent = "No active meeting. Join a Google Meet first.";
      askNextBtn.innerHTML = `<i class="ri-refresh-line"></i> Generate`;
      askNextBtn.disabled = false;
    }
  });
}

// ─── Late-Join Recap ──────────────────────────────────────────────────────────
if (recapBtn) {
  recapBtn.addEventListener("click", () => {
    if (!recapContent) return;
    const recapWrapper = document.getElementById("recap-wrapper");
    if (recapWrapper) recapWrapper.classList.remove("collapsed");
    recapContent.innerHTML = `<div style="display:flex; justify-content:center; padding: 12px;"><span class="md3-loading-indicator md3-loading-indicator-md"></span></div>`;
    recapBtn.innerHTML = `<span class="md3-loading-indicator md3-loading-indicator-sm" style="border-color:transparent; border-top-color:currentColor; border-right-color:currentColor;"></span> Recap`;
    recapBtn.disabled = true;
    recapBtn.style.pointerEvents = "none";

    const doRecap = (meetId) => {
      fetch(
        `${CONFIG.BASE_URL_BACKEND}/ingest/late-recap/${meetId}?force=true`,
        { method: "GET" }
      )
        .then((r) => r.json())
        .then((data) => {
          let recapText = "";

          // Build recap even if "Not enough discussion" — show whatever is available
          if (data.recap && data.recap.trim().length > 0) {
            recapText = `Recap:\n${data.recap}`;
          } else if (lastRecap) {
            recapText = lastRecap;
          } else if (totalTranscriptLines > 0) {
            recapText = "Meeting is still in early stages. Keep talking for a richer recap.";
          } else {
            recapText = "No speech captured yet. Enable Captions (CC) on Google Meet.";
          }

          if (data.key_decisions_so_far && data.key_decisions_so_far.length) {
            recapText += `\n\nDecisions:\n- ${data.key_decisions_so_far.join("\n- ")}`;
          }

          if (data.error) {
            recapContent.innerHTML = `<span style="color:var(--risk)">${data.error}</span>`;
          } else {
            lastRecap = recapText;
            recapContent.textContent = recapText;
          }

          if (data.powered_by && llmStatusText) {
            llmStatusText.textContent = `Active: ${data.powered_by}`;
            if (llmStatusChip) llmStatusChip.classList.remove("hidden");
          }
        })
        .catch(() => {
          if (lastRecap) {
            recapContent.textContent = lastRecap;
          } else {
            recapContent.textContent = "Could not reach backend API on port 8000.";
          }
        })
        .finally(() => {
          setTimeout(() => {
            recapBtn.innerHTML = `<i class="ri-refresh-line"></i> Recap`;
            recapBtn.disabled = false;
            recapBtn.style.pointerEvents = "auto";
          }, 2000);
        });
    };

    if (currentMeetingId) {
      doRecap(currentMeetingId);
    } else {
      chrome.storage.local.get(["currentMeetingId"], (res) => {
        if (res.currentMeetingId) {
          currentMeetingId = res.currentMeetingId;
          doRecap(res.currentMeetingId);
        } else {
          recapContent.textContent = "No active meeting. Join a Google Meet first.";
          recapBtn.innerHTML = `<i class="ri-refresh-line"></i> Recap`;
          recapBtn.disabled = false;
        }
      });
    }
  });
}

if (toggleTranscriptBtn) {
  toggleTranscriptBtn.addEventListener("click", () => {
    if (transcriptFeed.classList.contains("collapsed")) {
      transcriptFeed.classList.remove("collapsed");
      toggleTranscriptBtn.innerHTML = '<i class="ri-arrow-up-s-line" style="font-size: 16px;"></i>';
      setTimeout(() => transcriptFeed.scrollTop = transcriptFeed.scrollHeight, 50);
    } else {
      transcriptFeed.classList.add("collapsed");
      toggleTranscriptBtn.innerHTML = '<i class="ri-arrow-down-s-line" style="font-size: 16px;"></i>';
      setTimeout(() => transcriptFeed.scrollTop = transcriptFeed.scrollHeight, 50);
    }
  });
}

function setupToggle(btnId, contentId) {
  const btn = $(btnId);
  const content = $(contentId);
  if (btn && content) {
    btn.addEventListener("click", () => {
      if (content.classList.contains("hidden")) {
        content.classList.remove("hidden");
        btn.innerHTML = '<i class="ri-arrow-up-s-line" style="font-size: 16px;"></i>';
      } else {
        content.classList.add("hidden");
        btn.innerHTML = '<i class="ri-arrow-down-s-line" style="font-size: 16px;"></i>';
      }
    });
  }
}

setupToggle("toggle-suggestions-btn", "suggestions-list");
setupToggle("toggle-nextq-btn", "next-question-text");
setupToggle("toggle-recap-btn", "recap-content");

// ─── Render Copilot updates ───────────────────────────────────────────────────
function renderCopilotUpdate(data) {
  if (!data) return;

  if (data.powered_by && llmStatusText) {
    if (llmStatusChip) llmStatusChip.classList.remove("hidden");
    llmStatusText.textContent = `Active: ${data.powered_by}`;
  }

  if (data.error) {
    const errHTML = `<div class="risk-card"><strong>Status:</strong> ${data.error}</div>`;
    if (suggestionsList) suggestionsList.innerHTML = errHTML;
    if (nextQText && nextQText.textContent.includes("Click"))
      nextQText.innerHTML = errHTML;
    if (recapContent && !recapContent.classList.contains("hidden"))
      recapContent.innerHTML = errHTML;
    return;
  }

  const { suggestions = [], next_question = "", recap = "" } = data;

  if (suggestions.length > 0) {
    suggestionsList.innerHTML = "";
    suggestions.forEach((text) => {
      const card = document.createElement("div");
      card.className = "suggestion-card new";
      card.textContent = text;
      card.title = "Click to copy";
      card.addEventListener("click", () => {
        navigator.clipboard.writeText(text).catch(() => {});
        card.textContent = "Copied!";
        card.style.color = "var(--success)";
        setTimeout(() => {
          card.textContent = text;
          card.style.color = "";
        }, 1000);
        if (nextQSection) nextQSection.classList.remove("collapsed");
      });
      suggestionsList.appendChild(card);
    });
    if (nextQSection) nextQSection.classList.remove("collapsed");
  } else if (totalTranscriptLines > 0) {
    suggestionsList.innerHTML =
      '<p class="empty-text">No actionable suggestions right now. Keep talking!</p>';
  }

  if (next_question && nextQText) {
    nextQText.textContent = next_question;
    nextQText.title = "Click to copy";
    nextQText.style.cursor = "pointer";
    nextQText.onclick = () => {
      navigator.clipboard.writeText(next_question).catch(() => {});
      const originalText = nextQText.textContent;
      nextQText.textContent = "Copied!";
      nextQText.style.color = "var(--success)";
      setTimeout(() => {
        nextQText.textContent = originalText;
        nextQText.style.color = "";
      }, 1000);
    };
    if (nextQSection) nextQSection.classList.remove("hidden");
  }

  if (recap) {
    lastRecap = recap;
    if (recapContent && !recapContent.classList.contains("hidden")) {
      recapContent.textContent = lastRecap;
    }
  }
}

// ─── Message listener from background ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
    case "MEETING_STARTED":
      showActive(msg.meetingId);
      break;
    case "MEETING_ENDED":
      showIdle();
      break;
    case "COPILOT_UPDATE":
      if (msg.data) {
        const mid = msg.data.meeting_id;
        if (!mid || mid === currentMeetingId) {
          renderCopilotUpdate(msg.data);
        }
      }
      break;
    case "LIVE_CAPTION_CHUNK":
      if (msg.chunk) appendLiveCaption(msg.chunk);
      break;
    case "WS_CONNECTED":
      setBadge("LIVE", true);
      break;
  }
});

// ─── Storage-based fallback ────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if ("currentMeetingId" in changes) {
    const { oldValue, newValue } = changes.currentMeetingId;
    if (newValue && newValue !== oldValue) {
      chrome.storage.local.remove(["lastCopilotUpdate", "copilot_state"]);
      if (suggestionsList) suggestionsList.innerHTML = "";
      if (!meetingActive) showActive(newValue);
    } else if (!newValue && oldValue && meetingActive) {
      showIdle();
    }
  }

  if ("meetingTitle" in changes && changes.meetingTitle.newValue) {
    currentMeetingTitle = changes.meetingTitle.newValue;
    if (meetingTitleHint) {
      meetingTitleHint.textContent = `Opening report for: ${currentMeetingTitle}`;
    }
  }

  if ("lastCopilotUpdate" in changes && meetingActive) {
    const { newValue } = changes.lastCopilotUpdate;
    if (newValue && newValue.meeting_id === currentMeetingId) renderCopilotUpdate(newValue);
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
chrome.storage.local.get(["currentMeetingId", "meetingTitle", "lastCopilotUpdate", "copilot_state", "transcript"], (result) => {
  if (result.meetingTitle) currentMeetingTitle = result.meetingTitle;

  if (result.currentMeetingId) {
    showActive(result.currentMeetingId);
    if (result.transcript && Array.isArray(result.transcript)) {
      result.transcript.forEach(chunk => appendLiveCaption(chunk));
    }
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (
        tab &&
        tab.url &&
        tab.url.includes("meet.google.com") &&
        !tab.url.includes("landing") &&
        tab.url.length > 24
      ) {
        chrome.storage.local.remove(["lastCopilotUpdate", "copilot_state", "transcript"]);
        const fallbackId = "live_" + Date.now();
        chrome.storage.local.set({
          currentMeetingId: fallbackId,
          meetingTitle: tab.title || "Google Meet",
        });
        currentMeetingTitle = tab.title || "Google Meet";
        showActive(fallbackId);
        chrome.runtime.sendMessage({
          type: "START_MEETING",
          title: tab.title || "Google Meet",
          fallbackId,
        });
      }
    });
  }

  if (result.currentMeetingId) {
    const update = result.lastCopilotUpdate || result.copilot_state;
    if (update && update.meeting_id && update.meeting_id === result.currentMeetingId) {
      renderCopilotUpdate(update);
    }
  }
});

