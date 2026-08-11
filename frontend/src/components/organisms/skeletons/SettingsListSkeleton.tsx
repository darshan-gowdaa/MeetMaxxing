export function SettingsListSkeleton() {
  return (
    <div className="bg-surface-container rounded-[32px] p-8 flex flex-col gap-6 border border-border animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="w-40 h-6 rounded-full bg-surface-container-highest" />
              <div className="w-56 h-4 rounded-full bg-surface-container-highest" />
            </div>
            <div className="w-14 h-8 rounded-full bg-surface-container-highest" />
          </div>
          {i !== 3 && <div className="h-px w-full bg-border/50" />}
        </div>
      ))}
    </div>
  );
}
