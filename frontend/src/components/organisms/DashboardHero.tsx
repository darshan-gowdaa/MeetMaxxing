"use client";

import { RiSparklingLine, RiShieldCheckLine } from "@remixicon/react";
import AnimatedNumber from "@/components/atoms/AnimatedNumber";

interface DashboardHeroProps {
  loading: boolean;
  meetingsCount: number;
  totalMinutes: number;
  formatTime: (mins: number) => string;
}

export default function DashboardHero({ loading, meetingsCount, totalMinutes, formatTime }: DashboardHeroProps) {
  return (
    <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 md:p-10">
      {/* glowing blob in the background so it looks modern */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
           style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
           style={{ background: "radial-gradient(circle, var(--grad-tertiary) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-tertiary uppercase tracking-widest">
            <RiSparklingLine className="w-3.5 h-3.5" />
            AI Meeting Intelligence
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-tight">
            Your Meeting
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent"> Dashboard</span>
          </h1>
          <p className="text-[14px] text-text-muted max-w-md leading-relaxed">
            Every call summarized, every decision tracked, every action item captured — powered by Gemini.
          </p>
        </div>

        {/* tiny stats boxes */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-surface2 border border-border">
            <span className="text-2xl font-bold text-text">
              {loading ? <span className="text-text-muted">—</span> : <AnimatedNumber value={meetingsCount} />}
            </span>
            <span className="text-[10px] text-text-muted font-medium mt-1">Meetings</span>
          </div>
          <div className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-surface2 border border-border">
            <span className="text-xl font-bold text-text">
              {loading ? <span className="text-text-muted">—</span> : <AnimatedNumber value={totalMinutes} formatFn={formatTime} />}
            </span>
            <span className="text-[10px] text-text-muted font-medium mt-1">Recorded</span>
          </div>
          <div className="relative flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-primary-container/20 border border-primary/20 overflow-hidden group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] z-0">
              <div className="w-full h-full animate-spin-once bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] opacity-0" />
            </div>
            <div className="absolute inset-[1px] bg-surface-container rounded-[19px] z-10" />
            
            <div className="relative z-20 flex flex-col items-center justify-center">
              <RiShieldCheckLine className="w-7 h-7 text-primary mb-1.5" />
              <span className="text-[12px] text-text font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
