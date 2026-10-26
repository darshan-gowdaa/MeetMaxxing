/**
 * MeetMaxxing Content Script — Caption Scraper & Utterance Tracker
 */
"use strict";

const SILENCE_MS = 1200, MAX_CHARS = 200, DEDUP_TTL = 3500;
var captionObserver = null, targetedContainerObserver = null, scanDebounce = null;
const utteranceMap = new Map(), recentSent = new Map(), lastSentText = new Map(), speakerHistory = new Map();

const TEXT_SELECTORS = ['.ygicle', '.VbkSUe', '[jsname="tgaKEf"]', '[jsname="YSxPC"]', '[jsname="bltWBb"]', '[jsname="V67aGc"]', '.nMS8Ac', '.CNusmb span', '.CNusmb', '.TBMuR [jsname="tgaKEf"]', '.iOglke [jsname="tgaKEf"]', '[role="region"][aria-label*="Caption" i] span', '[role="region"][aria-label*="caption" i] span'];
const SPEAKER_SELECTORS = ['.NWpY1d', '.KcIKyf', '[jsname="r4nke"]', '[jsname="RDVNB"]', '.zs7s8d', '.KF4T6b', '[data-sender-name]', '[data-self-name]', '.TBMuR .zs7s8d', '.iOglke .zs7s8d'];
const CONTAINER_SELECTORS = ['.vNKgIf.UDinHf', '[jscontroller="KPn5nb"]', '[jsname="dsyhDe"]', '[jsname="jTNmtb"]', '[role="region"][aria-label*="Caption" i]', '[role="region"][aria-label*="caption" i]', '.iOglke', '.TBMuR'];

const TEXT_QUERY = TEXT_SELECTORS.join(', '), SPEAKER_QUERY = SPEAKER_SELECTORS.join(', '), CONTAINER_QUERY = CONTAINER_SELECTORS.join(', ');

const IGNORE_PHRASES = [
  "Speakers (", "Microphone (", "Microphone Array", "Smart Sound Technology", "Digital Microphones", "Intel Smart Sound", "Realtek", "Turn on captions", "You're muted", "joined the meeting", "left the meeting", "Pin to your screen", "More options", "Visual effects", "Send a message", "People (", "Activity", "Host controls", "Raise hand", "Present now", "Leave call", "Check your audio", "Switch camera", "Apply visual effects", "Report a problem", "Settings", "Troubleshooting", "mic_none", "mic_off", "videocam_off", "volume_up", "volume_off", "closed_caption", "Captions (CC)", "Share screen", "Open queue", "Meeting details", "Audio device", "Speaker Array", "Communication", "Default - ", "Communications - ", "System Audio", "Jump to the bottom", "arrow_downward", "format_size", "circle", "language"
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
  return clean.includes("(") && (clean.includes("Audio") || clean.includes("Microphone") || clean.includes("Speaker") || clean.includes("Intel") || clean.includes("USB") || clean.includes("Bluetooth"));
}

function cleanCaptionText(raw) {
  if (!raw) return "";
  let text = raw.replace(/arrow_downward\s*Jump to the bottom/gi, "").replace(/Jump to the bottom/gi, "").replace(/arrow_downward/gi, "").replace(/keyboard_arrow_down/gi, "").trim();
  if (/^You([A-Z])/.test(text)) text = text.replace(/^You([A-Z])/, "$1");
  else if (/^You\s+/.test(text)) text = text.replace(/^You\s+/, "");
  return text.trim();
}

function isCleanCaption(text) {
  return !(!text || text.length < 2 || isIgnorePhrase(text));
}

