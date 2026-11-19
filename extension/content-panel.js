/**
 * MeetMaxxing Content Script — Injected Side Panel Module
 * Injects a collapsible side panel into Google Meet DOM for Firefox and Chrome.
 */
"use strict";

const runtimeAPI = typeof browser !== 'undefined' ? browser : chrome;

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

  panel.appendChild(toggleTab);
  panel.appendChild(iframe);
  document.documentElement.appendChild(panel);

  let isCollapsed = false;
  try {
    isCollapsed = localStorage.getItem('mm_panel_collapsed') === 'true';
  } catch (e) {}

  function applyState() {
    const pathEl = toggleTab.querySelector('#mm-toggle-path');
    if (isCollapsed) {
      panel.classList.add('mm-collapsed');
      if (pathEl) {
        pathEl.setAttribute('d', 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z');
      }
      document.documentElement.classList.remove('mm-panel-open');
      document.documentElement.classList.add('mm-panel-collapsed');
    } else {
      panel.classList.remove('mm-collapsed');
      if (pathEl) {
        pathEl.setAttribute('d', 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z');
      }
      document.documentElement.classList.remove('mm-panel-collapsed');
      document.documentElement.classList.add('mm-panel-open');
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

  window.__mm_togglePanel = (explicitCollapsed) => {
    isCollapsed = explicitCollapsed !== undefined ? explicitCollapsed : !isCollapsed;
    applyState();
  };

  applyState();
}

function tryInjectPanel() {
  const p = window.location.pathname;
  const onMeetCall = p.length > 4 && !p.startsWith('/landing') && !p.startsWith('/home') && !p.startsWith('/new') && !p.startsWith('/about');
  const panel = document.getElementById('mm-panel-root');

  if (onMeetCall) {
    if (!panel) {
      injectMeetMaxxingPanel();
    } else {
      panel.style.display = 'flex';
      const isCollapsed = panel.classList.contains('mm-collapsed');
      document.documentElement.classList.toggle('mm-panel-open', !isCollapsed);
      document.documentElement.classList.toggle('mm-panel-collapsed', isCollapsed);
    }
  } else if (panel) {
    panel.style.display = 'none';
    document.documentElement.classList.remove('mm-panel-open');
    document.documentElement.classList.remove('mm-panel-collapsed');
  }
}

// Global listener for action click so clicking extension icon instantly toggles sidebar
runtimeAPI?.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'TOGGLE_PANEL' || msg?.type === 'TOGGLE_PANEL_OPEN') {
    let panel = document.getElementById('mm-panel-root');
    if (!panel) {
      injectMeetMaxxingPanel();
      panel = document.getElementById('mm-panel-root');
    }
    if (panel) {
      panel.style.display = 'flex';
    }
    if (typeof window.__mm_togglePanel === 'function') {
      window.__mm_togglePanel(msg.type === 'TOGGLE_PANEL_OPEN' ? false : undefined);
    }
    const isNowCollapsed = panel?.classList.contains('mm-collapsed');
    if (sendResponse) sendResponse({ success: true, collapsed: isNowCollapsed });
    return true;
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryInjectPanel, 1500));
} else {
  setTimeout(tryInjectPanel, 1500);
}

Object.assign(window, { injectMeetMaxxingPanel, tryInjectPanel });
