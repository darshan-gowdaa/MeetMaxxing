"use client";

import { use, useState } from "react";
import Link from "next/link";
import { MeetingSkeleton } from "@/components/templates/skeletons";
import {
  RiRefreshLine as RefreshCw,
  RiArrowLeftLine as ArrowLeft,
  RiSparklingLine,
  RiChat1Line,
  RiLayoutMasonryLine,
} from "@remixicon/react";

import MeetingTranscript from "@/components/organisms/MeetingTranscript";
import MeetingHeader from "@/components/organisms/MeetingHeader";
import MeetingSummary from "@/components/organisms/MeetingSummary";
import MeetingDecisions from "@/components/organisms/MeetingDecisions";
import MeetingActionItems from "@/components/organisms/MeetingActionItems";
import MeetingFollowUpForm from "@/components/organisms/MeetingFollowUpForm";
import { useMeetingManager } from "./_hooks/useMeetingManager";

type ViewTab = "notes" | "transcript" | "overview";

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");

  const {
    meeting,
    loading,
    actionItems,
    errorMsg,
    coldStart,
    gmailState,
    calendarState,
    loadMeeting,
    toggleItemStatus,
    changePriority,
    handleGmail,
    handleCalendar,
    refineTranscript,
    handleRename,
    handleDelete,
  } = useMeetingManager(id);

  if (loading) {
    return <MeetingSkeleton />;
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-bg flex flex-col justify-center items-center px-4">
        <div className="rounded-[28px] bg-surface-container-low border border-outline-variant/15 p-8 max-w-md mx-auto text-center flex flex-col items-center gap-6">
          {errorMsg ? (
            <div className="w-16 h-16 rounded-full bg-risk-container text-on-risk-container flex items-center justify-center mb-2">
              <span className="text-risk font-bold text-2xl">{coldStart ? "..." : "!"}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <p className="text-[14px] text-text-muted font-medium tracking-wide">
              {coldStart
                ? "Backend is starting up — this can take up to a minute"
                : errorMsg
                ? "Failed to load meeting"
                : "AI is processing this meeting transcript"}
            </p>
            {errorMsg && !coldStart && (
              <p className="text-[11px] text-risk max-w-xs text-center">{errorMsg}</p>
            )}
            {coldStart && (
              <p className="text-[11px] text-text-muted max-w-xs text-center">
                This page will retry automatically once the backend wakes up.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full bg-secondary-container text-on-secondary-container px-6 py-3 font-semibold text-sm active:scale-[0.98] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={loadMeeting}
              className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center active:scale-[0.98] transition-all"
              title="Refresh"
              aria-label="Refresh meeting"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const transcriptCount = meeting.transcript_data?.length || 0;
  const showNotesSection = activeTab === "notes" || activeTab === "overview";
  const showTranscriptSection = activeTab === "transcript" || activeTab === "overview";

  return (
    <div className="relative min-h-screen bg-bg text-text font-sans pb-24 overflow-x-hidden">
      {/* Ambient Atmospheric Backdrop */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/12 via-tertiary/6 to-transparent blur-3xl opacity-75" />
        <div className="absolute top-1/4 -left-32 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent blur-3xl opacity-60" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-tertiary/8 via-transparent to-transparent blur-3xl opacity-60" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Meeting Header */}
        <MeetingHeader
          meeting={meeting}
          gmailState={gmailState}
          calendarState={calendarState}
          handleGmail={handleGmail}
          handleCalendar={handleCalendar}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        {/* M3 Segmented View Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div
            role="tablist"
            aria-label="Meeting content views"
            className="inline-flex p-1.5 rounded-full bg-surface-container-low border border-outline-variant/15 shadow-xs overflow-x-auto max-w-full"
          >
            <button
              role="tab"
              aria-selected={activeTab === "notes"}
              onClick={() => setActiveTab("notes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "notes"
                  ? "bg-primary-container text-on-primary-container shadow-xs font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-container/60"
              }`}
            >
              <RiSparklingLine className="w-4 h-4 text-primary" />
              <span>Notes &amp; Summary</span>
              {actionItems && actionItems.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-variant font-mono">
                  {actionItems.length}
                </span>
              )}
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "transcript"}
              onClick={() => setActiveTab("transcript")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "transcript"
                  ? "bg-primary-container text-on-primary-container shadow-xs font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-container/60"
              }`}
            >
              <RiChat1Line className="w-4 h-4 text-primary" />
              <span>Full Transcript</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-text-variant font-mono">
                {transcriptCount}
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "overview"
                  ? "bg-primary-container text-on-primary-container shadow-xs font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-container/60"
              }`}
            >
              <RiLayoutMasonryLine className="w-4 h-4 text-primary" />
              <span>Complete Overview</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" />
            <span>
              {activeTab === "notes"
                ? "Notes & Action Items View"
                : activeTab === "transcript"
                ? "Focused Transcript Reader"
                : "Complete Overview"}
            </span>
          </div>
        </div>

        {/* ── Tab Views Content ──────────────────────────────────────────────── */}

        {/* Notes & Summary Components */}
        {showNotesSection && (
          <div className="flex flex-col gap-6">
            <MeetingFollowUpForm meeting={meeting} onScheduled={loadMeeting} />

            <MeetingSummary meeting={meeting} />

            <MeetingDecisions decisions={meeting.decisions} />

            <MeetingActionItems
              actionItems={actionItems || []}
              toggleItemStatus={toggleItemStatus}
              onPriorityChange={changePriority}
            />
          </div>
        )}

        {/* Full Transcript Component */}
        {showTranscriptSection && (
          <div className="flex flex-col gap-6">
            {meeting.transcript_data && meeting.transcript_data.length > 0 ? (
              <MeetingTranscript
                transcriptData={meeting.transcript_data}
                onRefine={refineTranscript}
                defaultOpen={activeTab === "transcript" || activeTab === "overview"}
              />
            ) : (
              <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-text-muted">
                  <RiChat1Line className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-text">No transcript available</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  This meeting does not contain any recorded transcript dialogue chunks.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("notes")}
                  className="mt-2 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  View Notes &amp; Summary
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
