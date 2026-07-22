"use client";

import { CardSkeleton } from "./CardSkeleton";

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 w-fit">
          <div className="w-5 h-5 rounded-full border-2 border-border/50 md3-skeleton" />
          <div className="w-24 h-[18px] rounded md3-skeleton" />
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
