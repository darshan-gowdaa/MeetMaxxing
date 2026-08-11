import { useState, useRef, useEffect } from "react";
import { copyToClipboard } from "../lib/utils";
import type { TranscriptChunk } from "../types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// ── Pulsing placeholder skeleton ─────────────────────────────────────────────
function PulsePlaceholder({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-4/5", "w-3/5"];
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-[24px] bg-surface-container border border-border animate-pulse min-h-[60px]">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full bg-surface-container-highest ${widths[i % widths.length]}`}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// ── LiveTranscript ────────────────────────────────────────────────────────────
export function LiveTranscript({ transcriptLines, onClear }: { transcriptLines: TranscriptChunk[], onClear: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Only show CC (dom) lines — no select needed, always CC only in Feed
  const filteredLines = transcriptLines.filter(line => {
    return searchQuery.trim() === ""
      ? true
      : line.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.speaker.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    setAutoScroll(scrollHeight - Math.ceil(scrollTop) - clientHeight < 40);
  };

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      setTimeout(() => {
        if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }, 50);
    }
  }, [transcriptLines.length, autoScroll, searchQuery]);

  return (
    <div className="bg-surface-container border-border rounded-[24px] border p-3 flex-1 flex flex-col min-h-0 transition-colors duration-300">
      <div className="flex items-center justify-between mb-2 shrink-0 h-[28px]">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
            <i className="ri-chat-voice-fill text-sm"></i>
            Live Feed
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-primary-container text-[9px] font-extrabold text-on-primary-container font-mono">
            {filteredLines.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <i className="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-[10px]"></i>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-highest border border-border rounded-full text-[11px] font-medium text-text py-1 pl-6 pr-6 outline-none focus:border-primary/50 transition-colors w-24 placeholder:text-text-muted"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              >
                <i className="ri-close-circle-fill text-[11px]"></i>
              </button>
            )}
          </div>
          <button
            onClick={() => {
              const fullText = filteredLines.map(l => `[${l.speaker}]: ${l.text}`).join('\n');
              copyToClipboard(fullText, () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); });
            }}
            title="Copy Transcript"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-text-muted hover:text-text active:opacity-80 transition-all"
          >
            <i className={copiedAll ? "ri-check-line text-success text-[12px]" : "ri-clipboard-line text-[12px]"}></i>
          </button>
          <button
            onClick={onClear}
            title="Clear Feed"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-risk-container text-text-muted hover:text-on-risk-container active:opacity-80 transition-all"
          >
            <i className="ri-delete-bin-line text-[12px]"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-[20px] border border-border min-h-0 relative mt-2 bg-surface">
        <div ref={feedRef} onScroll={handleScroll} className="h-full overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
          {filteredLines.length === 0 ? (
            searchQuery ? (
              <p className="text-xs text-text-muted italic text-center p-4 bg-surface-container rounded-2xl border border-border">
                No results found for &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-text-muted italic text-center p-4 bg-surface-container rounded-2xl border border-border">
                Enable Captions (CC) — live speech will appear here
              </p>
            )
          ) : (
            filteredLines.map((line, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 p-4 rounded-[20px] bg-surface-container-high border border-border hover:brightness-110 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase ${line.speaker === 'You' ? 'text-success' : 'text-primary'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] shrink-0 border ${line.speaker === 'You' ? 'bg-success-container border-success-container text-on-success-container' : 'bg-primary-container border-primary-container text-on-primary-container'}`}>
                      {line.speaker.charAt(0)}
                    </div>
                    {line.speaker}
                  </span>
                  {line.timestamp && line.timestamp > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-surface-container-highest text-text-muted font-mono border border-border">
                      {(() => {
                        const d = new Date(line.timestamp || 0);
                        return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
                      })()}
                    </span>
                  )}
                </div>
                <span className="text-[13px] text-text leading-relaxed break-words pl-6">{line.text}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {!autoScroll && (
          <button
            onClick={() => { setAutoScroll(true); if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary hover:brightness-110 text-on-primary rounded-full shadow-lg flex items-center justify-center transition-transform active:opacity-80 z-10"
            title="Resume auto-scroll"
          >
            <i className="ri-arrow-down-line"></i>
          </button>
        )}
      </div>
    </div>
  );
}

// ── SuggestionAgent ───────────────────────────────────────────────────────────
export function SuggestionAgent({ suggestions, isProcessing }: { suggestions: string[], isProcessing?: boolean }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  return (
    <div className="bg-primary-dim border-border rounded-[24px] border p-3 min-h-[140px] flex flex-col">
      <div className="flex items-center gap-2 shrink-0 h-[24px]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
          <i className="ri-sparkling-line text-sm"></i> Answers
        </h3>
      </div>

      <div className="mt-2 flex flex-col gap-2 flex-1">
        {suggestions.length > 0 ? (
          suggestions.map((sug: string, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-[24px] bg-surface-container border border-border hover:brightness-110 text-[13px] text-text transition-all duration-300 group"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="leading-relaxed cursor-pointer active:opacity-70 markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 whitespace-pre-wrap" onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{sug}</ReactMarkdown>
                </div>
                <button
                  onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-primary-container text-text-muted hover:text-on-primary-container active:opacity-80 transition-all shrink-0"
                >
                  {copiedIdx === idx ? <i className="ri-check-line text-success"></i> : <i className="ri-clipboard-line"></i>}
                </button>
              </div>
            </div>
          ))
        ) : isProcessing ? (
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <PulsePlaceholder lines={3} />
            <PulsePlaceholder lines={2} />
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

// ── NextQuestionAgent ─────────────────────────────────────────────────────────
export function NextQuestionAgent({ nextQuestion, isProcessing, onSendToIntelliAgent }: { nextQuestion: string, isProcessing?: boolean, onSendToIntelliAgent?: (q: string) => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-secondary-container border-border rounded-[24px] border p-3 min-h-[100px] flex flex-col">
      <div className="flex items-center gap-2 mb-1 shrink-0 h-[24px]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-secondary-container flex items-center gap-2">
          <i className="ri-question-answer-fill text-sm"></i> What to Ask
        </h3>
      </div>

      <div className="mt-1 flex-1 flex flex-col justify-center">
        {nextQuestion ? (
          <div
            onClick={() => copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            className="p-4 rounded-[24px] bg-surface-container border border-border hover:brightness-110 text-[13px] text-text transition-all duration-300 group cursor-pointer"
          >
            <div className="flex justify-between items-start gap-3">
              <span className="leading-relaxed font-medium active:opacity-70">{nextQuestion}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-secondary-container text-text-muted hover:text-on-secondary-container active:opacity-80 transition-all"
                  title="Copy"
                >
                  <i className={copied ? "ri-check-line text-success" : "ri-clipboard-line"}></i>
                </button>
                {onSendToIntelliAgent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSendToIntelliAgent(nextQuestion); }}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-primary hover:brightness-110 text-on-primary active:opacity-80 transition-all shadow-sm"
                    title="Send to AI Chat"
                  >
                    <i className="ri-arrow-right-up-line"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : isProcessing ? (
          <PulsePlaceholder lines={2} />
        ) : (
          <div className="text-xs text-text-variant italic text-center py-3 px-4 bg-surface-container rounded-[20px] border border-border w-full">
            Click &ldquo;Generate AI Insights&rdquo; to formulate a question.
          </div>
        )}
      </div>
    </div>
  );
}

// ── RecapAgent ────────────────────────────────────────────────────────────────
export function RecapAgent({ recap, isProcessing }: { recap: string, isProcessing?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-tertiary-container border-border rounded-[24px] border p-3 min-h-[140px] flex flex-col">
      <div className="flex items-center justify-between mb-1 shrink-0 h-[28px]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-on-tertiary-container flex items-center gap-2">
          <i className="ri-article-fill text-sm"></i> AI Recap
        </h3>
        {recap && !isProcessing && (
          <button
            onClick={() => copyToClipboard(recap, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-surface-container-high hover:bg-tertiary-container text-text-muted hover:text-on-tertiary-container active:opacity-80 transition-all shadow-sm"
            title="Copy Recap"
          >
            <i className={copied ? "ri-check-line text-success" : "ri-clipboard-line"}></i>
          </button>
        )}
      </div>

      <div className="mt-2 flex-1 flex flex-col justify-center">
        {recap ? (
          <div className="rounded-[24px] bg-surface-container border border-border text-[13px] text-text leading-relaxed shadow-inner overflow-hidden transition-all hover:brightness-110">
            <div
              className="recap-markdown p-3.5"
              style={{ fontFamily: "'Google Sans', 'Google Sans Text', system-ui, sans-serif" }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{recap}</ReactMarkdown>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col gap-2 flex-1">
            <PulsePlaceholder lines={3} />
            <PulsePlaceholder lines={2} />
            <PulsePlaceholder lines={1} />
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
