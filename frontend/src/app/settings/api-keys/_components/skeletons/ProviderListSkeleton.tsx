export function ProviderListSkeleton() {
  return (
    <div className="flex flex-col border border-border rounded-[24px] overflow-hidden bg-surface shadow-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-5 grid grid-cols-1 md:grid-cols-[240px_1fr_auto] items-center gap-6 border-b border-border last:border-b-0 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface2 shrink-0"></div>
            <div className="flex flex-col gap-2 w-full">
              <div className="h-4 bg-surface2 rounded w-24"></div>
              <div className="h-3 bg-surface2 rounded w-16"></div>
            </div>
          </div>
          <div className="h-9 bg-surface2 rounded-full w-40"></div>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-[90px] h-10 rounded-full bg-surface2 shrink-0"></div>
            <div className="w-10 h-10 rounded-full bg-surface2 shrink-0"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
