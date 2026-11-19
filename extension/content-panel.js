/**
 * MeetMaxxing Content Script — Injected Side Panel Module
 * Injects a collapsible side panel into Google Meet DOM for Firefox and Chrome.
 *
 * Layout strategy:
 *   We append the panel to <html> (not <body>) so it escapes any Meet overflow containers.
 *   We shift Google Meet's root app container left instead of squishing <body> width,
 *   because Meet uses position:fixed for all chrome and body.width has no visual effect.
 */
"use strict";

const runtimeAPI = typeof browser !== 'undefined' ? browser : chrome;

const MM_PANEL_WIDTH = 380; // px — keep in sync with CSS

// Detect and return Google Meet's root app element to shift
function getMeetRoot() {
  return (
    document.querySelector('div[jscontroller][id="app"]') ||
    document.querySelector('div[data-call-ended]') ||
    document.querySelector('c-wiz[data-view-id]') ||
    document.querySelector('body > div:first-child') ||
    document.body
  );
}

function applyMeetShift(collapsed) {
  const root = getMeetRoot();
  if (!root) return;
  if (collapsed) {
    root.style.transition = 'width 0.4s cubic-bezier(0.2,0,0,1), margin-right 0.4s cubic-bezier(0.2,0,0,1)';
    root.style.width = '';
    root.style.marginRight = '';
  } else {
    root.style.transition = 'width 0.4s cubic-bezier(0.2,0,0,1), margin-right 0.4s cubic-bezier(0.2,0,0,1)';
    root.style.width = `calc(100vw - ${MM_PANEL_WIDTH}px)`;
    root.style.marginRight = `${MM_PANEL_WIDTH}px`;
  }
}

function injectMeetMaxxingPanel() {
  if (document.getElementById('mm-panel-root')) return;

  const panelSrc = runtimeAPI.runtime.getURL('dist/index.html');

  const panel = document.createElement('div');
  panel.id = 'mm-panel-root';
  panel.className = 'mm-panel';

  const toggleTab = document.createElement('button');
  toggleTab.className = 'mm-toggle-tab';
  toggleTab.id = 'mm-toggle-btn';
  toggleTab.setAttribute('aria-label', 'Toggle MeetMaxxing Panel');
  toggleTab.innerHTML = `
    <svg class="mm-toggle-icon" viewBox="0 0 24 24">
      <path id="mm-toggle-path" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
    </svg>
  `;

  const iframe = document.createElement('iframe');
  iframe.id = 'mm-sidebar-iframe';
  iframe.className = 'mm-panel-content';
  iframe.src = panelSrc;
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.setAttribute('frameborder', '0');

  panel.appendChild(toggleTab);
  panel.appendChild(iframe);
  // Append to <html> so it's always on top, outside Meet's root
  document.documentElement.appendChild(panel);

  let isCollapsed = false;
  try {
    isCollapsed = localStorage.getItem('mm_panel_collapsed') === 'true';
  } catch (e) {}

  function applyState(skipAnimation) {
    const pathEl = document.getElementById('mm-toggle-path');
    if (isCollapsed) {
      panel.classList.add('mm-collapsed');
      if (pathEl) pathEl.setAttribute('d', 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z');
      applyMeetShift(true);
    } else {
      panel.classList.remove('mm-collapsed');
      if (pathEl) pathEl.setAttribute('d', 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z');
      applyMeetShift(false);
      if (runtimeAPI?.runtime?.sendMessage) {
        try { runtimeAPI.runtime.sendMessage({ type: 'WAKE_SERVER' }); } catch (e) {}
      }
    }
    try {
      localStorage.setItem('mm_panel_collapsed', String(isCollapsed));
    } catch (e) {}
  }

  toggleTab.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    applyState();
  });

  // Export toggle function BEFORE calling applyState
  window.__mm_togglePanel = (explicitCollapsed) => {
    isCollapsed = explicitCollapsed !== undefined ? Boolean(explicitCollapsed) : !isCollapsed;
    applyState();
  };

  window.__mm_isCollapsed = () => isCollapsed;

  applyState();
}

function tryInjectPanel() {
  const p = window.location.pathname;
  const onMeetCall = p.length > 4
    && !p.startsWith('/landing')
    && !p.startsWith('/home')
    && !p.startsWith('/new')
    && !p.startsWith('/about');

  const panel = document.getElementById('mm-panel-root');

  if (onMeetCall) {
    if (!panel) {
      injectMeetMaxxingPanel();
    } else {
      // Panel exists but might be hidden — restore it
      panel.style.removeProperty('display');
      const collapsed = panel.classList.contains('mm-collapsed');
      applyMeetShift(collapsed);
    }
  } else if (panel) {
    // Not in a call room — hide panel and undo Meet shift
    panel.style.display = 'none';
    applyMeetShift(true);
  }
}

// Message listener — handles toolbar icon clicks routed from background.js
runtimeAPI?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'TOGGLE_PANEL' || msg?.type === 'TOGGLE_PANEL_OPEN') {
    let panel = document.getElementById('mm-panel-root');
    if (!panel) {
      injectMeetMaxxingPanel();
      panel = document.getElementById('mm-panel-root');
    }
    // Ensure panel is visible (not display:none)
    if (panel) panel.style.removeProperty('display');

    if (typeof window.__mm_togglePanel === 'function') {
      window.__mm_togglePanel(msg.type === 'TOGGLE_PANEL_OPEN' ? false : undefined);
    }

    const collapsed = panel?.classList.contains('mm-collapsed') ?? false;
    if (sendResponse) sendResponse({ success: true, collapsed });
    return true;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryInjectPanel, 1500));
} else {
  setTimeout(tryInjectPanel, 1500);
}

Object.assign(window, { injectMeetMaxxingPanel, tryInjectPanel });
