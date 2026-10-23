export function SettingsListSkeleton() {
  return (
    <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-6 animate-pulse">
      <div className="w-48 h-4 rounded-full bg-surface-container-highest" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface-container/70 rounded-[24px] p-5 border border-outline-variant/15 flex items-center justify-between gap-4"
          >
            <div className="flex flex-col gap-1.5 w-full">
              <div className="w-36 sm:w-44 h-5 rounded-full bg-surface-container-highest" />
              <div className="w-52 sm:w-64 h-3.5 rounded-full bg-surface-container-highest/70" />
            </div>
            <div className="w-11 h-6 rounded-full bg-surface-container-highest shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
