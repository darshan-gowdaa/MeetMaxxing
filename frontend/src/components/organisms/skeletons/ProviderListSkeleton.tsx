"use client";

import { M3Skeleton } from "@/components/atoms/M3Skeleton";

export function ProviderListSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full">
      {[1, 2].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <M3Skeleton variant="text" className="h-[22px] w-44" />
          <div className="flex flex-col bg-surface-container-low rounded-[28px] border border-outline-variant/15 overflow-hidden shadow-none">
            {[1, 2, 3].map((i, idx, arr) => (
              <div
                key={i}
                className={`p-5 sm:p-6 flex flex-col md:grid md:grid-cols-[240px_1fr_auto] md:items-center gap-4 md:gap-6 ${
                  idx !== arr.length - 1 ? "border-b border-outline-variant/15" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <M3Skeleton variant="rounded" className="w-12 h-12 shrink-0" />
                  <div className="flex flex-col gap-2 w-full">
                    <M3Skeleton variant="text" className="h-[18px] w-28" />
                    <M3Skeleton variant="text" className="h-[14px] w-16" />
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <M3Skeleton variant="text" className="h-[26px] w-32" />
                  <M3Skeleton variant="text" className="h-[26px] w-24 hidden sm:block" />
                </div>
                <div className="flex items-center justify-end w-full md:w-auto gap-2 shrink-0 mt-2 md:mt-0">
                  <M3Skeleton variant="text" className="h-10 w-[100px] shrink-0" />
                  <M3Skeleton variant="circular" className="w-10 h-10 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProviderListSkeleton;
