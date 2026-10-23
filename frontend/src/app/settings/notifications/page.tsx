"use client";

import { useState, useEffect } from "react";
import { 
  RiMailLine, 
  RiNotification3Line, 
  RiAlarmWarningLine, 
  RiCalendarCheckLine,
  RiTimeLine 
} from "@remixicon/react";

import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { Switch } from "@/components/atoms/Switch";
import { M3Select } from "@/components/atoms/M3Select";
import { SettingsListSkeleton } from "@/components/organisms/skeletons/SettingsListSkeleton";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

type Notifications = {
  email: boolean;
  reminders: boolean;
  in_app: boolean;
  action_items_due: boolean;
  prep_alerts_lead_time: string;
  daily_digest_time: string;
};

const DEFAULT_NOTIFS: Notifications = {
  email: true,
  reminders: true,
  in_app: true,
  action_items_due: true,
  prep_alerts_lead_time: "10m",
  daily_digest_time: "09:00",
};

function readCachedNotifs(): Notifications {
  if (typeof window === "undefined") return DEFAULT_NOTIFS;
  try {
    const raw = localStorage.getItem("meetmaxxing_notifications");
    if (raw) return { ...DEFAULT_NOTIFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_NOTIFS;
}

export default function NotificationsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();
  
  const [notifs, setNotifs] = useState<Notifications>(readCachedNotifs);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.notifications) {
          const remote = data.notifications;
          setNotifs((prev) => {
            const merged: Notifications = {
              email: typeof remote.email === "boolean" ? remote.email : prev.email,
              reminders: typeof remote.reminders === "boolean" ? remote.reminders : prev.reminders,
              in_app: typeof remote.in_app === "boolean" ? remote.in_app : prev.in_app,
              action_items_due: typeof remote.action_items_due === "boolean" 
                ? remote.action_items_due 
                : (typeof remote.action_item_reminders === "boolean" ? remote.action_item_reminders : prev.action_items_due),
              prep_alerts_lead_time: remote.prep_alerts_lead_time 
                || (remote.prep_lead_time_minutes ? `${remote.prep_lead_time_minutes}m` : prev.prep_alerts_lead_time),
              daily_digest_time: remote.daily_digest_time || remote.digest_time || prev.daily_digest_time,
            };
            try {
              localStorage.setItem("meetmaxxing_notifications", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const toggleNotif = async (key: 'email' | 'reminders' | 'in_app' | 'action_items_due') => {
    const previous = notifs[key];
    const newNotifs = { ...notifs, [key]: !previous };
    
    // Optimistic UI + localStorage
    setNotifs(newNotifs);
    try {
      localStorage.setItem("meetmaxxing_notifications", JSON.stringify(newNotifs));
    } catch {}

    if (!token) {
      showMessage("Notification preference updated locally", { variant: "default" });
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ notifications: newNotifs })
      });
      if (!res.ok) throw new Error("Failed to save");
      showMessage("Notification preference updated", { variant: "success" });
    } catch {
      // Revert on error
      setNotifs({ ...notifs, [key]: previous });
      try {
        localStorage.setItem("meetmaxxing_notifications", JSON.stringify({ ...notifs, [key]: previous }));
      } catch {}
      showMessage("Failed to update notification setting", { variant: "error" });
    }
  };

  const updateSelect = async (key: 'prep_alerts_lead_time' | 'daily_digest_time', value: string) => {
    const previous = notifs[key];
    const newNotifs = { ...notifs, [key]: value };

    setNotifs(newNotifs);
    try {
      localStorage.setItem("meetmaxxing_notifications", JSON.stringify(newNotifs));
    } catch {}

    if (!token) {
      showMessage("Notification timing saved locally", { variant: "default" });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ notifications: newNotifs })
      });
      if (!res.ok) throw new Error("Failed to save");
      showMessage("Notification timing saved", { variant: "success" });
    } catch {
      setNotifs({ ...notifs, [key]: previous });
      try {
        localStorage.setItem("meetmaxxing_notifications", JSON.stringify({ ...notifs, [key]: previous }));
      } catch {}
      showMessage("Failed to update notification timing", { variant: "error" });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
          Notifications
        </h1>
        <p className="text-sm text-text-muted">
          Manage alert channels, lead-time notifications, and daily summaries.
        </p>
      </div>
      
      {loading ? (
        <SettingsListSkeleton />
      ) : (
        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Notification Channels */}
          <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <RiNotification3Line className="w-4 h-4 text-primary" /> Notification Channels & Triggers
            </h2>

            <div className="flex flex-col gap-3">
              <label className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-bold text-base text-text flex items-center gap-2">
                    <RiMailLine className="w-4 h-4 text-primary" /> Email Summaries
                  </span>
                  <span className="text-xs sm:text-sm text-text-muted">Daily and post-meeting activity recaps</span>
                </div>
                <Switch 
                  checked={notifs.email}
                  onCheckedChange={() => toggleNotif('email')}
                  aria-label="Toggle email summaries"
                />
              </label>
              
              <label className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-bold text-base text-text flex items-center gap-2">
                    <RiCalendarCheckLine className="w-4 h-4 text-primary" /> Meeting Reminders
                  </span>
                  <span className="text-xs sm:text-sm text-text-muted">Direct alerts before scheduled meetings start</span>
                </div>
                <Switch 
                  checked={notifs.reminders}
                  onCheckedChange={() => toggleNotif('reminders')}
                  aria-label="Toggle meeting reminders"
                />
              </label>

              <label className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-bold text-base text-text flex items-center gap-2">
                    <RiAlarmWarningLine className="w-4 h-4 text-primary" /> Action Items Due Reminder
                  </span>
                  <span className="text-xs sm:text-sm text-text-muted">Reminders when extracted tasks approach their target date</span>
                </div>
                <Switch 
                  checked={notifs.action_items_due}
                  onCheckedChange={() => toggleNotif('action_items_due')}
                  aria-label="Toggle action items due reminders"
                />
              </label>
              
              <label className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-bold text-base text-text flex items-center gap-2">
                    <RiNotification3Line className="w-4 h-4 text-primary" /> In-App Alerts
                  </span>
                  <span className="text-xs sm:text-sm text-text-muted">Real-time toasts and desktop notification prompts</span>
                </div>
                <Switch 
                  checked={notifs.in_app}
                  onCheckedChange={() => toggleNotif('in_app')}
                  aria-label="Toggle in-app alerts"
                />
              </label>
            </div>
          </div>

          {/* Timing Preferences */}
          <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <RiTimeLine className="w-4 h-4 text-primary" /> Schedule & Timing Preferences
            </h2>

            {/* Prep Alerts Lead Time */}
            <div className="flex flex-col gap-2">
              <label htmlFor="prep-lead-time" className="text-sm font-bold text-text">
                Meeting Prep Alerts Lead Time
              </label>
              <p className="text-xs text-text-muted">
                How far in advance to generate and deliver pre-meeting briefing packets
              </p>
              <M3Select
                id="prep-lead-time"
                value={notifs.prep_alerts_lead_time}
                onChange={(val) => updateSelect('prep_alerts_lead_time', String(val))}
                options={[
                  { value: "5m", label: "5 minutes before" },
                  { value: "10m", label: "10 minutes before" },
                  { value: "15m", label: "15 minutes before" },
                  { value: "30m", label: "30 minutes before" },
                ]}
                leadingIcon={RiTimeLine}
              />
            </div>

            <div className="h-px w-full bg-outline-variant/15" />

            {/* Daily Digest Time */}
            <div className="flex flex-col gap-2">
              <label htmlFor="daily-digest-time" className="text-sm font-bold text-text">
                Daily Digest Time
              </label>
              <p className="text-xs text-text-muted">
                Preferred time of day to receive your consolidated agenda and task digest
              </p>
              <M3Select
                id="daily-digest-time"
                value={notifs.daily_digest_time}
                onChange={(val) => updateSelect('daily_digest_time', String(val))}
                options={[
                  { value: "07:00", label: "07:00 AM (Early Morning)" },
                  { value: "08:00", label: "08:00 AM (Morning Prep)" },
                  { value: "09:00", label: "09:00 AM (Workday Start)" },
                  { value: "10:00", label: "10:00 AM (Late Morning)" },
                  { value: "17:00", label: "05:00 PM (End of Day)" },
                  { value: "18:00", label: "06:00 PM (Evening Wrap-up)" },
                ]}
                leadingIcon={RiTimeLine}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
