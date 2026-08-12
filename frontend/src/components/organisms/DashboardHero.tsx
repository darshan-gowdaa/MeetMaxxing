"use client";

import { RiSparklingLine, RiShieldCheckLine } from"@remixicon/react";
import AnimatedNumber from"@/components/atoms/AnimatedNumber";

interface DashboardHeroProps {
 loading: boolean;
 meetingsCount: number;
 totalMinutes: number;
 formatTime: (mins: number) => string;
}

export default function DashboardHero({ loading, meetingsCount, totalMinutes, formatTime }: DashboardHeroProps) {
 return (
 <div className="relative rounded-[32px] md:rounded-[40px] bg-primary-container/10 border border-primary/20 overflow-hidden p-6 md:p-12 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
 {/* glowing blob in the background so it looks modern */}
 <div className="absolute top-[-20%] right-[-10%] w-80 h-80 md:w-96 md:h-96 rounded-full blur-[100px] pointer-events-none"
 style={{ background:"radial-gradient(circle, var(--primary-dim) 0%, transparent 70%)"}} />
 <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 md:w-80 md:h-80 rounded-full blur-[100px] pointer-events-none"
 style={{ background:"radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)"}} />

 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
 <div className="flex flex-col gap-4 flex-1">
 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container/50 border border-primary/20 text-xs font-bold text-primary uppercase tracking-widest w-fit">
 <RiSparklingLine className="w-4 h-4"/>
 AI Meeting Intelligence
 </div>
 <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-text leading-tight">
 Your Meeting
 <span className="block md:inline text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary"> Dashboard</span>
 </h1>
 <p className="text-base md:text-lg text-text-muted max-w-lg leading-relaxed font-medium">
 Every call summarized, every decision tracked, every action item captured — powered by Gemini.
 </p>
 </div>

 {/* tiny stats boxes */}
 <div className="flex items-center gap-4 flex-wrap md:flex-col lg:flex-row">
 <div className="flex flex-col items-center justify-center w-[110px] md:w-32 h-24 md:h-28 rounded-3xl md:rounded-[32px] bg-surface2 border border-border hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
 <span className="text-3xl md:text-4xl font-extrabold text-text">
 {loading ? <span className="text-text-muted animate-pulse">—</span> : <AnimatedNumber value={meetingsCount} />}
 </span>
 <span className="text-xs md:text-sm text-text-muted font-bold mt-1 tracking-wide">Meetings</span>
 </div>
 <div className="flex flex-col items-center justify-center w-[110px] md:w-32 h-24 md:h-28 rounded-3xl md:rounded-[32px] bg-surface2 border border-border hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
 <span className="text-2xl md:text-3xl font-extrabold text-text">
 {loading ? <span className="text-text-muted animate-pulse">—</span> : <AnimatedNumber value={totalMinutes} formatFn={formatTime} />}
 </span>
 <span className="text-xs md:text-sm text-text-muted font-bold mt-1 tracking-wide">Recorded</span>
 </div>
 <div className="relative flex flex-col items-center justify-center w-full sm:w-[110px] md:w-32 h-24 md:h-28 rounded-3xl md:rounded-[32px] bg-primary-container/30 border border-primary/30 overflow-hidden group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] z-0">
 <div className="w-full h-full animate-spin-once bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] opacity-0"/>
 </div>
 <div className="absolute inset-[1px] bg-surface-container rounded-[31px] z-10"/>
 
 <div className="relative z-20 flex flex-col items-center justify-center">
 <RiShieldCheckLine className="w-8 h-8 md:w-10 md:h-10 text-primary mb-2"/>
 <span className="text-xs md:text-sm text-text font-bold tracking-wide">Active</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
