"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/Topbar";
import { queryMemory } from "@/lib/api";
import type { MemoryResult } from "@/types";
import { Md3LoadingIndicator } from "@/components/Md3Loading";
import {
  RiBrainLine,
  RiSearchLine,
  RiArrowDownSLine,
  RiSparklingLine,
  RiFlashlightLine,
  RiChat1Line,
  RiArrowRightLine,
  RiCloseLine,
  RiShieldCheckLine,
} from "@remixicon/react";

const EXAMPLE_QUERIES = [
  "What did the client say about pricing in the last 3 meetings?",
  "What's pending with Rahul?",
  "What was decided about the API migration?",
  "When is the mobile launch scheduled?",
];

const CONFIDENCE_STYLES: Record<string, { bar: string; chip: string; label: string }> = {
  high:   { bar: "bg-success", chip: "bg-success/15 text-success border-success/30", label: "High confidence" },
  medium: { bar: "bg-warning", chip: "bg-warning/15 text-warning border-warning/30", label: "Medium confidence" },
  low:    { bar: "bg-risk",    chip: "bg-risk/15 text-risk border-risk/30",           label: "Low confidence" },
};

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MemoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>(EXAMPLE_QUERIES);

  useEffect(() => {
    import("@/lib/api").then(({ fetchMeetings }) => {
      fetchMeetings("dev_token")
        .then((data) => {
          const list: any[] = Array.isArray(data) ? data : data.meetings || [];
          if (list.length > 0) {
            // Generate dynamic questions based on recent meetings
            const recentTitles = list.slice(0, 4).map(m => m.title || "Untitled Meeting");
            const dynamicQueries = [
              `What were the main decisions in ${recentTitles[0]}?`,
              recentTitles.length > 1 ? `What are the action items from ${recentTitles[1]}?` : "What's pending for me to do?",
              `Summarize the key points discussed about pricing.`,
              `What was discussed in the last few meetings?`
            ];
            setSuggestions(dynamicQueries);
          }
        })
        .catch(() => {});
    });
  }, []);

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
        answer: error.message || "No relevant memories found.",
        confidence: "low",
        total_retrieved: 0,
        sources: [],
        error: error.message,
        powered_by: "Fallback",
      });
    } finally {
      setLoading(false);
    }
  };

  const conf = result ? (CONFIDENCE_STYLES[result.confidence] ?? CONFIDENCE_STYLES.low) : null;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Topbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 text-center">
          {/* Ambient blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full blur-[80px]"
                 style={{ background: "radial-gradient(circle, rgba(219,185,253,0.12) 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 right-0 w-48 h-40 rounded-full blur-[60px]"
                 style={{ background: "radial-gradient(circle, rgba(168,199,250,0.08) 0%, transparent 70%)" }} />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-[20px] bg-tertiary-container border border-tertiary/20 flex items-center justify-center shadow-lg spring">
              <RiBrainLine className="w-7 h-7 text-tertiary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text">AI Semantic Memory</h1>
              <p className="text-[13px] text-text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
                Query past discussions, decisions, and insights across all your recorded meetings.
              </p>
            </div>
          </div>
        </div>

        {/* ── Search box ────────────────────────────────────────────────── */}
        <div className="relative">
          <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Ask your meeting memory…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuery(); }}
            className="w-full h-14 bg-surface2 border border-border rounded-2xl pl-11 pr-32 text-[14px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors shadow-lg"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResult(null); }}
              className="absolute right-24 top-1/2 -translate-y-1/2 text-text-muted hover:text-text spring-sm"
            >
              <RiCloseLine className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleQuery()}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 bg-primary-container text-on-primary-container rounded-xl text-[13px] font-semibold flex items-center gap-2 spring hover:brightness-125 active:scale-[0.96] disabled:opacity-40"
          >
            {loading ? <Md3LoadingIndicator size="sm" /> : <RiSparklingLine className="w-4 h-4" />}
            Ask
          </button>
        </div>

        {/* ── Example queries (idle) ─────────────────────────────────── */}
        {!result && !loading && (
          <div className="flex flex-col gap-3 animate-slide-up">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
              <RiSparklingLine className="w-3 h-3 text-tertiary" />
              Suggested queries
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuery(q)}
                  className="group bg-surface-container hover:bg-surface2 border border-border hover:border-primary/40 rounded-2xl px-4 py-3.5 text-[13px] text-left text-text-muted hover:text-text spring-colors flex items-center justify-between gap-3"
                >
                  <span className="line-clamp-2 leading-relaxed">{q}</span>
                  <RiArrowRightLine className="w-4 h-4 shrink-0 text-text-muted group-hover:text-primary spring-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-5 rounded-[28px] border border-dashed border-border bg-surface-dim py-16 animate-fade-scale">
            <Md3LoadingIndicator size="lg" />
            <div className="text-center">
              <p className="text-[14px] font-semibold text-text">Scanning semantic embeddings…</p>
              <p className="text-[12px] text-text-muted mt-1">Synthesizing answer with Gemini</p>
            </div>
          </div>
        )}

        {/* ── Result ─────────────────────────────────────────────────────── */}
        {result && !loading && (
          <div className="flex flex-col gap-4 animate-slide-up">

            {/* Answer card */}
            <div className="bg-surface-container rounded-[24px] border border-border overflow-hidden shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 text-[13px] font-bold text-text">
                  <RiSparklingLine className="w-4 h-4 text-tertiary" />
                  AI Synthesized Answer
                </div>
                <div className="flex items-center gap-2">
                  {result.powered_by && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-secondary bg-secondary-container rounded-full px-2.5 py-1">
                      <RiFlashlightLine className="w-3 h-3" />
                      {result.powered_by}
                    </span>
                  )}
                  {conf && (
                    <span className={`text-[11px] font-bold border rounded-full px-2.5 py-1 ${conf.chip}`}>
                      {conf.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Confidence bar */}
              {conf && (
                <div className="h-0.5 w-full bg-surface2">
                  <div
                    className={`h-full ${conf.bar} transition-all duration-700`}
                    style={{
                      width:
                        result.confidence === "high" ? "85%" :
                        result.confidence === "medium" ? "55%" : "25%",
                    }}
                  />
                </div>
              )}

              {/* Body */}
              <div className="p-5 text-[13.5px] text-text leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </div>

              {/* Footer */}
              {result.total_retrieved > 0 && (
                <div className="px-5 pb-4 flex items-center gap-1.5 text-[11px] text-text-muted">
                  <RiShieldCheckLine className="w-3.5 h-3.5" />
                  Retrieved from {result.total_retrieved} memory chunks
                </div>
              )}
            </div>

            {/* Cited sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="bg-surface-container rounded-[24px] border border-border overflow-hidden">
                {/* Collapsible header */}
                <button
                  onClick={() => setSourcesOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface2 spring-colors"
                >
                  <div className="flex items-center gap-2.5 text-[13px] font-bold text-text">
                    <RiChat1Line className="w-4 h-4 text-primary" />
                    Cited Meetings
                    <span className="text-[11px] text-text-muted font-normal bg-surface2 border border-border rounded-full px-2">
                      {result.sources.length}
                    </span>
                  </div>
                  <RiArrowDownSLine
                    className={`w-5 h-5 text-text-muted spring ${sourcesOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {sourcesOpen && (
                  <div className="flex flex-col gap-3 px-5 pb-5 border-t border-border pt-4">
                    {result.sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="bg-surface2 rounded-[16px] border border-border p-4 flex flex-col gap-3 animate-slide-up"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container text-[11px] font-bold flex items-center justify-center">
                              {src.speaker_name ? src.speaker_name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="text-[12px] font-bold text-text">
                              {src.speaker_name || "Participant"}
                            </span>
                            <span className="text-[10px] text-text-muted bg-surface3 border border-border rounded-full px-2 py-0.5">
                              {src.meeting_date || "Recent"}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-primary bg-primary-dim border border-primary/20 rounded-full px-2.5 py-0.5">
                            {Math.round((src.score || 0) * 100)}% match
                          </span>
                        </div>
                        <blockquote className="text-[12.5px] text-text-muted leading-relaxed italic border-l-2 border-primary/40 pl-3 ml-1">
                          &ldquo;{src.excerpt}&rdquo;
                        </blockquote>
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
