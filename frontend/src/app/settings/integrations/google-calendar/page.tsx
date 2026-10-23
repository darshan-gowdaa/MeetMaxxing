"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RiCheckLine,
  RiExternalLinkLine,
  RiRefreshLine,
  RiArrowRightSLine,
  RiArrowLeftLine,
  RiCalendarLine,
  RiTimeLine,
  RiFlashlightLine,
  RiCalendarCheckLine,
  RiUserLine,
  RiSparklingLine,
} from "@remixicon/react";

import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

/** Official 4-color Google Calendar logo (Blue/Green/Yellow/Red calendar icon with "31") */
function GoogleCalendarLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Google Calendar logo"
    >
      <path d="M390.736 121.264H121.264V390.736H390.736V121.264Z" fill="white" />
      <path
        d="M390.736 512L512 390.736L451.368 380.392L390.736 390.736L379.67 446.196L390.736 512Z"
        fill="#EA4335"
      />
      <path
        d="M0 390.736V471.578C0 493.912 18.088 512 40.42 512H121.264L133.714 451.368L121.264 390.736L55.198 380.392L0 390.736Z"
        fill="#188038"
      />
      <path
        d="M512 121.264V40.42C512 18.088 493.912 0 471.58 0H390.736C383.36 30.072 379.671 52.2027 379.67 66.392C379.67 80.58 383.359 98.8707 390.736 121.264C417.556 128.944 437.767 132.784 451.368 132.784C464.969 132.784 485.18 128.945 512 121.264Z"
        fill="#1967D2"
      />
      <path d="M512 121.264H390.736V390.736H512V121.264Z" fill="#FBBC04" />
      <path d="M390.736 390.736H121.264V512H390.736V390.736Z" fill="#34A853" />
      <path
        d="M390.736 0H40.422C18.088 0 0 18.088 0 40.42V390.736H121.264V121.264H390.736V0Z"
        fill="#4285F4"
      />
      <path
        d="M176.54 330.308C166.468 323.504 159.494 313.568 155.688 300.428L179.066 290.796C181.186 298.88 184.891 305.145 190.182 309.592C195.436 314.038 201.836 316.228 209.314 316.228C216.959 316.228 223.527 313.903 229.018 309.254C234.51 304.606 237.272 298.678 237.272 291.504C237.272 284.16 234.375 278.164 228.582 273.516C222.788 268.868 215.512 266.544 206.822 266.544H193.314V243.404H205.44C212.917 243.404 219.216 241.382 224.336 237.338C229.456 233.298 232.016 227.772 232.016 220.732C232.016 214.468 229.726 209.482 225.146 205.744C220.566 202.004 214.77 200.118 207.73 200.118C200.86 200.118 194.954 202.004 190.012 205.776C185.07 209.548 181.652 215.11 179.758 222.464L156.938 213.112C160.058 200.804 167.34 190.868 178.784 183.304C190.228 175.74 204.094 171.958 220.382 171.958C232.69 171.958 243.088 174.686 251.576 180.142C260.064 185.598 264.308 193.006 264.308 202.366C264.308 209.11 261.984 215.008 257.336 220.06C252.688 225.112 246.658 228.608 239.246 230.548V232.072C247.936 234.012 254.91 238.072 260.168 244.252C265.426 250.432 268.055 258.112 268.055 267.292C268.055 277.624 264.442 286.29 257.216 293.29C249.99 300.29 240.406 305.144 228.464 307.852V308.236C239.696 311.112 248.51 316.592 254.906 324.676C261.302 332.76 264.5 342.344 264.5 353.428C264.5 363.38 260.916 371.99 253.748 379.258C246.58 386.526 236.932 392.052 224.804 395.836C212.676 399.62 199.198 401.512 184.37 401.512C167.3 401.512 152.26 398.71 139.25 393.106C126.24 387.502 116.35 379.162 109.58 368.086L132.188 353.428C136.628 361.028 143.208 367.056 151.928 371.512C160.648 375.968 171.106 378.196 183.302 378.196C193.934 378.196 203.042 376.66 210.626 373.588C218.21 370.516 224.036 366.19 228.104 360.61C232.172 355.03 234.206 348.334 234.206 340.522C234.206 331.666 231.134 324.498 224.99 319.018C218.846 313.538 210.65 310.222 200.402 309.07L176.54 330.308Z"
        fill="#1967D2"
      />
      <path d="M309.927 396.676V184.18H338.457V396.676H309.927Z" fill="#1967D2" />
    </svg>
  );
}

