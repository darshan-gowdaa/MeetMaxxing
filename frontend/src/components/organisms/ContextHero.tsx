"use client";

import { RiFolderOpenFill, RiUploadCloud2Line } from"@remixicon/react";
import AnimatedNumber from"@/components/atoms/AnimatedNumber";

interface ContextHeroProps {
 loading: boolean;
 filesCount: number;
 totalSizeKB: number;
 setShowUpload: (val: boolean) => void;
}

export default function ContextHero({ loading, filesCount, totalSizeKB, setShowUpload }: ContextHeroProps) {
 return (
 <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 md:p-10">
 <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
 style={{ background:"radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)"}} />
 <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
 style={{ background:"radial-gradient(circle, var(--grad-tertiary) 0%, transparent 70%)"}} />

 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="flex flex-col gap-2">
 <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-widest">
 <RiFolderOpenFill className="w-3.5 h-3.5"/>
 Global Knowledge Base
 </div>
 <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-tight">
 Context
 <span className="bg-primary from-primary to-tertiary text-primary"> Manager</span>
 </h1>
 <p className="text-[14px] text-text-muted max-w-md leading-relaxed">
 Manage global documents for context-aware Q&A across all your meetings.
 </p>
 </div>

 <div className="flex items-center gap-3 flex-wrap">
 <div className="flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-surface2 border border-border">
 {loading ? (
 <div className="w-8 h-8 rounded-md md3-skeleton mb-1"/>
 ) : (
 <span className="text-2xl font-bold text-text">
 <AnimatedNumber value={filesCount} />
 </span>
 )}
 <span className="text-[10px] text-text-muted font-medium mt-1">Files</span>
 </div>
 <div className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-surface2 border border-border">
 {loading ? (
 <div className="w-12 h-8 rounded-md md3-skeleton mb-1"/>
 ) : (
 <span className="text-xl font-bold text-text">
 <AnimatedNumber value={totalSizeKB} formatFn={(v) => `${(v/1024).toFixed(1)}MB`} />
 </span>
 )}
 <span className="text-[10px] text-text-muted font-medium mt-1">Total Size</span>
 </div>
 <button 
 onClick={() => setShowUpload(true)}
 className="relative group flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-surface2 border border-border overflow-hidden text-text hover:border-transparent spring-sm active:opacity-80"
 >
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 /2 w-[150%] h-[150%] z-0">
 <div className="absolute inset-0 w-full h-full animate-[spin-fade_1.5s_ease-in-out_2_forwards] bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] opacity-0"/>
 <div className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
 </div>
 <div className="absolute inset-[1px] bg-surface2 group-hover:bg-surface3 rounded-[19px] z-10 transition-colors duration-300"/>
 
 <div className="relative z-20 flex flex-col items-center justify-center pointer-events-none">
 <RiUploadCloud2Line className="w-6 h-6 mb-1 text-text-muted group-hover:text-primary transition-colors duration-300"/>
 <span className="text-[12px] font-bold">Upload</span>
 </div>
 </button>
 </div>
 </div>
 </div>
 );
}
