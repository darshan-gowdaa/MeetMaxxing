export default function SettingsLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-[32px] sm:h-[36px] w-48 bg-surface-container-highest rounded-full" />
        <div className="h-[18px] w-72 bg-surface-container-highest/70 rounded-full" />
      </div>
      <div className="flex flex-col gap-6">
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
          <div className="w-40 h-4 rounded-full bg-surface-container-highest" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 rounded-[20px] bg-surface-container-high/60 border border-outline-variant/15" />
            <div className="h-24 rounded-[20px] bg-surface-container-high/60 border border-outline-variant/15" />
            <div className="h-24 rounded-[20px] bg-surface-container-high/60 border border-outline-variant/15" />
          </div>
        </div>
        <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
          <div className="w-48 h-4 rounded-full bg-surface-container-highest" />
          <div className="h-28 rounded-[20px] bg-surface-container-high/60 border border-outline-variant/15" />
        </div>
      </div>
    </div>
  );
}
