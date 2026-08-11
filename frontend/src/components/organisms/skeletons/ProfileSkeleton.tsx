export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-3xl animate-pulse">
      <div className="h-9 w-32 rounded-full bg-surface-container-highest" />
      
      <div className="flex flex-col gap-6">
        {/* Profile Hero Skeleton */}
        <div className="bg-surface-container rounded-[32px] p-8 flex flex-col sm:flex-row gap-6 border border-border">
          <div className="w-24 h-24 rounded-full bg-surface-container-highest shrink-0" />
          <div className="flex flex-col gap-3 w-full">
            <div className="h-6 w-1/3 rounded-full bg-surface-container-highest" />
            <div className="h-4 w-1/2 rounded-full bg-surface-container-highest" />
            <div className="h-10 w-full rounded-full bg-surface-container-highest mt-2" />
          </div>
        </div>

        {/* Profile Security Skeleton */}
        <div className="bg-surface-container rounded-[32px] p-8 flex flex-col gap-6 border border-border">
          <div className="h-6 w-1/3 rounded-full bg-surface-container-highest" />
          <div className="h-4 w-1/2 rounded-full bg-surface-container-highest" />
          <div className="h-12 w-full rounded-full bg-surface-container-highest mt-2" />
        </div>
      </div>
    </div>
  );
}
