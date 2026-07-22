"use client";

export function MemorySkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-3">
        <div className="w-36 h-4 rounded md3-skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl md3-skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
