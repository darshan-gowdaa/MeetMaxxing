import { M3Skeleton } from "@/components/atoms/M3Skeleton";

export default function SettingsLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <M3Skeleton variant="text" className="h-[32px] sm:h-[36px] w-48" />
        <M3Skeleton variant="text" className="h-[18px] w-72 opacity-70" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
          <M3Skeleton variant="text" className="w-40 h-4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <M3Skeleton variant="card" className="h-24 rounded-[20px] border border-outline-variant/15" />
            <M3Skeleton variant="card" className="h-24 rounded-[20px] border border-outline-variant/15" />
            <M3Skeleton variant="card" className="h-24 rounded-[20px] border border-outline-variant/15" />
          </div>
        </div>
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
          <M3Skeleton variant="text" className="w-48 h-4" />
          <M3Skeleton variant="card" className="h-28 rounded-[20px] border border-outline-variant/15" />
        </div>
      </div>
    </div>
  );
}
