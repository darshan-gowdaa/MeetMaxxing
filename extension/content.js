/**
 * MeetMaxxing Content Script — Production Caption Scraper
 *
 * Utterance-complete detection strategy:
 * - Tracks each speaker's live text as Google Meet updates it in real-time.
 * - Only sends a chunk when the speaker PAUSES (1500ms silence) or the DOM
 *   removes the utterance block (sentence finished).
 * - Never sends single words or mid-sentence fragments.
 * - MutationObserver watches only the caption container element for perf.
 */

"use strict";

// ─── State ─────────────────────────────────────────────────────────────────────
let meetingId = null;
let meetingStartTime = Date.now();
let captionObserver = null;
let authToken = null;
let maxParticipants = 1;

/**
 * Per-speaker utterance tracker.
 * Key: speaker name (string)
 * Value: { text: string, timer: setTimeout ID, element: HTMLElement }
 * Flushed when speaker pauses ≥ SILENCE_MS or utterance block is removed.
 */
const utteranceMap = new Map();
const SILENCE_MS = 1200;          // ms of silence before treating as sentence complete
const MAX_CHARS  = 200;           // force flush if utterance exceeds this length to prevent stalling
const DEDUP_TTL  = 3500;          // ms to remember sent chunks (prevents double-fires but allows repeated words)
const recentSent = new Map();     // key: "speaker||text" → timestamp
const lastSentText = new Map();   // key: speaker → last fully sent text
const speakerHistory = new Map(); // key: speaker → array of {text, timestamp}

// ─── All known caption selectors (2024-2026 community verified) ────────────────
// Text content selectors — the actual spoken text element inside caption region
const TEXT_SELECTORS = [
  '.ygicle',                 // 2025/2026 Google Meet primary text container inside .nMcdL
  '.VbkSUe',                 // 2025/2026 alternate class for primary text container
  '[jsname="tgaKEf"]',       // primary text span (2023-2025)
  '[jsname="YSxPC"]',        // alternate text container
  '[jsname="bltWBb"]',       // seen in some Meet versions
  '[jsname="V67aGc"]',
  '.nMS8Ac',                 // caption text class
  '.CNusmb span',            // 2024+ variant
  '.CNusmb',
  '.TBMuR [jsname="tgaKEf"]',
  '.iOglke [jsname="tgaKEf"]',
  '[role="region"][aria-label*="Caption" i] span',
  '[role="region"][aria-label*="caption" i] span'
];

// Speaker name selectors inside caption region
const SPEAKER_SELECTORS = [
  '.NWpY1d',                 // 2025/2026 primary speaker name class inside .nMcdL
  '.KcIKyf',                 // 2025/2026 speaker wrapper
  '[jsname="r4nke"]',
  '[jsname="RDVNB"]',
  '.zs7s8d',
  '.KF4T6b',
  '[data-sender-name]',
  '[data-self-name]',
  '.TBMuR .zs7s8d',
  '.iOglke .zs7s8d'
];

// Caption container selectors (the outer wrapping region ONLY)
const CONTAINER_SELECTORS = [
  '.vNKgIf.UDinHf',           // exact 2025/2026 primary captions region provided by user
  '[jscontroller="KPn5nb"]',  // jscontroller of the exact caption region
  '[jsname="dsyhDe"]',        // outer caption box
  '[jsname="jTNmtb"]',
  '[role="region"][aria-label*="Caption" i]',
  '[role="region"][aria-label*="caption" i]',
  '.iOglke',
  '.TBMuR'
];

