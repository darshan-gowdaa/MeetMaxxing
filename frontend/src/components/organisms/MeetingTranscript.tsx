"use client";

import { useState, useEffect, useMemo, useId } from "react";
import {
  RiChat1Line as MessageSquare,
  RiArrowDownSLine as ChevronDown,
  RiArrowUpSLine as ChevronUp,
  RiFileCopyLine as Copy,
  RiCheckLine as Check,
  RiErrorWarningFill,
  RiSearchLine as Search,
  RiCloseLine as Close,
  RiSparklingLine as Sparkles,
  RiFileTextLine as FileText,
  RiTimeLine as TimeIcon,
  RiUserLine as UserIcon,
} from "@remixicon/react";
import { Md3LoadingIndicator } from "@/components/atoms/Md3Loading";
import { copyToClipboard } from "@/lib/clipboard";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import type { Meeting } from "@/types";

interface MeetingTranscriptProps {
  transcriptData: Meeting["transcript_data"];
  onRefine?: () => Promise<void>;
  defaultOpen?: boolean;
}

type TranscriptItem = NonNullable<Meeting["transcript_data"]>[number];

// ─── Speaker Avatar Deterministic Palette ──────────────────────────────────────
const SPEAKER_PALETTES = [
  { bg: "bg-primary-container", text: "text-on-primary-container", border: "border-primary/20" },
  { bg: "bg-tertiary-container", text: "text-on-tertiary-container", border: "border-tertiary/20" },
  { bg: "bg-secondary-container", text: "text-on-secondary-container", border: "border-secondary/20" },
  { bg: "bg-success-container", text: "text-on-success-container", border: "border-success/20" },
  { bg: "bg-warning-container", text: "text-on-warning-container", border: "border-warning/20" },
];

