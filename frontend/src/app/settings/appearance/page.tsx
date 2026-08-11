"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { RiSunLine, RiMoonLine, RiComputerLine } from "@remixicon/react";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-8 max-w-3xl animate-fade-scale">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text">Appearance</h1>
      
      <div className="bg-surface-container rounded-[32px] p-8 flex flex-col gap-6 border border-border md3-glow-primary">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Theme Preference</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-4 py-6 rounded-[24px] border-2 transition-all spring-sm ${
              theme === 'light' 
                ? 'border-primary bg-primary-container text-on-primary-container' 
                : 'border-border bg-surface hover:bg-surface-container-high text-text-muted'
            }`}
          >
            <RiSunLine className="w-8 h-8" />
            <span className="font-bold">Light</span>
          </button>

          <button 
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-4 py-6 rounded-[24px] border-2 transition-all spring-sm ${
              theme === 'dark' 
                ? 'border-primary bg-primary-container text-on-primary-container' 
                : 'border-border bg-surface hover:bg-surface-container-high text-text-muted'
            }`}
          >
            <RiMoonLine className="w-8 h-8" />
            <span className="font-bold">Dark</span>
          </button>

          <button 
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center gap-4 py-6 rounded-[24px] border-2 transition-all spring-sm ${
              theme === 'system' 
                ? 'border-primary bg-primary-container text-on-primary-container' 
                : 'border-border bg-surface hover:bg-surface-container-high text-text-muted'
            }`}
          >
            <RiComputerLine className="w-8 h-8" />
            <span className="font-bold">System</span>
          </button>
        </div>
      </div>
    </div>
  );
}
