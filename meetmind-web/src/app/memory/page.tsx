"use client";
import "@material/web/progress/circular-progress.js";
import "@material/web/progress/linear-progress.js";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { queryMemory } from "@/lib/api";
import type { MemoryResult } from "@/types";
import {
  RiBrainLine,
  RiSearchLine,
  RiArrowDownSLine,
  RiSparklingLine,
  RiFlashlightLine,
  RiChat1Line,
  RiArrowRightLine,
} from "@remixicon/react";

const EXAMPLE_QUERIES = [
  "What did the client say about pricing in the last 3 meetings?",
  "What's pending with Rahul?",
  "What was decided about the API migration?",
  "When is the mobile launch scheduled?",
];

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-success bg-success-dim border-success/25",
  medium: "text-warning bg-[rgba(253,214,99,0.1)] border-[rgba(253,214,99,0.25)]",
  low: "text-risk bg-risk-bg border-[rgba(242,139,130,0.25)]",
};

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);

  const handleQuery = async (q: string = query) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setResult(null);

    try {
      const data = await queryMemory(q, "dev_token");
      setResult(data);
    } catch (err: unknown) {
      const error = err as Error;
      setResult({
        answer: error.message || "Failed to retrieve memory answer from server or no relevant memories found.",
        confidence: "low",
        total_retrieved: 0,
        sources: [],
        error: error.message,
        powered_by: "All LLM Fallbacks Failed"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-[12px] flex flex-col gap-[8px] max-w-5xl mx-auto w-full">
        
        {/* Memory Hero (MD3 Expressive Small) */}
        <div className="flex flex-col items-center gap-[10px] p-[16px_14px] text-center bg-surface2 border border-border rounded-2xl relative overflow-hidden mt-[4px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[120px] bg-tertiary/10 rounded-full blur-[40px] pointer-events-none"></div>
          
          <div className="w-[42px] h-[42px] rounded-[12px] bg-primary-dim border-[1.5px] border-[rgba(168,199,250,0.3)] flex items-center justify-center shrink-0 relative z-10 shadow-inner">
            <RiBrainLine size={20} className="text-tertiary" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-[2px]">
            <h1 className="font-sans text-[16px] font-bold text-white tracking-tight">AI Semantic Memory</h1>
            <p className="text-[12px] text-text-muted max-w-[280px] leading-[1.4]">Query past discussions and decisions across all your meetings.</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <RiSearchLine className="absolute left-[12px] top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Ask your meeting memory..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuery();
            }}
            className="w-full bg-surface border border-border rounded-[10px] pl-[36px] pr-[80px] py-[10px] text-[13px] text-white placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
          />
          <button
            onClick={() => handleQuery()}
            disabled={loading || !query.trim()}
            className="absolute right-[6px] top-1/2 -translate-y-1/2 btn btn-primary !py-[5px] !px-[12px] !text-[11px]"
          >
            {loading ? <md-circular-progress indeterminate style={{ '--md-circular-progress-size': '14px' } as React.CSSProperties}></md-circular-progress> : "Ask"}
          </button>
        </div>

        {/* Example Queries */}
        {!result && !loading && (
          <div className="mt-4 flex flex-col gap-[8px]">
            <div className="section-title">
              <RiSparklingLine size={13} />
              Suggested Queries
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuery(q)}
                  className="bg-surface2 border border-border hover:border-primary border-l-[2.5px] rounded-[8px] p-[10px_12px] text-[12.5px] font-normal leading-[1.5] text-left text-text-main hover:bg-surface3 transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{q}</span>
                  <RiArrowRightLine size={14} className="text-text-muted group-hover:text-primary transition-colors shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-4 bg-surface2 border border-dashed border-[rgba(255,255,255,0.06)] rounded-[10px] p-[30px] flex flex-col items-center justify-center gap-[12px] text-center">
            <md-circular-progress indeterminate style={{ '--md-circular-progress-size': '32px' } as React.CSSProperties}></md-circular-progress>
            <p className="text-text-main text-[13px] font-medium">Scanning semantic embeddings...</p>
            <p className="text-text-muted text-[11px] italic">Synthesizing answer using LLM</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="flex flex-col gap-[12px] mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Answer Box - styling matching recap-box in extension */}
            <div className="bg-surface2 rounded-[10px] p-[14px] text-[13px] leading-[1.6] text-text-main border border-border border-l-[3px] border-l-warning flex flex-col gap-[12px]">
              <div className="flex items-center justify-between pb-[8px] border-b border-border">
                <div className="flex items-center gap-[6px] text-[12px] font-bold text-white">
                  <RiSparklingLine size={14} className="text-warning" />
                  AI Synthesized Answer
                </div>
                <div className="flex items-center gap-[6px]">
                  {result.powered_by && (
                    <div className="badge !text-tertiary">
                      <RiFlashlightLine size={10} />
                      {result.powered_by}
                    </div>
                  )}
                  <div className={`badge ${CONFIDENCE_COLORS[result.confidence] || CONFIDENCE_COLORS.low}`}>
                    {result.confidence}
                  </div>
                </div>
              </div>
              <div className="whitespace-pre-wrap">{result.answer}</div>
            </div>

            {/* Cited Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="section !p-0 overflow-hidden mt-[4px]">
                <button
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  className="w-full flex items-center justify-between p-[12px_14px] hover:bg-surface2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-[8px]">
                    <RiChat1Line size={15} className="text-primary" />
                    <span className="text-[13px] font-bold text-white tracking-[-0.2px]">
                      Cited Meetings ({result.sources.length})
                    </span>
                  </div>
                  <RiArrowDownSLine size={16} className={`text-text-muted transition-transform ${sourcesOpen ? "rotate-180" : ""}`} />
                </button>
                
                {sourcesOpen && (
                  <div className="flex flex-col gap-[6px] p-[0_12px_12px_12px] border-t border-border">
                    {result.sources.map((src, idx) => (
                      <div key={idx} className="bg-surface border border-border rounded-[8px] p-[10px] mt-[6px]">
                        <div className="flex items-center justify-between mb-[6px]">
                          <div className="flex items-center gap-[6px]">
                            <div className="w-[18px] h-[18px] rounded-full bg-primary-container text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                              {src.speaker_name ? src.speaker_name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="text-[11px] font-bold text-white uppercase tracking-[0.5px]">
                              {src.speaker_name || "Participant"}
                            </span>
                            <span className="text-text-muted text-[10px] bg-surface2 px-[6px] py-[2px] rounded-pill border border-border">
                              {src.meeting_date || "Recent Call"}
                            </span>
                          </div>
                          <span className="badge">
                            Match: {Math.round((src.score || 0) * 100)}%
                          </span>
                        </div>
                        <p className="text-[12.5px] text-text-main leading-[1.6] pl-[8px] border-l-[2px] border-primary-dim italic bg-surface2 p-[6px_8px] rounded-r-[6px]">
                          &quot;{src.excerpt}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

