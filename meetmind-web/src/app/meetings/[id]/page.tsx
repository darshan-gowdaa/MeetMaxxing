"use client";
import "@material/web/progress/circular-progress.js";
import "@material/web/progress/linear-progress.js";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { fetchMeeting, updateActionItem } from "@/lib/api";
import { format } from "date-fns";
import {
  RiArrowLeftLine as ArrowLeft,
  RiGroupLine as Users,
  RiTimeLine as Clock,
  RiCheckLine as CheckCircle2,
  RiAlertLine as AlertTriangle,
  RiCalendarLine as Calendar,
  RiShieldCheckLine as Shield,
  RiArrowDownSLine as ChevronDown,
  RiArrowUpSLine as ChevronUp,
  RiChat1Line as MessageSquare,
  RiSparklingLine as Sparkles,
  RiFlashlightLine as Zap,
  RiCheckLine as Check,
  RiRadioButtonLine as Radio,
  RiMailLine as Mail,
  RiCalendar2Line as CalendarSync,
  RiExternalLinkLine as ExternalLink,
  RiRefreshLine as RefreshCw,
  RiUserLine as UserIcon,
} from "@remixicon/react";
import type { Meeting } from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-risk bg-[#3f1d20] border-risk/",
  medium: "text-warning bg-[#452b09] border-warning/",
  low: "text-success bg-[#0d3f23] border-success/",
};

type BtnState = "idle" | "loading" | "success" | "error";

