"use client";

import { useState, useEffect } from "react";
import {
  RiChat1Line as MessageSquare,
  RiArrowDownSLine as ChevronDown,
  RiArrowUpSLine as ChevronUp,
  RiFileCopyLine as Copy,
  RiCheckLine as Check,
  RiErrorWarningFill,
} from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { copyToClipboard } from "@/lib/clipboard";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import type { Meeting } from "@/types";

interface MeetingTranscriptProps {
  transcriptData: Meeting["transcript_data"];
  onRefine?: () => Promise<void>;
}

function LoadingPhrases() {
  const phrases = [
    "Connecting to Gemini API...",
    "Cleaning raw transcript data...",
    "Merging stutters and fixing diarization...",
    "Perfecting sentences and structure...",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % phrases.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <span className="text-sm font-medium text-text-muted transition-opacity duration-300">
      {phrases[idx]}
    </span>
  );
}

export default function MeetingTranscript({ transcriptData, onRefine }: MeetingTranscriptProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"dom" | "refined">(
    () => transcriptData?.some(c => (c as Record<string, unknown>).source === "refined") ? "refined" : "dom"
  );
  const [copied, setCopied] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const { showMessage } = useSnackbar();

  const rawChunks = (transcriptData || []).filter(
    (chunk) => (chunk as Record<string, unknown>).source !== "refined"
  );
  const refinedChunks = (transcriptData || []).filter(
    (chunk) => (chunk as Record<string, unknown>).source === "refined"
  );
  const hasRefinedData = refinedChunks.length > 0;

  // Fall back to all transcript data if specific source not tagged yet
  const visibleChunks =
    sourceFilter === "dom"
      ? (rawChunks.length > 0 ? rawChunks : transcriptData)
      : (refinedChunks.length > 0 ? refinedChunks : transcriptData);

  const handleRefine = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onRefine || isRefining) return;
    setIsRefining(true);
    setRefineError("");
    setSourceFilter("refined");
    setTranscriptOpen(true);
    try {
      await onRefine();
    } catch (e: unknown) {
      console.error(e);
      setRefineError((e as Error).message || "Failed to refine transcript.");
      setSourceFilter("dom");
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!transcriptData) return;
    const text = visibleChunks
      .map(chunk => {
        let content = typeof chunk.text === "string" ? chunk.text : JSON.stringify(chunk.text);
        if (typeof chunk.text === "string" && (chunk.text.trim().startsWith("{") || chunk.text.trim().startsWith("["))) {
          try {
            const parsed = JSON.parse(chunk.text);
            if (Array.isArray(parsed)) {
              content = parsed.map((item: unknown) => {
                const obj = item as Record<string, unknown>;
                return typeof item === "string" ? item : (obj.text || obj.utterance || obj.raw_text || obj.refined_text || JSON.stringify(item));
              }).join(' ');
            } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).dialog_turn)) {
              content = ((parsed as Record<string, unknown>).dialog_turn as unknown[]).map((t: unknown) => {
                const obj = t as Record<string, unknown>;
                return `${obj.speaker && obj.speaker !== chunk.speaker ? (obj.speaker as string) + ":" : ""}${(obj.refined_text || obj.raw_text || "") as string}`;
              }).join(' ');
            }
          } catch {}
        }
        const time = chunk.timestamp_ms > 0 ? `[${String(Math.floor(chunk.timestamp_ms / 60000)).padStart(2, "0")}:${String(Math.floor((chunk.timestamp_ms % 60000) / 1000)).padStart(2, "0")}]` : "";
        return `${time} ${chunk.speaker || "Unknown"}: ${content}`;
      }).join('\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      showMessage("Transcript copied to clipboard", { variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      showMessage("Couldn't copy the transcript", { variant: "error" });
    }
  };

  if (!transcriptData || transcriptData.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-4">
      <div 
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group gap-3 sm:gap-4 select-none"
        onClick={() => setTranscriptOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-text group-hover:text-primary transition-colors">
            Full Transcript <span className="text-text-muted font-medium ml-1 text-sm">({visibleChunks.length} lines)</span>
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-3 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center bg-surface-container-high/60 rounded-full p-1 border border-outline-variant/20 shadow-none">
            {(["refined", "dom"] as const).map((source) => {
              const labels = { dom: "Raw", refined: "AI Refined" };
              const isActive = sourceFilter === source;
              const isLoading = source === "refined" && isRefining;
              
              return (
                <button
                  key={source}
                  disabled={isLoading}
                  onClick={(e) => {
                    if (source === "refined" && !hasRefinedData && !isRefining && onRefine) {
                      handleRefine(e);
                    } else {
                      setSourceFilter(source);
                      setTranscriptOpen(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    isActive 
                      ? "bg-secondary-container text-on-secondary-container" 
                      : "text-text-muted hover:text-text hover:bg-surface-container-high"
                  }`}
                >
                  {isLoading && <Md3LoadingIndicator size="sm" className="text-current shrink-0" />}
                  <span>{labels[source as keyof typeof labels]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-surface-container-high/60 border border-outline-variant/20 flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all cursor-pointer text-text active:scale-95"
              onClick={handleCopy}
              aria-label="Copy transcript"
            >
              {copied ? <Check className="w-4 h-4 text-success" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-surface-container-high/60 border border-outline-variant/20 flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all cursor-pointer text-text active:scale-95"
              onClick={() => setTranscriptOpen((o) => !o)}
              aria-label={transcriptOpen ? "Collapse transcript" : "Expand transcript"}
              aria-expanded={transcriptOpen}
            >
              {transcriptOpen
                ? <ChevronUp className="w-5 h-5 text-text" aria-hidden="true" />
                : <ChevronDown className="w-5 h-5 text-text" aria-hidden="true" />
              }
            </button>
          </div>
        </div>
      </div>

      {transcriptOpen && (
        <div className="pt-3 border-t border-outline-variant/15 flex flex-col gap-3 max-h-[520px] overflow-y-auto custom-scrollbar">
          {refineError && (
            <div className="bg-risk-container text-on-risk-container rounded-[20px] p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <RiErrorWarningFill className="w-4 h-4" aria-hidden="true" />
                <span>Refinement Failed</span>
              </div>
              <p className="text-xs opacity-90">{refineError}</p>
            </div>
          )}

          {isRefining && sourceFilter === "refined" ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-scale w-full">
              <Md3LoadingIndicator size="lg" className="text-primary" />
              <LoadingPhrases />
              <p className="text-xs text-text-variant italic max-w-sm text-center">
                Processing your raw transcript to remove filler words, fix grammar, and perfect diarization. This may take up to a minute...
              </p>
            </div>
          ) : (
            visibleChunks.map((chunk, idx) => (
              <div
                key={idx}
                className="bg-surface-container/60 rounded-[20px] p-4 sm:p-5 border border-outline-variant/10 flex flex-col gap-2.5 transition-colors hover:bg-surface-container"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="bg-primary-container text-on-primary-container rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-on-primary-container/20 text-on-primary-container text-[9px] font-bold flex items-center justify-center">
                      {(chunk.speaker || "?").charAt(0).toUpperCase()}
                    </span>
                    <span>{chunk.speaker || "Unknown"}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {!!(chunk as Record<string, unknown>).source && (
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold bg-surface-container-high rounded-full px-2.5 py-1">
                        {(chunk as Record<string, unknown>).source as string}
                      </span>
                    )}
                    {chunk.timestamp_ms > 0 && (
                      <span className="text-[11px] font-mono font-bold text-text-variant bg-surface-container-high rounded-full px-2.5 py-1">
                        {`${String(Math.floor(chunk.timestamp_ms / 60000)).padStart(2, "0")}:${String(Math.floor((chunk.timestamp_ms % 60000) / 1000)).padStart(2, "0")}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[13.5px] sm:text-sm text-text leading-relaxed">
                  {(() => {
                    let content = chunk.text;
                    if (typeof content === "string" && (content.trim().startsWith("{") || content.trim().startsWith("["))) {
                      try { content = JSON.parse(content); } catch { }
                    }
                    
                    if (Array.isArray(content)) {
                      return content.map((item: unknown, i: number) => {
                        const obj = item as Record<string, unknown>;
                        const text = typeof item === "string" ? item : (obj.text || obj.utterance || obj.raw_text || obj.refined_text || JSON.stringify(item));
                        return <span key={i} className="block mb-1.5">{text as string}</span>;
                      });
                    }
                    
                    if (content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).dialog_turn)) {
                      return ((content as Record<string, unknown>).dialog_turn as unknown[]).map((t: unknown, i: number) => {
                        const obj = t as Record<string, unknown>;
                        return (
                          <span key={i} className="block mb-1.5">
                            {obj.speaker && obj.speaker !== chunk.speaker && obj.speaker !== "Unknown" && obj.speaker !== "You" ? <strong className="mr-1.5 text-primary">{obj.speaker as string}:</strong> : null}
                            {(obj.refined_text || obj.raw_text) as string}
                          </span>
                        );
                      });
                    }
                    return typeof chunk.text === "string" ? chunk.text : JSON.stringify(chunk.text);
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
