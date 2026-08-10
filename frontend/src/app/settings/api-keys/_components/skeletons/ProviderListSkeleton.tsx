export function ProviderListSkeleton() {
  return (
    <div className="flex flex-col border border-border rounded-[24px] overflow-hidden bg-surface shadow-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4 border-b border-border last:border-b-0 animate-pulse">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-surface2 shrink-0"></div>
            <div className="h-4 bg-surface2 rounded w-24 shrink-0"></div>
            <div className="h-7 bg-surface2 rounded-full w-32 ml-4"></div>
          </div>
          <div className="w-[100px] h-8 rounded-full bg-surface2 shrink-0"></div>
        </div>
      ))}
    </div>
  );
}
