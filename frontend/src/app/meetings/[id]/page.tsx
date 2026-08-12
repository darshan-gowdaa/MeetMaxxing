"use client";

import { use } from "react";
import Link from "next/link";
import { MeetingSkeleton } from "@/components/templates/skeletons";
import {
  RiRefreshLine as RefreshCw,
  RiArrowLeftLine as ArrowLeft,
} from "@remixicon/react";

import MeetingTranscript from "@/components/organisms/MeetingTranscript";
import MeetingHeader from "@/components/organisms/MeetingHeader";
import MeetingSummary from "@/components/organisms/MeetingSummary";
import MeetingDecisions from "@/components/organisms/MeetingDecisions";
import MeetingActionItems from "@/components/organisms/MeetingActionItems";
import MeetingFollowUpForm from "@/components/organisms/MeetingFollowUpForm";
import { useMeetingManager } from "./_hooks/useMeetingManager";

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const {
    meeting,
    loading,
    actionItems,
    errorMsg,
    gmailState,
    calendarState,
    loadMeeting,
    toggleItemStatus,
    changePriority,
    handleGmail,
    handleCalendar,
    refineTranscript
  } = useMeetingManager(id);

  if (loading) {
    return <MeetingSkeleton />;
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {errorMsg ? (
            <div className="w-16 h-16 rounded-full bg-risk-container flex items-center justify-center mb-2">
              <span className="text-risk font-bold text-2xl">!</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <p className="text-[14px] text-text-muted font-medium tracking-wide">
              {errorMsg ? "Failed to load meeting" : "AI is processing this meeting transcript"}
            </p>
            {errorMsg && (
              <p className="text-[11px] text-risk max-w-xs text-center">{errorMsg}</p>
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

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-5">

        <MeetingHeader 
          meeting={meeting} 
          gmailState={gmailState} 
          calendarState={calendarState} 
          handleGmail={handleGmail} 
          handleCalendar={handleCalendar} 
        />

        <MeetingFollowUpForm meeting={meeting} onScheduled={loadMeeting} />

        <MeetingSummary meeting={meeting} />

        {meeting.decisions && meeting.decisions.length > 0 && (
          <MeetingDecisions decisions={meeting.decisions} />
        )}

        {actionItems && actionItems.length > 0 && (
          <MeetingActionItems
            actionItems={actionItems}
            toggleItemStatus={toggleItemStatus}
            onPriorityChange={changePriority}
          />
        )}

        {meeting.transcript_data && meeting.transcript_data.length > 0 && (
          <MeetingTranscript transcriptData={meeting.transcript_data} onRefine={refineTranscript} />
        )}

      </div>
    </div>
  );
}
