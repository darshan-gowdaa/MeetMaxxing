import { M3Skeleton } from "@/components/atoms/M3Skeleton";
import { CardSkeleton } from "@/components/molecules/skeletons/CardSkeleton";

/**
 * Context route skeleton — hero stats + file grid, mirroring the real layout
 * adhering to Material 3 & M3E guidelines.
 */
export default function ContextLoading() {
  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col" aria-hidden="true">
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Hero */}
        <div className="rounded-[32px] bg-surface-container-low border border-outline-variant/15 overflow-hidden p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3">
            <M3Skeleton variant="text" className="h-3 w-36" />
            <M3Skeleton variant="text" className="h-9 w-64 max-w-full" />
            <M3Skeleton variant="text" className="h-3.5 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-surface-container-high/60 border border-outline-variant/15 gap-2">
              <M3Skeleton variant="rounded" className="w-10 h-6 rounded-xl" />
              <M3Skeleton variant="text" className="w-12 h-2.5" />
            </div>
            <M3Skeleton variant="text" className="h-12 w-32" />
          </div>
        </div>

        {/* Card grid */}
        <div className="flex flex-col gap-4">
          <M3Skeleton variant="text" className="h-5 w-28" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
