"use client";

import { useState, useEffect, useCallback } from "react";
import { 
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

/** Official 4-color Google Calendar logo (Blue/Green/Yellow/Red calendar icon with "31") */
function GoogleCalendarLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Google Calendar logo">
      {/* White background base plate */}
      <path d="M390.736 121.264H121.264V390.736H390.736V121.264Z" fill="white" />
      {/* Red corner fold (Bottom Right) */}
      <path d="M390.736 512L512 390.736L451.368 380.392L390.736 390.736L379.67 446.196L390.736 512Z" fill="#EA4335" />
      {/* Green corner fold (Bottom Left) */}
      <path d="M0 390.736V471.578C0 493.912 18.088 512 40.42 512H121.264L133.714 451.368L121.264 390.736L55.198 380.392L0 390.736Z" fill="#188038" />
      {/* Blue corner fold (Top Right) */}
      <path d="M512 121.264V40.42C512 18.088 493.912 0 471.58 0H390.736C383.36 30.072 379.671 52.2027 379.67 66.392C379.67 80.58 383.359 98.8707 390.736 121.264C417.556 128.944 437.767 132.784 451.368 132.784C464.969 132.784 485.18 128.945 512 121.264Z" fill="#1967D2" />
      {/* Yellow quadrant (Mid-Right) */}
      <path d="M512 121.264H390.736V390.736H512V121.264Z" fill="#FBBC04" />
      {/* Green quadrant (Bottom-Center) */}
      <path d="M390.736 390.736H121.264V512H390.736V390.736Z" fill="#34A853" />
      {/* Blue main/top-left block */}
      <path d="M390.736 0H40.422C18.088 0 0 18.088 0 40.42V390.736H121.264V121.264H390.736V0Z" fill="#4285F4" />
      {/* Number "3" and "1" Paths in Google Blue */}
      <path d="M176.54 330.308C166.468 323.504 159.494 313.568 155.688 300.428L179.066 290.796C181.186 298.88 184.891 305.145 190.182 309.592C195.436 314.038 201.836 316.228 209.314 316.228C216.959 316.228 223.527 313.903 229.018 309.254C234.51 304.606 237.272 298.678 237.272 291.504C237.272 284.16 234.375 278.164 228.582 273.516C222.788 268.868 215.512 266.544 206.822 266.544H193.314V243.404H205.44C212.917 243.404 219.216 241.382 224.336 237.338C229.456 233.298 232.016 227.772 232.016 220.732C232.016 214.468 229.726 209.482 225.146 205.744C220.566 202.004 214.77 200.118 207.73 200.118C200.86 200.118 194.954 202.004 190.012 205.776C185.07 209.548 181.652 215.11 179.758 222.464L156.938 213.112C160.058 200.804 167.34 190.868 178.784 183.304C190.228 175.74 204.094 171.958 220.382 171.958C232.69 171.958 243.088 174.686 251.576 180.142C260.064 185.598 264.308 193.006 264.308 202.366C264.308 209.11 261.984 215.008 257.336 220.06C252.688 225.112 246.658 228.608 239.246 230.548V232.072C247.936 234.012 254.91 238.072 260.168 244.252C265.426 250.432 268.055 258.112 268.055 267.292C268.055 277.624 264.442 286.29 257.216 293.29C249.99 300.29 240.406 305.144 228.464 307.852V308.236C239.696 311.112 248.51 316.592 254.906 324.676C261.302 332.76 264.5 342.344 264.5 353.428C264.5 363.38 260.916 371.99 253.748 379.258C246.58 386.526 236.932 392.052 224.804 395.836C212.676 399.62 199.198 401.512 184.37 401.512C167.3 401.512 152.26 398.71 139.25 393.106C126.24 387.502 116.35 379.162 109.58 368.086L132.188 353.428C136.628 361.028 143.208 367.056 151.928 371.512C160.648 375.968 171.106 378.196 183.302 378.196C193.934 378.196 203.042 376.66 210.626 373.588C218.21 370.516 224.036 366.19 228.104 360.61C232.172 355.03 234.206 348.334 234.206 340.522C234.206 331.666 231.134 324.498 224.99 319.018C218.846 313.538 210.65 310.222 200.402 309.07L176.54 330.308Z" fill="#1967D2" />
      <path d="M309.927 396.676V184.18H338.457V396.676H309.927Z" fill="#1967D2" />
    </svg>
  );
}

/** Official 4-color Google Meet camera logo (Green/Yellow/Red/Blue camera) */
function GoogleMeetLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 622 512" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Google Meet logo">
      <path d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z" fill="#00832D" />
      <path d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z" fill="#0066DA" />
      <path d="M145.556 0L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 0Z" fill="#E94235" />
      <path d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z" fill="#2684FC" />
      <path d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317" fill="#00AC47" />
      <path d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z" fill="#00AC47" />
      <path d="M450.825 0H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0 450.825 0" fill="#FFBA00" />
    </svg>
  );
}

