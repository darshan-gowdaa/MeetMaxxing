"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { 
  RiSunLine, 
  RiMoonLine, 
  RiComputerLine,
  RiPaletteLine,
  RiEyeLine
} from "@remixicon/react";

import { useAuth } from "@/lib/auth-context";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { SelectionCard } from "@/components/molecules/SelectionCard";
import { Switch } from "@/components/atoms/Switch";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://meetmaxxing-api.onrender.com";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token;
  const { showMessage } = useSnackbar();

  const [mounted, setMounted] = useState(false);
  const [compactCards, setCompactCards] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load local preferences
    const storedCompact = localStorage.getItem("meetmaxxing_compact_cards") === "true";
    const storedContrast = localStorage.getItem("meetmaxxing_high_contrast") === "true";
    setCompactCards(storedCompact);
    setHighContrast(storedContrast);
    if (storedContrast) {
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.theme && ["light", "dark", "system"].includes(data.theme)) {
          setTheme(data.theme);
        }
        if (typeof data.compact_meeting_cards === "boolean") {
          setCompactCards(data.compact_meeting_cards);
          localStorage.setItem("meetmaxxing_compact_cards", String(data.compact_meeting_cards));
        }
        if (typeof data.high_contrast_mode === "boolean") {
          setHighContrast(data.high_contrast_mode);
          localStorage.setItem("meetmaxxing_high_contrast", String(data.high_contrast_mode));
          if (data.high_contrast_mode) {
            document.documentElement.classList.add("high-contrast");
          } else {
            document.documentElement.classList.remove("high-contrast");
          }
        }
      } catch {
        // Silently fall back to local theme
      }
    };
    fetchSettings();
  }, [token, setTheme]);

  if (!mounted) return null;

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ theme: newTheme })
      });
      showMessage("Theme preference saved", { variant: "success" });
    } catch {
      showMessage("Failed to save theme preference", { variant: "error" });
    }
  };

  const handleCompactToggle = async (val: boolean) => {
    setCompactCards(val);
    localStorage.setItem("meetmaxxing_compact_cards", String(val));
    window.dispatchEvent(new Event("meetmaxxing_compact_change"));
    if (!token) {
      showMessage(val ? "Compact meeting cards enabled" : "Standard meeting cards enabled", { variant: "default" });
      return;
    }
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ compact_meeting_cards: val })
      });
      showMessage(val ? "Compact meeting cards enabled" : "Standard meeting cards enabled", { variant: "success" });
    } catch {
      showMessage("Failed to update display density", { variant: "error" });
    }
  };

  const handleContrastToggle = async (val: boolean) => {
    setHighContrast(val);
    localStorage.setItem("meetmaxxing_high_contrast", String(val));
    if (val) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
    window.dispatchEvent(new Event("meetmaxxing_contrast_change"));
    if (!token) {
      showMessage(val ? "High contrast mode enabled" : "High contrast mode disabled", { variant: "default" });
      return;
    }
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ high_contrast_mode: val })
      });
      showMessage(val ? "High contrast mode enabled" : "High contrast mode disabled", { variant: "success" });
    } catch {
      showMessage("Failed to update accessibility settings", { variant: "error" });
    }
  };

  const options = [
    { id: 'light', label: 'Light', icon: RiSunLine },
    { id: 'dark', label: 'Dark', icon: RiMoonLine },
    { id: 'system', label: 'System', icon: RiComputerLine },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] sm:text-3xl font-black text-text tracking-tight">
            Appearance
          </h1>
          <p className="text-sm text-text-muted">
            Customize interface theme, display density, and visual accessibility.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Card 1: Color Scheme & Theme */}
      <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-4 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <RiPaletteLine className="w-5 h-5 text-primary" />
            Color Scheme &amp; Theme
          </h2>
          <p className="text-xs sm:text-sm text-text-muted font-medium">
            Choose your preferred interface theme across light, dark, and operating system matching.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Theme selection">
          {options.map((opt) => (
            <SelectionCard
              key={opt.id}
              id={opt.id}
              label={opt.label}
              icon={opt.icon}
              selected={theme === opt.id}
              onClick={handleThemeChange}
            />
          ))}
        </div>
      </div>

      {/* Card 2: Display Density & Visual Accessibility */}
      <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-4 sm:p-8 flex flex-col gap-6 shadow-none">
        <div className="flex flex-col gap-1">
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <RiEyeLine className="w-5 h-5 text-primary" />
            Display Density &amp; Visual Accessibility
          </h2>
          <p className="text-xs sm:text-sm text-text-muted font-medium">
            Fine-tune interface density and visual contrast for optimal legibility.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Item A: Compact Meeting Cards */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              handleCompactToggle(!compactCards);
            }}
            className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer select-none"
          >
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base text-text">Compact Meeting Cards</span>
              <span className="text-xs sm:text-sm text-text-muted">
                Fit more cards on screen by condensing paddings and badge metadata
              </span>
            </div>
            <Switch 
              checked={compactCards}
              onCheckedChange={handleCompactToggle}
              aria-label="Toggle compact meeting cards"
            />
          </div>

          {/* Divider line */}
          <div className="h-px bg-outline-variant/15 w-full my-1" />

          {/* Item B: High Contrast Mode */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              handleContrastToggle(!highContrast);
            }}
            className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4 hover:bg-surface-container transition-colors cursor-pointer select-none"
          >
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base text-text">High Contrast Mode</span>
              <span className="text-xs sm:text-sm text-text-muted">
                Sharpen borders, text contrast, and interactive focus states
              </span>
            </div>
            <Switch 
              checked={highContrast}
              onCheckedChange={handleContrastToggle}
              aria-label="Toggle high contrast mode"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
