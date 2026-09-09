/**
 * Memory route skeleton — hero card + search bar + suggestion chips,
 * mirroring the real layout.
 */
export default function MemoryLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-bg" aria-hidden="true">
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Hero */}
        <div className="rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 flex flex-col items-center gap-4">
          <div className="md3-skeleton w-14 h-14 rounded-[20px]" />
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="md3-skeleton h-6 w-56 max-w-full" />
            <div className="md3-skeleton h-3.5 w-72 max-w-full" />
          </div>
        </div>

        {/* Search bar */}
        <div className="md3-skeleton h-14 w-full rounded-2xl" />

        {/* Suggestion chips */}
        <div className="flex flex-col gap-3">
          <div className="md3-skeleton h-3 w-36" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="md3-skeleton h-[68px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
