"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  RiCalendarLine,
  RiTimeLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiLinkM,
  RiExternalLinkLine,
  RiSparklingLine,
  RiCheckboxCircleLine,
  RiInformationLine,
} from "@remixicon/react";
import {
  ActionButton,
  GmailIcon,
  GoogleCalendarIcon,
  GoogleMeetIcon,
  PdfColorIcon,
  MarkdownColorIcon,
  type BtnState,
} from "@/components/molecules/ActionButtons";
import EditDialog from "@/components/organisms/EditDialog";
import DeleteDialog from "@/components/organisms/DeleteDialog";
import { copyToClipboard } from "@/lib/clipboard";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
import { exportMeetingPdf } from "@/lib/pdfExport";
import { suggestMeetingTitle } from "@/lib/api";
import type { Meeting } from "@/types";

interface MeetingHeaderProps {
  meeting: Meeting;
  gmailState: BtnState;
  calendarState: BtnState;
  handleGmail: () => void;
  handleCalendar: () => void;
  onRename?: (newTitle: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function MeetingHeader({
  meeting,
  gmailState,
  calendarState,
  handleGmail,
  handleCalendar,
  onRename,
  onDelete,
}: MeetingHeaderProps) {
  const set = new Set<string>(meeting.attendees || []);
  if (meeting.transcript_data && Array.isArray(meeting.transcript_data)) {
    meeting.transcript_data.forEach((t) => {
      if (t.speaker && t.speaker !== "Unknown" && t.speaker !== "System") {
        set.add(t.speaker);
      }
    });
  }
  const participantsList = Array.from(set);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { showMessage } = useSnackbar();

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleCopyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const ok = await copyToClipboard(url);
    setMenuOpen(false);
    if (ok) {
      setLinkCopied(true);
      showMessage("Meeting link copied to clipboard", { variant: "success" });
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      showMessage("Failed to copy link to clipboard", { variant: "error" });
    }
  };

  const handleExportPdf = async () => {
    setMenuOpen(false);
    try {
      await exportMeetingPdf(meeting);
      showMessage("Meeting notes exported as PDF", { variant: "success" });
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("Failed to generate PDF", { variant: "error" });
    }
  };

  const handleExportMarkdown = () => {
    let md = `# ${meeting.title || "Untitled Meeting"}\n\n`;
    if (meeting.start_at && !isNaN(new Date(meeting.start_at).getTime())) {
      md += `**Date:** ${format(
        new Date(meeting.start_at),
        "EEEE, MMMM d, yyyy • h:mm a"
      )}\n\n`;
    }
    if (meeting.summary) {
      md += `## Executive Summary\n\n${meeting.summary}\n\n`;
    }
    if (meeting.decisions && meeting.decisions.length > 0) {
      md += `## Key Decisions\n\n`;
      meeting.decisions.forEach((d) => {
        const text = typeof d === "string" ? d : d.text || JSON.stringify(d);
        md += `- ${text}\n`;
      });
      md += `\n`;
    }
    if (meeting.action_items && meeting.action_items.length > 0) {
      md += `## Action Items\n\n`;
      meeting.action_items.forEach((item) => {
        md += `- [${item.status === "done" ? "x" : " "}] **${item.description}** (Owner: ${
          item.owner_name || "Unassigned"
        })\n`;
      });
      md += `\n`;
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(meeting.title || "meeting").replace(/[^a-zA-Z0-9_-]/g, "_")}-notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage("Meeting notes exported (Markdown)", { variant: "success" });
  };

  const handleCopyAllNotes = async () => {
    let md = `# ${meeting.title || "Untitled Meeting"}\n\n`;
    if (meeting.start_at && !isNaN(new Date(meeting.start_at).getTime())) {
      md += `**Date:** ${format(
        new Date(meeting.start_at),
        "EEEE, MMMM d, yyyy • h:mm a"
      )}\n\n`;
    }
    if (meeting.summary) {
      md += `## Executive Summary\n\n${meeting.summary}\n\n`;
    }
    if (meeting.decisions && meeting.decisions.length > 0) {
      md += `## Key Decisions\n\n`;
      meeting.decisions.forEach((d) => {
        const text = typeof d === "string" ? d : d.text || JSON.stringify(d);
        md += `- ${text}\n`;
      });
      md += `\n`;
    }
    if (meeting.action_items && meeting.action_items.length > 0) {
      md += `## Action Items\n\n`;
      meeting.action_items.forEach((item) => {
        md += `- [${item.status === "done" ? "x" : " "}] **${item.description}** (Owner: ${
          item.owner_name || "Unassigned"
        })\n`;
      });
      md += `\n`;
    }

    const ok = await copyToClipboard(md);
    setMenuOpen(false);
    if (ok) {
      showMessage("All meeting notes copied to clipboard", { variant: "success" });
    } else {
      showMessage("Failed to copy notes to clipboard", { variant: "error" });
    }
  };

  const handleSaveTitle = async (newTitle: string) => {
    if (!onRename) return;
    setEditBusy(true);
    try {
      await onRename(newTitle);
      setIsEditOpen(false);
      showMessage("Meeting title updated", { variant: "success" });
    } catch (e: unknown) {
      showMessage((e as Error).message || "Failed to update title", { variant: "error" });
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setDeleteBusy(true);
    try {
      await onDelete();
      setIsDeleteOpen(false);
      showMessage("Meeting deleted", { variant: "success" });
    } catch (e: unknown) {
      showMessage((e as Error).message || "Failed to delete meeting", { variant: "error" });
      setDeleteBusy(false);
    }
  };

  // Safe formatted date
  const formattedDate = (() => {
    if (!meeting.start_at) return "Recent Google Meet Call";
    const startD = new Date(meeting.start_at);
    if (isNaN(startD.getTime())) return "Recent Google Meet Call";
    const startStr = format(startD, "EEEE, MMMM d, yyyy • h:mm a");
    if (!meeting.end_at) return startStr;
    const endD = new Date(meeting.end_at);
    if (isNaN(endD.getTime())) return startStr;
    return `${startStr} – ${format(endD, "h:mm a")}`;
  })();

  // Duration calculated from start_at and end_at
  const durationLabel = (() => {
    if (!meeting.start_at || !meeting.end_at) return null;
    const start = new Date(meeting.start_at).getTime();
    const end = new Date(meeting.end_at).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const diffMinutes = Math.round((end - start) / (1000 * 60));
    if (diffMinutes < 1) return "< 1 min";
    if (diffMinutes >= 60) {
      const hrs = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${diffMinutes} mins`;
  })();

  // Resolve Google Meet URL and display label
  const meetUrl = (() => {
    if (!meeting.google_meet_link) return null;
    if (meeting.google_meet_link.startsWith("http://") || meeting.google_meet_link.startsWith("https://")) {
      return meeting.google_meet_link;
    }
    return `https://meet.google.com/${meeting.google_meet_link}`;
  })();

  const meetDisplayCode = (() => {
    if (!meeting.google_meet_link) return "Google Meet";
    const clean = meeting.google_meet_link.replace(/^https?:\/\/meet\.google\.com\//, "");
    return clean.length > 0 ? clean : "Google Meet";
  })();

  // Resolve display title
  const displayTitle = (() => {
    if (meeting.title && meeting.title !== "Google Meet" && meeting.title !== "Untitled Meeting") {
      return meeting.title;
    }
    if (meeting.google_meet_link) {
      return `Meet - ${meeting.google_meet_link}`;
    }
    return "Meet - Live Session";
  })();

  // MD3 Expressive status badge
  const statusBadge = (() => {
    if (meeting.status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-primary bg-primary-container/30 border border-primary/30 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" aria-hidden="true" />
          Live Recording
        </span>
      );
    }
    if (meeting.status === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-secondary bg-secondary-container/40 border border-secondary/30 rounded-full px-3 py-1">
          <RiSparklingLine className="w-3.5 h-3.5 text-secondary animate-spin" aria-hidden="true" />
          AI Processing Summary…
        </span>
      );
    }
    if (meeting.summary && meeting.summary.trim() && meeting.status !== "no_transcript") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-success bg-success-container/30 border border-success/30 rounded-full px-3 py-1">
          <RiCheckboxCircleLine className="w-3.5 h-3.5 text-success" aria-hidden="true" />
          Completed & Summarized
        </span>
      );
    }
    if (meeting.status === "no_transcript") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-text-muted bg-surface-container-high border border-outline-variant/20 rounded-full px-3 py-1">
          <RiInformationLine className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          No Transcript Recorded
        </span>
      );
    }
    return null;
  })();

  // Participant initials color helper
  const getAvatarBg = (idx: number) => {
    const colors = [
      "bg-primary-container text-on-primary-container",
      "bg-secondary-container text-on-secondary-container",
      "bg-tertiary-container text-on-tertiary-container",
      "bg-success-container text-on-success-container",
      "bg-warning-container text-on-warning-container",
    ];
    return colors[idx % colors.length];
  };

  return (
    <>
      <header className="relative z-20 bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none transition-all">
        {/* Ambient tonal accent with contained overflow */}
        <div
          className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          {/* 1. Top Meta Row: Google Meet badge, Date & Time chip, Duration chip, Status badge */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Google Meet Badge */}
            {meetUrl ? (
              <a
                href={meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${meetUrl} in Google Meet`}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-text bg-surface-container-high/70 hover:bg-surface-container-highest border border-outline-variant/20 rounded-full px-3 py-1 transition-all active:scale-[0.98] group cursor-pointer"
              >
                <GoogleMeetIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{meetDisplayCode}</span>
                <RiExternalLinkLine className="w-3 h-3 text-text-muted group-hover:text-primary transition-colors" aria-hidden="true" />
              </a>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-text bg-surface-container-high/70 border border-outline-variant/20 rounded-full px-3 py-1">
                <GoogleMeetIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Google Meet</span>
              </div>
            )}

            {/* Date & Time Chip */}
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-primary bg-primary-container/20 border border-primary/25 rounded-full px-3 py-1">
              <RiCalendarLine className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{formattedDate}</span>
            </div>

            {/* Duration Chip */}
            {durationLabel && (
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-text-muted bg-surface-container-high/60 border border-outline-variant/20 rounded-full px-3 py-1">
                <RiTimeLine className="w-3.5 h-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span>{durationLabel}</span>
              </div>
            )}

            {/* Status Badge */}
            {statusBadge}
          </div>

          {/* 2. Full-Width Expressive Title Row with Inline Edit Pencil & AI Suggest Chip */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full group">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text tracking-tight leading-tight break-words">
              {displayTitle}
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              {onRename && (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  aria-label="Edit meeting title"
                  title="Edit meeting title"
                  className="p-1.5 rounded-full text-text-muted hover:text-primary hover:bg-surface-container-highest transition-colors active:scale-95 shrink-0 cursor-pointer"
                >
                  <RiEditLine className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </button>
              )}
              {onRename && (!meeting.title || meeting.title.startsWith("Meet - ") || meeting.title === "Google Meet" || meeting.title === "Untitled Meeting") && (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/40 hover:bg-primary-container text-primary hover:text-on-primary-container text-xs font-bold border border-primary/20 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Generate intelligent title with AI"
                >
                  <RiSparklingLine className="w-3.5 h-3.5 text-primary" />
                  <span>Suggest Title</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Clean Participants Avatar Stack with Initials & Role Badges */}
          {participantsList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* Overlapping Avatar Stack */}
              <div className="flex items-center -space-x-2 shrink-0">
                {participantsList.slice(0, 4).map((p, idx) => (
                  <div
                    key={p}
                    title={p}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center justify-center ring-2 ring-surface-container-low shadow-sm ${getAvatarBg(
                      idx
                    )}`}
                  >
                    {p.charAt(0).toUpperCase()}
                  </div>
                ))}
                {participantsList.length > 4 && (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[9px] sm:text-[10px] font-bold bg-surface-container-highest text-text-muted flex items-center justify-center ring-2 ring-surface-container-low">
                    +{participantsList.length - 4}
                  </div>
                )}
              </div>

              {/* Participant Pill Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {participantsList.map((p, idx) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium text-text bg-surface-container/60 border border-outline-variant/15 rounded-full px-2.5 py-0.5"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${getAvatarBg(
                        idx
                      )}`}
                    >
                      {p.charAt(0).toUpperCase()}
                    </span>
                    <span>{p}</span>
                    {idx === 0 && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                        Host
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4. Dedicated Expressive Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-5 mt-2 border-t border-outline-variant/15">
            {meeting.summary && (
              <>
                <ActionButton
                  label="Send via Gmail"
                  icon={GmailIcon}
                  state={gmailState}
                  successLabel="Gmail Opened"
                  onClick={handleGmail}
                  variant="filled-tonal"
                />
                <ActionButton
                  label="Sync Calendar"
                  icon={GoogleCalendarIcon}
                  state={calendarState}
                  successLabel="Calendar Synced"
                  errorLabel="Authorize Calendar"
                  onClick={handleCalendar}
                  variant="tonal"
                />
              </>
            )}

            {/* Export PDF pill button (M3 Tonal button) with colorful PDF badge */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-surface-container-high text-text hover:bg-surface-container-highest border border-outline-variant/15 hover:border-red-500/30 cursor-pointer group shadow-2xs"
            >
              <PdfColorIcon className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span>Export PDF</span>
            </button>

            {/* M3 More Options Overflow Menu */}
            <div className="relative z-50 ml-auto sm:ml-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More options"
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all duration-200 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/15 text-text cursor-pointer"
              >
                <RiMoreLine className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <span className="hidden sm:inline">Options</span>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: reduced ? 0 : -8, scale: reduced ? 1 : 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -8, scale: reduced ? 1 : 0.96 }}
                    transition={
                      reduced
                        ? { duration: 0.01 }
                        : { type: "spring", stiffness: 500, damping: 35 }
                    }
                    role="menu"
                    aria-label="Meeting options"
                    className="absolute top-full right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-surface-container-highest rounded-[24px] border border-outline-variant/15 shadow-2xl flex flex-col p-1.5 z-[100] origin-top-right backdrop-blur-xl"
                  >
                    {/* Copy All Notes */}
                    <button
                      type="button"
                      onClick={handleCopyAllNotes}
                      role="menuitem"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98] cursor-pointer"
                    >
                      <RiLinkM className="w-4 h-4 text-primary" aria-hidden="true" />
                      <span>Copy Full Meeting Notes</span>
                    </button>

                    {/* Edit Title */}
                    {onRename && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setIsEditOpen(true);
                        }}
                        role="menuitem"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98] cursor-pointer"
                      >
                        <RiEditLine className="w-4 h-4 text-text-muted" aria-hidden="true" />
                        <span>Edit Title</span>
                      </button>
                    )}

                    {/* Copy Meeting Link */}
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      role="menuitem"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98] cursor-pointer"
                    >
                      <RiLinkM className="w-4 h-4 text-text-muted" aria-hidden="true" />
                      <span>{linkCopied ? "Link Copied!" : "Copy Meeting Link"}</span>
                    </button>

                    {/* Export Markdown (.md) */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleExportMarkdown();
                      }}
                      role="menuitem"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98] cursor-pointer group"
                    >
                      <MarkdownColorIcon className="w-4 h-4 shrink-0 group-hover:scale-105 transition-transform" />
                      <span>Export as Markdown (.md)</span>
                    </button>

                    {/* View Calendar Event */}
                    {meeting.scheduling_result?.html_link && (
                      <a
                        href={meeting.scheduling_result.html_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-primary hover:bg-primary-container/20 transition-colors outline-none active:scale-[0.98] cursor-pointer"
                      >
                        <RiExternalLinkLine className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span>View Calendar Event</span>
                      </a>
                    )}

                    {/* Destructive Action: Delete Meeting */}
                    {onDelete && (
                      <>
                        <div className="h-[1px] bg-outline-variant/15 mx-2 my-1" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setIsDeleteOpen(true);
                          }}
                          role="menuitem"
                          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-risk hover:bg-risk-container/20 transition-colors outline-none active:scale-[0.98] cursor-pointer"
                        >
                          <RiDeleteBinLine className="w-4 h-4 text-risk" aria-hidden="true" />
                          <span>Delete Meeting</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Title Dialog with AI Title Suggestions */}
      {isEditOpen && (
        <EditDialog
          initialTitle={meeting.title || ""}
          itemName="Meeting"
          onSave={handleSaveTitle}
          onCancel={() => setIsEditOpen(false)}
          busy={editBusy}
          onSuggestAiTitle={() => suggestMeetingTitle(meeting.id)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteOpen && (
        <DeleteDialog
          title={meeting.title || "Untitled Meeting"}
          itemName="Meeting"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setIsDeleteOpen(false)}
          busy={deleteBusy}
        />
      )}
    </>
  );
}
