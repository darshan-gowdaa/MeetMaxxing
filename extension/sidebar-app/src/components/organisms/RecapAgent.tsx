import { useState } from "react";
import { copyToClipboard } from "../../lib/utils";
import { MarkdownView } from "../atoms/MarkdownView";
import { Skeleton } from "../atoms/Skeleton";

export function RecapAgent({ recap, isProcessing }: { recap: string; isProcessing?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-tertiary-container border-border rounded-[24px] border p-3 min-h-[140px] flex flex-col">
      <div className="flex items-center justify-between mb-1 shrink-0 h-[28px]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-tertiary-container flex items-center gap-2">
          <i className="ri-article-fill text-sm" /> AI Recap
        </h3>
        {recap && !isProcessing && (
          <button
            onClick={() => copyToClipboard(recap, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-tertiary-container text-text-muted hover:text-on-tertiary-container active:opacity-80 transition-all shadow-sm"
            title="Copy Recap"
          >
            <i className={copied ? "ri-check-line text-success" : "ri-clipboard-line"} />
          </button>
        )}
      </div>
      <div className="mt-2 flex-1 flex flex-col justify-center">
        {isProcessing ? (
          <div className="flex flex-col gap-2 flex-1 relative cursor-not-allowed">
            <div className="absolute inset-0 z-10"></div>
            <Skeleton lines={3} />
            <Skeleton lines={2} />
            <Skeleton lines={1} />
          </div>
        ) : recap ? (
          <div className="rounded-[24px] bg-surface-container border border-border text-[13px] text-text leading-relaxed shadow-inner overflow-hidden transition-all hover:brightness-110 break-words">
            <MarkdownView
              className="recap-markdown p-3.5"
              children={recap}
            />
          </div>
        ) : (
          <div className="text-xs text-text-variant italic text-center py-3 px-4 bg-surface-container rounded-[20px] border border-border w-full">
            Click &ldquo;Generate AI Insights&rdquo; for an executive summary.
          </div>
        )}
      </div>
    </div>
  );
}
