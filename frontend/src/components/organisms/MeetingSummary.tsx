/* eslint-disable */
"use client";

import { getAuthToken } from"@/lib/api";
import { useState } from"react";
import { RiSparklingLine as Sparkles, RiFileCopyLine as Copy, RiCheckLine as Check } from"@remixicon/react";
import type { Meeting } from"@/types";
import { endMeeting, reprocessMeeting } from"@/lib/api";

interface MeetingSummaryProps {
 meeting: Meeting;
}

export default function MeetingSummary({ meeting }: MeetingSummaryProps) {
 const [isForcing, setIsForcing] = useState(false);
 const [copied, setCopied] = useState(false);

 const handleCopy = async () => {
 if (!meeting.summary) return;
 await navigator.clipboard.writeText(meeting.summary);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleForceAction = async () => {
 if (isForcing) return;
 setIsForcing(true);
 try {
 if (meeting.status ==="active") {
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
 <div className="bg-surface-container rounded-[24px] border border-border p-5 md:p-6 flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-[12px] bg-tertiary-container flex items-center justify-center">
 <Sparkles className="w-4 h-4 text-tertiary"/>
 </div>
 <h2 className="text-[14px] font-bold text-text tracking-tight uppercase text-tertiary">
 Executive Summary
 </h2>
 </div>
 {meeting.summary && (
 <button
 onClick={handleCopy}
 className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface2 active:opacity-80 transition-colors text-text-muted hover:text-primary"
 title="Copy Summary"
 >
 {copied ? <Check className="w-4 h-4 text-success"/> : <Copy className="w-4 h-4"/>}
 </button>
 )}
 </div>
 {meeting.summary ? (
 <p className="text-[13.5px] text-text leading-[1.75] whitespace-pre-wrap">
 {meeting.summary}
 </p>
 ) : meeting.status ==="active"|| meeting.status ==="processing"? (
 <div className="flex flex-col items-center justify-center py-5 md:py-6 gap-4">
 <div className="flex items-center justify-center gap-2">
 <div className="w-3 h-3 bg-white rounded-full animate-bounce"style={{ animationDelay:"-0.3s"}}></div>
 <div className="w-3 h-3 bg-white rounded-full animate-bounce"style={{ animationDelay:"-0.15s"}}></div>
 <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
 </div>
 <p className="text-[13px] text-text-muted font-medium animate-pulse tracking-wide">
 {meeting.status ==="active"?"Meeting is currently active...":"AI is processing executive summary..."}
 </p>
 <button 
 onClick={handleForceAction}
 disabled={isForcing}
 className="mt-2 text-[12px] text-primary hover:underline disabled:opacity-50"
 >
 {isForcing ?"Processing...": meeting.status ==="active"?"Force End & Generate Summary":"Taking too long? Retry Summary"}
 </button>
 </div>
 ) : (
 <div className="bg-risk-container/10 border border-risk/30 rounded-xl p-3 md:p-4 my-2">
 <p className="text-[13.5px] text-risk/90 italic leading-relaxed">
 {meeting.status ==="no_transcript"
 ?"No transcript was captured during this meeting, so no summary could be generated."
 : meeting.status ==="error"|| meeting.status ==="failed"
 ?"An error occurred during summarization. The meeting might have been too short or the AI service was unavailable."
 :"Executive summary is not available for this meeting. It may not have contained enough conversational data."}
 </p>
 </div>
 )}
 </div>
 );
}

