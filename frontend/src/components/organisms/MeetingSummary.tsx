/* eslint-disable */
"use client";

import { useState } from "react";
import {
  RiSparklingLine as Sparkles,
  RiFileCopyLine as Copy,
  RiCheckLine as Check,
  RiRefreshLine as RefreshCw,
  RiAlertLine as AlertIcon,
} from "@remixicon/react";
import type { Meeting } from "@/types";
import { endMeeting, reprocessMeeting } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";

interface MeetingSummaryProps {
  meeting: Meeting;
}

export default function MeetingSummary({ meeting }: MeetingSummaryProps) {
  const [isForcing, setIsForcing] = useState(false);
  const [copied, setCopied] = useState(false);

  const wordCount = meeting.summary
    ? meeting.summary.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 180));

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
    <section 
      aria-label="Executive Summary"
      className="bg-surface-container-low rounded-[28px] border border-outline-variant/15 p-6 sm:p-8 shadow-none flex flex-col gap-5 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text">
                Executive Summary
              </h2>
              {wordCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high/80 text-[11px] font-medium text-text-muted">
                    {wordCount} words
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high/80 text-[11px] font-medium text-text-muted">
                    {readingTime} min read
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Key takeaways & synthesis from discussion
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {meeting.summary && (
            <>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-text active:scale-95 transition-all"
                title="Copy summary to clipboard"
                aria-label="Copy summary to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span className="text-success font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleForceAction}
                disabled={isForcing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-text-muted hover:text-text active:scale-95 transition-all disabled:opacity-50"
                title="Regenerate summary"
                aria-label="Regenerate summary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isForcing ? "animate-spin text-primary" : ""}`} />
                <span className="hidden sm:inline">{isForcing ? "Processing..." : "Re-summarize"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body content */}
      {meeting.summary ? (
        <div className="border-l-4 border-primary/40 pl-4 sm:pl-5 py-1">
          <p className="text-[15px] sm:text-[16px] text-text font-normal leading-[1.8] tracking-normal whitespace-pre-wrap select-text">
            {meeting.summary}
          </p>
        </div>
      ) : meeting.status === "active" || meeting.status === "processing" ? (
        <div className="py-8 px-4 flex flex-col items-center justify-center gap-3.5 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
          </div>
          <p className="text-[14px] text-text-muted font-medium tracking-wide">
            {meeting.status === "active" ? "Meeting is currently active..." : "AI is generating executive summary..."}
          </p>
          <button 
            onClick={handleForceAction}
            disabled={isForcing}
            className="mt-1 px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-primary transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isForcing ? "Processing..." : meeting.status === "active" ? "Force End & Generate Summary" : "Taking too long? Retry Summary"}
          </button>
        </div>
      ) : (
        <div className="rounded-[22px] bg-risk-container/20 border border-risk/20 p-4 sm:p-5 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-full bg-risk-container text-on-risk-container flex items-center justify-center shrink-0">
            <AlertIcon className="w-4 h-4 text-risk" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] text-text leading-relaxed">
              {meeting.status === "no_transcript"
                ? "No transcript was captured during this meeting, so no summary could be generated."
                : meeting.status === "error" || meeting.status === "failed"
                ? "An error occurred during summarization. The meeting might have been too short or the AI service was unavailable."
                : "Executive summary is not available for this meeting. It may not have contained enough conversational data."}
            </p>
            <button
              onClick={handleForceAction}
              disabled={isForcing}
              className="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isForcing ? "Retrying..." : "Retry Summarization"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
