export function ModelSelectionSkeleton() {
  return (
    <section className="relative overflow-hidden bg-surface-container-low border border-outline-variant/15 rounded-[28px] p-6 sm:p-8 animate-pulse flex flex-col gap-6 shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[18px] bg-surface-container-highest shrink-0" />
          <div className="flex flex-col gap-2">
            <div className="w-48 h-6 rounded-full bg-surface-container-highest" />
            <div className="w-64 h-4 rounded-full bg-surface-container-highest/70" />
          </div>
        </div>
        <div className="w-40 h-8 rounded-full bg-surface-container-highest shrink-0" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="w-28 h-3.5 rounded-full bg-surface-container-highest/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="h-[96px] rounded-[24px] bg-surface-container-high/60 border border-outline-variant/15" />
          <div className="h-[96px] rounded-[24px] bg-surface-container-high/60 border border-outline-variant/15" />
        </div>
      </div>
    </section>
  );
}
