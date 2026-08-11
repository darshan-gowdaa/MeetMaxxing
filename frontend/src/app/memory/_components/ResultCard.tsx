import Link from "next/link";
import {
  RiFlashlightLine,
  RiShieldCheckLine,
  RiChat1Line,
  RiArrowDownSLine,
  RiSparklingLine
} from "@remixicon/react";
import type { MemoryResult } from "@/types";
import { CONFIDENCE_STYLES } from "../_hooks/useMemoryManager";

export function ResultCard({
  result,
  conf,
  sourcesOpen,
  setSourcesOpen
}: {
  result: MemoryResult;
  conf: typeof CONFIDENCE_STYLES[string] | null;
  sourcesOpen: boolean;
  setSourcesOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Answer card */}
      <div className="bg-surface-container rounded-[24px] border border-border overflow-hidden shadow-sm border border-border">
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
                  result.confidence === "high" ? "100%" :
                  result.confidence === "medium" ? "60%" : "25%",
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
                <Link
                  key={idx}
                  href={`/meetings/${src.meeting_id}`}
                  className="bg-surface2 hover:bg-surface3 rounded-[16px] border border-border hover:border-primary/50 p-4 flex flex-col gap-3 animate-slide-up transition-colors group cursor-pointer"
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
                  <blockquote className="text-[12.5px] text-text-muted group-hover:text-text leading-relaxed italic border-l-2 border-primary/40 pl-3 ml-1 transition-colors">
                    &ldquo;{src.excerpt}&rdquo;
                  </blockquote>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