// ─── Find speaker near a text element ─────────────────────────────────────────
function findSpeaker(textEl) {
  if (!textEl) return "Participant";
  const speakerQuery = SPEAKER_SELECTORS.join(",");

  // 1. Check siblings (speaker div precedes text div in Meet's structure)
  let sib = textEl.previousElementSibling;
  for (let i = 0; i < 6 && sib; i++, sib = sib.previousElementSibling) {
    const s = sib.matches(speakerQuery) ? sib : sib.querySelector(speakerQuery);
    if (s?.textContent?.trim()) {
      const name = s.textContent.trim();
      if (name.length < 50 && !isIgnorePhrase(name)) return name;
    }
  }

  // 2. Walk up ancestors, check their subtrees
  let node = textEl.parentElement;
  for (let i = 0; i < 8 && node && node !== document.body; i++, node = node.parentElement) {
    if (node.dataset?.senderName && !isIgnorePhrase(node.dataset.senderName)) return node.dataset.senderName;
    if (node.dataset?.selfName && !isIgnorePhrase(node.dataset.selfName)) return node.dataset.selfName;
    
    const s = node.querySelector(speakerQuery);
    if (s && s !== textEl && !textEl.contains(s) && s.textContent?.trim()) {
      const name = s.textContent.trim();
      if (name.length < 50 && !isIgnorePhrase(name) && !name.includes(textEl.textContent?.trim())) {
        return name;
      }
    }
    const aria = node.getAttribute("aria-label") || "";
    if (aria.startsWith("Caption from ")) {
      return aria.replace("Caption from ", "").trim();
    }
  }

  // 3. Fallback: check inside closest caption container
  const container = textEl.closest(CONTAINER_SELECTORS.join(","));
  if (container) {
    const s = container.querySelector(speakerQuery);
    if (s && s !== textEl && !textEl.contains(s) && s.textContent?.trim()) {
      const name = s.textContent.trim();
      if (name.length < 50 && !isIgnorePhrase(name)) return name;
    }
  }

  return "You";
}

// ─── Noise Filter (Ignore Google Meet UI notifications & device toasts) ────────
const IGNORE_PHRASES = [
  "Speakers (", "Microphone (", "Microphone Array", "Smart Sound Technology",
  "Digital Microphones", "Intel Smart Sound", "Realtek", "Turn on captions", "You're muted",
  "joined the meeting", "left the meeting", "Pin to your screen", "More options",
  "Visual effects", "Send a message", "People (", "Activity", "Host controls",
  "Raise hand", "Present now", "Leave call", "Check your audio", "Switch camera",
  "Apply visual effects", "Report a problem", "Settings", "Troubleshooting",
  "mic_none", "mic_off", "videocam_off", "volume_up", "volume_off", "closed_caption",
  "Captions (CC)", "Share screen", "Open queue", "Meeting details", "Audio device",
  "Speaker Array", "Communication", "Default - ", "Communications - ", "System Audio",
  "Jump to the bottom", "arrow_downward", "format_size", "circle", "language",
  "Default", "Tiny", "Small", "Medium", "Large", "Huge", "Jumbo",
  "White", "Black", "Blue", "Green", "Red", "Yellow", "Cyan", "Magenta"
];

function isIgnorePhrase(text) {
  if (!text) return true;
  const clean = text.trim();
  if (clean === "You" || clean === "Participant") return true;
  for (const phrase of IGNORE_PHRASES) {
    if (clean.includes(phrase) || clean.toLowerCase() === phrase.toLowerCase()) return true;
  }
  if (/^(mic_|volume_|videocam_|info|settings|check|close|menu|share|person|group|format_|circle|arrow_)/i.test(clean)) return true;
  if (/^(Default|Tiny|Small|Medium|Large|Huge|Jumbo|White|Black|Blue|Green|Red|Yellow|Cyan|Magenta)$/i.test(clean)) return true;
  if (clean.includes("(") && (clean.includes("Audio") || clean.includes("Microphone") || clean.includes("Speaker") || clean.includes("Intel") || clean.includes("USB") || clean.includes("Bluetooth"))) return true;
  return false;
}

function cleanCaptionText(raw) {
  if (!raw) return "";
  let text = raw.replace(/arrow_downward\s*Jump to the bottom/gi, "")
                .replace(/Jump to the bottom/gi, "")
                .replace(/arrow_downward/gi, "")
                .replace(/keyboard_arrow_down/gi, "")
                .trim();
  if (/^You([A-Z])/.test(text)) {
    text = text.replace(/^You([A-Z])/, "$1");
  } else if (/^You\s+/.test(text)) {
    text = text.replace(/^You\s+/, "");
  }
  return text.trim();
}

function isCleanCaption(text) {
  if (!text || text.length < 2) return false;
  if (isIgnorePhrase(text)) return false;
  return true;
}

