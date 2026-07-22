"use client";

import { RiArrowLeftLine as ArrowLeft } from "@remixicon/react";
import Link from "next/link";

export function MeetingSkeleton() {
  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-5">
        
        {/* Back nav */}
        <Link
          href="/"
          className="group flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-text bg-surface-container border border-border rounded-full w-fit mb-2 shadow-sm pointer-events-none"
        >
          <ArrowLeft className="w-4 h-4 text-text-muted" />
          All Meetings
        </Link>

        {/* Header card skeleton */}
        <div className="bg-surface-container rounded-[28px] border border-border overflow-hidden p-6 md:p-8 flex flex-col gap-5">
          <div className="w-48 h-6 rounded-full md3-skeleton mb-2" />
          <div className="w-3/4 h-8 rounded-lg md3-skeleton mb-4" />
          <div className="w-1/3 h-6 rounded-full md3-skeleton" />
          
          <div className="border-t border-border mt-2 pt-5">
            <div className="flex flex-wrap gap-2">
              <div className="w-24 h-6 rounded-full md3-skeleton" />
              <div className="w-24 h-6 rounded-full md3-skeleton" />
              <div className="w-24 h-6 rounded-full md3-skeleton" />
            </div>
          </div>
        </div>

        {/* Executive Summary Skeleton */}
        <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-[12px] md3-skeleton" />
            <div className="w-40 h-6 rounded-lg md3-skeleton" />
          </div>
          <div className="w-full h-4 rounded md3-skeleton" />
          <div className="w-full h-4 rounded md3-skeleton" />
          <div className="w-5/6 h-4 rounded md3-skeleton" />
        </div>

        {/* Action Items Skeleton */}
        <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-[12px] md3-skeleton" />
            <div className="w-32 h-6 rounded-lg md3-skeleton" />
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-20 rounded-[16px] md3-skeleton" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
