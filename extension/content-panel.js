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
  iframe.className = 'mm-iframe';
  iframe.src = panelSrc;
  iframe.setAttribute('allow', 'clipboard-write');

  panel.appendChild(toggleTab);
  panel.appendChild(iframe);
  document.body.appendChild(panel);

  let isCollapsed = false;

  function applyState() {
    panel.classList.toggle('collapsed', isCollapsed);
    const path = toggleTab.querySelector('#mm-toggle-path');
    if (path) {
      path.setAttribute(
        'd',
        isCollapsed
          ? 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z'
          : 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'
      );
    }
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
      if (runtimeAPI?.runtime?.sendMessage) {
        try { runtimeAPI.runtime.sendMessage({ type: 'WAKE_SERVER' }); } catch (e) {}
      }
      injectMeetMaxxingPanel();
    } else {
      panel.style.display = 'block';
    }
  } else if (panel) {
    panel.style.display = 'none';
  }
}

// Global listener for action click so clicking icon instantly toggles panel even before 2s delay
runtimeAPI?.runtime?.onMessage?.addListener((msg) => {
  if (msg?.type === 'TOGGLE_PANEL' || msg?.type === 'TOGGLE_PANEL_OPEN') {
    if (!document.getElementById('mm-panel-root')) {
      tryInjectPanel();
    }
    if (typeof window.__mm_togglePanel === 'function') {
      window.__mm_togglePanel(msg.type === 'TOGGLE_PANEL_OPEN' ? false : undefined);
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryInjectPanel, 2000));
} else {
  setTimeout(tryInjectPanel, 2000);
}

Object.assign(window, { injectMeetMaxxingPanel, tryInjectPanel });
