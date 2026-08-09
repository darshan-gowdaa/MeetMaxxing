import { useState, useRef, useEffect } from "react";
import { copyToClipboard } from "../lib/utils";
import type { TranscriptChunk } from "../types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

// ── Pulsing placeholder skeleton ─────────────────────────────────────────────
function PulsePlaceholder({ lines = 3, color = "zinc" }: { lines?: number; color?: string }) {
  const widths = ["w-full", "w-4/5", "w-3/5"];
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-[24px] bg-zinc-800/40 border border-zinc-700/40 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full ${color === 'blue' ? 'bg-blue-700/40' : color === 'emerald' ? 'bg-emerald-700/40' : 'bg-zinc-700/40'} ${widths[i % widths.length]}`}
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
    <div className="md3-card !bg-zinc-800/40 !border-zinc-700/50 !p-3 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-blue-400">
            <i className="ri-chat-voice-fill text-sm"></i>
            Live Feed
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-900/20 border border-blue-800/30 text-[9px] font-extrabold text-blue-400 font-mono">
            {filteredLines.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <i className="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]"></i>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/60 border border-zinc-700/50 rounded-full text-[11px] font-medium text-zinc-300 py-1 pl-6 pr-6 outline-none focus:border-blue-500/50 transition-colors w-24 placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
          >
            <i className={copiedAll ? "ri-check-line text-emerald-400 text-[12px]" : "ri-clipboard-line text-[12px]"}></i>
          </button>
          <button
            onClick={onClear}
            title="Clear Feed"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-400 active:scale-95 transition-all"
          >
            <i className="ri-delete-bin-line text-[12px]"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-[24px] border border-zinc-700/30 min-h-0 relative mt-2">
        <div ref={feedRef} onScroll={handleScroll} className="h-full overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
          {filteredLines.length === 0 ? (
            searchQuery ? (
              <p className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                No results found for &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                Enable Captions (CC) — live speech will appear here
              </p>
            )
          ) : (
            filteredLines.map((line, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 p-4 rounded-[24px] bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-800/50 transition-all hover:-translate-y-0.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase ${line.speaker === 'You' ? 'text-emerald-400' : 'text-blue-400'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9.5px] shrink-0 border ${line.speaker === 'You' ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-blue-500/20 border-blue-500/30'}`}>
                      {line.speaker.charAt(0)}
                    </div>
                    {line.speaker}
                  </span>
                  {line.timestamp && line.timestamp > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-mono border border-zinc-700/50">
                      {(() => {
                        const d = new Date(line.timestamp || 0);
                        return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
                      })()}
                    </span>
                  )}
                </div>
                <span className="text-[13px] text-zinc-200 leading-relaxed break-words pl-6">{line.text}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {!autoScroll && (
          <button
            onClick={() => { setAutoScroll(true); if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-10"
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
    <div className="md3-card !bg-blue-900/10 !border-blue-800/20 !p-3">
      <div className="flex items-center gap-2">
        <h3 className="md3-title !text-blue-400">
          <i className="ri-sparkling-line text-sm"></i> Answers
        </h3>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {suggestions.length > 0 ? (
          suggestions.map((sug: string, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-[28px] bg-zinc-800/60 border border-zinc-700/50 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-900/20 hover:border-blue-500/40 text-[13px] text-zinc-200 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="leading-relaxed cursor-pointer active:opacity-70 markdown-body prose prose-invert prose-sm max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 whitespace-pre-wrap" onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{sug}</ReactMarkdown>
                </div>
                <button
                  onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-700/50 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 active:scale-95 transition-all shrink-0"
                >
                  {copiedIdx === idx ? <i className="ri-check-line text-emerald-400"></i> : <i className="ri-clipboard-line"></i>}
                </button>
              </div>
            </div>
          ))
        ) : isProcessing ? (
          <div className="flex flex-col gap-2">
            <PulsePlaceholder lines={3} color="blue" />
            <PulsePlaceholder lines={2} color="blue" />
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic text-center py-3 px-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
            Click &ldquo;Generate AI Insights&rdquo; when ready.
          </p>
        )}
      </div>
    </div>
  );
}

// ── NextQuestionAgent ─────────────────────────────────────────────────────────
export function NextQuestionAgent({ nextQuestion, isProcessing, onSendToIntelliAgent }: { nextQuestion: string, isProcessing?: boolean, onSendToIntelliAgent?: (q: string) => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="md3-card !bg-cyan-900/20 !border-cyan-800/30 !p-3">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="md3-title !text-cyan-400">
          <i className="ri-question-answer-fill text-sm"></i> What to Ask
        </h3>
      </div>

      <div className="mt-1">
        {nextQuestion ? (
          <div
            onClick={() => copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            className="p-4 rounded-[28px] bg-cyan-900/20 border border-cyan-800/40 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-900/20 hover:border-cyan-500/40 text-[13px] text-zinc-200 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex justify-between items-start gap-3">
              <span className="leading-relaxed font-medium active:opacity-70">{nextQuestion}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                  className="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-700/50 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400 active:scale-95 transition-all"
                  title="Copy"
                >
                  <i className={copied ? "ri-check-line text-emerald-400" : "ri-clipboard-line"}></i>
                </button>
                {onSendToIntelliAgent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSendToIntelliAgent(nextQuestion); }}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:-translate-y-[1px] active:scale-[0.97] transition-all shadow-sm"
                    title="Send to AI Chat"
                  >
                    <i className="ri-arrow-right-up-line"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : isProcessing ? (
          <PulsePlaceholder lines={2} color="cyan" />
        ) : (
          <div className="text-xs text-zinc-500 italic text-center py-3 px-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
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
    <div className="md3-card !bg-emerald-900/10 !border-emerald-800/20 !p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="md3-title !text-emerald-400">
          <i className="ri-article-fill text-sm"></i> AI Recap
        </h3>
        {recap && !isProcessing && (
          <button
            onClick={() => copyToClipboard(recap, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 active:scale-95 transition-all shadow-sm"
            title="Copy Recap"
          >
            <i className={copied ? "ri-check-line text-emerald-400" : "ri-clipboard-line"}></i>
          </button>
        )}
      </div>

      <div className="mt-2">
        {recap ? (
          <div className="rounded-[24px] bg-zinc-800/40 border border-emerald-800/25 text-[13px] text-zinc-200 leading-relaxed shadow-inner overflow-hidden transition-all hover:border-emerald-700/40">
            <div
              className="recap-markdown p-3.5"
              style={{ fontFamily: "'Google Sans', 'Open Sans', 'Roboto', sans-serif" }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{recap}</ReactMarkdown>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col gap-2">
            <PulsePlaceholder lines={3} color="emerald" />
            <PulsePlaceholder lines={2} color="emerald" />
            <PulsePlaceholder lines={1} color="emerald" />
          </div>
        ) : (
          <div className="text-xs text-zinc-500 italic text-center py-3 px-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
            Click &ldquo;Generate AI Insights&rdquo; for an executive summary.
          </div>
        )}
      </div>
    </div>
  );
}
