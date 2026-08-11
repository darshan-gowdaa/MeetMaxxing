"use client";

import { useTheme } from"next-themes";
import { useEffect, useState } from"react";
import { RiSunLine, RiMoonLine, RiComputerLine } from"@remixicon/react";

import { SelectionCard } from "@/components/molecules/SelectionCard";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const options = [
    { id: 'light', label: 'Light', icon: RiSunLine },
    { id: 'dark', label: 'Dark', icon: RiMoonLine },
    { id: 'system', label: 'System', icon: RiComputerLine },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-3xl animate-fade-scale">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text">Appearance</h1>
      
      <div className="bg-surface-container rounded-[32px] p-8 flex flex-col gap-6 border border-border">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Theme Preference</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup">
          {options.map((opt) => (
            <SelectionCard
              key={opt.id}
              id={opt.id}
              label={opt.label}
              icon={opt.icon}
              selected={theme === opt.id}
              onClick={(id) => setTheme(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
