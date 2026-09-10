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
    <div className={`bg-surface-container rounded-[32px] overflow-hidden shadow-sm border border-border transition-all duration-300 ${transcriptOpen ? 'shadow-md shadow-primary/5' : ''}`}>
      <div 
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-4 md:py-5 hover:bg-surface-container-high transition-colors cursor-pointer group gap-3 sm:gap-4"
        onClick={() => setTranscriptOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[18px] sm:rounded-[20px] bg-primary-container border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300 shrink-0">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-on-primary-container" />
          </div>
          <span className="text-[16px] sm:text-[18px] font-extrabold tracking-tight text-text group-hover:text-primary transition-colors">
            Full Transcript <span className="text-text-muted font-medium ml-1">({visibleChunks.length} lines)</span>
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-3 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center bg-surface-container-high rounded-full p-1 border border-border shadow-sm">
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
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-[12px] font-bold rounded-full transition-colors cursor-pointer ${isActive ? "bg-secondary-container text-on-secondary-container shadow-sm" : "text-text-muted hover:text-text hover:bg-surface-container-highest"}`}
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
              className="w-9 h-9 rounded-full bg-surface-container-high border border-border flex items-center justify-center hover:bg-secondary-container transition-colors cursor-pointer text-text hover:text-on-secondary-container shadow-sm"
              onClick={handleCopy}
              aria-label="Copy transcript"
            >
              {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" aria-hidden="true" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-surface-container-high border border-border flex items-center justify-center hover:bg-secondary-container transition-colors duration-300 cursor-pointer group-hover:text-primary shadow-sm"
              onClick={() => setTranscriptOpen((o) => !o)}
              aria-label={transcriptOpen ? "Collapse transcript" : "Expand transcript"}
              aria-expanded={transcriptOpen}
            >
              {transcriptOpen
                ? <ChevronUp className="w-5 h-5 text-text transition-colors" aria-hidden="true" />
                : <ChevronDown className="w-5 h-5 text-text transition-colors" aria-hidden="true" />
              }
            </button>
          </div>
        </div>
      </div>

      {transcriptOpen && (
        <div className="border-t border-border px-4 md:px-6 pb-4 md:pb-6 pt-4 md:pt-5 flex flex-col gap-3 max-h-[520px] overflow-y-auto custom-scrollbar bg-surface relative">
          
          {refineError && (
            <div className="bg-risk-container/40 border border-risk/30 rounded-xl p-3 flex flex-col gap-1.5 mb-2">
              <div className="flex items-center gap-2 text-risk font-semibold text-[13px]">
                <RiErrorWarningFill className="w-4 h-4" aria-hidden="true" /> Refinement Failed
              </div>
              <p className="text-[12px] text-risk/80">{refineError}</p>
            </div>
          )}

          {isRefining && sourceFilter === "refined" ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-scale w-full">
              <Md3LoadingIndicator size="lg" className="text-primary" />
              <LoadingPhrases />
              <p className="text-[12px] text-text-variant italic max-w-sm text-center">
                Processing your raw transcript to remove filler words, fix grammar, and perfect diarization. This may take up to a minute...
              </p>
            </div>
          ) : (
            visibleChunks.map((chunk, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 p-4 md:p-5 rounded-[24px] bg-surface-container border border-border hover:shadow-md hover:border-primary/30 transition-all duration-300 group/chunk"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-[14px] font-bold tracking-wide text-text group-hover/chunk:text-primary transition-colors">
                    <span className="w-8 h-8 rounded-[12px] bg-primary-container text-on-primary-container border border-primary/20 text-[12px] flex items-center justify-center shadow-inner transition-colors">
                      {(chunk.speaker || "?").charAt(0).toUpperCase()}
                    </span>
                    {chunk.speaker || "Unknown"}
                  </span>
                  <div className="flex items-center gap-2">
                    {!!(chunk as Record<string, unknown>).source && (
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold bg-surface-container-high px-2.5 py-1 rounded-full border border-border shadow-sm">
                        {(chunk as Record<string, unknown>).source as string}
                      </span>
                    )}
                    {chunk.timestamp_ms > 0 && (
                      <span className="text-[11px] font-mono font-bold text-text-variant bg-surface-container-high px-2 py-1 rounded-lg border border-border shadow-sm">
                        {`${String(Math.floor(chunk.timestamp_ms / 60000)).padStart(2, "0")}:${String(Math.floor((chunk.timestamp_ms % 60000) / 1000)).padStart(2, "0")}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[13.5px] sm:text-[14px] text-text-muted leading-relaxed pl-0 sm:pl-[42px] group-hover/chunk:text-text transition-colors">
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