function findSpeaker(textEl) {
  if (!textEl) return "Participant";
  let sib = textEl.previousElementSibling;
  for (let i = 0; i < 6 && sib; i++, sib = sib.previousElementSibling) {
    const s = sib.matches(SPEAKER_QUERY) ? sib : sib.querySelector(SPEAKER_QUERY);
    const name = s?.textContent?.trim();
    if (name && name.length < 50 && !isIgnorePhrase(name)) return name;
  }
  let node = textEl.parentElement;
  for (let i = 0; i < 8 && node && node !== document.body; i++, node = node.parentElement) {
    if (node.dataset?.senderName && !isIgnorePhrase(node.dataset.senderName)) return node.dataset.senderName;
    if (node.dataset?.selfName && !isIgnorePhrase(node.dataset.selfName)) return node.dataset.selfName;
    const s = node.querySelector(SPEAKER_QUERY);
    const name = s?.textContent?.trim();
    if (s && s !== textEl && !textEl.contains(s) && name && name.length < 50 && !isIgnorePhrase(name) && !name.includes(textEl.textContent?.trim())) return name;
    const aria = node.getAttribute("aria-label") || "";
    if (aria.startsWith("Caption from ")) return aria.replace("Caption from ", "").trim();
  }
  const container = textEl.closest(CONTAINER_QUERY);
  if (container) {
    const s = container.querySelector(SPEAKER_QUERY);
    const name = s?.textContent?.trim();
    if (s && s !== textEl && !textEl.contains(s) && name && name.length < 50 && !isIgnorePhrase(name)) return name;
  }
  return "You";
}

function extractUnrepeatedText(speaker, newText) {
  if (!newText) return "";
  const history = speakerHistory.get(speaker) || [];
  const now = Date.now();
  const validHistory = history.filter(h => now - h.timestamp < 5000);
  speakerHistory.set(speaker, validHistory);
  const recentSentText = validHistory.map(h => h.text).join(" ");
  if (!recentSentText) return newText;
  if (recentSentText.includes(newText)) return "";

  const oldWords = recentSentText.split(/\s+/), newWords = newText.split(/\s+/);
  let maxOverlap = 0;
  const minLen = Math.min(oldWords.length, newWords.length);
  for (let i = 1; i <= minLen; i++) {
    let match = true;
    for (let j = 0; j < i; j++) {
      const w1 = oldWords[oldWords.length - i + j].toLowerCase().replace(/[^a-z0-9]/g, "");
      const w2 = newWords[j].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (w1 !== w2) { match = false; break; }
    }
    if (match) maxOverlap = i;
  }
  return maxOverlap > 0 ? newWords.slice(maxOverlap).join(" ") : newText;
}

function safeSendMessage(msg, callback) {
  if (!chrome?.runtime?.id) return false;
  try {
    chrome.runtime.sendMessage(msg, (resp) => {
      let _ = chrome.runtime.lastError;
      if (callback) callback(resp);
    });
    return true;
  } catch (err) { return false; }
}

function flushUtterance(speaker) {
  const entry = utteranceMap.get(speaker);
  if (!entry) return;
  clearTimeout(entry.timer);
  utteranceMap.delete(speaker);

  const text = cleanCaptionText(entry.text);
  if (!isCleanCaption(text)) return;
  const now = Date.now();
  if (lastSentText.get(speaker) === text) return;

  const diffText = extractUnrepeatedText(speaker, text);
  if (!diffText || diffText.length < 2) { lastSentText.set(speaker, text); return; }
  const diffKey = `${speaker}||${diffText}`;
  const last = recentSent.get(diffKey);
  if (last && now - last < DEDUP_TTL) return;

  for (const [k, t] of recentSent.entries()) {
    if (now - t > DEDUP_TTL) recentSent.delete(k);
  }
  recentSent.set(diffKey, now);
  lastSentText.set(speaker, text);

  const hist = speakerHistory.get(speaker) || [];
  hist.push({ text: diffText, timestamp: now });
  speakerHistory.set(speaker, hist);

  const curMeetingId = window.meetingId || (typeof meetingId !== "undefined" ? meetingId : null);
  const curStartTime = window.meetingStartTime || (typeof meetingStartTime !== "undefined" ? meetingStartTime : now);
  const sent = safeSendMessage({
    type: "INGEST_CHUNK",
    meetingId: curMeetingId,
    chunk: { speaker, text: diffText, timestamp: now, timestamp_ms: now - curStartTime, platform: "google_meet", source: "dom" },
  });
  if (sent) console.log(`[MeetMaxxing] Utterance -> ${speaker}: "${diffText.slice(0, 80)}"`);
}

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
  if (existing) {
    clearTimeout(existing.timer);
    existing.text = text;
    existing.timer = setTimeout(() => flushUtterance(speaker), SILENCE_MS);
  } else {
    utteranceMap.set(speaker, { text, timer: setTimeout(() => flushUtterance(speaker), SILENCE_MS) });
  }
}

