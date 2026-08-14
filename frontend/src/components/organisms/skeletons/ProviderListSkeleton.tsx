export function ProviderListSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      {[1, 2].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <div className="h-[22.5px] w-40 bg-surface-container-highest rounded-full mx-2" />
          <div className="flex flex-col border border-border rounded-[24px] overflow-hidden bg-surface shadow-sm">
            {[1, 2, 3].map((i, idx, arr) => (
              <div key={i} className={`p-4 sm:p-5 flex flex-col md:grid md:grid-cols-[240px_1fr_auto] md:items-center gap-4 md:gap-6 ${idx !== arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest shrink-0" />
                  <div className="flex flex-col gap-2 w-full">
                    <div className="h-[18px] bg-surface-container-highest rounded-full w-24" />
                    <div className="h-[14px] bg-surface-container-highest rounded-full w-16" />
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="h-[26px] bg-surface-container-highest rounded-full w-32" />
                </div>
                <div className="flex items-center justify-end w-full md:w-auto gap-2 shrink-0 mt-2 md:mt-0">
                  <div className="h-10 w-[90px] rounded-full bg-surface-container-highest shrink-0" />
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
