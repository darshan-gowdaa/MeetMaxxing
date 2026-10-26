"use client";

import { M3Skeleton } from "@/components/atoms/M3Skeleton";
import { CardSkeleton } from "@/components/molecules/skeletons/CardSkeleton";

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 w-fit">
          <M3Skeleton variant="circular" className="w-5 h-5 border border-outline-variant/20" />
          <M3Skeleton variant="text" className="w-24 h-[18px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default GridSkeleton;
