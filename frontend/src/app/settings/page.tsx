'use client';

import { useState, useEffect } from 'react';
import { 
  RiFileTextLine, 
  RiFileList3Line, 
  RiFlashlightLine, 
  RiCompass3Line 
} from '@remixicon/react';

import { useAuth } from '@/lib/auth-context';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import { SelectionCard } from "@/components/molecules/SelectionCard";
import { Switch } from "@/components/atoms/Switch";
import { M3Select } from "@/components/atoms/M3Select";

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

interface GeneralSettings {
  language: string;
  summary_style: string;
  timezone: string;
  meeting_duration: number;
  auto_extract_actions: boolean;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  language: 'en',
  summary_style: 'concise',
  timezone: 'UTC',
  meeting_duration: 30,
  auto_extract_actions: true,
};

function readCachedSettings(): GeneralSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const rawLocal = localStorage.getItem("meetmaxxing_general_settings");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    const match = document.cookie.match(/meetmaxxing_general_settings=([^;]+)/);
    if (match) {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function persistSettingsLocally(settings: GeneralSettings) {
  try {
    const serialized = JSON.stringify(settings);
    localStorage.setItem("meetmaxxing_general_settings", serialized);
    document.cookie = `meetmaxxing_general_settings=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

export default function GeneralPreferences() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();

  const [settings, setSettings] = useState<GeneralSettings>(readCachedSettings);

  // Sync with backend on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/settings/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setSettings(prev => {
          const updated: GeneralSettings = {
            language: data.language || prev.language,
            summary_style: data.summary_style || prev.summary_style,
            timezone: data.timezone || prev.timezone,
            meeting_duration: data.meeting_duration !== undefined ? Number(data.meeting_duration) : prev.meeting_duration,
            auto_extract_actions: typeof data.auto_extract_actions === 'boolean' ? data.auto_extract_actions : prev.auto_extract_actions,
          };
          persistSettingsLocally(updated);
          return updated;
        });
      })
      .catch(() => {});
  }, [token]);

  const updateSetting = async <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K], label: string) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    persistSettingsLocally(nextSettings);

    if (!token) {
      showMessage(`${label} saved locally`, { variant: "default" });
      return;
    }

    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value })
      });
      showMessage(`${label} updated`, { variant: "success" });
    } catch {
      showMessage(`Failed to save ${label.toLowerCase()} to cloud`, { variant: "error" });
    }
  };

  const handleAutoDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        updateSetting("timezone", detected, "Timezone");
        showMessage(`Detected timezone: ${detected}`, { variant: "default" });
      }
    } catch {
      showMessage("Could not auto-detect timezone", { variant: "error" });
    }
  };

  const summaryOptions = [
    { id: 'concise', label: 'Concise', icon: RiFileTextLine, desc: 'Brief overview with key takeaways' },
    { id: 'detailed', label: 'Detailed', icon: RiFileList3Line, desc: 'In-depth notes covering all topics' },
    { id: 'action-focused', label: 'Action Focused', icon: RiFlashlightLine, desc: 'Prioritizes tasks, decisions & owners' }
  ];

  const timezoneOptions = COMMON_TIMEZONES.includes(settings.timezone)
    ? COMMON_TIMEZONES
    : [settings.timezone, ...COMMON_TIMEZONES];

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
          General Preferences
        </h1>
        <p className="text-sm text-text-muted">
          Manage AI note synthesis, scheduling defaults, timezones, and regional language.
        </p>
      </div>

      {/* SECTION 1: AI Notes & Synthesis */}
      <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex flex-col gap-1 border-b border-outline-variant/15 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            AI Notes & Synthesis
          </h2>
          <p className="text-xs text-text-muted">
            Configure how intelligence models analyze transcripts and structure meeting summaries.
          </p>
        </div>

        {/* Summary Style Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-bold text-text">
            Default Summary Style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup">
            {summaryOptions.map(opt => (
              <SelectionCard
                key={opt.id}
                id={opt.id}
                label={opt.label}
                description={opt.desc}
                icon={opt.icon}
                selected={settings.summary_style === opt.id}
                onClick={(id) => updateSetting("summary_style", id, "Summary style")}
              />
            ))}
          </div>
        </div>

        {/* Auto-extract Action Items */}
        <div className="pt-2 border-t border-outline-variant/10">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div className="flex flex-col">
              <span className="font-bold text-base text-text">
                Auto-extract Action Items
              </span>
              <span className="text-xs sm:text-sm text-text-muted">
                Automatically detect commitments, assignees, and deadlines from live transcripts
              </span>
            </div>
            <Switch 
              checked={settings.auto_extract_actions}
              onCheckedChange={(val) => updateSetting("auto_extract_actions", val, "Action items auto-extraction")}
              aria-label="Toggle auto-extract action items"
            />
          </label>
        </div>
      </section>

      {/* SECTION 2: Scheduling & Calendar Defaults */}
      <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex flex-col gap-1 border-b border-outline-variant/15 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Scheduling & Defaults
          </h2>
          <p className="text-xs text-text-muted">
            Set default meeting lengths and time references for follow-up coordination.
          </p>
        </div>

        {/* Primary Timezone */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="text-[14px] font-bold text-text">
              Primary Timezone
            </label>
            <button
              type="button"
              onClick={handleAutoDetectTimezone}
              className="rounded-full px-3.5 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-semibold hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RiCompass3Line className="w-3.5 h-3.5" />
              Auto-detect
            </button>
          </div>
          <M3Select
            value={settings.timezone}
            onChange={(val) => updateSetting("timezone", String(val), "Timezone")}
            options={timezoneOptions.map(tz => ({ value: tz, label: tz }))}
            placeholder="Select primary timezone"
          />
        </div>

        {/* Default Meeting Duration */}
        <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/10">
          <div className="flex flex-col gap-1">
            <label className="text-[14px] font-bold text-text">
              Default Meeting Duration
            </label>
            <p className="text-xs text-text-muted">
              Standard block assigned when scheduling follow-up meetings or events
            </p>
          </div>
          <M3Select
            value={settings.meeting_duration}
            onChange={(val) => updateSetting("meeting_duration", Number(val), "Default duration")}
            options={[
              { value: 15, label: "15 minutes (Quick Standup)" },
              { value: 30, label: "30 minutes (Standard Meeting)" },
              { value: 45, label: "45 minutes (In-depth Review)" },
              { value: 60, label: "60 minutes (Workshop / Sync)" },
            ]}
          />
        </div>
      </section>

      {/* SECTION 3: Regional & Localization */}
      <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex flex-col gap-1 border-b border-outline-variant/15 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Regional & Localization
          </h2>
          <p className="text-xs text-text-muted">
            Preferred language for transcripts, summaries, and generated meeting notes.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-bold text-text">
            Primary Language
          </label>
          <M3Select
            value={settings.language}
            onChange={(val) => updateSetting("language", String(val), "Language")}
            options={[
              { value: "en", label: "English (Global / US / UK)" },
              { value: "es", label: "Spanish (Español)" },
              { value: "fr", label: "French (Français)" },
              { value: "de", label: "German (Deutsch)" },
              { value: "ja", label: "Japanese (日本語)" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
