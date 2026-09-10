"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  RiCalendarLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileTextLine,
  RiLinkM,
  RiExternalLinkLine,
  RiUserLine,
  RiSparklingLine,
  RiCheckboxCircleLine,
  RiInformationLine,
} from "@remixicon/react";
import {
  ActionButton,
  GmailIcon,
  GoogleCalendarIcon,
  type BtnState,
} from "@/components/molecules/ActionButtons";
import EditDialog from "@/components/organisms/EditDialog";
import DeleteDialog from "@/components/organisms/DeleteDialog";
import { copyToClipboard } from "@/lib/clipboard";
import { useSnackbar } from "@/components/providers/SnackbarProvider";
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
    setMenuOpen(false);
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setLinkCopied(true);
      showMessage("Meeting link copied to clipboard", { variant: "success" });
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      showMessage("Couldn't copy link", { variant: "error" });
    }
  };

  const handleExportTxt = () => {
    let content = `Meeting: ${meeting.title || "Untitled"}\n`;
    content += `Date: ${
      meeting.start_at && !isNaN(new Date(meeting.start_at).getTime())
        ? format(new Date(meeting.start_at), "EEEE, MMMM d, yyyy • h:mm a")
        : "Unknown"
    }\n\n`;

    if (meeting.summary) {
      content += `=== SUMMARY ===\n${meeting.summary}\n\n`;
    }

    if (meeting.action_items && meeting.action_items.length > 0) {
      content += `=== ACTION ITEMS ===\n`;
      meeting.action_items.forEach((item) => {
        content += `- [${item.status === "done" ? "x" : " "}] ${item.description} (Owner: ${
          item.owner_name || "Unassigned"
        })\n`;
      });
      content += `\n`;
    }

    if (meeting.decisions && meeting.decisions.length > 0) {
      content += `=== DECISIONS ===\n`;
      meeting.decisions.forEach((d) => {
        const text = typeof d === "string" ? d : d.text || JSON.stringify(d);
        content += `- ${text}\n`;
      });
      content += `\n`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(meeting.title || "meeting").replace(/[^a-zA-Z0-9_-]/g, "_")}-notes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage("Meeting notes exported (TXT)", { variant: "success" });
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

  // MD3 status badge: strictly conditional, never displays false state
  const statusBadge = (() => {
    if (meeting.status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-primary bg-primary-container/30 border border-primary/30 rounded-full px-3 py-0.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" aria-hidden="true" />
          Live Recording
        </span>
      );
    }
    if (meeting.status === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-secondary bg-secondary-container/40 border border-secondary/30 rounded-full px-3 py-0.5">
          <RiSparklingLine className="w-3.5 h-3.5 text-secondary animate-spin" aria-hidden="true" />
          AI Processing Summary…
        </span>
      );
    }
    if (meeting.summary && meeting.summary.trim() && meeting.status !== "no_transcript") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-success bg-success/15 border border-success/30 rounded-full px-3 py-0.5">
          <RiCheckboxCircleLine className="w-3.5 h-3.5 text-success" aria-hidden="true" />
          Completed & Summarized
        </span>
      );
    }
    if (meeting.status === "no_transcript") {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-text-muted bg-surface-container-high border border-border rounded-full px-3 py-0.5">
          <RiInformationLine className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          No Transcript Recorded
        </span>
      );
    }
    return null;
  })();

  return (
    <>
      <div className="relative bg-surface-container rounded-[28px] border border-border overflow-hidden p-5 md:p-8">
        {/* Ambient tonal accent */}
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-5 justify-between">
          <div className="flex flex-col gap-2.5 max-w-2xl">
            {/* Metadata row: Date chip + Dynamic Status Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-primary bg-primary-container/20 border border-primary/25 rounded-full px-3 py-0.5 w-fit">
                <RiCalendarLine className="w-3 h-3" aria-hidden="true" />
                <span>{formattedDate}</span>
              </div>
              {statusBadge}
            </div>

            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold text-text tracking-tight leading-tight">
              {meeting.title && meeting.title !== "Google Meet" && meeting.title !== "Untitled Meeting"
                ? meeting.title
                : meeting.google_meet_link
                ? `Meet - ${meeting.google_meet_link}`
                : "Meet - Live Session"}
            </h1>
          </div>

          {/* Action Button Row: Primary visible buttons + MD3 Overflow Menu */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
            {meeting.summary && (
              <>
                <ActionButton
                  label="Send via Gmail"
                  icon={GmailIcon}
                  state={gmailState}
                  successLabel="Gmail Opened"
                  onClick={handleGmail}
                />
                <ActionButton
                  label="Sync Calendar"
                  icon={GoogleCalendarIcon}
                  state={calendarState}
                  successLabel="Calendar Synced"
                  errorLabel="Authorize Calendar"
                  onClick={handleCalendar}
                />
              </>
            )}

            {/* MD3 Expressive More Options Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="More options"
                className="flex items-center justify-center gap-1.5 h-10 sm:h-9 px-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-border text-[12px] sm:text-[13px] font-semibold text-text transition-all active:scale-[0.96] shadow-xs"
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
                    className="absolute top-full right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-surface-container-highest rounded-[24px] border border-border shadow-xl flex flex-col p-1.5 z-50 origin-top-right backdrop-blur-xl"
                  >
                    {/* Edit Title */}
                    {onRename && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setIsEditOpen(true);
                        }}
                        role="menuitem"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98]"
                      >
                        <RiEditLine className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span>Edit Title</span>
                      </button>
                    )}

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      role="menuitem"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98]"
                    >
                      <RiLinkM className="w-4 h-4 text-text-muted" aria-hidden="true" />
                      <span>{linkCopied ? "Link Copied!" : "Copy Link"}</span>
                    </button>

                    {/* Separator */}
                    <div className="h-[1px] bg-border mx-2 my-1" aria-hidden="true" />

                    {/* Export TXT */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleExportTxt();
                      }}
                      role="menuitem"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98]"
                    >
                      <RiDownloadLine className="w-4 h-4 text-text-muted" aria-hidden="true" />
                      <span>Export Notes (TXT)</span>
                    </button>

                    {/* Export Markdown */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleExportMarkdown();
                      }}
                      role="menuitem"
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-text hover:bg-surface-container-high transition-colors outline-none active:scale-[0.98]"
                    >
                      <RiFileTextLine className="w-4 h-4 text-text-muted" aria-hidden="true" />
                      <span>Export as Markdown</span>
                    </button>

                    {/* View Calendar Event */}
                    {meeting.scheduling_result?.html_link && (
                      <a
                        href={meeting.scheduling_result.html_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-primary hover:bg-primary-container/20 transition-colors outline-none active:scale-[0.98]"
                      >
                        <RiExternalLinkLine className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span>View Calendar Event</span>
                      </a>
                    )}

                    {/* Separator */}
                    {onDelete && (
                      <>
                        <div className="h-[1px] bg-border mx-2 my-1" aria-hidden="true" />

                        {/* Delete Meeting */}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setIsDeleteOpen(true);
                          }}
                          role="menuitem"
                          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-risk hover:bg-risk-container hover:text-on-risk-container transition-colors outline-none active:scale-[0.98]"
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

        {/* Participants chip list */}
        {participantsList.length > 0 && (
          <div className="relative z-10 flex flex-wrap items-center gap-2 pt-4 mt-5 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-[12px] text-text-muted font-medium">
              <RiUserLine className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-text font-semibold">
                Participants ({participantsList.length}):
              </span>
            </div>
            {participantsList.map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 text-[11.5px] font-medium text-text bg-surface-container-high border border-border/80 rounded-full px-3 py-1"
              >
                <span className="w-4 h-4 rounded-full bg-primary-container text-[8px] font-bold text-on-primary-container flex items-center justify-center">
                  {a.charAt(0).toUpperCase()}
                </span>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit Title Dialog */}
      {isEditOpen && (
        <EditDialog
          initialTitle={meeting.title || ""}
          itemName="Meeting"
          onSave={handleSaveTitle}
          onCancel={() => setIsEditOpen(false)}
          busy={editBusy}
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