// ─── 5-Minute Overlap Deduplication ──────────────────────────────────────────
function extractUnrepeatedText(speaker, newText) {
  if (!newText) return "";
  
  const history = speakerHistory.get(speaker) || [];
  const now = Date.now();
  
  // Keep only last 5 seconds of history
  const validHistory = history.filter(h => now - h.timestamp < 5 * 1000);
  speakerHistory.set(speaker, validHistory);
  
  const recentSentText = validHistory.map(h => h.text).join(" ");
  if (!recentSentText) return newText;
  
  // If fully contained in history, it's a complete duplicate
  if (recentSentText.includes(newText)) return "";
  
  // Suffix-prefix word overlap to handle mid-sentence flushes and corrections
  const oldWords = recentSentText.split(/\\s+/);
  const newWords = newText.split(/\\s+/);
  
  let maxOverlap = 0;
  const minLen = Math.min(oldWords.length, newWords.length);
  
  for (let i = 1; i <= minLen; i++) {
    let match = true;
    for (let j = 0; j < i; j++) {
      const w1 = oldWords[oldWords.length - i + j].toLowerCase().replace(/[^a-z0-9]/g, "");
      const w2 = newWords[j].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (w1 !== w2) {
        match = false;
        break;
      }
    }
    if (match) maxOverlap = i;
  }
  
  if (maxOverlap > 0) {
    return newWords.slice(maxOverlap).join(" ");
  }
  
  return newText;
}

// ─── Safe message sender (prevents context invalidated errors) ────────────────
function safeSendMessage(msg, callback) {
  if (!chrome.runtime || !chrome.runtime.id) {
    return false;
  }
  try {
    chrome.runtime.sendMessage(msg, (resp) => {
      let _ = chrome.runtime.lastError;
      if (callback) callback(resp);
    });
    return true;
  } catch (err) {
    return false;
  }
}

// ─── Flush a completed utterance to background ───────────────────────────────
function flushUtterance(speaker) {
  const entry = utteranceMap.get(speaker);
  if (!entry) return;
  clearTimeout(entry.timer);
  utteranceMap.delete(speaker);

  const text = cleanCaptionText(entry.text);
  if (!isCleanCaption(text)) return;

  const now = Date.now();
  const key = `${speaker}||${text}`;

  // If this text is EXACTLY what we just sent for this speaker, DO NOT send it again ever, 
  // until they say something new. (Fixes stale DOM elements firing repeatedly)
  if (lastSentText.get(speaker) === text) return;

  // Extract only the new unrepeated part using the 5-minute rolling overlap algorithm
  const diffText = extractUnrepeatedText(speaker, text);
  if (!diffText || diffText.length < 2) {
    lastSentText.set(speaker, text);
    return; // Completely redundant
  }

  // Dedup: skip if same exact diff sent recently
  const diffKey = `${speaker}||${diffText}`;
  const last = recentSent.get(diffKey);
  if (last && now - last < DEDUP_TTL) return;

  // Prune old dedup entries
  for (const [k, t] of recentSent.entries()) {
    if (now - t > DEDUP_TTL) recentSent.delete(k);
  }
  recentSent.set(diffKey, now);
  lastSentText.set(speaker, text);
  
  // Update speaker history with the new diff
  const hist = speakerHistory.get(speaker) || [];
  hist.push({ text: diffText, timestamp: now });
  speakerHistory.set(speaker, hist);

  const sent = safeSendMessage({
    type: "INGEST_CHUNK",
    meetingId: meetingId,
    chunk: { speaker, text: diffText, timestamp_ms: now - meetingStartTime, platform: "google_meet", source: "dom" },
  });
  if (sent) console.log(`[MeetMaxxing] ✓ Utterance → ${speaker}: "${diffText.slice(0, 80)}"`);
  else console.warn("[MeetMaxxing] Context invalidated — refresh this tab (F5).");
}

// ─── Track live text per-speaker; schedule flush on silence ──────────────────
function trackUtterance(speaker, rawText) {
  const text = cleanCaptionText(rawText);
  if (!text) return;

  const existing = utteranceMap.get(speaker);

  if (text.length >= MAX_CHARS) {
    if (existing) clearTimeout(existing.timer);
    utteranceMap.set(speaker, { text, timer: null });
    flushUtterance(speaker);
    return;
  }

  // Reset silence timer whenever text changes
  if (existing) {
    clearTimeout(existing.timer);
    existing.text = text; // always keep the latest (longest) version
    existing.timer = setTimeout(() => flushUtterance(speaker), SILENCE_MS);
  } else {
    utteranceMap.set(speaker, {
      text,
      timer: setTimeout(() => flushUtterance(speaker), SILENCE_MS),
    });
  }
}

