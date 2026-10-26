"use client";

import { M3Skeleton } from "@/components/atoms/M3Skeleton";

export function ModelSelectionSkeleton() {
  return (
    <section className="relative overflow-hidden bg-surface-container-low border border-outline-variant/15 rounded-[28px] p-6 sm:p-8 flex flex-col gap-6 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <M3Skeleton variant="rounded" className="w-10 h-10 rounded-[18px] shrink-0" />
          <div className="flex flex-col gap-2">
            <M3Skeleton variant="text" className="w-48 h-6" />
            <M3Skeleton variant="text" className="w-64 h-4 opacity-70" />
          </div>
        </div>
        <M3Skeleton variant="text" className="w-40 h-8 shrink-0" />
      </div>

      <div className="flex flex-col gap-3">
        <M3Skeleton variant="text" className="w-28 h-3.5 opacity-60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <M3Skeleton variant="card" className="h-[96px] rounded-[24px] border border-outline-variant/15" />
          <M3Skeleton variant="card" className="h-[96px] rounded-[24px] border border-outline-variant/15" />
        </div>
      </div>
    </section>
  );
}

export default ModelSelectionSkeleton;
