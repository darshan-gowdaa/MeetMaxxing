export function AnswerSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Answer card skeleton */}
      <div className="bg-surface-container rounded-[32px] border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-surface-container-highest" />
            <div className="w-32 h-5 rounded-full bg-surface-container-highest" />
          </div>
          <div className="w-20 h-6 rounded-full bg-surface-container-highest" />
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3">
          <div className="w-full h-4 rounded-full bg-surface-container-highest" />
          <div className="w-11/12 h-4 rounded-full bg-surface-container-highest" />
          <div className="w-4/5 h-4 rounded-full bg-surface-container-highest" />
          <div className="w-full h-4 rounded-full bg-surface-container-highest mt-2" />
          <div className="w-3/4 h-4 rounded-full bg-surface-container-highest" />
        </div>
      </div>

      {/* Sources accordion skeleton */}
      <div className="bg-surface-container rounded-[32px] border border-border">
        <div className="flex items-center gap-2 p-4">
          <div className="w-5 h-5 rounded-full bg-surface-container-highest" />
          <div className="w-24 h-5 rounded-full bg-surface-container-highest" />
        </div>
      </div>
    </div>
  );
}
