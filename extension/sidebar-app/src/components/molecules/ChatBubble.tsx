import { MarkdownView } from "../atoms/MarkdownView";
import { getWebUrl } from "../../config";

interface ChatBubbleProps {
  role: "user" | "agent";
  content: string;
  sources?: any[];
  onCopy?: () => void;
  copied?: boolean;
}

/** Single chat message bubble — user (right) or agent (left with copy + sources) */
export function ChatBubble({ role, content, sources, onCopy, copied }: ChatBubbleProps) {
  const isAgent = role === "agent";
  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[88%] min-w-0 break-words px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
        isAgent
          ? "bg-surface-container text-text rounded-[24px] rounded-bl-[4px] border border-border"
          : "bg-primary text-on-primary rounded-[24px] rounded-br-[4px] font-medium"
      }`}>
        {isAgent ? (
          <div className="flex flex-col gap-2 relative group">
            {onCopy && (
              <button
                onClick={onCopy}
                className="absolute -top-5 -right-2 p-1.5 rounded-full bg-surface-container-highest hover:brightness-110 text-text opacity-0 group-hover:opacity-100 transition-all active:opacity-80 shadow-sm"
                title="Copy"
              >
                <i className={copied ? "ri-check-line text-primary text-[12px]" : "ri-file-copy-line text-[12px]"} />
              </button>
            )}
            <MarkdownView className="markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>li]:mb-1 font-normal leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </MarkdownView>
            {sources && sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-border">
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold mr-1 flex items-center">Sources</span>
                {Array.from(new Set(sources.map((s: any) => s.filename || s.doc_name || s.title || s.speaker_name || "Document"))).map((name: any, idx) => (
                  <a
                    key={idx}
                    href={`${getWebUrl()}/context?view=${encodeURIComponent(name || "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high text-text text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors border border-border"
                    title={name || "Context Document"}
                  >
                    <i className="ri-file-text-line" /> {name && name.length > 18 ? name.substring(0, 18) + "…" : name || "Document"}
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
