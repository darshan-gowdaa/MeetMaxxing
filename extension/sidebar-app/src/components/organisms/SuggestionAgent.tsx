import { SuggestionCard } from "../molecules/SuggestionCard";
import { Skeleton } from "../atoms/Skeleton";

export function SuggestionAgent({ suggestions, isProcessing }: { suggestions: string[]; isProcessing?: boolean }) {
  return (
    <div className="bg-primary-dim border-border rounded-[24px] border p-3 min-h-[140px] flex flex-col">
      <div className="flex items-center gap-2 shrink-0 h-[24px]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
          <i className="ri-sparkling-line text-sm" /> Answers
        </h3>
      </div>
      <div className="mt-2 flex flex-col gap-2 flex-1">
        {suggestions.length > 0 ? (
          suggestions.map((sug, idx) => <SuggestionCard key={idx} text={sug} />)
        ) : isProcessing ? (
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <Skeleton lines={3} />
            <Skeleton lines={2} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-text-variant italic text-center py-3 px-4 bg-surface-container rounded-[20px] border border-border w-full">
              Click &ldquo;Generate AI Insights&rdquo; when ready.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