function scanCaptions() {
  const containers = document.querySelectorAll(CONTAINER_QUERY);
  for (const c of containers) {
    if (c.closest('.rHGeGc-aPP78e, button, [role="menu"], [role="dialog"], [role="listbox"]')) continue;
    const utteranceBlocks = c.querySelectorAll('.nMcdL, .bj4p3b');
    let foundBlocks = false;
    for (const u of utteranceBlocks) {
      if (u.closest('.IMKgW, .GvZY2, button, .VfPpkd-PtP14e')) continue;
      const sEl = u.querySelector(SPEAKER_QUERY);
      const speaker = sEl?.textContent?.trim() || findSpeaker(u) || "You";
      const tEl = u.querySelector(TEXT_QUERY);
      const rawText = (tEl || u).textContent;
      if (rawText?.trim()) { trackUtterance(speaker, rawText); foundBlocks = true; }
    }
    if (!foundBlocks) {
      const textEls = c.querySelectorAll(TEXT_QUERY);
      for (const t of textEls) {
        if (t.closest('.IMKgW, .GvZY2, button, .VfPpkd-PtP14e, [role="menu"]')) continue;
        const rawText = t.textContent;
        if (rawText?.trim()) trackUtterance(findSpeaker(t) || "You", rawText);
      }
    }
  }
}

function checkRemovedForFlush(mutations) {
  for (const m of mutations) {
    if (m.type !== "childList") continue;
    for (const removed of m.removedNodes) {
      if (!(removed instanceof Element)) continue;
      if (removed.matches?.('.nMcdL, .bj4p3b')) {
        const sEl = removed.querySelector('.NWpY1d, .KcIKyf, [jsname="r4nke"], .zs7s8d');
        const speaker = sEl?.textContent?.trim();
        if (speaker) flushUtterance(speaker);
        else for (const sp of [...utteranceMap.keys()]) flushUtterance(sp);
      }
    }
  }
}

function onMutation(mutations) {
  checkRemovedForFlush(mutations);
  clearTimeout(scanDebounce);
  scanDebounce = setTimeout(scanCaptions, 200);
}

function attachTargetedCaptionObserver() {
  const container = document.querySelector(CONTAINER_QUERY);
  if (!container || container === targetedContainerObserver?.target) return;
  if (targetedContainerObserver) { try { targetedContainerObserver.disconnect(); } catch (e) {} }
  targetedContainerObserver = new MutationObserver(onMutation);
  targetedContainerObserver.observe(container, { subtree: true, childList: true, characterData: true });
  targetedContainerObserver.target = container;
  console.log("[MeetMaxxing] Attached targeted caption container observer");
}

function startCaptionObserver() {
  stopCaptionObserver();
  if (document.body) {
    captionObserver = new MutationObserver((mutations) => {
      attachTargetedCaptionObserver();
      onMutation(mutations);
    });
    captionObserver.observe(document.body, { subtree: true, childList: true });
    attachTargetedCaptionObserver();
    console.log("[MeetMaxxing] Body childList observer active");
  }
  scanCaptions();
}

function stopCaptionObserver() {
  clearTimeout(scanDebounce);
  for (const sp of [...utteranceMap.keys()]) flushUtterance(sp);
  if (captionObserver) { try { captionObserver.disconnect(); } catch (e) {} captionObserver = null; }
  if (targetedContainerObserver) { try { targetedContainerObserver.disconnect(); } catch (e) {} targetedContainerObserver = null; }
}

function isCaptionObserverActive() {
  return !!captionObserver;
}

Object.assign(window, {
  findSpeaker, isIgnorePhrase, cleanCaptionText, isCleanCaption, extractUnrepeatedText,
  safeSendMessage, flushUtterance, trackUtterance, scanCaptions, checkRemovedForFlush,
  attachTargetedCaptionObserver, startCaptionObserver, stopCaptionObserver, isCaptionObserverActive, utteranceMap
});
