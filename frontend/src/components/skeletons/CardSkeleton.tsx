"use client";

export function CardSkeleton() {
  return (
    <div className="rounded-[24px] border border-border bg-surface-container/60 p-5 flex flex-col h-[220px] justify-between relative overflow-hidden">
      {/* Top chip & menu skeleton */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-6 rounded-full md3-skeleton" />
        <div className="w-8 h-8 rounded-full md3-skeleton" />
      </div>

      {/* Title skeleton */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="w-3/4 h-5 rounded-md md3-skeleton" />
        <div className="w-1/2 h-5 rounded-md md3-skeleton" />
      </div>

      {/* Description lines skeleton */}
      <div className="flex flex-col gap-2 my-2">
        <div className="w-full h-3 rounded md3-skeleton opacity-70" />
        <div className="w-4/5 h-3 rounded md3-skeleton opacity-70" />
      </div>

      {/* Footer skeleton */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between mt-auto">
        <div className="w-24 h-4 rounded md3-skeleton" />
        <div className="w-7 h-7 rounded-full md3-skeleton" />
      </div>
    </div>
  );
}
