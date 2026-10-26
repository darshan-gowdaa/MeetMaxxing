"use client";

import { M3Skeleton } from "@/components/atoms/M3Skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-[28px] sm:rounded-[32px] border border-outline-variant/15 bg-surface-container-low p-5 flex flex-col h-[220px] justify-between relative overflow-hidden shadow-none">
      {/* Top chip & menu skeleton */}
      <div className="flex items-center justify-between">
        <M3Skeleton variant="text" className="w-28 h-6" />
        <M3Skeleton variant="circular" className="w-8 h-8" />
      </div>

      {/* Title skeleton */}
      <div className="flex flex-col gap-2 mt-2">
        <M3Skeleton variant="text" className="w-3/4 h-5" />
        <M3Skeleton variant="text" className="w-1/2 h-5" />
      </div>

      {/* Description lines skeleton */}
      <div className="flex flex-col gap-2 my-2">
        <M3Skeleton variant="text" className="w-full h-3 opacity-70" />
        <M3Skeleton variant="text" className="w-4/5 h-3 opacity-70" />
      </div>

      {/* Footer skeleton */}
      <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between mt-auto">
        <M3Skeleton variant="text" className="w-24 h-4" />
        <M3Skeleton variant="circular" className="w-7 h-7" />
      </div>
    </div>
  );
}

export default CardSkeleton;
