export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-3xl animate-pulse">
      <div className="h-[36px] w-24 sm:w-32 rounded-full bg-surface-container-highest" />
      
      <div className="flex flex-col gap-6">
        {/* Profile Hero Skeleton */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center md:items-start p-5 md:p-6 rounded-[24px] bg-surface border border-border shadow-sm mb-2">
          <div className="w-24 h-24 rounded-full bg-surface-container-highest shrink-0" />
          <div className="flex-1 flex flex-col gap-3 w-full">
            <div className="h-[20px] w-24 rounded-full bg-surface-container-highest" />
            <div className="flex gap-2 w-full">
              <div className="flex-1 h-[46px] rounded-xl bg-surface-container-highest" />
              <div className="w-[84px] h-[46px] rounded-xl bg-surface-container-highest" />
            </div>
            <div className="h-[20px] w-48 rounded-full bg-surface-container-highest" />
          </div>
        </div>

        {/* Profile Security Skeleton */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 p-5 md:p-6 rounded-[24px] bg-surface-container border border-border shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="h-[22px] w-36 rounded-full bg-surface-container-highest" />
              <div className="h-[20px] w-64 max-w-full rounded-full bg-surface-container-highest mt-1" />
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="w-full sm:w-[200px] h-[46px] rounded-xl bg-surface-container-highest" />
                <div className="w-full sm:w-[150px] h-[46px] rounded-xl bg-surface-container-highest" />
              </div>
              <div className="h-[24px] w-full sm:w-[250px] rounded-full bg-surface-container-highest mt-2" />
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5 md:p-6 rounded-[24px] bg-surface-container border border-border shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="h-[22px] w-32 rounded-full bg-surface-container-highest" />
              <div className="h-[20px] w-full sm:w-3/4 rounded-full bg-surface-container-highest mt-1" />
            </div>
            <div className="mt-2">
              <div className="w-[140px] h-[46px] rounded-xl bg-surface-container-highest" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