// ─── Scan caption container and update per-speaker live text ─────────────────
function scanCaptions() {
  const containerQuery = CONTAINER_SELECTORS.join(", ");
  const containers = document.querySelectorAll(containerQuery);

  for (const c of containers) {
    if (c.closest('.rHGeGc-aPP78e, button, [role="menu"], [role="dialog"], [role="listbox"]')) continue;

    // 2025/2026: each active speaker gets a .nMcdL block
    const utteranceBlocks = c.querySelectorAll('.nMcdL, .bj4p3b');
    let foundBlocks = false;

    for (const u of utteranceBlocks) {
      if (u.closest('.IMKgW, .GvZY2, button, .VfPpkd-PtP14e')) continue;

      const sEl = u.querySelector('.NWpY1d, .KcIKyf, [jsname="r4nke"], .zs7s8d, .KF4T6b');
      const speaker = sEl?.textContent?.trim() || findSpeaker(u) || "You";

      const tEl = u.querySelector('.ygicle, .VbkSUe, [jsname="tgaKEf"], [jsname="YSxPC"], .CNusmb');
      const rawText = (tEl || u).innerText || (tEl || u).textContent;

      if (rawText?.trim()) {
        trackUtterance(speaker, rawText);
        foundBlocks = true;
      }
    }

    // Fallback for older Meet structures without .nMcdL
    if (!foundBlocks) {
      const textEls = c.querySelectorAll('.ygicle, .VbkSUe, [jsname="tgaKEf"], [jsname="YSxPC"], [jsname="bltWBb"], .CNusmb');
      for (const t of textEls) {
        if (t.closest('.IMKgW, .GvZY2, button, .VfPpkd-PtP14e, [role="menu"]')) continue;
        const rawText = t.innerText || t.textContent;
        if (rawText?.trim()) {
          const speaker = findSpeaker(t) || "You";
          trackUtterance(speaker, rawText);
        }
      }
    }
  }
}

// ─── When a .nMcdL block is REMOVED from DOM → utterance finished → flush now ─
function checkRemovedForFlush(mutations) {
  for (const m of mutations) {
    if (m.type !== "childList") continue;
    for (const removed of m.removedNodes) {
      if (!(removed instanceof Element)) continue;
      // If the utterance block itself was removed, flush all pending
      if (removed.matches?.('.nMcdL, .bj4p3b')) {
        const sEl = removed.querySelector('.NWpY1d, .KcIKyf, [jsname="r4nke"], .zs7s8d');
        const speaker = sEl?.textContent?.trim();
        if (speaker) flushUtterance(speaker);
        else {
          // Flush all pending utterances (speaker unknown)
          for (const sp of [...utteranceMap.keys()]) flushUtterance(sp);
        }
      }
    }
  }
}

// ─── MutationObserver with utterance-complete detection ──────────────────────
let scanDebounce = null;

function onMutation(mutations) {
  // Immediately check if any utterance blocks were removed (sentence finished)
  checkRemovedForFlush(mutations);

  // Debounce the live-text scan to ~200ms to avoid per-keystroke overhead
  clearTimeout(scanDebounce);
  scanDebounce = setTimeout(scanCaptions, 200);
}

// ─── Start the observer ────────────────────────────────────────────────────────
function startCaptionObserver() {
  if (captionObserver) { try { captionObserver.disconnect(); } catch (e) {} captionObserver = null; }

  // Flush any pending utterances from a previous session
  for (const sp of [...utteranceMap.keys()]) flushUtterance(sp);

  if (document.body) {
    captionObserver = new MutationObserver(onMutation);
    captionObserver.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    console.log("[MeetMaxxing] Observer active — utterance-complete mode");
  }

  // Immediate baseline scan
  scanCaptions();
}

// ─── Meeting lifecycle ─────────────────────────────────────────────────────────
let consentGiven = false;

