/**
 * MeetMaxxing Content Script — UI Module
 * Handles Consent Banner, Captions Visibility Toggle, and Auto-CC enablement.
 */

"use strict";

var consentGiven = (typeof localStorage !== "undefined" && localStorage.getItem("mm_consent_granted") === "true");
var hideCaptionsStyle = null;
var visibilityAttachInterval = null;
var autoCcInterval = null;

function isConsentGiven() {
  if (!consentGiven && typeof localStorage !== "undefined") {
    consentGiven = localStorage.getItem("mm_consent_granted") === "true";
  }
  return consentGiven;
}

function showConsentUI(onAccept) {
  if (isConsentGiven() || document.getElementById("meetmaxxing-consent-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "meetmaxxing-consent-overlay";
  overlay.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 999999;
    font-family: 'Inter', 'Google Sans', system-ui, sans-serif;
    animation: mm-slide-up 0.3s cubic-bezier(0, 0, 0.2, 1);
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #1e1f20; border: 1px solid rgba(227, 227, 227, 0.16);
    border-radius: 24px; padding: 22px; width: 330px;
    box-shadow: 0 16px 36px rgba(0,0,0,0.5); text-align: left;
    color: #e3e3e3;
  `;

  modal.innerHTML = `
    <style>
      @keyframes mm-slide-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .mm-btn { padding: 9px 18px; border-radius: 99px; font-weight: 700; font-size: 13px; cursor: pointer; border: none; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      .mm-btn-primary { background: #a8c7fa; color: #0842a0; }
      .mm-btn-primary:hover { background: #d3e3fd; transform: translateY(-1px); }
      .mm-btn-primary:active { transform: scale(0.97); }
      .mm-btn-secondary { background: transparent; color: #a8c7fa; border: 1px solid rgba(168, 199, 250, 0.3); }
      .mm-btn-secondary:hover { background: rgba(168, 199, 250, 0.08); }
    </style>
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
      <div style="width: 36px; height: 36px; background: #0842a0; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#a8c7fa"><path d="M11 2L11.5 5.51869C11.8906 8.26786 14.1039 10.3708 16.8687 10.6382L20.5 10.9893L16.8687 11.3404C14.1039 11.6078 11.8906 13.7107 11.5 16.4599L11 19.9786L10.5 16.4599C10.1094 13.7107 7.8961 11.6078 5.13134 11.3404L1.5 10.9893L5.13134 10.6382C7.8961 10.3708 10.1094 8.26786 10.5 5.51869L11 2Z"></path></svg>
      </div>
      <div>
        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #fff;">MeetMaxxing AI</h3>
        <span style="font-size: 11px; color: #a8c7fa;">AI Meeting Copilot</span>
      </div>
    </div>
    <p style="margin: 0 0 16px; font-size: 12px; line-height: 1.5; color: #c4c7c5;">
      Transcribes live captions during this call to provide real-time suggestions and executive recaps.
    </p>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="mm-decline-btn" class="mm-btn mm-btn-secondary">Decline</button>
      <button id="mm-accept-btn" class="mm-btn mm-btn-primary">Allow & Start</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById("mm-accept-btn")?.addEventListener("click", () => {
    overlay.remove();
    consentGiven = true;
    window.consentGiven = true;
    try { localStorage.setItem("mm_consent_granted", "true"); } catch (e) {}
    if (typeof safeSendMessage === "function") safeSendMessage({ type: "ENSURE_SIDE_PANEL_OPEN" });
    if (onAccept) onAccept();
  });

  document.getElementById("mm-decline-btn")?.addEventListener("click", () => {
    overlay.remove();
    console.log("[MeetMaxxing] Consent declined. Extension inactive.");
  });
}

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
    background: #3c4043; color: #e8eaed; width: 40px; height: 40px;
    border-radius: 100px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: none; margin: 0 4px;
    transition: background 0.2s; flex-shrink: 0;
  `;

  const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c5.392 0 9.878 3.88 10.819 9-.94 5.12-5.427 9-10.819 9-5.392 0-9.878-3.88-10.819-9C2.121 6.88 6.608 3 12 3zm0 16a9.005 9.005 0 0 0 8.777-7A9.005 9.005 0 0 0 12 5a9.005 9.005 0 0 0-8.777 7A9.005 9.005 0 0 0 12 19zm0-2a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path></svg>`;
  const eyeCloseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.94 6.088c.348-.057.708-.088 1.06-.088 5.392 0 9.878 3.88 10.819 9-.263 1.43-.876 2.733-1.723 3.84l-1.446-1.445a9.006 9.006 0 0 0 1.15-2.395A9.005 9.005 0 0 0 12 5c-.476 0-.94.037-1.393.107l.333 1.011zm9.645 15.427-1.414 1.414-3.791-3.79a11.196 11.196 0 0 1-3.38.261c-5.392 0-9.878-3.88-10.819-9a10.966 10.966 0 0 1 2.37-4.47l-2.228-2.228 1.414-1.414 17.848 17.848zM4.654 7.483A9.013 9.013 0 0 0 3.223 12a9.005 9.005 0 0 0 8.777 7c.803 0 1.58-.105 2.316-.304L12.52 16.9a5 5 0 0 1-5.421-5.42L4.654 7.483zM14 12a2 2 0 0 1-2 2l-1.748-1.748c.046-.732.616-1.302 1.348-1.348L14 12.001zM11.95 7a5 5 0 0 1 4.95 4.95l-1.921-1.921A3.003 3.003 0 0 0 11.95 7z"></path></svg>`;

  if (!hideCaptionsStyle) toggleHideCaptions();
  const parser = new DOMParser();
  const openIcon = parser.parseFromString(eyeOpenSvg, "image/svg+xml").documentElement;
  const closeIcon = parser.parseFromString(eyeCloseSvg, "image/svg+xml").documentElement;

  btn.replaceChildren(closeIcon.cloneNode(true));
  btn.title = "Captions Hidden (MeetMaxxing)";
  btn.style.background = "#ea4335";
  btn.style.color = "#fff";

  btn.onmouseover = () => { if (!hideCaptionsStyle) btn.style.background = "#4d5156"; };
  btn.onmouseout = () => { if (!hideCaptionsStyle) btn.style.background = "#3c4043"; };

  btn.onclick = () => {
    toggleHideCaptions();
    if (hideCaptionsStyle) {
      btn.replaceChildren(closeIcon.cloneNode(true));
      btn.style.background = "#ea4335";
      btn.style.color = "#fff";
      btn.title = "Captions Hidden (MeetMaxxing)";
    } else {
      btn.replaceChildren(openIcon.cloneNode(true));
      btn.style.background = "#3c4043";
      btn.style.color = "#e8eaed";
      btn.title = "Captions Visible (MeetMaxxing)";
    }
  };

  if (visibilityAttachInterval) clearInterval(visibilityAttachInterval);
  visibilityAttachInterval = setInterval(() => {
    let ccBtn = document.querySelector('.UTNHae') || document.querySelector('button[aria-label*="caption" i], button[data-tooltip*="caption" i]');
    if (ccBtn) {
      const wrapper = ccBtn.closest('.UTNHae') || ccBtn.parentElement;
      if (wrapper && wrapper.parentElement) {
        if (!document.getElementById("mm-caption-visibility-btn")) {
          wrapper.parentElement.insertBefore(btn, wrapper.nextSibling);
        }
        clearInterval(visibilityAttachInterval);
        visibilityAttachInterval = null;
      }
    }
  }, 2000);
}

function autoEnableCC() {
  if (autoCcInterval) { clearInterval(autoCcInterval); autoCcInterval = null; }
  let attempts = 0;
  autoCcInterval = setInterval(() => {
    attempts++;
    const ccBtns = document.querySelectorAll('button[aria-label*="caption" i], button[data-tooltip*="caption" i]');
    for (const btn of ccBtns) {
      const isPressed = btn.getAttribute("aria-pressed") === "true" || btn.classList.contains("VfPpkd-Bz112c-LgbsSe-OWXEXe-INsBxf");
      const label = btn.getAttribute("aria-label") || btn.getAttribute("data-tooltip") || "";
      if (!isPressed && label.toLowerCase().includes("turn on")) {
        btn.click();
        console.log("[MeetMaxxing] Auto-enabled CC.");
        clearInterval(autoCcInterval);
        autoCcInterval = null;
        return;
      } else if (isPressed || label.toLowerCase().includes("turn off")) {
        console.log("[MeetMaxxing] CC already enabled.");
        clearInterval(autoCcInterval);
        autoCcInterval = null;
        return;
      }
    }
    if (attempts >= 15) {
      clearInterval(autoCcInterval);
      autoCcInterval = null;
      console.log("[MeetMaxxing] Gave up trying to auto-enable CC after 15 seconds.");
    }
  }, 1000);
}

function cleanupUI() {
  if (visibilityAttachInterval) { clearInterval(visibilityAttachInterval); visibilityAttachInterval = null; }
  if (autoCcInterval) { clearInterval(autoCcInterval); autoCcInterval = null; }
  const toggleBtn = document.getElementById("mm-caption-visibility-btn");
  if (toggleBtn) toggleBtn.remove();
  if (hideCaptionsStyle) {
    hideCaptionsStyle.remove();
    hideCaptionsStyle = null;
  }
}

Object.assign(window, {
  isConsentGiven, showConsentUI, toggleHideCaptions,
  injectVisibilityButton, autoEnableCC, cleanupUI
});
