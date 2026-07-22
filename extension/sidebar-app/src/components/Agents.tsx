import { useState, useRef, useEffect } from "react";
import { copyToClipboard } from "../lib/utils";
import type { TranscriptChunk } from "../types";

export function LiveTranscript({ transcriptLines, onClear }: { transcriptLines: TranscriptChunk[], onClear: () => void }) {
  const [sourceFilter, setSourceFilter] = useState<"all" | "dom" | "audio">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const filteredLines = transcriptLines.filter(line => {
    const sourceMatch = sourceFilter === "all" ? true : (line.source || "dom") === sourceFilter;
    const searchMatch = searchQuery.trim() === "" ? true : line.text.toLowerCase().includes(searchQuery.toLowerCase()) || line.speaker.toLowerCase().includes(searchQuery.toLowerCase());
    return sourceMatch && searchMatch;
  });

  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    // If user is within 40px of bottom, auto-scroll is true. Otherwise false.
    setAutoScroll(scrollHeight - Math.ceil(scrollTop) - clientHeight < 40);
  };

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      setTimeout(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [transcriptLines.length, autoScroll, searchQuery, sourceFilter]);

  return (
    <div className="md3-card !bg-zinc-800/40 !border-zinc-700/50 !p-3 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-blue-400">
            <i className="ri-chat-voice-fill text-sm"></i>
            Live Transcript
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <i className="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]"></i>
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/60 border border-zinc-700/50 rounded-full text-[11px] font-medium text-zinc-300 py-1 pl-6 pr-2 outline-none focus:border-blue-500/50 transition-colors w-24 placeholder:text-zinc-500"
            />
          </div>
          <select 
            value={sourceFilter} 
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-zinc-900/60 border border-zinc-700/50 rounded-full text-[11px] font-medium text-zinc-300 py-1 px-2 outline-none focus:border-blue-500/50 transition-colors cursor-pointer appearance-none"
          >
            <option value="all">All</option>
            <option value="dom">CC</option>
            <option value="audio">AI</option>
          </select>
          <span className="px-2 py-1 rounded-full bg-blue-900/20 border border-blue-800/30 text-[9px] font-extrabold text-blue-400 font-mono flex items-center justify-center min-w-[24px]">
            {filteredLines.length}
          </span>
          <button 
            onClick={onClear} 
            title="Clear Transcript"
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-400 active:scale-95 transition-all ml-0.5"
          >
            <i className="ri-delete-bin-line text-[12px]"></i>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden rounded-xl border border-zinc-700/30 min-h-0 relative">
        <div ref={feedRef} onScroll={handleScroll} className="h-full overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
          {filteredLines.length === 0 ? (
            <p className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
              Enable Captions (CC) — live speech will appear here
            </p>
          ) : (
            filteredLines.map((line, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-[20px] bg-zinc-900/50 border border-zinc-800/60 hover:bg-zinc-800/50 transition-colors shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-blue-400">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9.5px] shrink-0 border border-blue-500/30">
                      {line.speaker.charAt(0)}
                    </div>
                    {line.speaker}
                  </span>
                  {line.source && <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold border border-zinc-700/50">{line.source === "audio" ? "AI (Deep)" : "CC (Live)"}</span>}
                </div>
                <span className="text-[13px] text-zinc-200 leading-relaxed break-words pl-6">{line.text}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        
        {!autoScroll && (
          <button 
            onClick={() => {
              setAutoScroll(true);
              if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
            }}
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

export function SuggestionAgent({ suggestions, isProcessing }: { suggestions: string[], isProcessing?: boolean }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  return (
    <div className="md3-card !bg-blue-900/10 !border-blue-800/20 !p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-blue-400">
            <i className="ri-sparkling-fill text-sm"></i> Answers
          </h3>
        </div>
      </div>
      
      <div className="mt-2 flex flex-col gap-2">
            {suggestions.length > 0 ? (
              suggestions.map((sug: string, idx: number) => (
                <div key={idx} 
                     className="p-3.5 rounded-[20px] bg-zinc-800/60 border border-zinc-700/50 hover:-translate-y-[2px] hover:shadow-lg hover:shadow-blue-900/20 hover:border-blue-500/40 text-[13px] text-zinc-200 transition-all duration-300 group">
                  <div className="flex justify-between items-start gap-3">
                    <span className="leading-relaxed cursor-pointer active:opacity-70" onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })}>{sug}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })} className="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-700/50 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 active:scale-95 transition-all">
                        {copiedIdx === idx ? <i className="ri-check-line text-emerald-400"></i> : <i className="ri-clipboard-line"></i>}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : isProcessing ? (
              <div className="text-xs text-blue-400 italic flex justify-center items-center gap-2 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <div className="md3-loading-indicator md3-loading-indicator-sm text-blue-400 !w-3 !h-3"></div> Generating insights...
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                Click "Generate AI Insights" when ready.
              </p>
            )}
          </div>
    </div>
  );
}

export function NextQuestionAgent({ nextQuestion, isProcessing, onSendToIntelliAgent }: { nextQuestion: string, isProcessing?: boolean, onSendToIntelliAgent?: (q: string) => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="md3-card !bg-cyan-900/20 !border-cyan-800/30 !p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-cyan-400">
            <i className="ri-question-answer-fill text-sm"></i> What to Ask
          </h3>
        </div>
      </div>
      
      <div className="mt-2">
            {nextQuestion ? (
              <div onClick={() => copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                   className="p-3.5 rounded-[20px] bg-cyan-900/20 border border-cyan-800/40 hover:-translate-y-[2px] hover:shadow-lg hover:shadow-cyan-900/20 hover:border-cyan-500/40 text-[13px] text-zinc-200 transition-all duration-300 group">
                <div className="flex justify-between items-start gap-3">
                  <span className="leading-relaxed font-medium cursor-pointer active:opacity-70">{nextQuestion}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                      className="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-700/50 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400 active:scale-95 transition-all"
                      title="Copy Question"
                    >
                      <i className={copied ? "ri-check-line text-emerald-400" : "ri-clipboard-line"}></i>
                    </button>
                    {onSendToIntelliAgent && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSendToIntelliAgent(nextQuestion); }}
                        className="w-7 h-7 flex items-center justify-center rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:-translate-y-[1px] active:scale-[0.97] transition-all shadow-sm"
                        title="Send to IntelliAgent"
                      >
                        <i className="ri-arrow-right-up-line"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="text-xs text-cyan-400 italic flex justify-center items-center gap-2 p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                <div className="md3-loading-indicator md3-loading-indicator-sm text-cyan-400 !w-3 !h-3"></div> Thinking of questions...
              </div>
            ) : (
              <div className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                Click "Generate AI Insights" to formulate a question.
              </div>
            )}
          </div>
    </div>
  );
}

export function RecapAgent({ recap, isProcessing }: { recap: string, isProcessing?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="md3-card !bg-emerald-900/10 !border-emerald-800/20 !p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-emerald-400">
            <i className="ri-article-fill text-sm"></i> AI Recap
          </h3>
        </div>
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
              <div className="p-3.5 rounded-[20px] bg-zinc-800/50 border border-emerald-800/30 text-[13px] text-zinc-200 leading-relaxed font-serif whitespace-pre-wrap shadow-inner">
                {recap}
              </div>
            ) : isProcessing ? (
              <div className="text-xs text-emerald-400 italic flex justify-center items-center gap-2 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <div className="md3-loading-indicator md3-loading-indicator-sm text-emerald-400 !w-3 !h-3"></div> Drafting recap...
              </div>
            ) : (
              <div className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                Click "Generate AI Insights" for an executive summary.
              </div>
            )}
          </div>
    </div>
  );
}
