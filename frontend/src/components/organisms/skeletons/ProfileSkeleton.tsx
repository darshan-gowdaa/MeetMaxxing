"use client";

import { M3Skeleton } from "@/components/atoms/M3Skeleton";

export function ProfileSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <M3Skeleton variant="text" className="h-[36px] w-36" />

      <div className="flex flex-col gap-6">
        {/* Profile Hero Skeleton */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center md:items-start p-6 sm:p-8 rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-none mb-2">
          {/* Avatar Column */}
          <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
            <M3Skeleton variant="circular" className="w-24 h-24 shrink-0" />
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 max-w-[280px]">
              <M3Skeleton variant="text" className="w-28 h-7" />
              <M3Skeleton variant="text" className="w-16 h-7" />
            </div>
            <M3Skeleton variant="text" className="w-20 h-4 mt-0.5" />
          </div>

          {/* Form Column */}
          <div className="flex-1 flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <M3Skeleton variant="text" className="h-4 w-28" />
                <M3Skeleton variant="card" className="h-[48px] rounded-[20px] border border-outline-variant/30" />
              </div>
              <div className="flex flex-col gap-1.5">
                <M3Skeleton variant="text" className="h-4 w-36" />
                <M3Skeleton variant="card" className="h-[48px] rounded-[20px] border border-outline-variant/30" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <M3Skeleton variant="text" className="h-4 w-44" />
              <M3Skeleton variant="text" className="w-full sm:w-32 h-[44px]" />
            </div>
          </div>
        </div>

        {/* Profile Security Skeleton */}
        <div className="flex flex-col gap-6">
          {/* Password Card */}
          <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-none">
            <div className="flex flex-col gap-1.5">
              <M3Skeleton variant="text" className="h-5 w-40" />
              <M3Skeleton variant="text" className="h-4 w-64 max-w-full opacity-70" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mt-2">
              <M3Skeleton variant="card" className="w-full sm:flex-1 h-[48px] rounded-[20px] border border-outline-variant/30" />
              <M3Skeleton variant="text" className="w-full sm:w-36 h-[44px] shrink-0" />
            </div>
          </div>

          {/* Data Management / GDPR Export Card */}
          <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-none">
            <div className="flex flex-col gap-1.5">
              <M3Skeleton variant="text" className="h-5 w-56" />
              <M3Skeleton variant="text" className="h-4 w-full sm:w-4/5 opacity-70" />
            </div>
            <div className="mt-1">
              <M3Skeleton variant="text" className="w-full sm:w-48 h-[44px]" />
            </div>
          </div>

          {/* Delete Account Card */}
          <div className="flex flex-col gap-4 p-6 sm:p-8 rounded-[28px] bg-surface-container-low border border-outline-variant/15 shadow-none">
            <div className="flex flex-col gap-1.5">
              <M3Skeleton variant="text" className="h-5 w-32" />
              <M3Skeleton variant="text" className="h-4 w-full sm:w-3/4 opacity-70" />
            </div>
            <div className="mt-1">
              <M3Skeleton variant="text" className="w-full sm:w-36 h-[44px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSkeleton;
