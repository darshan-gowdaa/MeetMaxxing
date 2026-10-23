"use client";

export function MeetingSkeleton() {
  return (
    <div className="relative min-h-screen bg-bg text-text font-sans pb-24 overflow-x-hidden animate-pulse">
      {/* Ambient Atmospheric Backdrop skeleton */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/12 via-tertiary/6 to-transparent blur-3xl opacity-75" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header card skeleton */}
        <header className="relative bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-4 shadow-none">
          {/* 1. Top Meta Row skeleton */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-28 h-6 rounded-full bg-surface-container-highest" />
            <div className="w-56 h-6 rounded-full bg-surface-container-highest" />
            <div className="w-20 h-6 rounded-full bg-surface-container-highest" />
            <div className="w-36 h-6 rounded-full bg-surface-container-highest" />
          </div>

          {/* 2. Title row skeleton with edit button */}
          <div className="flex items-center gap-3 w-full">
            <div className="w-3/5 sm:w-1/2 h-9 sm:h-10 rounded-full bg-surface-container-highest" />
            <div className="w-8 h-8 rounded-full bg-surface-container-highest shrink-0" />
            <div className="w-24 h-7 rounded-full bg-surface-container-highest shrink-0 hidden sm:block" />
          </div>

          {/* 3. Avatar stack & participants skeleton */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className="flex items-center -space-x-2 shrink-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-container-highest ring-2 ring-surface-container-low" />
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-container-highest ring-2 ring-surface-container-low" />
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-surface-container-highest ring-2 ring-surface-container-low" />
            </div>
            <div className="w-24 h-5 rounded-full bg-surface-container-highest" />
            <div className="w-28 h-5 rounded-full bg-surface-container-highest" />
          </div>

          {/* 4. Action buttons toolbar skeleton */}
          <div className="flex flex-wrap items-center gap-2.5 pt-5 mt-2 border-t border-outline-variant/15">
            <div className="w-36 h-10 rounded-full bg-surface-container-high" />
            <div className="w-36 h-10 rounded-full bg-surface-container-high" />
            <div className="w-28 h-10 rounded-full bg-surface-container-high" />
            <div className="w-24 h-10 rounded-full bg-surface-container-high ml-auto sm:ml-0" />
          </div>
        </header>

        {/* Segmented tabs skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="inline-flex p-1.5 rounded-full bg-surface-container-low border border-outline-variant/15 shadow-xs gap-1.5">
            <div className="w-36 sm:w-40 h-8 sm:h-9 rounded-full bg-surface-container-highest" />
            <div className="w-32 sm:w-36 h-8 sm:h-9 rounded-full bg-surface-container-high/60" />
            <div className="w-32 sm:w-36 h-8 sm:h-9 rounded-full bg-surface-container-high/60" />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-surface-container-highest" />
            <div className="w-28 h-4 rounded-full bg-surface-container-highest" />
          </div>
        </div>

        {/* Content sections skeleton */}
        <div className="flex flex-col gap-6">
          {/* Executive Summary skeleton */}
          <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-surface-container-highest shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <div className="w-44 h-6 rounded-full bg-surface-container-highest" />
                  <div className="w-56 h-3.5 rounded-full bg-surface-container-highest/70" />
                </div>
              </div>
              <div className="w-20 h-7 rounded-full bg-surface-container-highest" />
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="w-full h-4 rounded-full bg-surface-container-highest" />
              <div className="w-full h-4 rounded-full bg-surface-container-highest" />
              <div className="w-5/6 h-4 rounded-full bg-surface-container-highest" />
              <div className="w-2/3 h-4 rounded-full bg-surface-container-highest" />
            </div>
          </section>

          {/* Key Decisions skeleton */}
          <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-surface-container-highest shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <div className="w-36 h-6 rounded-full bg-surface-container-highest" />
                  <div className="w-48 h-3.5 rounded-full bg-surface-container-highest/70" />
                </div>
              </div>
              <div className="w-20 h-7 rounded-full bg-surface-container-highest" />
            </div>
            <div className="grid grid-cols-1 gap-3 pt-1">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-[20px] bg-surface-container/60 border border-outline-variant/15 p-4 flex flex-col gap-2"
                >
                  <div className="w-3/4 h-4 rounded-full bg-surface-container-highest" />
                  <div className="w-1/3 h-3 rounded-full bg-surface-container-highest/70" />
                </div>
              ))}
            </div>
          </section>

          {/* Action Items skeleton */}
          <section className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 flex flex-col gap-5 shadow-none">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-surface-container-highest shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <div className="w-32 h-6 rounded-full bg-surface-container-highest" />
                  <div className="w-40 h-3.5 rounded-full bg-surface-container-highest/70" />
                </div>
              </div>
              <div className="w-24 h-7 rounded-full bg-surface-container-highest" />
            </div>
            <div className="flex flex-col gap-3 pt-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[20px] bg-surface-container/60 border border-outline-variant/15 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-surface-container-highest shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="w-3/4 h-4 rounded-full bg-surface-container-highest" />
                      <div className="w-1/3 h-3 rounded-full bg-surface-container-highest/70" />
                    </div>
                  </div>
                  <div className="w-16 h-6 rounded-full bg-surface-container-highest shrink-0" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