/** Official Zoom squircle camera icon in Zoom Blue `#2D8CFF` */
function ZoomLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Zoom logo">
      <rect width="48" height="48" rx="12" fill="#2D8CFF" />
      <path
        d="M12 20C12 17.2386 14.2386 15 17 15H27C29.7614 15 32 17.2386 32 20V28C32 30.7614 29.7614 33 27 33H17C14.2386 33 12 30.7614 12 28V20Z"
        fill="white"
      />
      <path
        d="M32 22.8L37.5 18.675C38.3 18.075 39.2 18.65 39.2 19.65V28.35C39.2 29.35 38.3 29.925 37.5 29.325L32 25.2V22.8Z"
        fill="white"
      />
    </svg>
  );
}

/** Official 4-color Slack hashtag logo (Red/Yellow/Green/Blue lozenges) */
function SlackLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Slack logo">
      <path d="M22 12a6 6 0 1 1 6-6v6zM22 16a6 6 0 0 1 0 12H6a6 6 0 1 1 0-12z" fill="#36C5F0" />
      <path d="M48 22a6 6 0 1 1 6 6h-6zM32 6a6 6 0 1 1 12 0v16a6 6 0 0 1-12 0z" fill="#2EB67D" />
      <path d="M38 48a6 6 0 1 1-6 6v-6zM54 32a6 6 0 0 1 0 12H38a6 6 0 1 1 0-12z" fill="#ECB22E" />
      <path d="M12 38a6 6 0 1 1-6-6h6zM16 38a6 6 0 1 1 12 0v16a6 6 0 0 1-12 0z" fill="#E01E5A" />
    </svg>
  );
}

/** Official Notion monogram vector icon */
function NotionLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Notion logo">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.197 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.213.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.887l-15.177.887c-.56.047-.746.374-.746.934zm14.337.747c.093.42 0 .84-.42.887l-.7.14v10.264c-.607.327-1.167.514-1.634.514-.747 0-.933-.233-1.493-.933l-4.573-7.186v6.953l1.447.327s0 .84-1.167.84l-3.219.187c-.093-.187 0-.653.327-.747l.84-.233V9.852l-1.167-.094c-.094-.42.14-.98.793-1.026l3.453-.234 4.76 7.28V9.385l-1.213-.14c-.094-.514.28-.887.747-.933zM1.752 1.268l13.495-.98c1.633-.14 2.053.046 3.08.793l4.246 2.986c.653.467.886.607.886 1.167v16.332c0 1.026-.373 1.633-1.68 1.726l-15.41.933c-.98.047-1.446-.093-1.96-.746L.772 19.345C.212 18.598 0 18.038 0 17.385V2.902c0-.84.373-1.54 1.752-1.634z" />
    </svg>
  );
}

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
          const intg = data.integrations || data.notifications?.integrations || {};
          if (intg.zoom_webhook) setZoomWebhook(intg.zoom_webhook);
          if (intg.slack_webhook) setSlackWebhook(intg.slack_webhook);
          if (intg.notion_api_key) setNotionApiKey(intg.notion_api_key);
          if (intg.notion_db_id) setNotionDbId(intg.notion_db_id);
          else if (intg.notion_database_id) setNotionDbId(intg.notion_database_id);
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
            integrations: {
              zoom_webhook: zoomWebhook,
              slack_webhook: slackWebhook,
              notion_api_key: notionApiKey,
              notion_db_id: notionDbId,
            }
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
            integrations: {
              zoom_webhook: zoomWebhook,
              slack_webhook: slackWebhook,
              notion_api_key: notionApiKey,
              notion_db_id: notionDbId,
            }
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
            integrations: {
              zoom_webhook: zoomWebhook,
              slack_webhook: slackWebhook,
              notion_api_key: notionApiKey,
              notion_db_id: notionDbId,
            }
          })
        });
      } catch {}
    }
    setNotionSaving(false);
    showMessage("Notion credentials saved", { variant: "success" });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
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
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high/80 border border-outline-variant/20 flex items-center justify-center shrink-0 shadow-xs">
              <GoogleCalendarLogo className="w-6 h-6" />
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
                  <GoogleCalendarLogo className="w-4 h-4 shrink-0" />
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
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high/80 border border-outline-variant/20 flex items-center justify-center shrink-0 shadow-xs">
              <GoogleMeetLogo className="w-6 h-6" />
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
              <div className="w-12 h-12 rounded-2xl bg-[#0B5CFF]/10 border border-[#0B5CFF]/20 flex items-center justify-center shrink-0 shadow-xs">
                <ZoomLogo className="w-6 h-6" />
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
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high/80 border border-outline-variant/20 flex items-center justify-center shrink-0 shadow-xs">
                <SlackLogo className="w-6 h-6" />
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
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high/80 border border-outline-variant/20 flex items-center justify-center shrink-0 shadow-xs text-text">
                <NotionLogo className="w-6 h-6 text-text" />
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
