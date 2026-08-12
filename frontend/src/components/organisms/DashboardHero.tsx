"use client";

import { RiSparklingLine, RiShieldCheckLine } from"@remixicon/react";
import AnimatedNumber from"@/components/atoms/AnimatedNumber";

interface DashboardHeroProps {
 loading: boolean;
 meetingsCount: number;
 totalMinutes: number;
 formatTime: (mins: number) => string;
}

import PageHero from "./PageHero";

export default function DashboardHero({ loading, meetingsCount, totalMinutes, formatTime }: DashboardHeroProps) {
  return (
    <PageHero
      icon={RiSparklingLine}
      pretitle="AI Meeting Intelligence"
      title="Your Meeting"
      titleHighlight="Dashboard"
      description="Every call summarized, every decision tracked, every action item captured — powered by Gemini."
      stats={[
        { loading, value: <AnimatedNumber value={meetingsCount} />, label: "Meetings" },
        { loading, value: <AnimatedNumber value={totalMinutes} formatFn={formatTime} />, label: "Recorded" }
      ]}
      action={
        <div className="relative flex flex-col items-center justify-center w-full sm:w-[110px] md:min-w-[6rem] h-20 rounded-[20px] bg-primary-container/30 border border-primary/30 overflow-hidden group shadow-sm transition-all duration-300">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] z-0">
            <div className="w-full h-full animate-spin-once bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] opacity-0"/>
          </div>
          <div className="absolute inset-[1px] bg-surface-container rounded-[19px] z-10"/>
          
          <div className="relative z-20 flex flex-col items-center justify-center">
            <RiShieldCheckLine className="w-6 h-6 text-primary mb-1"/>
            <span className="text-[10px] text-text font-bold tracking-wide">Active</span>
          </div>
        </div>
      }
    />
  );
}
