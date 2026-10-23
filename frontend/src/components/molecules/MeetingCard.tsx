"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  RiCalendarLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiGroupLine,
  RiArrowRightLine,
  RiCheckLine,
  RiSparklingLine,
} from "@remixicon/react";
import type { Meeting } from "@/types";

export default function MeetingCard({
  meeting,
  index,
  compact = false,
  onDelete,
  onEdit,
  onSelect,
}: {
  meeting: Meeting;
  index: number;
  compact?: boolean;
  onDelete: (m: Meeting) => void;
  onEdit: (m: Meeting) => void;
  onSelect?: (m: Meeting) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [menuOpen]);

  const colorVariants = [
    "bg-primary-container/10 border-primary/20 hover:border-primary/50 md3-glow-primary",
    "bg-secondary-container/10 border-secondary/20 hover:border-secondary/50 md3-glow-secondary",
    "bg-tertiary-container/10 border-tertiary/20 hover:border-tertiary/50 md3-glow-tertiary",
    "bg-surface-container-high hover:border-primary/40 md3-glow-primary",
  ];
  const variant = colorVariants[index % colorVariants.length];

  const displayTitle =
    meeting.title && meeting.title !== "Google Meet" && meeting.title !== "Untitled Meeting"
      ? meeting.title
      : meeting.google_meet_link
      ? `Meet - ${meeting.google_meet_link}`
      : "Meet - Live Session";

  const participantsCount =
    meeting.max_participants && meeting.max_participants > 0
      ? meeting.max_participants
      : Math.max(
          new Set([
            ...(meeting.attendees || []),
            ...(Array.isArray(meeting.transcript_data) ? meeting.transcript_data : [])
              .map((t) => t.speaker)
              .filter((s) => s && s !== "Unknown" && s !== "System"),
          ]).size,
          1
        );

  const formattedDate = (() => {
    if (!meeting.start_at) return "Recent Call";
    const startD = new Date(meeting.start_at);
    if (isNaN(startD.getTime())) return "Recent Call";
    const startStr = format(startD, "MMM d • h:mm a");
    if (!meeting.end_at) return startStr;
    const endD = new Date(meeting.end_at);
    if (isNaN(endD.getTime())) return startStr;
    return `${startStr} – ${format(endD, "h:mm a")}`;
  })();

  // ── COMPACT MODE VIEW ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="group relative rounded-2xl sm:rounded-[22px] border border-outline-variant/15 hover:border-primary/50 bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between p-3.5 sm:px-5 gap-3 shadow-none hover:shadow-md">
        {/* Main link */}
        <Link
          href={`/meetings/${meeting.id}`}
          className="flex items-center gap-3.5 min-w-0 flex-1 py-0.5"
        >
          {/* Status icon / dot indicator */}
          <div className="w-9 h-9 rounded-xl bg-surface-container-high group-hover:bg-primary-container/40 flex items-center justify-center shrink-0 transition-colors">
            {meeting.status === "processing" ? (
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            ) : meeting.status === "active" ? (
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping" />
            ) : (
              <RiCalendarLine className="w-4 h-4 text-primary" />
            )}
          </div>

          {/* Title and metadata */}
          <div className="flex flex-col min-w-0 gap-0.5 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] sm:text-[15px] font-bold text-text truncate group-hover:text-primary transition-colors">
                {displayTitle}
              </h4>
              {meeting.summary && (
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container/40 text-[10.5px] font-semibold text-primary shrink-0">
                  <RiSparklingLine className="w-3 h-3" /> Summary
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-[11px] text-text-muted">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <RiGroupLine className="w-3 h-3" />
                {participantsCount}
              </span>
            </div>
          </div>
        </Link>

        {/* Action cluster */}
        <div className="flex items-center gap-1.5 shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="w-8 h-8 rounded-full bg-surface2 hover:bg-surface3 flex items-center justify-center transition-colors border border-border shadow-xs active:scale-[0.96]"
            aria-label="Meeting options"
          >
            <RiMoreLine className="w-4 h-4 text-text-muted" />
          </button>

          <Link
            href={`/meetings/${meeting.id}`}
            aria-label={`Open meeting ${displayTitle}`}
            className="w-8 h-8 rounded-full bg-surface2 hover:bg-primary-container flex items-center justify-center transition-colors group-hover:text-primary"
          >
            <RiArrowRightLine className="w-4 h-4 text-text-muted group-hover:text-primary" />
          </Link>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute top-full right-4 mt-2 w-44 bg-surface-highest rounded-2xl border border-border shadow-lg z-30 animate-fade-scale overflow-hidden">
              {onSelect && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onSelect(meeting);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface3 transition-colors"
                  >
                    <RiCheckLine className="w-4 h-4 text-primary" />
                    Select
                  </button>
                  <div className="h-px bg-border mx-3" />
                </>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  setTimeout(() => onEdit(meeting), 10);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-surface3 transition-colors"
              >
                <RiEditLine className="w-4 h-4 text-primary" />
                Rename
              </button>
              <div className="h-px bg-border mx-3" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  setTimeout(() => onDelete(meeting), 10);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-risk hover:bg-risk-container/30 transition-colors"
              >
                <RiDeleteBinLine className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STANDARD EXPANDED VIEW ──────────────────────────────────────────────────
  return (
    <div className={`group relative rounded-[32px] border spring flex flex-col h-auto min-h-[200px] md:h-[220px] overflow-visible ${variant} hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
      {/* 3-Dots Menu (Top Right) */}
      <div className="absolute top-4 right-4 z-20" ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="w-10 h-10 rounded-2xl bg-surface2 hover:bg-surface3 flex items-center justify-center spring-colors border border-border shadow-sm active:scale-[0.97]"
          aria-label="Meeting options"
        >
          <RiMoreLine className="w-4 h-4 text-text-muted" />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 w-44 bg-surface-highest rounded-3xl border border-border shadow-sm animate-fade-scale overflow-hidden">
            {onSelect && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onSelect(meeting);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-text hover:bg-surface3 spring-colors"
                >
                  <RiCheckLine className="w-4 h-4 text-primary" />
                  Select
                </button>
                <div className="h-px bg-border mx-3" />
              </>
            )}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setTimeout(() => onEdit(meeting), 10); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-text hover:bg-surface3 spring-colors"
            >
              <RiEditLine className="w-4 h-4 text-primary" />
              Rename
            </button>
            <div className="h-px bg-border mx-3" />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setTimeout(() => onDelete(meeting), 10); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-risk hover:bg-risk-container/30 spring-colors"
            >
              <RiDeleteBinLine className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Card body — clickable to navigate */}
      <Link
        href={`/meetings/${meeting.id}`}
        className="flex flex-col gap-3 p-5 flex-1 relative z-10 h-full"
      >
        {/* Date chip */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary-dim border border-primary/20 rounded-full px-3 py-1 w-fit mt-1">
          <RiCalendarLine className="w-3 h-3" />
          <span>{formattedDate}</span>
        </div>

        {/* Title */}
        <h4 className="text-[15px] font-bold text-text leading-snug line-clamp-2 group-hover:text-primary spring-colors pr-10 mt-1">
          {displayTitle}
        </h4>

        {/* Summary */}
        {meeting.summary ? (
          <p className="text-[12.5px] text-text-muted leading-relaxed line-clamp-3 flex-1 mt-1">
            {meeting.summary}
          </p>
        ) : meeting.status === "active" || meeting.status === "processing" ? (
          <div className="flex-1 flex flex-col items-start justify-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 ml-0.5">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
            </div>
            <p className="text-[11.5px] text-text-muted font-medium animate-pulse">
              {meeting.status === "processing" ? "AI is generating executive summary…" : "AI is processing transcript…"}
            </p>
          </div>
        ) : (
          <p className="text-[12.5px] text-text-muted/60 italic leading-relaxed line-clamp-3 flex-1 mt-1">
            {meeting.status === "no_transcript" ? "No transcript recorded for this meeting." : "Summary unavailable."}
          </p>
        )}

        {/* Footer inside link */}
        <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted font-medium">
            <RiGroupLine className="w-3.5 h-3.5" />
            {participantsCount} participants
          </div>
          <div className="w-7 h-7 rounded-full bg-surface2 group-hover:bg-primary-container flex items-center justify-center spring-colors">
            <RiArrowRightLine className="w-3.5 h-3.5 text-text-muted group-hover:text-primary spring-colors" />
          </div>
        </div>
      </Link>
    </div>
  );
}
