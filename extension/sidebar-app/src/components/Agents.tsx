import { useState, useRef, useEffect } from "react";
import { copyToClipboard } from "../lib/utils";
import type { TranscriptChunk } from "../types";

export function LiveTranscript({ transcriptLines }: { transcriptLines: TranscriptChunk[] }) {
  const [sourceFilter, setSourceFilter] = useState<"all" | "dom" | "audio">("dom");
  const bottomRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const filteredLines = transcriptLines.filter(line => 
    sourceFilter === "all" ? true : (line.source || "dom") === sourceFilter
  );

  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = () => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    // If user is within 40px of bottom, auto-scroll is true. Otherwise false.
    setAutoScroll(scrollHeight - Math.ceil(scrollTop) - clientHeight < 40);
  };

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filteredLines]);

  return (
    <div className="md3-card !bg-zinc-800/40 !border-zinc-700/50 !p-3 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-blue-400">
            <i className="ri-chat-voice-fill text-sm"></i>
            Live Transcript
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={sourceFilter} 
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 rounded text-[11px] font-medium text-zinc-300 py-0.5 px-1 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All sources</option>
            <option value="dom">DOM (CC)</option>
            <option value="audio">Agent (AI)</option>
          </select>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-[10px] font-bold text-zinc-400 font-mono">
            {filteredLines.length}
          </span>
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
              <div key={idx} className="flex flex-col gap-1 p-2.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase text-blue-400">
                    <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] shrink-0">
                      {line.speaker.charAt(0)}
                    </div>
                    {line.speaker}
                  </span>
                  {line.source && <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{line.source === "audio" ? "AI Transcripted(correct)" : line.source}</span>}
                </div>
                <span className="text-[12.5px] text-zinc-200 leading-relaxed break-words pl-5">{line.text}</span>
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
    <div className="md3-card !p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-blue-400">
            <i className="ri-sparkling-fill text-sm"></i> Answers
          </h3>
        </div>
      </div>
      
      <div className="mt-1 flex flex-col gap-2">
            {suggestions.length > 0 ? (
              suggestions.map((sug: string, idx: number) => (
                <div key={idx} onClick={() => copyToClipboard(sug, () => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); })}
                     className="p-3 rounded-2xl bg-zinc-800/70 border border-zinc-700/50 hover:bg-zinc-700/70 hover:border-blue-500/30 text-[12.5px] text-zinc-200 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-start gap-2">
                    <span className="leading-relaxed">{sug}</span>
                    {copiedIdx === idx ? 
                      <i className="ri-check-line text-emerald-400 text-sm shrink-0"></i> : 
                      <i className="ri-clipboard-line text-zinc-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0"></i>
                    }
                  </div>
                </div>
              ))
            ) : isProcessing ? (
              <p className="text-xs text-blue-400 italic text-center p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 animate-pulse">
                Generating insights...
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic text-center p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                Click "Generate AI Insights" when ready.
              </p>
            )}
          </div>
    </div>
  );
}

export function NextQuestionAgent({ nextQuestion, isProcessing }: { nextQuestion: string, isProcessing?: boolean }) {
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
      
      <div className="mt-1">
            {nextQuestion ? (
              <div onClick={() => copyToClipboard(nextQuestion, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                   className="p-3 rounded-2xl bg-zinc-800/70 border border-cyan-800/40 hover:bg-zinc-700/70 hover:border-cyan-500/40 text-[13px] text-zinc-200 cursor-pointer transition-colors group">
                <div className="flex justify-between items-start gap-2">
                  <span className="leading-relaxed font-medium">{nextQuestion}</span>
                  {copied ? 
                    <i className="ri-check-line text-emerald-400 text-sm shrink-0"></i> : 
                    <i className="ri-clipboard-line text-zinc-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm shrink-0"></i>
                  }
                </div>
              </div>
            ) : isProcessing ? (
              <div className="text-xs text-cyan-400 italic text-center p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 animate-pulse">
                Thinking of questions...
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
  return (
    <div className="md3-card !bg-emerald-900/20 !border-emerald-800/30 !p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="md3-title !text-emerald-400">
            <i className="ri-file-list-3-fill text-sm"></i> Recap
          </h3>
        </div>
      </div>
      
      <div className="mt-1">
            {recap ? (
              <div className="p-4 rounded-2xl bg-zinc-800/70 border border-emerald-800/40 text-[12.5px] text-zinc-200 leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {recap}
              </div>
            ) : isProcessing ? (
              <div className="text-xs text-emerald-400 italic text-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 animate-pulse">
                Drafting recap...
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
