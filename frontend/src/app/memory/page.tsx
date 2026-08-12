"use client";

import { useState, useEffect } from "react";
import {
  RiBrainLine,
  RiSearchLine,
  RiSparklingLine,
  RiArrowRightLine,
  RiCloseLine,
} from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { useMemoryManager } from "./_hooks/useMemoryManager";
import { ResultCard } from "./_components/ResultCard";

export default function MemoryPage() {
  const {
    query,
    setQuery,
    result,
    setResult,
    loading,
    sourcesOpen,
    setSourcesOpen,
    suggestions,
    loadingSuggestions,
    handleQuery,
    conf
  } = useMemoryManager();

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full blur-[80px]"
                 style={{ background: "radial-gradient(circle, var(--grad-tertiary) 0%, transparent 70%)" }} />
            <div className="absolute bottom-0 right-0 w-48 h-40 rounded-full blur-[60px]"
                 style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }} />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-[20px] bg-tertiary-container border border-tertiary/20 flex items-center justify-center shadow-sm border border-border spring">
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
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuery(); }}
            className="w-full h-14 bg-surface2 border border-border rounded-2xl pl-11 pr-32 text-[14px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors shadow-sm border border-border"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 bg-primary-container text-on-primary-container rounded-xl text-[13px] font-semibold flex items-center gap-2 spring hover:brightness-125 active:opacity-80 disabled:opacity-40"
          >
            <RiSparklingLine className="w-4 h-4" />
            Ask
          </button>
        </div>

        {/* ── Example queries (idle) ─────────────────────────────────── */}
        {!result && !loading && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
              <RiSparklingLine className="w-3 h-3 text-tertiary" />
              Suggested queries
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loadingSuggestions ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[68px] rounded-[32px] bg-surface-container-highest animate-pulse" />
                ))
              ) : (
                suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuery(q)}
                    className="group bg-surface-container hover:bg-surface2 border border-border hover:border-primary/40 rounded-2xl px-4 py-3.5 text-[13px] text-left text-text-muted hover:text-text spring-colors flex items-center justify-between gap-3 h-[68px]"
                  >
                    <span className="line-clamp-2 leading-relaxed">{q}</span>
                    <RiArrowRightLine className="w-4 h-4 shrink-0 text-text-muted group-hover:text-primary spring-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {loading && (
          <div className="pt-16 pb-12 flex flex-col items-center justify-center gap-4 w-full">
            <Md3LoadingIndicator size="lg" className="text-primary" />
            <LoadingPhrases />
          </div>
        )}

        {/* ── Result ─────────────────────────────────────────────────────── */}
        {result && !loading && (
          <ResultCard
            result={result}
            conf={conf}
            sourcesOpen={sourcesOpen}
            setSourcesOpen={setSourcesOpen}
          />
        )}
      </main>
    </div>
  );
}

function LoadingPhrases() {
  const phrases = [
    "Searching past meetings and transcripts...",
    "Analyzing context and key decisions...",
    "Synthesizing insights for your query...",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <span className="text-sm font-medium text-text-muted transition-opacity duration-300">
      {phrases[idx]}
    </span>
  );
}
