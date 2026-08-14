export function SettingsListSkeleton() {
  return (
    <div className="bg-surface-container rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 flex flex-col gap-5 sm:gap-6 border border-border animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-5 sm:gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full">
              <div className="w-32 sm:w-40 h-[26px] rounded-full bg-surface-container-highest" />
              <div className="w-48 sm:w-56 h-[20px] rounded-full bg-surface-container-highest" />
            </div>
            <div className="w-11 h-6 rounded-full bg-surface-container-highest shrink-0" />
          </div>
          {i !== 3 && <div className="h-px w-full bg-border" />}
        </div>
      ))}
    </div>
  );
}
