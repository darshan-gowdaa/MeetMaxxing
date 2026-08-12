/** Pulse-skeleton loading placeholder — used while AI data is fetching */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-4/5", "w-3/5"];
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-[24px] bg-surface-container border border-border animate-pulse min-h-[60px]">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full bg-surface-container-highest ${widths[i % widths.length]}`}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
