import { useState, useRef, useEffect } from "react";
import { copyToClipboard } from "../../lib/utils";
import type { TranscriptChunk } from "../../types";
import { TranscriptLine } from "../molecules/TranscriptLine";

export function LiveTranscript({ transcriptLines, onClear }: { transcriptLines: TranscriptChunk[]; onClear: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  const filtered = transcriptLines.filter((l) =>
    !searchQuery.trim() ||
    l.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    setAutoScroll(scrollHeight - Math.ceil(scrollTop) - clientHeight < 40);
  };

  useEffect(() => {
    if (autoScroll && feedRef.current)
      setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, 50);
  }, [transcriptLines.length, autoScroll, searchQuery]);

  return (
    <div className="bg-surface-container border-border rounded-[24px] border p-3 flex-1 flex flex-col min-h-0 transition-colors duration-300">
      <div className="flex items-center justify-between mb-2 shrink-0 h-[28px]">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-primary flex items-center gap-2">
            <i className="ri-chat-voice-fill text-sm" /> Live Feed
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-primary-container text-[9px] font-extrabold text-on-primary-container font-mono">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <i className="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-[10px]" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-highest border border-border rounded-full text-[11px] font-medium text-text py-1 pl-6 pr-6 outline-none focus:border-primary/50 transition-colors w-24 placeholder:text-text-muted"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors">
                <i className="ri-close-circle-fill text-[11px]" />
              </button>
            )}
          </div>
          <button
            onClick={() => copyToClipboard(filtered.map((l) => `[${l.speaker}]: ${l.text}`).join("\n"), () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); })}
            title="Copy Transcript"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-text-muted hover:text-text active:opacity-80 transition-all"
          >
            <i className={copiedAll ? "ri-check-line text-success text-[12px]" : "ri-clipboard-line text-[12px]"} />
          </button>
          <button
            onClick={onClear}
            title="Clear Feed"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-risk-container text-text-muted hover:text-on-risk-container active:opacity-80 transition-all"
          >
            <i className="ri-delete-bin-line text-[12px]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-[20px] border border-border min-h-0 relative mt-2 bg-surface">
        <div ref={feedRef} onScroll={handleScroll} className="h-full overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-muted italic text-center p-4 bg-surface-container rounded-2xl border border-border">
              {searchQuery ? `No results for "${searchQuery}"` : "Enable Captions (CC) — live speech will appear here"}
            </p>
          ) : (
            filtered.map((line, idx) => <TranscriptLine key={idx} line={line} />)
          )}
        </div>
        {!autoScroll && (
          <button
            onClick={() => { setAutoScroll(true); if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary hover:brightness-110 text-on-primary rounded-full shadow-lg flex items-center justify-center transition-transform active:opacity-80 z-10"
            title="Resume auto-scroll"
          >
            <i className="ri-arrow-down-line" />
          </button>
        )}
      </div>
    </div>
  );
}
