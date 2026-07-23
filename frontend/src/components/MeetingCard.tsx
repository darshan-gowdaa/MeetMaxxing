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
} from "@remixicon/react";
import type { Meeting } from "@/types";

export default function MeetingCard({
  meeting,
  index,
  onDelete,
  onEdit,
  onSelect,
}: {
  meeting: Meeting;
  index: number;
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
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const colorVariants = [
    "bg-primary-container/10 border-primary/20 hover:border-primary/50 md3-glow-primary",
    "bg-secondary-container/10 border-secondary/20 hover:border-secondary/50 md3-glow-secondary",
    "bg-tertiary-container/10 border-tertiary/20 hover:border-tertiary/50 md3-glow-tertiary",
    "bg-[#2c2d34] hover:border-primary/40 md3-glow-primary",
  ];
  const variant = colorVariants[index % colorVariants.length];

  return (
    <div className={`group relative rounded-[24px] border spring flex flex-col h-[220px] overflow-visible ${variant}`}>
      {/* Top glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-t-[24px]" />

      {/* 3-Dots Menu (Top Right) */}
      <div className="absolute top-4 right-4 z-20" ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="w-8 h-8 rounded-full bg-surface2 hover:bg-surface3 flex items-center justify-center spring-colors border border-border shadow-sm"
          aria-label="Meeting options"
        >
          <RiMoreLine className="w-4 h-4 text-text-muted" />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 w-44 bg-surface-highest rounded-[16px] border border-border shadow-2xl animate-fade-scale overflow-hidden">
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
          {meeting.start_at ? (
            <span>
              {format(new Date(meeting.start_at), "MMM d, yyyy • h:mm a")}
              {meeting.end_at ? ` – ${format(new Date(meeting.end_at), "h:mm a")}` : ""}
            </span>
          ) : (
            "Recent Call"
          )}
        </div>

        {/* Title */}
        <h4 className="text-[15px] font-bold text-text leading-snug line-clamp-2 group-hover:text-primary spring-colors pr-10 mt-1">
          {meeting.title && meeting.title !== "Google Meet" && meeting.title !== "Untitled Meeting"
            ? meeting.title
            : meeting.google_meet_link
            ? `Meet - ${meeting.google_meet_link}`
            : "Meet - Live Session"}
        </h4>

        {/* Summary */}
        {meeting.summary ? (
          <p className="text-[12.5px] text-text-muted leading-relaxed line-clamp-3 flex-1 mt-1">
            {meeting.summary}
          </p>
        ) : meeting.status === "active" || meeting.status === "processing" ? (
          <div className="flex-1 flex flex-col items-start justify-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 ml-0.5">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
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
            {(() => {
              if (meeting.max_participants && meeting.max_participants > 0) {
                return meeting.max_participants;
              }
              const set = new Set<string>(meeting.attendees || []);
              if (meeting.transcript_data && Array.isArray(meeting.transcript_data)) {
                meeting.transcript_data.forEach((t) => {
                  if (t.speaker && t.speaker !== "Unknown" && t.speaker !== "System") set.add(t.speaker);
                });
              }
              return Math.max(set.size, 1);
            })()} participants
          </div>
          <div className="w-7 h-7 rounded-full bg-surface2 group-hover:bg-primary-container flex items-center justify-center spring-colors">
            <RiArrowRightLine className="w-3.5 h-3.5 text-text-muted group-hover:text-primary spring-colors" />
          </div>
        </div>
      </Link>
    </div>
  );
}
