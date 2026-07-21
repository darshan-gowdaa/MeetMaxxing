"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { fetchMeeting, updateActionItem } from "@/lib/api";
import { Md3LoadingIndicator } from "@/components/Md3Loading";
import { format } from "date-fns";
import {
  RiArrowLeftLine as ArrowLeft,
  RiGroupLine as Users,
  RiTimeLine as Clock,
  RiCheckLine as CheckCircle2,
  RiCalendarLine as Calendar,
  RiArrowDownSLine as ChevronDown,
  RiArrowUpSLine as ChevronUp,
  RiChat1Line as MessageSquare,
  RiSparklingLine as Sparkles,
  RiCheckLine as Check,
  RiRadioButtonLine as Radio,
  RiExternalLinkLine as ExternalLink,
  RiRefreshLine as RefreshCw,
  RiUserLine as UserIcon,
} from "@remixicon/react";
import type { Meeting } from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const PRIORITY: Record<string, { chip: string; dot: string }> = {
  high:   { chip: "bg-risk-container text-risk border-risk/30",      dot: "bg-risk" },
  medium: { chip: "bg-warning-container text-warning border-warning/30", dot: "bg-warning" },
  low:    { chip: "bg-success-container text-success border-success/30", dot: "bg-success" },
};

import { ActionButton, GmailIcon, GoogleCalendarIcon, type BtnState } from "@/components/ActionButtons";


