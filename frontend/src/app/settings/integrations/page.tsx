"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  RiGoogleLine, 
  RiCalendarLine, 
  RiVideoChatLine, 
  RiVidiconLine, 
  RiSlackLine, 
  RiNotionLine, 
  RiCheckLine, 
  RiExternalLinkLine, 
  RiRefreshLine,
  RiLinkM,
  RiSendPlaneLine,
  RiSaveLine
} from "@remixicon/react";

import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

export default function IntegrationsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();

  // Google Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);

  // Zoom state
  const [zoomWebhook, setZoomWebhook] = useState("");
  const [zoomSaving, setZoomSaving] = useState(false);

  // Slack state
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackTesting, setSlackTesting] = useState(false);

  // Notion state
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [notionSaving, setNotionSaving] = useState(false);

  const fetchCalendarStatus = useCallback(async () => {
    if (!token) {
      setCalendarLoading(false);
      return;
    }
    setCalendarLoading(true);
    try {
      // Check calendar status endpoint
      const res = await fetch(`${API_URL}/api/calendar/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarConnected(Boolean(data.connected));
      } else {
        // Fallback endpoint without /api
        const fallbackRes = await fetch(`${API_URL}/calendar/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setCalendarConnected(Boolean(data.connected));
        } else {
          setCalendarConnected(false);
        }
      }
    } catch {
      setCalendarConnected(false);
    } finally {
      setCalendarLoading(false);
    }
  }, [token]);

  // Load saved integration configurations
  useEffect(() => {
    fetchCalendarStatus();

    // Load persisted local integration settings
    const storedZoom = localStorage.getItem("meetmaxxing_zoom_webhook") || "";
    const storedSlack = localStorage.getItem("meetmaxxing_slack_webhook") || "";
    const storedNotionKey = localStorage.getItem("meetmaxxing_notion_key") || "";
    const storedNotionDb = localStorage.getItem("meetmaxxing_notion_db") || "";
    setZoomWebhook(storedZoom);
    setSlackWebhook(storedSlack);
    setNotionApiKey(storedNotionKey);
    setNotionDbId(storedNotionDb);

    // Also check backend settings
    if (token) {
      fetch(`${API_URL}/api/settings/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const intg = data.notifications?.integrations || {};
          if (intg.zoom_webhook) setZoomWebhook(intg.zoom_webhook);
          if (intg.slack_webhook) setSlackWebhook(intg.slack_webhook);
          if (intg.notion_api_key) setNotionApiKey(intg.notion_api_key);
          if (intg.notion_database_id) setNotionDbId(intg.notion_database_id);
        })
        .catch(() => {});
    }
  }, [token, fetchCalendarStatus]);

  const handleConnectCalendar = async () => {
    if (!token) {
      showMessage("Please log in to connect Google Calendar", { variant: "error" });
      return;
    }
    setCalendarActionLoading(true);
    try {
      let res = await fetch(`${API_URL}/api/calendar/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // Fallback to /calendar/connect
        res = await fetch(`${API_URL}/calendar/connect`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      }
      const err = await res.json().catch(() => ({ detail: "Failed to generate auth URL" }));
      showMessage(err.detail || "Google OAuth not configured on backend", { variant: "error" });
    } catch {
      showMessage("Failed to connect Google Calendar", { variant: "error" });
    } finally {
      setCalendarActionLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!token) return;
    setCalendarActionLoading(true);
    try {
      let res = await fetch(`${API_URL}/api/calendar/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}/calendar/disconnect`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      if (res.ok) {
        setCalendarConnected(false);
        showMessage("Google Calendar disconnected", { variant: "success" });
      } else {
        showMessage("Failed to disconnect calendar", { variant: "error" });
      }
    } catch {
      showMessage("Error disconnecting calendar", { variant: "error" });
    } finally {
      setCalendarActionLoading(false);
    }
  };

  const handleSaveZoom = async () => {
    setZoomSaving(true);
    localStorage.setItem("meetmaxxing_zoom_webhook", zoomWebhook);
    if (token) {
      try {
        await fetch(`${API_URL}/api/settings/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            notifications: { integrations: { zoom_webhook: zoomWebhook } }
          })
        });
      } catch {}
    }
    setZoomSaving(false);
    showMessage("Zoom settings saved", { variant: "success" });
  };

  const handleSaveSlack = async () => {
    setSlackSaving(true);
    localStorage.setItem("meetmaxxing_slack_webhook", slackWebhook);
    if (token) {
      try {
        await fetch(`${API_URL}/api/settings/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            notifications: { integrations: { slack_webhook: slackWebhook } }
          })
        });
      } catch {}
    }
    setSlackSaving(false);
    showMessage("Slack webhook saved", { variant: "success" });
  };

  const handleTestSlack = async () => {
    if (!slackWebhook) {
      showMessage("Please enter a Slack Webhook URL first", { variant: "error" });
      return;
    }
    setSlackTesting(true);
    try {
      await fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "🚀 *MeetMaxxing* integration test: Webhook connection successful!"
        }),
        mode: "no-cors"
      });
      // no-cors returns opaque status 0
      showMessage("Slack test message sent!", { variant: "success" });
    } catch {
      showMessage("Could not deliver to Slack webhook. Check URL.", { variant: "error" });
    } finally {
      setSlackTesting(false);
    }
  };

  const handleSaveNotion = async () => {
    setNotionSaving(true);
    localStorage.setItem("meetmaxxing_notion_key", notionApiKey);
    localStorage.setItem("meetmaxxing_notion_db", notionDbId);
    if (token) {
      try {
        await fetch(`${API_URL}/api/settings/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            notifications: {
              integrations: {
                notion_api_key: notionApiKey,
                notion_database_id: notionDbId
              }
            }
          })
        });
      } catch {}
    }
    setNotionSaving(false);
    showMessage("Notion credentials saved", { variant: "success" });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-4xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
          Integrations Hub
        </h1>
        <p className="text-sm text-text-muted">
          Connect your calendar, meeting platforms, and team workspaces for automated recaps and scheduling.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6">
        {/* 1. Google Calendar Integration */}
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 hover:bg-surface-container/80 transition-all duration-300 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <RiCalendarLine className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-text">Google Calendar</h2>
                {calendarLoading ? (
                  <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold animate-pulse">
                    Checking…
                  </span>
                ) : calendarConnected ? (
                  <span className="bg-success-container text-on-success-container rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5">
                    <RiCheckLine className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Bi-directional sync for event conflict detection, follow-up meeting creation, and automated invites.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {calendarConnected ? (
              <button
                type="button"
                onClick={handleDisconnectCalendar}
                disabled={calendarActionLoading}
                className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform border border-risk/30 text-risk hover:bg-risk/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {calendarActionLoading ? <Md3LoadingIndicator size="sm" className="text-risk" /> : null}
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectCalendar}
                disabled={calendarActionLoading || calendarLoading}
                className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-primary text-on-primary hover:brightness-110 shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {calendarActionLoading ? (
                  <Md3LoadingIndicator size="sm" className="text-on-primary" />
                ) : (
                  <RiGoogleLine className="w-4 h-4" />
                )}
                Connect Calendar
              </button>
            )}
            <button
              type="button"
              onClick={fetchCalendarStatus}
              title="Refresh status"
              disabled={calendarLoading}
              className="p-3 rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <RiRefreshLine className={`w-4 h-4 ${calendarLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Google Meet Integration */}
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 hover:bg-surface-container/80 transition-all duration-300 shadow-none flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <RiVideoChatLine className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-text">Google Meet</h2>
                <span className="bg-success-container text-on-success-container rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5">
                  <RiCheckLine className="w-3.5 h-3.5" /> Built-in / Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Native real-time audio caption extraction, memory suggestions, and live meeting assist directly in Meet tabs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <a
              href="https://meet.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-text inline-flex items-center gap-1.5"
            >
              Open Google Meet <RiExternalLinkLine className="w-3.5 h-3.5 text-text-muted" />
            </a>
          </div>
        </div>

        {/* 3. Zoom Integration */}
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 hover:bg-surface-container/80 transition-all duration-300 shadow-none flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <RiVidiconLine className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-text">Zoom</h2>
                  {zoomWebhook ? (
                    <span className="bg-success-container text-on-success-container rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5">
                      <RiCheckLine className="w-3.5 h-3.5" /> Configured
                    </span>
                  ) : (
                    <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold">
                      Webhook / OAuth
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-text-muted">
                  Ingest recording transcripts via Zoom Marketplace webhook or server-to-server OAuth.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1 flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="Zoom Webhook Endpoint / Secret URL"
              value={zoomWebhook}
              onChange={e => setZoomWebhook(e.target.value)}
              className="flex-1 bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={handleSaveZoom}
              disabled={zoomSaving}
              className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-text flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {zoomSaving ? <Md3LoadingIndicator size="sm" className="text-text" /> : <RiSaveLine className="w-4 h-4 text-primary" />}
              Save Zoom
            </button>
          </div>
        </div>

        {/* 4. Slack Integration */}
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 hover:bg-surface-container/80 transition-all duration-300 shadow-none flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <RiSlackLine className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-text">Slack</h2>
                  {slackWebhook ? (
                    <span className="bg-success-container text-on-success-container rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5">
                      <RiCheckLine className="w-3.5 h-3.5" /> Webhook Active
                    </span>
                  ) : (
                    <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold">
                      Incoming Webhook
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-text-muted">
                  Automatically broadcast post-meeting executive summaries and action items into dedicated Slack channels.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1 flex flex-col sm:flex-row gap-2.5">
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T00/B00/XXXXX"
              value={slackWebhook}
              onChange={e => setSlackWebhook(e.target.value)}
              className="flex-1 bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted font-mono"
            />
            <button
              type="button"
              onClick={handleTestSlack}
              disabled={slackTesting || !slackWebhook}
              className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-text flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {slackTesting ? <Md3LoadingIndicator size="sm" className="text-text" /> : <RiSendPlaneLine className="w-4 h-4 text-primary" />}
              Test
            </button>
            <button
              type="button"
              onClick={handleSaveSlack}
              disabled={slackSaving}
              className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-primary text-on-primary hover:brightness-110 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {slackSaving ? <Md3LoadingIndicator size="sm" className="text-on-primary" /> : <RiSaveLine className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {/* 5. Notion Integration */}
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 hover:bg-surface-container/80 transition-all duration-300 shadow-none flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <RiNotionLine className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-text">Notion</h2>
                  {notionApiKey ? (
                    <span className="bg-success-container text-on-success-container rounded-full px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5">
                      <RiCheckLine className="w-3.5 h-3.5" /> Workspace Ready
                    </span>
                  ) : (
                    <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold">
                      Workspace Export
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-text-muted">
                  Export formatted meeting notes, key decisions, and tracked tasks to your team Notion databases.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1 flex flex-col gap-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="password"
                placeholder="Notion Internal Integration Token (secret_...)"
                value={notionApiKey}
                onChange={e => setNotionApiKey(e.target.value)}
                className="bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted font-mono"
              />
              <input
                type="text"
                placeholder="Database ID (32-character string)"
                value={notionDbId}
                onChange={e => setNotionDbId(e.target.value)}
                className="bg-surface-container-high/60 border border-outline-variant/40 rounded-[20px] px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-muted font-mono"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotion}
                disabled={notionSaving}
                className="rounded-full px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-transform bg-primary text-on-primary hover:brightness-110 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {notionSaving ? <Md3LoadingIndicator size="sm" className="text-on-primary" /> : <RiLinkM className="w-4 h-4" />}
                Save Notion Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
