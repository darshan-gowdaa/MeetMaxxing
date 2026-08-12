"use client";

import { RiFolderOpenFill, RiUploadCloud2Line } from"@remixicon/react";
import AnimatedNumber from"@/components/atoms/AnimatedNumber";
import PageHero from "./PageHero";

interface ContextHeroProps {
 loading: boolean;
 filesCount: number;
 totalSizeKB: number;
 setShowUpload: (val: boolean) => void;
}

export default function ContextHero({ loading, filesCount, totalSizeKB, setShowUpload }: ContextHeroProps) {
  return (
    <PageHero
      icon={RiFolderOpenFill}
      pretitle="Global Knowledge Base"
      title="Context"
      titleHighlight="Manager"
      description="Manage global documents for context-aware Q&A across all your meetings."
      stats={[
        { loading, value: <AnimatedNumber value={filesCount} />, label: "Files" },
        { loading, value: <AnimatedNumber value={totalSizeKB} formatFn={(v) => `${(v/1024).toFixed(1)}MB`} />, label: "Total Size" },
      ]}
      action={
        <button 
          onClick={() => setShowUpload(true)}
          className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-primary-container text-on-primary-container hover:brightness-125 transition-all duration-300 active:opacity-80 border border-primary/20 shadow-sm"
        >
          <RiUploadCloud2Line className="w-6 h-6 mb-1"/>
          <span className="text-[12px] font-bold">Upload</span>
        </button>
      }
    />
  );
}