function showConsentUI(onAccept) {
  if (document.getElementById("meetmaxxing-consent-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "meetmaxxing-consent-overlay";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(19, 19, 20, 0.85); backdrop-filter: blur(12px);
    z-index: 999999; display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', 'Google Sans', system-ui, sans-serif;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #1e1f20; border: 1px solid rgba(227, 227, 227, 0.12);
    border-radius: 32px; padding: 40px; width: 100%; max-width: 440px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.4); text-align: center;
    color: #e3e3e3; animation: mm-slide-up 0.3s cubic-bezier(0, 0, 0.2, 1);
  `;

  modal.innerHTML = `
    <style>
      @keyframes mm-slide-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .mm-btn { padding: 14px 28px; border-radius: 99px; font-weight: 700; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      .mm-btn-primary { background: #a8c7fa; color: #0842a0; flex: 1; }
      .mm-btn-primary:hover { background: #d3e3fd; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(168, 199, 250, 0.2); }
      .mm-btn-primary:active { transform: scale(0.97); }
      .mm-btn-secondary { background: transparent; color: #a8c7fa; border: 1px solid rgba(168, 199, 250, 0.3); }
      .mm-btn-secondary:hover { background: rgba(168, 199, 250, 0.08); transform: translateY(-1px); }
      .mm-btn-secondary:active { transform: scale(0.97); }
    </style>
    <div style="width: 72px; height: 72px; background: #0842a0; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 8px 24px rgba(8, 66, 160, 0.3);">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="#a8c7fa"><path d="M11 2L11.5 5.51869C11.8906 8.26786 14.1039 10.3708 16.8687 10.6382L20.5 10.9893L16.8687 11.3404C14.1039 11.6078 11.8906 13.7107 11.5 16.4599L11 19.9786L10.5 16.4599C10.1094 13.7107 7.8961 11.6078 5.13134 11.3404L1.5 10.9893L5.13134 10.6382C7.8961 10.3708 10.1094 8.26786 10.5 5.51869L11 2ZM18.5 14L18.675 15.2285C18.8117 16.1907 19.5863 16.9278 20.554 17.0215L22 17.1614L20.554 17.3013C19.5863 17.3949 18.8117 18.132 18.675 19.0943L18.5 20.3228L18.325 19.0943C18.1883 18.132 17.4137 17.3949 16.446 17.3013L15 17.1614L16.446 17.0215C17.4137 16.9278 18.1883 16.1907 18.325 15.2285L18.5 14Z"></path></svg>
    </div>
    <h2 style="margin: 0 0 12px; font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.5px;">MeetMaxxing AI</h2>
    <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #c4c7c5;">
      To provide meeting intelligence and memory, this extension requires your consent to transcribe captions during this call.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="mm-decline-btn" class="mm-btn mm-btn-secondary">Decline</button>
      <button id="mm-accept-btn" class="mm-btn mm-btn-primary">Allow & Start</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById("mm-accept-btn").addEventListener("click", () => {
    overlay.remove();
    safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
    onAccept();
  });

  document.getElementById("mm-decline-btn").addEventListener("click", () => {
    overlay.remove();
    console.log("[MeetMaxxing] Consent declined. Extension inactive.");
  });
}

let hideCaptionsStyle = null;
function toggleHideCaptions() {
  if (!hideCaptionsStyle) {
    hideCaptionsStyle = document.createElement("style");
    hideCaptionsStyle.innerHTML = `
      div[class*="a4cQT"], div[class*="iTtpOb"], div[jsname="dsSS6e"], div[class*="bhZ0Nb"] {
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(hideCaptionsStyle);
  } else {
    hideCaptionsStyle.remove();
    hideCaptionsStyle = null;
  }
}

function injectVisibilityButton() {
  if (document.getElementById("mm-caption-visibility-btn")) return;
  const btn = document.createElement("button");
  btn.id = "mm-caption-visibility-btn";
  btn.style.cssText = `
    position: fixed; bottom: 18px; left: 240px; z-index: 999999;
    background: #3c4043; color: #e8eaed; width: 40px; height: 40px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: none;
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
    transition: background 0.2s;
  `;
  
  const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c5.392 0 9.878 3.88 10.819 9-.94 5.12-5.427 9-10.819 9-5.392 0-9.878-3.88-10.819-9C2.121 6.88 6.608 3 12 3zm0 16a9.005 9.005 0 0 0 8.777-7A9.005 9.005 0 0 0 12 5a9.005 9.005 0 0 0-8.777 7A9.005 9.005 0 0 0 12 19zm0-2a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path></svg>`;
  const eyeCloseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.94 6.088c.348-.057.708-.088 1.06-.088 5.392 0 9.878 3.88 10.819 9-.263 1.43-.876 2.733-1.723 3.84l-1.446-1.445a9.006 9.006 0 0 0 1.15-2.395A9.005 9.005 0 0 0 12 5c-.476 0-.94.037-1.393.107l.333 1.011zm9.645 15.427-1.414 1.414-3.791-3.79a11.196 11.196 0 0 1-3.38.261c-5.392 0-9.878-3.88-10.819-9a10.966 10.966 0 0 1 2.37-4.47l-2.228-2.228 1.414-1.414 17.848 17.848zM4.654 7.483A9.013 9.013 0 0 0 3.223 12a9.005 9.005 0 0 0 8.777 7c.803 0 1.58-.105 2.316-.304L12.52 16.9a5 5 0 0 1-5.421-5.42L4.654 7.483zM14 12a2 2 0 0 1-2 2l-1.748-1.748c.046-.732.616-1.302 1.348-1.348L14 12.001zM11.95 7a5 5 0 0 1 4.95 4.95l-1.921-1.921A3.003 3.003 0 0 0 11.95 7z"></path></svg>`;

  if (!hideCaptionsStyle) toggleHideCaptions();
  btn.innerHTML = eyeCloseSvg;
  btn.title = "Captions Hidden (MeetMaxxing)";
  btn.style.background = "#ea4335";
  btn.style.color = "#fff";

  btn.onmouseover = () => {
    if (!hideCaptionsStyle) btn.style.background = "#4d5156";
  };
  btn.onmouseout = () => {
    if (!hideCaptionsStyle) btn.style.background = "#3c4043";
  };

  btn.onclick = () => {
    toggleHideCaptions();
    if (hideCaptionsStyle) {
      btn.innerHTML = eyeCloseSvg;
      btn.style.background = "#ea4335";
      btn.style.color = "#fff";
      btn.title = "Captions Hidden (MeetMaxxing)";
    } else {
      btn.innerHTML = eyeOpenSvg;
      btn.style.background = "#3c4043";
      btn.style.color = "#e8eaed";
      btn.title = "Captions Visible (MeetMaxxing)";
    }
  };
  document.body.appendChild(btn);
}

function autoEnableCC() {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const ccBtns = document.querySelectorAll('button[aria-label*="caption" i], button[data-tooltip*="caption" i]');
    
    for (const btn of ccBtns) {
      const isPressed = btn.getAttribute("aria-pressed") === "true" || btn.classList.contains("VfPpkd-Bz112c-LgbsSe-OWXEXe-INsBxf");
      const label = btn.getAttribute("aria-label") || btn.getAttribute("data-tooltip") || "";
      
      if (!isPressed && label.toLowerCase().includes("turn on")) {
        btn.click();
        console.log("[MeetMaxxing] Auto-enabled CC.");
        clearInterval(interval);
        return;
      } else if (isPressed || label.toLowerCase().includes("turn off")) {
        console.log("[MeetMaxxing] CC already enabled.");
        clearInterval(interval);
        return;
      }
    }
    
    if (attempts >= 15) {
      clearInterval(interval);
      console.log("[MeetMaxxing] Gave up trying to auto-enable CC after 15 seconds.");
    }
  }, 1000);
}

function startMeeting() {
  if (!consentGiven) {
    showConsentUI(() => {
      consentGiven = true;
      startMeeting();
    });
    return;
  }

  meetingStartTime = Date.now();
  maxParticipants = 1;
  autoEnableCC();
  injectVisibilityButton();
  const match = location.pathname.match(/^\/([a-z0-9\-]+)/i);
  const meetCode = match ? match[1] : "";
  let title = document.title.replace("Google Meet", "").replace(/^Meet\s*-\s*/i, "").trim();
  if (meetCode && meetCode.length >= 3) {
    title = `Meet - ${meetCode}`;
  } else if (!title) {
    title = "Meet - Live Session";
  } else {
    title = `Meet - ${title}`;
  }

  if (!meetingId) meetingId = meetCode || ("live_" + Math.random().toString(36).slice(2, 9));

  if (chrome.runtime && chrome.runtime.id) {
    chrome.storage.local.set({ currentMeetingId: meetingId, meetingTitle: title, meetCode });
  }
  startCaptionObserver();

  safeSendMessage({ type: "START_MEETING", title, fallbackId: meetingId, meetCode }, (resp) => {
    if (resp?.meetingId) {
      meetingId = resp.meetingId;
      if (chrome.runtime && chrome.runtime.id) {
        chrome.storage.local.set({ currentMeetingId: meetingId, meetingTitle: title, meetCode });
      }
    }
  });

  console.log("[MeetMaxxing] Meeting started:", meetingId, "(Code:", meetCode, ")");

  // Polling fallback to detect if user left the meeting but URL didn't change
  const endCheckInterval = setInterval(() => {
    if (!meetingId) {
      clearInterval(endCheckInterval);
      return;
    }
    
    // Track max participants
    const participantCountEl = document.querySelector('.uGOf1d') || document.querySelector('[jsname="Nqj9L"]');
    if (participantCountEl && participantCountEl.innerText) {
      const count = parseInt(participantCountEl.innerText, 10);
      if (!isNaN(count) && count > maxParticipants) {
        maxParticipants = count;
        safeSendMessage({ type: "UPDATE_PARTICIPANTS", maxParticipants });
      }
    }

    const text = document.body.innerText || "";
    const isEndScreen = text.includes("You left the meeting") || 
                        text.includes("Return to home screen") || 
                        text.includes("Rejoin") || 
                        text.includes("You're no longer in the meeting") ||
                        document.querySelector('[data-is-leave-page="true"]') || 
                        (document.querySelector('.roSPhc') && text.includes("left"));
                        
    // If the main bottom control bar is missing, we probably left
    const hasControlBar = document.querySelector('[aria-label="Leave call"], button[data-tooltip*="Leave"]');

    if (isEndScreen || (!hasControlBar && meetingStartTime && (Date.now() - meetingStartTime > 15000))) {
      console.log("[MeetMaxxing] Detected meeting end screen or missing controls.");
      clearInterval(endCheckInterval);
      endMeeting();
    }
  }, 2000);
}

function endMeeting() {
  if (!meetingId) return;
  clearTimeout(scanDebounce);
  // Flush all pending utterances before ending
  for (const sp of [...utteranceMap.keys()]) flushUtterance(sp);
  if (captionObserver) { try { captionObserver.disconnect(); } catch (e) {} captionObserver = null; }

  const toggleBtn = document.getElementById("meetmaxxing-cc-toggle");
  if (toggleBtn) toggleBtn.remove();
  const styleEl = document.getElementById("meetmaxxing-hide-cc");
  if (styleEl) styleEl.remove();

  safeSendMessage({ type: "END_MEETING", meetingId, title: document.title, maxParticipants });

  meetingId = null;
  if (chrome.runtime && chrome.runtime.id) {
    chrome.storage.local.remove("currentMeetingId");
  }
  console.log("[MeetMaxxing] Meeting ended.");
}

// ─── Meeting detection ─────────────────────────────────────────────────────────
function detectMeetingState() {
  const isMeeting =
    location.hostname.includes("meet.google.com") &&
    location.pathname.length > 4 &&
    !location.pathname.includes("landing") &&
    !location.pathname.includes("home");

  if (isMeeting) {
    if (!meetingId) {
      startMeeting();
    } else if (!captionObserver) {
      startCaptionObserver();
    }
    safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
  } else if (!isMeeting && meetingId) {
    endMeeting();
  }
}

// Attach user gesture listener to catch join clicks and ensure side panel pops open immediately
document.addEventListener("click", (e) => {
  const target = e.target;
  // Detect Leave Call button clicks as an early signal
  if (target && target.closest && target.closest('[aria-label="Leave call"], [data-tooltip="Leave call"], button[aria-label*="Leave"], button[data-tooltip*="Leave"], .VfPpkd-Bz112c-LgbsSe.yHy1rc.eT1oJ.ftVzxd, i[aria-label="Leave call"]')) {
    console.log("[MeetMaxxing] User clicked Leave call.");
    if (meetingId) {
      setTimeout(() => endMeeting(), 1500); // Give it a moment to flush and process
    }
  }

  if (location.hostname.includes("meet.google.com") && location.pathname.length > 4 && !location.pathname.includes("landing")) {
    safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
  }
}, { capture: true });

// ─── Init ──────────────────────────────────────────────────────────────────────
if (chrome.runtime && chrome.runtime.id) {
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

// SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) { lastUrl = location.href; detectMeetingState(); }
}).observe(document, { subtree: true, childList: true });

// ─── Firefox DOM Panel Injection ─────────────────────────────────────────────
// Injects a collapsible side panel into Google Meet DOM for Firefox (and Chrome fallback)
// Firefox has no sidePanel API so we inject our own.

const IS_FIREFOX = typeof InstallTrigger !== 'undefined' || navigator.userAgent.includes('Firefox');

function injectMeetMaxxingPanel() {
  // Check if already injected
  if (document.getElementById('mm-panel-root')) return;
  
  const BACKEND_URL = (typeof MEETMAXXING_CONFIG !== 'undefined') 
    ? MEETMAXXING_CONFIG.BASE_URL_BACKEND 
    : 'https://meetmaxxing-api.onrender.com';

  // Load panel HTML (the sidebar-app dist)
  // For Firefox MV2, web_accessible_resources allows loading dist/index.html in iframe
  const panelSrc = (typeof browser !== 'undefined' ? browser : chrome).runtime.getURL('dist/index.html');

  // Create container
  const panel = document.createElement('div');
  panel.id = 'mm-panel-root';
  panel.className = 'mm-panel';
  
  // Toggle tab button
  const toggleTab = document.createElement('button');
  toggleTab.className = 'mm-toggle-tab';
  toggleTab.id = 'mm-toggle-btn';
  toggleTab.setAttribute('aria-label', 'Toggle MeetMaxxing Panel');
  toggleTab.innerHTML = `
    <span class="mm-toggle-icon">◀</span>
    <span class="mm-brand-label">M</span>
  `;
  
  // Iframe for sidebar app
  const iframe = document.createElement('iframe');
  iframe.id = 'mm-sidebar-iframe';
  iframe.className = 'mm-panel-content';
  iframe.src = panelSrc;
  iframe.setAttribute('allow', 'microphone');
  iframe.style.cssText = 'width:100%;height:100%;border:none;background:transparent;';
  
  panel.appendChild(toggleTab);
  panel.appendChild(iframe);
  document.documentElement.appendChild(panel);
  
  // Toggle logic
  let isCollapsed = localStorage.getItem('mm_panel_collapsed') === 'true';
  
  function applyState() {
    if (isCollapsed) {
      panel.classList.add('mm-collapsed');
      toggleTab.querySelector('.mm-toggle-icon').textContent = '▶';
      document.documentElement.classList.remove('mm-panel-open');
      document.documentElement.classList.add('mm-panel-collapsed');
    } else {
      panel.classList.remove('mm-collapsed');
      toggleTab.querySelector('.mm-toggle-icon').textContent = '◀';
      document.documentElement.classList.remove('mm-panel-collapsed');
      document.documentElement.classList.add('mm-panel-open');
    }
    localStorage.setItem('mm_panel_collapsed', String(isCollapsed));
  }
  
  toggleTab.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    applyState();
  });
  
  applyState();
  
  // Listen for toggle from background (browser action click)
  const runtimeAPI = typeof browser !== 'undefined' ? browser : chrome;
  runtimeAPI.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_PANEL' || msg.type === 'TOGGLE_PANEL_OPEN') {
      if (msg.type === 'TOGGLE_PANEL_OPEN') {
        isCollapsed = false;
      } else {
        isCollapsed = !isCollapsed;
      }
      applyState();
    }
  });
}

// Inject panel when on Google Meet call page (has /room path)
function tryInjectPanel() {
  // Only inject if we're in an active meeting (URL has the meeting code)
  const onMeetCall = window.location.pathname.length > 1 && !window.location.pathname.startsWith('/landing');
  if (onMeetCall && !document.getElementById('mm-panel-root')) {
    injectMeetMaxxingPanel();
  }
}

// Observe URL changes (Meet is a SPA)
let mmLastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== mmLastUrl) {
    mmLastUrl = location.href;
    setTimeout(tryInjectPanel, 1000);
  }
});
urlObserver.observe(document.body, { subtree: true, childList: true });

// Initial inject attempt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryInjectPanel, 2000));
} else {
  setTimeout(tryInjectPanel, 2000);
}