function getSpeakerTheme(name?: string) {
  if (!name || name === "Unknown" || name === "System") {
    return { bg: "bg-surface-container-high", text: "text-text-muted", border: "border-outline-variant/20" };
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SPEAKER_PALETTES.length;
  return SPEAKER_PALETTES[index];
}

function formatTimestamp(timestampMs?: number): string {
  if (typeof timestampMs !== "number" || timestampMs <= 0) return "";
  const totalSeconds = Math.floor(timestampMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`;
}

// ─── Text Extraction & Parsing ────────────────────────────────────────────────
function parseTurnContent(rawText: unknown): { paragraphs: Array<{ speaker?: string; text: string }>; rawString: string } {
  if (typeof rawText !== "string") {
    const s = JSON.stringify(rawText ?? "");
    return { paragraphs: [{ text: s }], rawString: s };
  }

  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const paragraphs = parsed.map((item: unknown) => {
          if (typeof item === "string") return { text: item };
          const obj = item as Record<string, unknown>;
          const text = String(obj.text || obj.utterance || obj.raw_text || obj.refined_text || JSON.stringify(item));
          const speaker = typeof obj.speaker === "string" ? obj.speaker : undefined;
          return { speaker, text };
        });
        const rawString = paragraphs.map((p) => (p.speaker ? `${p.speaker}: ${p.text}` : p.text)).join(" ");
        return { paragraphs, rawString };
      }

      if (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).dialog_turn)) {
        const turns = (parsed as Record<string, unknown>).dialog_turn as Array<Record<string, unknown>>;
        const paragraphs = turns.map((t) => ({
          speaker: typeof t.speaker === "string" ? t.speaker : undefined,
          text: String(t.refined_text || t.raw_text || t.text || ""),
        }));
        const rawString = paragraphs.map((p) => (p.speaker ? `${p.speaker}: ${p.text}` : p.text)).join(" ");
        return { paragraphs, rawString };
      }
    } catch {
      // JSON parse fallback to string
    }
  }

  return { paragraphs: [{ text: rawText }], rawString: rawText };
}

// ─── Keyword Highlighter ──────────────────────────────────────────────────────
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-primary/25 text-primary font-semibold rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MeetingTranscript({
  transcriptData,
  onRefine,
  defaultOpen = false,
}: MeetingTranscriptProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(defaultOpen);
  const [sourceFilter, setSourceFilter] = useState<"dom" | "refined">(() =>
    transcriptData?.some((c) => (c as Record<string, unknown>).source === "refined") ? "refined" : "dom"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("ALL");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTurnIdx, setCopiedTurnIdx] = useState<number | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const { showMessage } = useSnackbar();
  const searchInputId = useId();

  // Sync with defaultOpen if parent changes tab
  useEffect(() => {
    if (defaultOpen) {
      setTranscriptOpen(true);
    }
  }, [defaultOpen]);

  const rawChunks = useMemo(
    () => (transcriptData || []).filter((chunk) => (chunk as Record<string, unknown>).source !== "refined"),
    [transcriptData]
  );
  const refinedChunks = useMemo(
    () => (transcriptData || []).filter((chunk) => (chunk as Record<string, unknown>).source === "refined"),
    [transcriptData]
  );
  const hasRefinedData = refinedChunks.length > 0;

  // Fall back to all transcript data if specific source not tagged yet
  const visibleChunks = useMemo(() => {
    if (sourceFilter === "dom") {
      return rawChunks.length > 0 ? rawChunks : transcriptData || [];
    }
    return refinedChunks.length > 0 ? refinedChunks : transcriptData || [];
  }, [sourceFilter, rawChunks, refinedChunks, transcriptData]);

  // Distinct speakers list for quick filter chips
  const speakersList = useMemo(() => {
    const set = new Set<string>();
    visibleChunks.forEach((c) => {
      if (c.speaker && c.speaker.trim()) {
        set.add(c.speaker.trim());
      }
    });
    return Array.from(set);
  }, [visibleChunks]);

  // Filter chunks by keyword and speaker
  const filteredTurns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleChunks
      .map((chunk, originalIdx) => {
        const { paragraphs, rawString } = parseTurnContent(chunk.text);
        const speaker = chunk.speaker || "Unknown";
        return {
          chunk,
          originalIdx,
          speaker,
          paragraphs,
          rawString,
        };
      })
      .filter(({ speaker, rawString }) => {
        if (selectedSpeaker !== "ALL" && speaker !== selectedSpeaker) {
          return false;
        }
        if (!q) return true;
        return speaker.toLowerCase().includes(q) || rawString.toLowerCase().includes(q);
      });
  }, [visibleChunks, searchQuery, selectedSpeaker]);

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

  const handleCopyAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!transcriptData || transcriptData.length === 0) return;

    const textToCopy = filteredTurns
      .map(({ chunk, speaker, rawString }) => {
        const time = formatTimestamp(chunk.timestamp_ms);
        return `${time ? `${time} ` : ""}${speaker}: ${rawString}`;
      })
      .join("\n\n");

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedAll(true);
      showMessage("Transcript copied to clipboard", { variant: "success" });
      setTimeout(() => setCopiedAll(false), 2000);
    } else {
      showMessage("Couldn't copy the transcript", { variant: "error" });
    }
  };

  const handleCopySingleTurn = async (
    e: React.MouseEvent,
    turn: { chunk: TranscriptItem; speaker: string; rawString: string },
    idx: number
  ) => {
    e.stopPropagation();
    const time = formatTimestamp(turn.chunk.timestamp_ms);
    const text = `${time ? `${time} ` : ""}${turn.speaker}: ${turn.rawString}`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTurnIdx(idx);
      showMessage("Turn copied", { variant: "success" });
      setTimeout(() => setCopiedTurnIdx(null), 1500);
    }
  };

  if (!transcriptData || transcriptData.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-5 sm:p-7 shadow-none flex flex-col gap-4 transition-all">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group gap-4 select-none"
        onClick={() => setTranscriptOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setTranscriptOpen((o) => !o);
          }
        }}
        aria-expanded={transcriptOpen}
        aria-label="Toggle transcript section"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-bold tracking-tight text-text group-hover:text-primary transition-colors">
                Full Transcript
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-text-muted border border-outline-variant/15 font-mono">
                {visibleChunks.length} turns
              </span>
              {hasRefinedData && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary-container/40 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  AI Diarized
                </span>
              )}
            </div>
            {!transcriptOpen && (
              <p className="text-xs text-text-muted mt-0.5">
                Click to expand dialogue turns, filter by speaker, and search keywords
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div
          className="flex items-center justify-between sm:justify-end gap-2 md:gap-3 w-full sm:w-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* M3 Segmented Button: AI Refined vs Raw */}
          <div
            className="flex items-center bg-surface-container-high/60 rounded-full p-1 border border-outline-variant/20 shadow-none"
            role="group"
            aria-label="Transcript source selection"
          >
            {(["refined", "dom"] as const).map((source) => {
              const labels = { dom: "Raw", refined: "AI Refined" };
              const isActive = sourceFilter === source;
              const isLoading = source === "refined" && isRefining;

              return (
                <button
                  key={source}
                  type="button"
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
                      ? "bg-secondary-container text-on-secondary-container font-bold shadow-xs"
                      : "text-text-muted hover:text-text hover:bg-surface-container-high"
                  }`}
                  aria-pressed={isActive}
                >
                  {isLoading ? (
                    <Md3LoadingIndicator size="sm" className="text-current shrink-0" />
                  ) : source === "refined" ? (
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  )}
                  <span>{labels[source]}</span>
                </button>
              );
            })}
          </div>

          {/* Copy & Collapse Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-surface-container-high/60 border border-outline-variant/20 flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all cursor-pointer text-text active:scale-95"
              onClick={handleCopyAll}
              title="Copy entire transcript"
              aria-label="Copy entire transcript"
            >
              {copiedAll ? (
                <Check className="w-4 h-4 text-success" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-surface-container-high/60 border border-outline-variant/20 flex items-center justify-center hover:bg-secondary-container hover:text-on-secondary-container transition-all cursor-pointer text-text active:scale-95"
              onClick={() => setTranscriptOpen((o) => !o)}
              title={transcriptOpen ? "Collapse transcript" : "Expand transcript"}
              aria-label={transcriptOpen ? "Collapse transcript" : "Expand transcript"}
            >
              {transcriptOpen ? (
                <ChevronUp className="w-5 h-5 text-text" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Expanded Content Area ────────────────────────────────────────────── */}
      {transcriptOpen && (
        <div className="pt-2 flex flex-col gap-4">
          {/* Error Banner */}
          {refineError && (
            <div className="bg-risk-container text-on-risk-container rounded-[20px] p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <RiErrorWarningFill className="w-4 h-4" aria-hidden="true" />
                <span>Refinement Failed</span>
              </div>
              <p className="text-xs opacity-90">{refineError}</p>
            </div>
          )}

          {/* Search and Speaker Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container/40 p-2.5 sm:p-3 rounded-2xl border border-outline-variant/10">
            {/* Search Input Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <label htmlFor={searchInputId} className="sr-only">
                Search transcript
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Search className="w-4 h-4" />
              </div>
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dialogue, speaker, or keyword..."
                className="w-full pl-10 pr-9 py-2 bg-surface-container-low rounded-full text-xs sm:text-sm text-text placeholder:text-text-muted border border-outline-variant/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text cursor-pointer"
                  aria-label="Clear search query"
                >
                  <Close className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Match Count */}
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-text-muted px-1">
              <span>
                {searchQuery || selectedSpeaker !== "ALL" ? (
                  <>
                    Showing <strong className="text-text font-semibold">{filteredTurns.length}</strong> of{" "}
                    {visibleChunks.length}
                  </>
                ) : (
                  <>{visibleChunks.length} speaker turns</>
                )}
              </span>
            </div>
          </div>

          {/* Speaker Quick Filter Chips (if 2+ distinct speakers) */}
          {speakersList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs" role="toolbar" aria-label="Filter by speaker">
              <span className="text-text-muted text-[11px] font-medium mr-1 shrink-0 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" />
                Speakers:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSpeaker("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSpeaker === "ALL"
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-container-high/60 text-text-muted hover:text-text hover:bg-surface-container-high"
                }`}
              >
                All ({visibleChunks.length})
              </button>
              {speakersList.map((speaker) => {
                const isSelected = selectedSpeaker === speaker;
                const count = visibleChunks.filter((c) => c.speaker === speaker).length;
                return (
                  <button
                    key={speaker}
                    type="button"
                    onClick={() => setSelectedSpeaker(isSelected ? "ALL" : speaker)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container-high/60 text-text-muted hover:text-text hover:bg-surface-container-high"
                    }`}
                  >
                    <span>{speaker}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Turns List or Loading State ───────────────────────────────────── */}
          {isRefining && sourceFilter === "refined" ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-scale w-full bg-surface-container/20 rounded-[24px]">
              <Md3LoadingIndicator size="lg" className="text-primary" />
              <LoadingPhrases />
              <p className="text-xs text-text-variant italic max-w-sm text-center">
                Processing your raw transcript to remove filler words, fix grammar, and perfect diarization. This may take up to a minute...
              </p>
            </div>
          ) : filteredTurns.length === 0 ? (
            <div className="text-center py-12 px-4 bg-surface-container/30 rounded-[20px] border border-outline-variant/10 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-text-muted">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-text">No dialogue matches your filter</p>
              <p className="text-xs text-text-muted max-w-sm">
                No dialogue turns found for &ldquo;{searchQuery || selectedSpeaker}&rdquo;. Try another term or clear the filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSpeaker("ALL");
                }}
                className="mt-1 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTurns.map(({ chunk, originalIdx, speaker, paragraphs, rawString }) => {
                const theme = getSpeakerTheme(speaker);
                const timestamp = formatTimestamp(chunk.timestamp_ms);
                const isTurnCopied = copiedTurnIdx === originalIdx;

                return (
                  <div
                    key={originalIdx}
                    className="group/turn bg-surface-container/60 hover:bg-surface-container/90 rounded-[20px] p-4 sm:p-5 border border-outline-variant/10 flex flex-col gap-2.5 transition-all"
                  >
                    {/* Turn Meta Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Speaker Avatar & Name Badge */}
                        <div
                          className={`rounded-full pl-1.5 pr-3 py-1 text-xs font-semibold inline-flex items-center gap-2 ${theme.bg} ${theme.text} border ${theme.border}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-black/15 text-current text-[10px] font-bold flex items-center justify-center shrink-0">
                            {speaker.charAt(0).toUpperCase()}
                          </span>
                          <span className="tracking-tight">{speaker}</span>
                        </div>

                        {/* Timestamp Chip */}
                        {timestamp && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-text-variant bg-surface-container-high/80 rounded-md px-2 py-0.5">
                            <TimeIcon className="w-3 h-3 text-text-muted" />
                            {timestamp}
                          </span>
                        )}
                      </div>

                      {/* Right Meta: Source Tag & Single Turn Copy */}
                      <div className="flex items-center gap-1.5">
                        {!!(chunk as Record<string, unknown>).source && (
                          <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold bg-surface-container-high rounded-full px-2.5 py-0.5">
                            {(chunk as Record<string, unknown>).source as string}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) =>
                            handleCopySingleTurn(e, { chunk, speaker, rawString }, originalIdx)
                          }
                          className="opacity-0 group-hover/turn:opacity-100 focus:opacity-100 w-7 h-7 rounded-full bg-surface-container-high hover:bg-secondary-container hover:text-on-secondary-container text-text-muted flex items-center justify-center transition-all cursor-pointer"
                          title="Copy this turn"
                          aria-label={`Copy turn by ${speaker}`}
                        >
                          {isTurnCopied ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Speech Text Content */}
                    <div className="text-[13.5px] sm:text-sm text-text leading-relaxed font-normal pl-1">
                      {paragraphs.map((p, pIdx) => (
                        <p key={pIdx} className="mb-1.5 last:mb-0">
                          {p.speaker && p.speaker !== speaker && p.speaker !== "Unknown" && (
                            <strong className="mr-1.5 text-primary font-semibold">
                              {p.speaker}:
                            </strong>
                          )}
                          <HighlightedText text={p.text} query={searchQuery} />
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