export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "dom" | "audio">("all");
  const [actionItems, setActionItems] = useState<Meeting["action_items"]>([]);
  const [errorMsg, setErrorMsg] = useState("");
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
        if (data.scheduling_result && ["success", "scheduled", "gcal_url_generated"].includes(data.scheduling_result.status))
          setCalendarState("success");
      })
      .catch((err: Error) => {
        setMeeting(null);
        setErrorMsg(err.message || "Failed to fetch meeting from backend");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const poll = async () => {
      try {
        const data = await fetchMeeting(id, "dev_token");
        setMeeting(data);
        setActionItems(data.action_items || []);
        setErrorMsg("");
        if (data.email_result?.sent) setGmailState("success");
        if (data.scheduling_result && ["success", "scheduled", "gcal_url_generated"].includes(data.scheduling_result.status))
          setCalendarState("success");

        if (data.status === "active" || data.status === "processing") {
          timeoutId = setTimeout(poll, 3000);
        }
      } catch (err: unknown) {
        setMeeting(null);
        setErrorMsg((err as Error).message || "Failed to fetch meeting from backend");
      } finally {
        setLoading(false);
      }
    };
    
    // setLoading(true);  // Removed to fix React hook warning, poll will set data anyway
    poll();
    
    return () => clearTimeout(timeoutId);
  }, [id]);

  const toggleItemStatus = async (itemId: string) => {
    const item = actionItems.find((a) => a.id === itemId);
    if (!item) return;
    const next =
      item.status === "open" ? "in_progress" :
      item.status === "in_progress" ? "done" : "open";
    setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: next } : a)));
    try {
      await updateActionItem(itemId, { status: next }, "dev_token");
    } catch {
      setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: item.status } : a)));
    }
  };

  const handleGmail = async () => {
    if (!meeting) return;
    setGmailState("loading");
    try {
      const subject = encodeURIComponent(`[MeetMaxxing] Follow-up: ${meeting.title || "Meeting Summary"}`);
      const actionList = (meeting.action_items || [])
        .map((a, i) => `${i + 1}. ${a.description} (Owner: ${a.owner_name || "Unassigned"})`)
        .join("\n");
      const body = encodeURIComponent(
        `Hi team,\n\nMeeting: ${meeting.title || ""}\n\nSummary:\n${meeting.summary || "No summary."}\n\n` +
        (actionList ? `Action Items:\n${actionList}\n\n` : "") +
        `Details: ${window.location.href}\n\nBest,\nMeetMaxxing AI Copilot`
      );
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank");
      setGmailState("success");
    } catch { setGmailState("error"); }
  };

  const handleCalendar = async () => {
    if (!meeting) return;
    setCalendarState("loading");
    const buildGcalUrl = () => {
      const title = encodeURIComponent(`Follow-up: ${meeting.follow_up?.suggested_topic || meeting.title || "Meeting"}`);
      const details = encodeURIComponent(
        `Summary:\n${meeting.summary || ""}\n\n` +
        (meeting.action_items?.length ? `Actions:\n${meeting.action_items.map((a, i) => `${i + 1}. ${a.description}`).join("\n")}\n\n` : "") +
        `Dashboard: ${window.location.href}`
      );
      const start = new Date(Date.now() + 86400000); start.setUTCHours(10, 0, 0, 0);
      const end = new Date(start.getTime() + 3600000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const add = meeting.attendees?.length ? `&add=${encodeURIComponent(meeting.attendees.join(","))}` : "";
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(start)}/${fmt(end)}${add}`;
    };
    try {
      const res = await fetch(`${BACKEND_URL}/calendar/add-url?meeting_id=${id}`, {
        headers: { Authorization: "Bearer dev_token" },
      });
      if (res.ok) {
        const data = JSON.parse(await res.text());
        const url = data.gcal_url || data.html_link;
        if (url) { window.open(url, "_blank"); setCalendarState("success"); return; }
      }
    } catch { /* fall through */ }
    window.open(buildGcalUrl(), "_blank");
    setCalendarState("success");
  };

  // ── Loading fullscreen ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <Md3LoadingIndicator size="lg" />
          <p className="text-[13px] text-text-muted font-medium">Loading meeting data…</p>
        </div>
      </div>
    );
  }

  // ── Processing / Not Found state ────────────────────────────────────────
  if (!meeting) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[14px] text-text-muted font-medium animate-pulse tracking-wide">
              AI is processing this meeting transcript
            </p>
            {errorMsg && (
              <p className="text-[11px] text-text-muted/40 max-w-xs text-center">{errorMsg}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Link
              href="/"
              className="flex items-center gap-2 h-10 px-5 rounded-full bg-surface2 hover:bg-surface3 text-text text-[13px] font-semibold spring"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={loadMeeting}
              className="w-10 h-10 rounded-full bg-surface2 hover:bg-surface3 text-text flex items-center justify-center spring"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main detail ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-5">

        {/* Back nav */}
        <Link
          href="/"
          className="group flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-text hover:text-primary bg-surface-container hover:bg-surface2 border border-border rounded-full w-fit mb-2 spring shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:-translate-x-1 spring" />
          All Meetings
        </Link>

        {/* ── Header card ─────────────────────────────────────────────── */}
        <div className="relative bg-surface-container rounded-[28px] border border-border overflow-hidden p-6 md:p-8">
          {/* Ambient */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
               style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-5 justify-between">
            <div className="flex flex-col gap-3 max-w-2xl">
              {/* Date */}
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-primary bg-primary-dim border border-primary/20 rounded-full px-3.5 py-1 w-fit">
                <Calendar className="w-3 h-3" />
                {meeting.start_at ? (
                  <span>
                    {format(new Date(meeting.start_at), "EEEE, MMMM d, yyyy • h:mm a")}
                    {meeting.end_at ? ` – ${format(new Date(meeting.end_at), "h:mm a")}` : ""}
                  </span>
                ) : (
                  "Recent Google Meet Call"
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-text tracking-tight leading-tight">
                {meeting.title && meeting.title !== "Google Meet" && meeting.title !== "Untitled Meeting"
                  ? meeting.title
                  : meeting.google_meet_link
                  ? `Meet - ${meeting.google_meet_link}`
                  : "Meet - Live Session"}
              </h1>

              {/* Status chips */}
              <div className="flex flex-wrap items-center gap-2">
                {meeting.summary && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-3 py-1">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Completed & Summarized
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              {meeting.summary && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Send via Gmail" icon={GmailIcon} state={gmailState}
                      successLabel="Gmail Opened" onClick={handleGmail} />
                    <ActionButton label="Sync Calendar" icon={GoogleCalendarIcon} state={calendarState}
                      successLabel="Calendar Synced" errorLabel="Authorize Calendar" onClick={handleCalendar} />
                  </div>
                  {meeting.scheduling_result?.html_link && (
                    <a href={meeting.scheduling_result.html_link} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      View Calendar Event
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Attendees */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="relative z-10 flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-border">
              <div className="flex items-center gap-1.5 text-[12px] text-text-muted font-medium">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-text font-semibold">Participants:</span>
              </div>
              {meeting.attendees.map((a) => (
                <span key={a} className="flex items-center gap-1.5 text-[11.5px] font-medium text-text bg-surface2 border border-border rounded-full px-3 py-1">
                  <span className="w-4 h-4 rounded-full bg-primary-container text-[8px] font-bold text-on-primary-container flex items-center justify-center">
                    {a.charAt(0).toUpperCase()}
                  </span>
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Executive Summary ─────────────────────────────────────────── */}
        <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-tertiary-container flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-tertiary" />
            </div>
            <h2 className="text-[14px] font-bold text-text tracking-tight uppercase text-tertiary">
              Executive Summary
            </h2>
          </div>
          {meeting.summary ? (
            <p className="text-[13.5px] text-text leading-[1.75] whitespace-pre-wrap">
              {meeting.summary}
            </p>
          ) : meeting.status === "active" || meeting.status === "processing" ? (
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
              </div>
              <p className="text-[13px] text-text-muted font-medium animate-pulse tracking-wide">
                AI is processing executive summary...
              </p>
            </div>
          ) : (
            <div className="bg-risk-container/10 border border-risk/30 rounded-xl p-4 my-2">
              <p className="text-[13.5px] text-risk/90 italic leading-relaxed">
                {meeting.status === "no_transcript"
                  ? "No transcript was captured during this meeting, so no summary could be generated."
                  : meeting.status === "error" || meeting.status === "failed" 
                  ? "An error occurred during summarization. The meeting might have been too short or the AI service was unavailable."
                  : "Executive summary is not available for this meeting. It may not have contained enough conversational data."}
              </p>
            </div>
          )}
        </div>

        {/* ── Key Decisions ─────────────────────────────────────────────── */}
        {meeting.decisions && meeting.decisions.length > 0 && (
          <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <h2 className="text-[14px] font-bold text-text tracking-tight">
                Key Decisions ({meeting.decisions.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {meeting.decisions.map((dec, idx) => (
                <div
                  key={idx}
                  className="bg-surface2 rounded-[16px] border border-border p-4 flex flex-col gap-3 spring hover:-translate-y-0.5 hover:border-border-strong"
                >
                  <p className="text-[13px] text-text leading-relaxed font-medium">{dec.text}</p>
                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-surface3 border border-border flex items-center justify-center">
                        <UserIcon className="w-2.5 h-2.5" />
                      </span>
                      <span className="text-text font-semibold">{dec.decided_by || "Team"}</span>
                    </span>
                    {dec.confidence && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-dim text-primary text-[10px] font-bold capitalize border border-primary/20">
                        {dec.confidence}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Items ─────────────────────────────────────────────── */}
        <div className="bg-surface-container rounded-[24px] border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[12px] bg-primary-container flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-[14px] font-bold text-text tracking-tight">
                Action Items ({actionItems.length})
              </h2>
            </div>
            <span className="text-[11px] text-text-muted bg-surface2 border border-border rounded-full px-3 py-1 font-medium">
              Click to toggle status
            </span>
          </div>

          {actionItems.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-border bg-surface-dim p-6 text-center">
              <p className="text-[13px] text-text-muted font-medium">No action items in this meeting.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {[...actionItems].sort((a, b) => {
                const statusOrder: Record<string, number> = { open: 0, in_progress: 1, done: 2 };
                const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                const aStatus = statusOrder[a.status] ?? 3;
                const bStatus = statusOrder[b.status] ?? 3;
                if (aStatus !== bStatus) return aStatus - bStatus;
                const aPri = priorityOrder[a.priority] ?? 3;
                const bPri = priorityOrder[b.priority] ?? 3;
                return aPri - bPri;
              }).map((item) => {
                const isDone = item.status === "done";
                const isInProgress = item.status === "in_progress";
                const pStyle = PRIORITY[item.priority] ?? PRIORITY.medium;

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItemStatus(item.id)}
                    className={`group w-full text-left rounded-[16px] border p-4 spring flex items-start gap-3 hover:-translate-y-0.5 active:scale-[0.99] ${
                      isDone
                        ? "bg-success/5 border-success/20"
                        : "bg-surface2 border-border hover:border-border-strong"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5 spring ${
                      isDone
                        ? "bg-success border-success text-bg"
                        : isInProgress
                        ? "border-warning bg-warning/10"
                        : "border-border-strong group-hover:border-primary"
                    }`}>
                      {isDone && <Check className="w-3.5 h-3.5" />}
                      {isInProgress && <div className="w-2 h-2 rounded-full bg-warning" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold leading-snug spring-colors ${
                        isDone ? "line-through text-text-muted" : "text-text group-hover:text-primary"
                      }`}>
                        {item.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted mt-1.5">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span className="text-text font-medium">{item.owner_name || "Unassigned"}</span>
                        </span>
                        {item.due_date && (
                          <span className="flex items-center gap-1 text-warning">
                            <Clock className="w-3 h-3" />
                            {item.due_date}
                          </span>
                        )}
                        <span className="text-text-variant capitalize">{item.status.replace("_", " ")}</span>
                      </div>
                    </div>

                    {/* Priority */}
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2.5 py-1 uppercase tracking-wide shrink-0 ${pStyle.chip}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                      {item.priority || "medium"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Full Transcript ───────────────────────────────────────────── */}
        {meeting.transcript_data && meeting.transcript_data.length > 0 && (
          <div className="bg-surface-container rounded-[24px] border border-border overflow-hidden">
            <div className="w-full flex items-center justify-between px-6 py-5 hover:bg-surface2 spring-colors group cursor-pointer" onClick={() => setTranscriptOpen((o) => !o)}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[12px] bg-surface3 border border-border flex items-center justify-center group-hover:bg-primary-container spring-colors">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[14px] font-bold text-text group-hover:text-primary spring-colors">
                  Full Transcript ({meeting.transcript_data.length} total)
                </span>
              </div>
              <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                <select 
                  value={sourceFilter} 
                  onChange={(e) => setSourceFilter(e.target.value as "all" | "dom" | "audio")}
                  className="bg-surface3 border border-border rounded text-[12px] font-medium text-text py-1 px-2 outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="all">All sources</option>
                  <option value="dom">DOM (CC)</option>
                  <option value="audio">Agent (AI)</option>
                </select>
                <div className="w-7 h-7 rounded-full bg-surface3 border border-border flex items-center justify-center group-hover:bg-primary-container spring-colors cursor-pointer" onClick={() => setTranscriptOpen((o) => !o)}>
                  {transcriptOpen
                    ? <ChevronUp className="w-4 h-4 text-text group-hover:text-primary spring-colors" />
                    : <ChevronDown className="w-4 h-4 text-text group-hover:text-primary spring-colors" />}
                </div>
              </div>
            </div>

            {transcriptOpen && (
              <div className="border-t border-border px-6 pb-6 pt-4 flex flex-col gap-1.5 max-h-[520px] overflow-y-auto custom-scrollbar">
                {meeting.transcript_data
                  .filter(chunk => sourceFilter === "all" ? true : (((chunk as Record<string, unknown>).source as string) || "dom") === sourceFilter)
                  .map((chunk, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1.5 py-3 px-3 rounded-[14px] hover:bg-surface2 spring-colors border border-transparent hover:border-border last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[12px] font-bold text-primary">
                        <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold flex items-center justify-center">
                          {(chunk.speaker || "?").charAt(0).toUpperCase()}
                        </span>
                        {chunk.speaker || "Unknown"}
                      </span>
                      <div className="flex items-center gap-2">
                        {!!(chunk as Record<string, unknown>).source && (
                          <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold bg-surface3 px-2 py-0.5 rounded-full border border-border">
                            {(chunk as Record<string, unknown>).source as string}
                          </span>
                        )}
                        {chunk.timestamp_ms && (
                          <span className="text-[10px] font-mono text-text-muted bg-surface3 px-2 py-0.5 rounded-md">
                            {format(new Date(chunk.timestamp_ms), "h:mm:ss a")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[12.5px] text-text-muted leading-relaxed pl-8">
                      {(() => {
                        let content = chunk.text;
                        if (typeof content === "string" && (content.trim().startsWith("{") || content.trim().startsWith("["))) {
                          try { content = JSON.parse(content); } catch { }
                        }
                        
                        if (Array.isArray(content)) {
                          return content.map((item: unknown, i: number) => {
                            const obj = item as Record<string, unknown>;
                            const text = typeof item === "string" ? item : (obj.text || obj.utterance || obj.raw_text || obj.refined_text || JSON.stringify(item));
                            return <span key={i} className="block mb-1">{text as string}</span>;
                          });
                        }
                        
                        if (content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).dialog_turn)) {
                          return ((content as Record<string, unknown>).dialog_turn as unknown[]).map((t: unknown, i: number) => {
                            const obj = t as Record<string, unknown>;
                            return (
                            <span key={i} className="block mb-1">
                              {obj.speaker && obj.speaker !== chunk.speaker && obj.speaker !== "Unknown" && obj.speaker !== "You" ? <strong className="mr-1 text-primary">{obj.speaker as string}:</strong> : null}
                              {(obj.refined_text || obj.raw_text) as string}
                            </span>
                            );
                          });
                        }
                        return typeof chunk.text === "string" ? chunk.text : JSON.stringify(chunk.text);
                      })()}
                    </div>
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
