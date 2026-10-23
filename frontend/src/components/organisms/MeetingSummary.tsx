/* eslint-disable */
"use client";

import { getAuthToken } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { useState } from "react";
import { RiSparklingLine as Sparkles, RiFileCopyLine as Copy, RiCheckLine as Check } from "@remixicon/react";
import type { Meeting } from "@/types";
import { endMeeting, reprocessMeeting } from "@/lib/api";

interface MeetingSummaryProps {
  meeting: Meeting;
}

export default function MeetingSummary({ meeting }: MeetingSummaryProps) {
  const [isForcing, setIsForcing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!meeting.summary) return;
    const ok = await copyToClipboard(meeting.summary);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleForceAction = async () => {
    if (isForcing) return;
    setIsForcing(true);
    try {
      if (meeting.status === "active") {
        await endMeeting(meeting.id);
      } else {
        await reprocessMeeting(meeting.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsForcing(false);
    }
  };

  return (
    <div className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>Executive Summary</span>
        </div>
        {meeting.summary && (
          <button
            onClick={handleCopy}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container active:scale-[0.98] transition-all text-text-muted hover:text-primary"
            title="Copy Summary"
            aria-label="Copy Summary"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>

      {meeting.summary ? (
        <div className="bg-surface-container/70 rounded-[20px] p-4 sm:p-5 border border-outline-variant/15">
          <p className="text-[13.5px] sm:text-sm text-text leading-[1.75] whitespace-pre-wrap">
            {meeting.summary}
          </p>
        </div>
      ) : meeting.status === "active" || meeting.status === "processing" ? (
        <div className="bg-surface-container/70 rounded-[20px] p-4 sm:p-5 border border-outline-variant/15 flex flex-col items-center justify-center py-6 gap-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
          </div>
          <p className="text-[13px] text-text-muted font-medium animate-pulse tracking-wide">
            {meeting.status === "active" ? "Meeting is currently active..." : "AI is processing executive summary..."}
          </p>
          <button 
            onClick={handleForceAction}
            disabled={isForcing}
            className="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {isForcing ? "Processing..." : meeting.status === "active" ? "Force End & Generate Summary" : "Taking too long? Retry Summary"}
          </button>
        </div>
      ) : (
        <div className="bg-surface-container/70 rounded-[20px] p-4 sm:p-5 border border-outline-variant/15">
          <div className="bg-risk-container text-on-risk-container rounded-[16px] p-3 sm:p-4">
            <p className="text-[13.5px] italic leading-relaxed">
              {meeting.status === "no_transcript"
                ? "No transcript was captured during this meeting, so no summary could be generated."
                : meeting.status === "error" || meeting.status === "failed"
                ? "An error occurred during summarization. The meeting might have been too short or the AI service was unavailable."
                : "Executive summary is not available for this meeting. It may not have contained enough conversational data."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
