"use client";

export function MeetingSkeleton() {
  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-16 animate-pulse">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-5">
        {/* Header card skeleton */}
        <div className="bg-surface-container rounded-[32px] border border-border overflow-hidden p-6 md:p-8 flex flex-col gap-5">
          <div className="w-48 h-5 rounded-full bg-surface-container-highest mb-2" />
          <div className="w-3/4 h-8 rounded-full bg-surface-container-highest mb-4" />
          <div className="w-1/3 h-5 rounded-full bg-surface-container-highest" />
          <div className="border-t border-border mt-2 pt-5">
            <div className="flex flex-wrap gap-2">
              <div className="w-24 h-6 rounded-full bg-surface-container-highest" />
              <div className="w-24 h-6 rounded-full bg-surface-container-highest" />
              <div className="w-24 h-6 rounded-full bg-surface-container-highest" />
            </div>
          </div>
        </div>
        {/* Executive Summary skeleton */}
        <div className="bg-surface-container rounded-[32px] border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
            <div className="w-40 h-5 rounded-full bg-surface-container-highest" />
          </div>
          <div className="w-full h-4 rounded-full bg-surface-container-highest" />
          <div className="w-full h-4 rounded-full bg-surface-container-highest" />
          <div className="w-5/6 h-4 rounded-full bg-surface-container-highest" />
        </div>
        {/* Action Items skeleton */}
        <div className="bg-surface-container rounded-[32px] border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
            <div className="w-32 h-5 rounded-full bg-surface-container-highest" />
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-20 rounded-[32px] bg-surface-container-highest" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