/** Official 4-color Google Meet camera logo (Green/Yellow/Red/Blue camera) */
function GoogleMeetLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 622 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Google Meet logo"
    >
      <path
        d="M351.419 255.568L411.978 324.79L493.418 376.827L507.584 256.005L493.418 137.908L410.418 183.621L351.419 255.568Z"
        fill="#00832D"
      />
      <path
        d="M0.00283051 365.583V468.541C0.00283051 492.049 19.0851 511.136 42.5983 511.136H145.556L166.876 433.344L145.556 365.583L74.9198 344.263L0.00283051 365.583Z"
        fill="#0066DA"
      />
      <path
        d="M145.556 0L0.00283051 145.554L74.9247 166.822L145.556 145.554L166.488 78.7145L145.556 0Z"
        fill="#E94235"
      />
      <path
        d="M0.00526047 365.629H145.556V145.551H0.00526047V365.629Z"
        fill="#2684FC"
      />
      <path
        d="M586.398 61.6293L493.416 137.91V376.827L586.782 453.404C600.758 464.352 621.204 454.374 621.204 436.607V78.0861C621.204 60.1224 600.271 50.193 586.396 61.6317"
        fill="#00AC47"
      />
      <path
        d="M351.419 255.568V365.583H145.556V511.136H450.825C474.338 511.136 493.418 492.049 493.418 468.541V376.827L351.419 255.568Z"
        fill="#00AC47"
      />
      <path
        d="M450.825 0H145.556V145.554H351.419V255.568L493.42 137.905V42.5979C493.42 19.0847 474.338 0 450.825 0"
        fill="#FFBA00"
      />
    </svg>
  );
}

interface CalendarPreferences {
  auto_schedule_followups: boolean;
  followup_mode: "prompt" | "auto";
  lead_days: number;
  time_block_actions: boolean;
  context_sync: boolean;
}

const DEFAULT_CALENDAR_PREFS: CalendarPreferences = {
  auto_schedule_followups: true,
  followup_mode: "prompt",
  lead_days: 3,
  time_block_actions: true,
  context_sync: true,
};

interface CalendarEventItem {
  id: string;
  summary: string;
  start?: string;
  end?: string;
  html_link?: string;
  hangout_link?: string;
  attendees_count?: number;
}

function GoogleCalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();

  // Status & OAuth states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Preference states
  const [calendarPrefs, setCalendarPrefs] = useState<CalendarPreferences>(
    DEFAULT_CALENDAR_PREFS
  );

  // Synced Events states (Google Meet only)
  const [upcomingMeetEvents, setUpcomingMeetEvents] = useState<
    CalendarEventItem[]
  >([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [testEventLoading, setTestEventLoading] = useState(false);

  // Fetch upcoming Google Meet events (automatically called on mount & sync)
  const fetchUpcomingMeetEvents = useCallback(async () => {
    if (!token) return;
    setEventsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calendar/events?only_meet=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Defensive double-filter to guarantee every displayed event has a Google Meet link
        const meetEvents = (data.events || []).filter(
          (ev: CalendarEventItem) => Boolean(ev.hangout_link)
        );
        setUpcomingMeetEvents(meetEvents);
      } else {
        const fallbackRes = await fetch(
          `${API_URL}/calendar/events?only_meet=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const meetEvents = (data.events || []).filter(
            (ev: CalendarEventItem) => Boolean(ev.hangout_link)
          );
          setUpcomingMeetEvents(meetEvents);
        }
      }
    } catch {
      // silent failure on background poll
    } finally {
      setEventsLoading(false);
    }
  }, [token]);

  // Fetch connection status & preferences
  const fetchCalendarStatus = useCallback(async () => {
    if (!token) {
      setCalendarLoading(false);
      return;
    }
    setCalendarLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calendar/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const isConn = Boolean(data.connected);
        setCalendarConnected(isConn);
        if (data.email) setCalendarEmail(data.email);
        if (data.last_synced_at) setLastSyncedAt(data.last_synced_at);
        if (data.preferences) {
          setCalendarPrefs((prev) => ({ ...prev, ...data.preferences }));
        }
        if (isConn) {
          // Auto-sync upcoming Google Meet events as soon as connection is verified
          fetchUpcomingMeetEvents();
        }
      } else {
        const fallbackRes = await fetch(`${API_URL}/calendar/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const isConn = Boolean(data.connected);
          setCalendarConnected(isConn);
          if (data.email) setCalendarEmail(data.email);
          if (data.last_synced_at) setLastSyncedAt(data.last_synced_at);
          if (data.preferences) {
            setCalendarPrefs((prev) => ({ ...prev, ...data.preferences }));
          }
          if (isConn) {
            fetchUpcomingMeetEvents();
          }
        } else {
          setCalendarConnected(false);
        }
      }
    } catch {
      setCalendarConnected(false);
    } finally {
      setCalendarLoading(false);
    }
  }, [token, fetchUpcomingMeetEvents]);

  // Handle OAuth query params on mount & trigger automatic sync
  useEffect(() => {
    const calendarParam = searchParams.get("calendar");
    const calendarError = searchParams.get("calendar_error");

    if (calendarParam === "connected") {
      showMessage(
        "Google Calendar successfully connected! Syncing your Google Meet schedule...",
        { variant: "success" }
      );
      // Clean query params from URL without reload
      router.replace("/settings/integrations/google-calendar");
    } else if (calendarError) {
      showMessage(`Google Calendar connection failed: ${calendarError}`, {
        variant: "error",
      });
      router.replace("/settings/integrations/google-calendar");
    }
  }, [searchParams, showMessage, router]);

  // Auto-sync whenever page is opened / mounted
  useEffect(() => {
    fetchCalendarStatus();
  }, [fetchCalendarStatus]);

  // Initiate Google Calendar OAuth connect
  const handleConnectCalendar = async () => {
    if (!token) {
      showMessage("Please sign in to connect Google Calendar", {
        variant: "error",
      });
      return;
    }
    setCalendarActionLoading(true);
    try {
      const frontendOrigin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://meetmaxxing.vercel.app";
      const res = await fetch(
        `${API_URL}/api/calendar/connect?frontend_origin=${encodeURIComponent(frontendOrigin)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      }
      // Fallback direct endpoint
      const fallbackRes = await fetch(
        `${API_URL}/calendar/connect?frontend_origin=${encodeURIComponent(frontendOrigin)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      }
      showMessage("Could not initialize Google OAuth consent flow", {
        variant: "error",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showMessage(`Calendar connection error: ${msg}`, {
        variant: "error",
      });
    } finally {
      setCalendarActionLoading(false);
    }
  };

  // Disconnect Google Calendar
  const handleDisconnectCalendar = async () => {
    if (!token) return;
    if (
      !confirm(
        "Disconnect Google Calendar from MeetMaxxing? Automated meeting sync and follow-up booking will be paused."
      )
    ) {
      return;
    }
    setCalendarActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calendar/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCalendarConnected(false);
        setCalendarEmail(null);
        setUpcomingMeetEvents([]);
        showMessage("Google Calendar disconnected", { variant: "default" });
      } else {
        const fallbackRes = await fetch(`${API_URL}/calendar/disconnect`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackRes.ok) {
          setCalendarConnected(false);
          setCalendarEmail(null);
          setUpcomingMeetEvents([]);
          showMessage("Google Calendar disconnected", { variant: "default" });
        }
      }
    } catch {
      showMessage("Failed to disconnect calendar", { variant: "error" });
    } finally {
      setCalendarActionLoading(false);
    }
  };

  // Update automation preference
  const handleUpdatePref = async (newPrefs: Partial<CalendarPreferences>) => {
    const updated = { ...calendarPrefs, ...newPrefs };
    setCalendarPrefs(updated);
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/calendar/preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        await fetch(`${API_URL}/calendar/preferences`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updated),
        });
      }
      showMessage("Calendar preference saved", { variant: "success" });
    } catch {
      showMessage("Failed to save preference", { variant: "error" });
    }
  };

  // Schedule a test Google Meet meeting
  const handleCreateTestEvent = async () => {
    if (!token) return;
    setTestEventLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/calendar/test-event`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.event_id) {
        showMessage(
          "Test meeting with Google Meet link scheduled on your Google Calendar!",
          { variant: "success" }
        );
        fetchUpcomingMeetEvents();
      } else {
        showMessage(data.detail || "Failed to schedule test meeting", {
          variant: "error",
        });
      }
    } catch {
      showMessage("Error scheduling test meeting", { variant: "error" });
    } finally {
      setTestEventLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* M3 Expressive Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-muted">
        <Link
          href="/settings"
          className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          Settings
        </Link>
        <RiArrowRightSLine className="w-3.5 h-3.5 text-outline-variant/60 shrink-0" />
        <Link
          href="/settings/integrations"
          className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
        >
          Integrations
        </Link>
        <RiArrowRightSLine className="w-3.5 h-3.5 text-outline-variant/60 shrink-0" />
        <span className="text-text font-bold bg-surface-container-high/80 px-2.5 py-0.5 rounded-full">
          Google Calendar
        </span>
      </nav>

      {/* Hero Header with M3 Tokens */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-3xl bg-surface-container-high/90 border border-outline-variant/20 flex items-center justify-center shrink-0 shadow-sm">
            <GoogleCalendarLogo className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">
                Google Calendar
              </h1>
              {calendarLoading ? (
                <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold animate-pulse">
                  Checking…
                </span>
              ) : calendarConnected ? (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full px-3.5 py-1 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="bg-surface-container-highest text-text-muted rounded-full px-3.5 py-1 text-xs font-semibold">
                  Disconnected
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
              Bi-directional calendar synchronization, instant Google Meet join buttons,
              autonomous follow-up scheduling, and pre-call agenda intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
          {calendarConnected ? (
            <>
              <button
                type="button"
                onClick={handleCreateTestEvent}
                disabled={testEventLoading}
                title="Create a 15-minute test event with Google Meet to test sync"
                className="rounded-full px-4 py-2.5 font-semibold text-xs active:scale-[0.98] transition-transform border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {testEventLoading ? (
                  <Md3LoadingIndicator size="sm" className="text-primary" />
                ) : (
                  <RiFlashlightLine className="w-3.5 h-3.5" />
                )}
                Schedule Test Meet
              </button>
              <button
                type="button"
                onClick={handleDisconnectCalendar}
                disabled={calendarActionLoading}
                className="rounded-full px-5 py-2.5 font-semibold text-xs active:scale-[0.98] transition-transform border border-risk/30 text-risk hover:bg-risk/10 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {calendarActionLoading ? (
                  <Md3LoadingIndicator size="sm" className="text-risk" />
                ) : null}
                Disconnect
              </button>
            </>
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
              Connect Google Calendar
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchCalendarStatus();
              fetchUpcomingMeetEvents();
            }}
            title="Refresh integration status and events"
            disabled={calendarLoading || eventsLoading}
            className="p-2.5 rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <RiRefreshLine
              className={`w-4 h-4 ${
                calendarLoading || eventsLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Account Info Pill Card */}
      {calendarConnected && (
        <div className="bg-surface-container-low rounded-[20px] p-4 sm:p-5 border border-outline-variant/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <RiUserLine className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-text-muted">Connected Primary Account</span>
              <span className="text-sm font-bold text-text">
                {calendarEmail || "Primary Google Account"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {lastSyncedAt && (
              <span>
                Last synced:{" "}
                {new Date(lastSyncedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/40" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <RiCheckLine className="w-3.5 h-3.5" /> Auto-Sync Active
            </span>
          </div>
        </div>
      )}

      {/* SECTION: Upcoming Google Meet Calls (ONLY events with Google Meet Join button) */}
      <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#00832D]/10 text-[#00832D] flex items-center justify-center shrink-0">
              <GoogleMeetLogo className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-text">
                  Upcoming Google Meet Calls
                </h2>
                <span className="bg-[#00832D]/10 text-[#00832D] border border-[#00832D]/20 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                  Meet Only
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted">
                Only calendar events featuring an active Google Meet video conference link are displayed here.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={fetchUpcomingMeetEvents}
              disabled={eventsLoading || !calendarConnected}
              className="rounded-full px-3.5 py-2 font-medium text-xs border border-outline-variant/20 hover:bg-surface-container-high text-text active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RiRefreshLine
                className={`w-3.5 h-3.5 ${eventsLoading ? "animate-spin" : ""}`}
              />
              Sync Now
            </button>
          </div>
        </div>

        {/* Meet Events List Content */}
        {!calendarConnected ? (
          <div className="bg-surface-container/60 rounded-2xl p-6 sm:p-8 border border-outline-variant/15 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-text-muted">
              <RiCalendarLine className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-text">Google Calendar is Disconnected</h3>
            <p className="text-xs text-text-muted max-w-md">
              Connect your Google Calendar account above to automatically ingest and display your upcoming Google Meet calls with one-click join buttons.
            </p>
            <button
              type="button"
              onClick={handleConnectCalendar}
              disabled={calendarActionLoading}
              className="mt-2 rounded-full px-5 py-2.5 font-semibold text-xs bg-primary text-on-primary hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <GoogleCalendarLogo className="w-4 h-4" />
              Connect Calendar
            </button>
          </div>
        ) : eventsLoading && upcomingMeetEvents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Md3LoadingIndicator size="md" className="text-primary" />
            <p className="text-xs text-text-muted font-medium animate-pulse">
              Syncing your Google Meet schedule from Google Calendar…
            </p>
          </div>
        ) : upcomingMeetEvents.length === 0 ? (
          <div className="bg-surface-container/60 rounded-2xl p-6 sm:p-8 border border-outline-variant/15 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#00832D]/10 flex items-center justify-center text-[#00832D]">
              <GoogleMeetLogo className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-text">No Upcoming Google Meet Calls Found</h3>
            <p className="text-xs text-text-muted max-w-md leading-relaxed">
              Only calendar events that include a Google Meet video conference link will appear here. Non-video calendar items are omitted to keep your meeting queue clean.
            </p>
            <button
              type="button"
              onClick={handleCreateTestEvent}
              disabled={testEventLoading}
              className="mt-2 rounded-full px-5 py-2.5 font-semibold text-xs border border-primary/30 text-primary hover:bg-primary/10 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              {testEventLoading ? (
                <Md3LoadingIndicator size="sm" className="text-primary" />
              ) : (
                <RiFlashlightLine className="w-4 h-4" />
              )}
              Schedule Test Meeting with Google Meet
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingMeetEvents.map((ev) => {
              const startDate = ev.start ? new Date(ev.start) : null;
              const endDate = ev.end ? new Date(ev.end) : null;

              return (
                <div
                  key={ev.id}
                  className="bg-surface-container/80 hover:bg-surface-container rounded-2xl p-4 sm:p-5 border border-outline-variant/15 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Date Badge */}
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high/90 border border-outline-variant/20 flex flex-col items-center justify-center shrink-0 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {startDate
                          ? startDate.toLocaleDateString([], { month: "short" })
                          : "MEET"}
                      </span>
                      <span className="text-base font-black text-text leading-tight">
                        {startDate ? startDate.getDate() : "--"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-text truncate">
                        {ev.summary || "Google Meet Session"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1 font-medium text-text">
                          <RiTimeLine className="w-3.5 h-3.5 text-text-muted" />
                          {startDate
                            ? startDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Scheduled"}
                          {endDate
                            ? ` - ${endDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </span>
                        {ev.attendees_count !== undefined && ev.attendees_count > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-outline-variant/40" />
                            <span className="flex items-center gap-1">
                              <RiUserLine className="w-3 h-3 text-text-muted" />
                              {ev.attendees_count} attendee
                              {ev.attendees_count > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Join Action Buttons */}
                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    {ev.hangout_link && (
                      <a
                        href={ev.hangout_link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full px-5 py-2.5 font-bold text-xs bg-[#00832D] text-white hover:bg-[#006e26] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm"
                      >
                        <GoogleMeetLogo className="w-4 h-4" />
                        Join Call
                      </a>
                    )}
                    {ev.html_link && (
                      <a
                        href={ev.html_link}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Google Calendar"
                        className="p-2.5 rounded-full hover:bg-surface-container-high text-text-muted hover:text-text transition-colors"
                      >
                        <RiExternalLinkLine className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION: Intelligent Calendar Automations & Sub-Options */}
      <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <RiSparklingLine className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-text">
              Intelligent Calendar Automations
            </h2>
            <p className="text-xs sm:text-sm text-text-muted">
              Configure how MeetMaxxing interacts with your schedule, automates action follow-ups, and prepares context.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Sub-Option 1: Autonomous Follow-Up Scheduling */}
          <div className="bg-surface-container/70 rounded-2xl p-5 border border-outline-variant/15 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <RiTimeLine className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-bold text-text">
                    Autonomous Follow-Up Scheduling
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed max-w-xl">
                    When AI identifies agreed-upon follow-up sessions or syncs in your meeting transcript, automatically prepare Google Calendar invites with attendees and synthesized agendas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={calendarPrefs.auto_schedule_followups}
                onClick={() =>
                  handleUpdatePref({
                    auto_schedule_followups: !calendarPrefs.auto_schedule_followups,
                  })
                }
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 relative ${
                  calendarPrefs.auto_schedule_followups
                    ? "bg-primary"
                    : "bg-surface-container-highest border border-outline-variant/30"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-surface shadow-xs transition-transform duration-200 ${
                    calendarPrefs.auto_schedule_followups
                      ? "translate-x-5 bg-on-primary"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {calendarPrefs.auto_schedule_followups && (
              <div className="pt-3.5 border-t border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted font-medium">Booking Mode:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdatePref({ followup_mode: "prompt" })}
                    className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                      calendarPrefs.followup_mode === "prompt"
                        ? "bg-primary text-on-primary font-semibold shadow-xs"
                        : "bg-surface-container-high text-text-muted hover:text-text"
                    }`}
                  >
                    Prompt For Confirmation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePref({ followup_mode: "auto" })}
                    className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                      calendarPrefs.followup_mode === "auto"
                        ? "bg-primary text-on-primary font-semibold shadow-xs"
                        : "bg-surface-container-high text-text-muted hover:text-text"
                    }`}
                  >
                    Auto-Book Directly
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-text-muted font-medium">Suggested Offset:</span>
                  {[3, 5, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleUpdatePref({ lead_days: days })}
                      className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                        calendarPrefs.lead_days === days
                          ? "bg-primary text-on-primary font-semibold shadow-xs"
                          : "bg-surface-container-high text-text-muted hover:text-text"
                      }`}
                    >
                      {days === 7 ? "1 Week" : `${days} Days`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sub-Option 2: Action Item Focus Time-Blocking */}
          <div className="bg-surface-container/70 rounded-2xl p-5 border border-outline-variant/15 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <RiFlashlightLine className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-text">
                  Action Item Focus Time-Blocking
                </h4>
                <p className="text-xs text-text-muted leading-relaxed max-w-xl">
                  Automatically reserve dedicated 30-minute focus slots on your calendar to complete high-priority deliverables and action items assigned to you.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={calendarPrefs.time_block_actions}
              onClick={() =>
                handleUpdatePref({
                  time_block_actions: !calendarPrefs.time_block_actions,
                })
              }
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 relative ${
                calendarPrefs.time_block_actions
                  ? "bg-primary"
                  : "bg-surface-container-highest border border-outline-variant/30"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-surface shadow-xs transition-transform duration-200 ${
                  calendarPrefs.time_block_actions
                    ? "translate-x-5 bg-on-primary"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Sub-Option 3: Pre-Meeting Context Priming */}
          <div className="bg-surface-container/70 rounded-2xl p-5 border border-outline-variant/15 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <RiCalendarCheckLine className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-text">
                  Pre-Meeting Agenda & Memory Priming
                </h4>
                <p className="text-xs text-text-muted leading-relaxed max-w-xl">
                  Ingest calendar invite agendas and surface past decisions and open commitments with attending participants 15 minutes before your Google Meet begins.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={calendarPrefs.context_sync}
              onClick={() =>
                handleUpdatePref({
                  context_sync: !calendarPrefs.context_sync,
                })
              }
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 relative ${
                calendarPrefs.context_sync
                  ? "bg-primary"
                  : "bg-surface-container-highest border border-outline-variant/30"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-surface shadow-xs transition-transform duration-200 ${
                  calendarPrefs.context_sync
                    ? "translate-x-5 bg-on-primary"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Back to Integrations Hub link */}
      <div className="pt-2">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Back to all Integrations
        </Link>
      </div>
    </div>
  );
}

export default function GoogleCalendarIntegrationPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 flex justify-center items-center">
          <Md3LoadingIndicator size="md" className="text-primary" />
        </div>
      }
    >
      <GoogleCalendarContent />
    </Suspense>
  );
}