function ActionButton({
  label,
  icon: Icon,
  state,
  successLabel,
  errorLabel = "Failed — retry",
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: BtnState;
  successLabel: string;
  errorLabel?: string;
  onClick: () => void;
}) {
  const baseClass =
    "flex items-center gap-[4px] px-[12px] py-[8px] rounded-[10px] border text-[12px] font-semibold transition-all duration-200 select-none ";
  if (state === "loading")
    return (
      <button disabled className={baseClass + "bg-surface3 border-border text-text-muted cursor-wait"}>
        <md-circular-progress indeterminate style={{ "--md-circular-progress-size": "14px" } as React.CSSProperties} />
        {label}…
      </button>
    );
  if (state === "success")
    return (
      <button disabled className={baseClass + "bg-success/10 border-success/ text-success cursor-default"}>
        <Check className="w-[14px] h-[14px]" />
        {successLabel}
      </button>
    );
  if (state === "error")
    return (
      <button onClick={onClick} className={baseClass + "bg-risk-bg/10 border-risk/ text-risk hover:-translate-y-0.5 active:translate-y-0"}>
        <AlertTriangle className="w-[14px] h-[14px]" />
        {errorLabel}
      </button>
    );
  return (
    <button
      onClick={onClick}
      className={baseClass + "bg-surface3 hover:bg-primary-container border-border text-[var(--text)] hover:text-white transition-colors"}
    >
      <Icon className="w-[14px] h-[14px]" />
      {label}
    </button>
  );
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [actionItems, setActionItems] = useState<Meeting["action_items"]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  // Button states
  const [gmailState, setGmailState] = useState<BtnState>("idle");
  const [calendarState, setCalendarState] = useState<BtnState>("idle");

  const loadMeeting = useCallback(() => {
    setLoading(true);
    fetchMeeting(id, "dev_token")
      .then((data: Meeting) => {
        setMeeting(data);
        setActionItems(data.action_items || []);
        setErrorMsg("");
        if (data.email_result?.sent) setGmailState("success");
        if (
          data.scheduling_result &&
          data.scheduling_result.status !== "skipped" &&
          !data.scheduling_result.error
        )
          setCalendarState("success");
      })
      .catch((err: Error) => {
        setMeeting(null);
        setErrorMsg(err.message || "Failed to fetch meeting from backend API on port 8000");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setTimeout(loadMeeting, 0);
  }, [loadMeeting]);

  const toggleItemStatus = async (itemId: string) => {
    const item = actionItems.find((a) => a.id === itemId);
    if (!item) return;
    const next =
      item.status === "open"
        ? "in_progress"
        : item.status === "in_progress"
        ? "done"
        : "open";
    setActionItems((prev) =>
      prev.map((a) => (a.id === itemId ? { ...a, status: next } : a))
    );
    try {
      await updateActionItem(itemId, { status: next }, "dev_token");
    } catch {
      setActionItems((prev) =>
        prev.map((a) => (a.id === itemId ? { ...a, status: item?.status || "open" } : a))
      );
    }
  };

  const handleGmail = async () => {
    if (!meeting) return;
    setGmailState("loading");
    try {
      const subject = encodeURIComponent(
        `[MeetMaxxing] Follow-up: ${meeting.title || "Meeting Summary"}`
      );
      const actionList = (meeting.action_items || [])
        .map((a, i) => `${i + 1}. ${a.description || ""} (Owner: ${a.owner_name || "Unassigned"})`)
        .join("\n");
      const body = encodeURIComponent(
        `Hi team,\n\nHere is a summary of our meeting: ${meeting.title || ""}\n\n` +
          `Summary:\n${meeting.summary || "No summary available."}\n\n` +
          (actionList ? `Action Items:\n${actionList}\n\n` : "") +
          `View full details: ${window.location.href}\n\nBest,\nMeetMaxxing AI Copilot`
      );
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
        "_blank"
      );
      setGmailState("success");
    } catch {
      setGmailState("error");
    }
  };

  const handleCalendar = async () => {
    if (!meeting) return;
    setCalendarState("loading");

    const buildGcalUrl = () => {
      const title = encodeURIComponent(
        `Follow-up: ${meeting.follow_up?.suggested_topic || meeting.title || "Meeting"}`
      );
      const details = encodeURIComponent(
        `Meeting Summary:\n${meeting.summary || "No summary."}\n\n` +
          (meeting.action_items?.length
            ? `Action Items:\n${meeting.action_items
                .map((a, i) => `${i + 1}. ${a.description} (${a.owner_name || "Unassigned"})`)
                .join("\n")}\n\n`
            : "") +
          `Dashboard: ${window.location.href}`
      );
      const now = new Date();
      const start = new Date(now.getTime() + 86400000);
      start.setUTCHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 3600000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dates = `${fmt(start)}/${fmt(end)}`;
      const add = meeting.attendees?.length
        ? `&add=${encodeURIComponent(meeting.attendees.join(","))}`
        : "";
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}${add}`;
    };

    try {
      const res = await fetch(`${BACKEND_URL}/calendar/add-url?meeting_id=${id}`, {
        headers: { Authorization: "Bearer dev_token" },
      });
      if (res.ok) {
        const text = await res.text();
        let data: Record<string, string> = {};
        if (text && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error("Calendar JSON parse error:", e);
          }
        }
        const url = data.gcal_url || data.html_link;
        if (url) {
          window.open(url, "_blank");
          setCalendarState("success");
          return;
        }
      }
    } catch {
      // Backend unreachable — fall through
    }

    window.open(buildGcalUrl(), "_blank");
    setCalendarState("success");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-white font-sans pb-24 flex flex-col items-center justify-center gap-4">
        <md-circular-progress indeterminate style={{ "--md-circular-progress-size": "48px" } as React.CSSProperties} />
        <p className="text-text-muted text-sm font-medium">Loading meeting data...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-[14px] text-center">
        <div className="w-20 h-20 rounded-2xl bg-risk-bg/20 border border-risk/ flex items-center justify-center mb-6 shadow-inner">
          <AlertTriangle className="w-[28px] h-[28px] text-risk" />
        </div>
        <h2 className="text-[20px] font-black text-white mb-3 tracking-tight">Meeting Record Not Found</h2>
        <p className="text-[13px] text-text-muted max-w-lg mb-8 leading-relaxed font-medium">
          Could not load meeting with ID{" "}
          <code className="bg-surface2 px-2.5 py-1 rounded-md text-primary font-mono text-[12px]">{id}</code>.
          {errorMsg
            ? ` (${errorMsg})`
            : " This record either does not exist or is still processing via the LLM pipeline."}
        </p>
        <div className="flex items-center gap-[6px]">
          <Link
            href="/"
            className="flex items-center gap-[6px] px-8 py-4 bg-primary-container hover:bg-primary-container/90 text-white text-[13px] font-bold rounded-full transition-colors shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-[16px] h-[16px]" />
            Back to Dashboard
          </Link>
          <button
            onClick={loadMeeting}
            className="w-12 h-12 rounded-full bg-surface2 hover:bg-surface3 border border-border text-primary flex items-center justify-center transition-colors"
          >
            <RefreshCw className="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white font-sans pb-24 selection:bg-primary-container selection:text-white">
      <Topbar />

      <div className="max-w-5xl mx-auto px-[12px] pt-[24px] flex flex-col gap-[16px]">

        {/* Header Card */}
        <div className="bg-surface border border-border rounded-[8px] p-[14px] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-10 -mt-10 group-hover:bg-primary/5 transition-colors duration-1000" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-[14px]">
            <div className="flex flex-col gap-[8px] max-w-2xl">
              <div className="flex items-center gap-[4px] text-[12px] text-primary font-bold bg-primary-container/50 border border-primary/ px-[12px] py-1.5 rounded-full w-fit">
                <Calendar className="w-[14px] h-[14px]" />
                <span>
                  {meeting.start_at
                    ? format(new Date(meeting.start_at), "EEEE, MMMM d, yyyy • h:mm a")
                    : "Recent Google Meet Call"}
                </span>
              </div>
              <h1 className="text-[18px] md:text-[20px] font-bold text-white tracking-tight leading-tight">
                {meeting.title}
              </h1>
            </div>

            <div className="flex flex-col items-end gap-[6px] shrink-0 pt-2">
              <div className="flex items-center gap-[6px]">
                {meeting.powered_by && (
                  <span className="px-[12px] py-[8px] rounded-full bg-surface2 border border-border text-[12px] text-white font-bold flex items-center gap-[4px] shadow-inner">
                    <Zap className="w-[14px] h-[14px] text-warning animate-pulse" />
                    <span>
                      Powered by <strong className="text-white">{meeting.powered_by}</strong>
                    </span>
                  </span>
                )}
                <span className="px-[12px] py-[8px] rounded-full bg-success/10 border border-success/ text-[12px] font-bold text-success flex items-center gap-[4px]">
                  <Shield className="w-[14px] h-[14px]" />
                  <span>Safety: {Math.round((meeting.guardrail_score || 0) * 100)}%</span>
                </span>
              </div>
              <span className="px-[12px] py-[8px] mt-2 rounded-full bg-success/10 border border-success/ text-[12px] text-success font-bold flex items-center gap-[4px] shadow-sm">
                <Radio className="w-[14px] h-[14px] animate-pulse" />
                Completed &amp; Summarized
              </span>

              <div className="flex flex-wrap gap-[4px]">
                <ActionButton
                  label="Send via Gmail"
                  icon={Mail}
                  state={gmailState}
                  successLabel="Gmail Compose Opened"
                  errorLabel="Failed — try again"
                  onClick={handleGmail}
                />
                <ActionButton
                  label="Sync to Calendar"
                  icon={CalendarSync}
                  state={calendarState}
                  successLabel="Calendar Synced"
                  errorLabel="Authorize Calendar"
                  onClick={handleCalendar}
                />
              </div>

              {meeting.scheduling_result?.html_link && (
                <a
                  href={meeting.scheduling_result.html_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                >
                  <ExternalLink className="w-[12px] h-[12px]" />
                  View Calendar Event
                </a>
              )}
            </div>
          </div>

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="relative z-10 flex flex-wrap items-center gap-[6px] pt-[12px] mt-6 border-t border-border text-[12px] text-text-muted font-medium">
              <div className="w-[24px] h-[24px] rounded-full bg-surface2 flex items-center justify-center border border-border">
                <Users className="w-[14px] h-[14px] text-primary" />
              </div>
              <span className="text-white font-bold">Participants:</span>
              <div className="flex flex-wrap gap-[4px]">
                {meeting.attendees.map((a) => (
                  <span key={a} className="px-3 py-1 bg-surface2 border border-border rounded-full text-[11px] font-bold text-white">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Executive Summary */}
        <div className="bg-surface border border-border rounded-[8px] p-[16px] shadow-md flex flex-col gap-[8px] relative overflow-hidden group">
          <div className="flex items-center gap-[6px] text-[13px] font-black text-tertiary uppercase tracking-widest">
            <div className="w-[28px] h-[28px] rounded-[10px] bg-tertiary/20 flex items-center justify-center">
              <Sparkles className="w-[16px] h-[16px]" />
            </div>
            <span>Executive Summary</span>
          </div>
          <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap font-medium">
            {meeting.summary || "No executive summary generated yet."}
          </p>
        </div>

        {/* Decisions Section */}
        {meeting.decisions && meeting.decisions.length > 0 && (
          <div className="bg-surface border border-border rounded-[8px] p-[16px] shadow-md flex flex-col gap-[8px]">
            <h2 className="text-[16px] font-bold text-white flex items-center gap-[4px] tracking-tight">
              <div className="w-[28px] h-[28px] rounded-[10px] bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-[16px] h-[16px] text-success" />
              </div>
              Key Decisions Logged ({meeting.decisions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
              {meeting.decisions.map((dec, idx) => (
                <div
                  key={idx}
                  className="bg-surface2 border border-border rounded-[8px] p-[12px] flex flex-col justify-between gap-[6px] shadow-sm hover:shadow-md transition-colors duration-300"
                >
                  <p className="text-[13px] text-white leading-relaxed font-semibold">{dec.text}</p>
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-text-muted pt-[10px] border-t border-border font-medium">
                    <span className="flex items-center gap-[4px]">
                      <span className="w-[20px] h-[20px] rounded-full bg-surface3 flex items-center justify-center border border-border">
                        <UserIcon className="w-[10px] h-[10px] text-text-muted" />
                      </span>
                      Decided by: <strong className="text-white">{dec.decided_by || "Team"}</strong>
                    </span>
                    {dec.confidence && (
                      <span className="px-2 py-1 rounded-md bg-primary-container/40 text-primary font-bold capitalize">
                        {dec.confidence} Confidence
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Action Items */}
        <div className="bg-surface border border-border rounded-[8px] p-[16px] shadow-md flex flex-col gap-[8px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[8px]">
            <h2 className="text-[16px] font-bold text-white flex items-center gap-[4px] tracking-tight">
              <div className="w-[28px] h-[28px] rounded-[10px] bg-primary-container flex items-center justify-center">
                <CheckCircle2 className="w-[16px] h-[16px] text-primary" />
              </div>
              Action Items &amp; Tasks ({actionItems.length})
            </h2>
            <span className="text-[12px] font-bold text-text-muted bg-surface2 px-[12px] py-[8px] rounded-full border border-border">
              Click task to toggle
            </span>
          </div>

          {actionItems.length === 0 ? (
            <div className="bg-surface2 rounded-[8px] p-[16px] text-center border border-border border-dashed">
              <p className="text-[13px] text-text-muted font-bold">No action items assigned in this meeting.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {actionItems.map((item) => {
                const isDone = item.status === "done";
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemStatus(item.id)}
                    className={`group bg-surface2 hover:bg-surface3 border ${
                      isDone ? "border-success/ bg-success/5" : "border-border"
                    } rounded-[8px] p-[12px] transition-colors duration-300 cursor-pointer flex items-center justify-between gap-[12px] shadow-sm hover:shadow-md`}
                  >
                    <div className="flex items-center gap-[8px] min-w-0">
                      <div
                        className={`w-[24px] h-[24px] rounded-[8px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isDone
                            ? "bg-success border-[var(--success)] text-bg"
                            : "border-[var(--foreground-variant)] group-hover:border-[var(--primary)]"
                        }`}
                      >
                        {isDone && <Check className="w-[16px] h-[16px] font-black" />}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-[13px] font-bold leading-relaxed truncate transition-colors ${
                            isDone ? "line-through text-text-muted" : "text-white group-hover:text-primary"
                          }`}
                        >
                          {item.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-[8px] text-[11px] text-text-muted mt-1.5 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className="w-[16px] h-[16px] rounded-full bg-surface border border-border flex items-center justify-center">
                              <UserIcon className="w-[10px] h-[10px] text-text-muted" />
                            </span>
                            Owner: <strong className="text-white">{item.owner_name || "Unassigned"}</strong>
                          </span>
                          {item.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-[12px] h-[12px] text-warning" />
                              Due: {item.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-[12px] py-1.5 rounded-full text-[11px] font-black border uppercase tracking-wide shrink-0 ${
                        PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium
                      }`}
                    >
                      {item.priority || "medium"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Spoken Transcript */}
        {meeting.transcript_data && meeting.transcript_data.length > 0 && (
          <div className="bg-surface border border-border rounded-[8px] p-[14px] shadow-md">
            <button
              onClick={() => setTranscriptOpen(!transcriptOpen)}
              className="w-full flex items-center justify-between text-left focus:outline-none group px-1"
            >
              <div className="flex items-center gap-[6px] text-[14px] font-bold text-white group-hover:text-primary transition-colors">
                <div className="w-[28px] h-[28px] rounded-[10px] bg-surface3 flex items-center justify-center border border-border group-hover:bg-primary-container transition-colors">
                  <MessageSquare className="w-[16px] h-[16px] text-primary" />
                </div>
                <span>Full Spoken Transcript Log ({meeting.transcript_data.length} utterances)</span>
              </div>
              <div className="w-[24px] h-[24px] rounded-full bg-surface3 flex items-center justify-center border border-border group-hover:bg-primary-container transition-colors">
                {transcriptOpen ? (
                  <ChevronUp className="w-[16px] h-[16px] text-white group-hover:text-primary" />
                ) : (
                  <ChevronDown className="w-[16px] h-[16px] text-white group-hover:text-primary" />
                )}
              </div>
            </button>

            {transcriptOpen && (
              <div className="mt-6 pt-[10px] border-t border-border flex flex-col gap-[6px] max-h-[500px] overflow-y-auto pr-3">
                {meeting.transcript_data.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 pb-3 border-b border-border last:border-0 hover:bg-surface/50 p-3 rounded-[10px] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-[12px] flex items-center gap-[4px]">
                        <span className="w-[20px] h-[20px] rounded-full bg-primary-container text-[10px] flex items-center justify-center border border-primary/ text-white">
                          {chunk.speaker.charAt(0).toUpperCase()}
                        </span>
                        {chunk.speaker}
                      </span>
                      {chunk.timestamp_ms && (
                        <span className="text-[11px] font-mono font-bold text-text-muted bg-surface3 px-2 py-0.5 rounded-md">
                          {format(new Date(chunk.timestamp_ms), "h:mm:ss a")}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-white leading-relaxed font-medium pl-8">{chunk.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
