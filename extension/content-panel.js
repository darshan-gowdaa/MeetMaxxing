/**
 * MeetMaxxing Content Script — Injected Side Panel Module
 * Injects a collapsible side panel into Google Meet DOM for Firefox (and Chrome fallback).
 */

"use strict";

const IS_FIREFOX = navigator.userAgent.includes('Firefox');

function injectMeetMaxxingPanel() {
  if (document.getElementById('mm-panel-root')) return;

  const runtimeAPI = typeof browser !== 'undefined' ? browser : chrome;
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
  iframe.setAttribute('allow', 'microphone');
  iframe.style.cssText = 'width:100%;height:100%;border:none;background:transparent;';

  panel.appendChild(toggleTab);
  panel.appendChild(iframe);
  document.documentElement.appendChild(panel);

  let isCollapsed = localStorage.getItem('mm_panel_collapsed') === 'true';

  function applyState() {
    const pathEl = toggleTab.querySelector('#mm-toggle-path');
    if (isCollapsed) {
      panel.classList.add('mm-collapsed');
      if (pathEl) pathEl.setAttribute('d', 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z');
      document.documentElement.classList.remove('mm-panel-open');
      document.documentElement.classList.add('mm-panel-collapsed');
    } else {
      panel.classList.remove('mm-collapsed');
      if (pathEl) pathEl.setAttribute('d', 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z');
      document.documentElement.classList.remove('mm-panel-collapsed');
      document.documentElement.classList.add('mm-panel-open');
      if (runtimeAPI?.runtime?.sendMessage) {
        try { runtimeAPI.runtime.sendMessage({ type: 'WAKE_SERVER' }); } catch (e) {}
      }
    }
    localStorage.setItem('mm_panel_collapsed', String(isCollapsed));
  }

  toggleTab.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    applyState();
  });

  applyState();

  runtimeAPI?.runtime?.onMessage?.addListener((msg) => {
    if (msg.type === 'TOGGLE_PANEL' || msg.type === 'TOGGLE_PANEL_OPEN') {
      isCollapsed = msg.type === 'TOGGLE_PANEL_OPEN' ? false : !isCollapsed;
      applyState();
    }
  });
}

function tryInjectPanel() {
  const p = window.location.pathname;
  const onMeetCall = p.length > 4 && !p.startsWith('/landing') && !p.startsWith('/home') && !p.startsWith('/new') && !p.startsWith('/about');
  const panel = document.getElementById('mm-panel-root');

  if (onMeetCall) {
    if (!panel) {
      const runtimeAPI = typeof browser !== 'undefined' ? browser : chrome;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(tryInjectPanel, 2000));
} else {
  setTimeout(tryInjectPanel, 2000);
}

Object.assign(window, { injectMeetMaxxingPanel, tryInjectPanel });
