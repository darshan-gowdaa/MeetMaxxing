'use client';

import { useState, useEffect } from 'react';
import { 
  RiFileTextLine, 
  RiFileList3Line, 
  RiFlashlightLine, 
  RiTranslate2, 
  RiTimeLine, 
  RiTimerLine, 
  RiCompass3Line, 
  RiSparklingLine 
} from '@remixicon/react';

import { useAuth } from '@/lib/auth-context';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import { SelectionCard } from "@/components/molecules/SelectionCard";
import { Switch } from "@/components/atoms/Switch";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function GeneralPreferences() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();

  const [lang, setLang] = useState('en');
  const [style, setStyle] = useState('concise');
  const [timezone, setTimezone] = useState('UTC');
  const [duration, setDuration] = useState(30);
  const [autoExtract, setAutoExtract] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/settings/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.language) setLang(data.language);
        if (data.summary_style) setStyle(data.summary_style);
        if (data.timezone) setTimezone(data.timezone);
        if (data.meeting_duration) setDuration(Number(data.meeting_duration));
        if (typeof data.auto_extract_actions === 'boolean') {
          setAutoExtract(data.auto_extract_actions);
        }
      })
      .catch(() => {});
  }, [token]);

  const saveLang = async (v: string) => {
    setLang(v);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: v })
      });
      showMessage("Language updated", { variant: "success" });
    } catch {
      showMessage("Failed to update language", { variant: "error" });
    }
  };

  const saveStyle = async (v: string) => {
    setStyle(v);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ summary_style: v })
      });
      showMessage("Summary style updated", { variant: "success" });
    } catch {
      showMessage("Failed to update summary style", { variant: "error" });
    }
  };

  const saveTimezone = async (tz: string) => {
    setTimezone(tz);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ timezone: tz })
      });
      showMessage("Timezone updated", { variant: "success" });
    } catch {
      showMessage("Failed to update timezone", { variant: "error" });
    }
  };

  const handleAutoDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        saveTimezone(detected);
        showMessage(`Detected timezone: ${detected}`, { variant: "default" });
      }
    } catch {
      showMessage("Could not auto-detect timezone", { variant: "error" });
    }
  };

  const saveDuration = async (dur: number) => {
    setDuration(dur);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ meeting_duration: dur })
      });
      showMessage("Default meeting duration updated", { variant: "success" });
    } catch {
      showMessage("Failed to update meeting duration", { variant: "error" });
    }
  };

  const saveAutoExtract = async (val: boolean) => {
    setAutoExtract(val);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ auto_extract_actions: val })
      });
      showMessage(val ? "Action items auto-extraction enabled" : "Action items auto-extraction disabled", { variant: "success" });
    } catch {
      showMessage("Failed to update action items preference", { variant: "error" });
    }
  };

  const summaryOptions = [
    { id: 'concise', label: 'Concise', icon: RiFileTextLine, desc: 'Brief overview' },
    { id: 'detailed', label: 'Detailed', icon: RiFileList3Line, desc: 'In-depth notes' },
    { id: 'action-focused', label: 'Action Focused', icon: RiFlashlightLine, desc: 'Tasks & decisions' }
  ];

  const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
          General Preferences
        </h1>
        <p className="text-sm text-text-muted">
          Manage language, scheduling defaults, timezones, and AI note extraction.
        </p>
      </div>

      {/* Timezone Section */}
      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <RiTimeLine className="w-4 h-4 text-primary" /> Primary Timezone
            </h2>
            <p className="text-xs text-text-muted">
              Used for calendar scheduling and reminder calculations
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoDetectTimezone}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface2 hover:bg-surface-container-highest border border-border text-xs font-semibold text-text transition-all self-start sm:self-auto cursor-pointer"
          >
            <RiCompass3Line className="w-3.5 h-3.5 text-primary" />
            Auto-detect
          </button>
        </div>

        <select
          value={timezone}
          onChange={e => saveTimezone(e.target.value)}
          aria-label="Primary timezone"
          className="w-full bg-surface2 border border-border rounded-[20px] px-5 py-4 text-[14px] font-medium focus:outline-none focus:border-primary text-text transition-all appearance-none cursor-pointer"
        >
          {timezoneOptions.map(tz => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </section>

      {/* Default Meeting Duration */}
      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <RiTimerLine className="w-4 h-4 text-primary" /> Default Meeting Duration
          </h2>
          <p className="text-xs text-text-muted">
            Preset duration applied when scheduling follow-up meetings
          </p>
        </div>

        <select
          value={duration}
          onChange={e => saveDuration(Number(e.target.value))}
          aria-label="Default meeting duration"
          className="w-full bg-surface2 border border-border rounded-[20px] px-5 py-4 text-[14px] font-medium focus:outline-none focus:border-primary text-text transition-all appearance-none cursor-pointer"
        >
          <option value={15}>15 minutes (Quick Standup)</option>
          <option value={30}>30 minutes (Standard Meeting)</option>
          <option value={45}>45 minutes (In-depth Review)</option>
          <option value={60}>60 minutes (Workshop / Sync)</option>
        </select>
      </section>

      {/* Auto-extract Action Items */}
      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg text-text flex items-center gap-2">
              <RiSparklingLine className="w-4 h-4 text-primary" /> Auto-extract Action Items
            </span>
            <span className="text-xs sm:text-sm text-text-muted">
              Automatically identify tasks, assignees, and deadlines from live transcripts
            </span>
          </div>
          <Switch 
            checked={autoExtract}
            onCheckedChange={saveAutoExtract}
            aria-label="Toggle auto-extract action items"
          />
        </label>
      </section>

      {/* Language Section */}
      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <RiTranslate2 className="w-4 h-4 text-primary" /> Default Meeting Language
        </h2>
        <select
          value={lang}
          onChange={e => saveLang(e.target.value)}
          aria-label="Default meeting language"
          className="w-full bg-surface2 border border-border rounded-[20px] px-5 py-4 text-[14px] font-medium focus:outline-none focus:border-primary text-text transition-all appearance-none cursor-pointer"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
        </select>
      </section>

      {/* Summary Style */}
      <section className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col gap-5 sm:gap-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <RiFileList3Line className="w-4 h-4 text-primary" /> Summary Style
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup">
          {summaryOptions.map(opt => (
            <SelectionCard
              key={opt.id}
              id={opt.id}
              label={opt.label}
              description={opt.desc}
              icon={opt.icon}
              selected={style === opt.id}
              onClick={saveStyle}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
