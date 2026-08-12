import { CopyButton } from "../atoms/CopyButton";
import { MarkdownView } from "../atoms/MarkdownView";

/** Single AI suggestion card with copy button and click-to-copy on body */
export function SuggestionCard({ text }: { text: string }) {
  return (
    <div className="p-4 rounded-[24px] bg-surface-container border border-border hover:brightness-110 text-[13px] text-text transition-all duration-300 group">
      <div className="flex justify-between items-start gap-3 w-full">
        <div className="flex-1 min-w-0 break-words">
          <MarkdownView
            className="leading-relaxed cursor-pointer active:opacity-70 markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 whitespace-pre-wrap"
            children={text}
          />
        </div>
        <div className="shrink-0">
          <CopyButton text={text} />
        </div>
      </div>
    </div>
  );
}
