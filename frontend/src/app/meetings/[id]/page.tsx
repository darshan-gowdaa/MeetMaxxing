"use client";

import { getAuthToken } from"@/lib/api";
import { useState, useEffect, use, useCallback } from"react";
import Link from"next/link";
import { fetchMeeting, updateActionItem } from"@/lib/api";
import { MeetingSkeleton } from"@/components/templates/skeletons";
import {
 RiRefreshLine as RefreshCw,
 RiArrowLeftLine as ArrowLeft,
} from"@remixicon/react";
import type { Meeting } from"@/types";
import MeetingTranscript from"@/components/organisms/MeetingTranscript";
import MeetingHeader from"@/components/organisms/MeetingHeader";
import MeetingSummary from"@/components/organisms/MeetingSummary";
import MeetingDecisions from"@/components/organisms/MeetingDecisions";
import MeetingActionItems from"@/components/organisms/MeetingActionItems";
import MeetingFollowUpForm from"@/components/organisms/MeetingFollowUpForm";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||"https://meetmaxxing-api.onrender.com";






export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = use(params);
 const [meeting, setMeeting] = useState<Meeting | null>(null);
 const [loading, setLoading] = useState(true);
 const [actionItems, setActionItems] = useState<Meeting["action_items"]>([]);
 const [errorMsg, setErrorMsg] = useState("");
 const [gmailState, setGmailState] = useState<"idle"|"loading"|"success"|"error">("idle");
 const [calendarState, setCalendarState] = useState<"idle"|"loading"|"success"|"error">("idle");

 const loadMeeting = useCallback(() => {
 setLoading(true);
 fetchMeeting(id)
 .then((data: Meeting) => {
 setMeeting(data);
 setActionItems(data.action_items || []);
 setErrorMsg("");
 if (data.email_result?.sent) setGmailState("success");
 if (data.scheduling_result && ["success","scheduled","gcal_url_generated"].includes(data.scheduling_result.status))
 setCalendarState("success");
 })
 .catch((err: Error) => {
 setMeeting(null);
 setErrorMsg(err.message ||"Failed to fetch meeting from backend");
 })
 .finally(() => setLoading(false));
 }, [id]);

 useEffect(() => {
 const timeoutRef = { current: undefined as NodeJS.Timeout | undefined };
 let isMounted = true;
 
 const poll = async () => {
 try {
 const data = await fetchMeeting(id);
 if (!isMounted) return;
 
 setMeeting(data);
 setActionItems(data.action_items || []);
 setErrorMsg("");
 if (data.email_result?.sent) setGmailState("success");
 if (data.scheduling_result && ["success","scheduled","gcal_url_generated"].includes(data.scheduling_result.status))
 setCalendarState("success");

 if (data.status ==="active"|| data.status ==="processing") {
 timeoutRef.current = setTimeout(poll, 3000);
 }
 } catch (err: unknown) {
 if (!isMounted) return;
 setMeeting(null);
 setErrorMsg((err as Error).message ||"Failed to fetch meeting from backend");
 } finally {
 if (isMounted) setLoading(false);
 }
 };
 
 setLoading(true);
 poll();
 
 return () => {
 isMounted = false;
 if (timeoutRef.current) clearTimeout(timeoutRef.current);
 };
 }, [id]);

 const toggleItemStatus = async (itemId: string) => {
 const item = actionItems.find((a) => a.id === itemId);
 if (!item) return;
 const next =
 item.status ==="open"?"in_progress":
 item.status ==="in_progress"?"done":"open";
 setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: next } : a)));
 try {
 await updateActionItem(itemId, { status: next });
 } catch {
 setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, status: item.status } : a)));
 }
 };

 const changePriority = async (itemId: string, priority: string) => {
 const item = actionItems.find((a) => a.id === itemId);
 if (!item) return;
 setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, priority } : a)));
 try {
 await updateActionItem(itemId, { priority });
 } catch {
 setActionItems((prev) => prev.map((a) => (a.id === itemId ? { ...a, priority: item.priority } : a)));
 }
 };

 const handleGmail = async () => {
 if (!meeting) return;
 setGmailState("loading");
 try {
 const subject = encodeURIComponent(`[MeetMaxxing] Follow-up: ${meeting.title ||"Meeting Summary"}`);
 const actionList = (meeting.action_items || [])
 .map((a, i) => `${i + 1}. ${a.description} (Owner: ${a.owner_name ||"Unassigned"})`)
 .join("\n");
 
 let summaryText = meeting.summary ||"No summary.";
 if (summaryText.length > 600) {
 summaryText = summaryText.substring(0, 600) +"... (see link for more)";
 }
 
 const bodyStr = `Hi team,\n\nMeeting: ${meeting.title ||""}\n\nSummary:\n${summaryText}\n\n` +
 (actionList ? `Action Items:\n${actionList}\n\n` :"") +
 `Details: ${window.location.href}\n\nBest,\nMeetMaxxing AI Copilot`;
 
 const body = encodeURIComponent(bodyStr.substring(0, 1500)); // prevent 414 URI Too Long
 
 window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,"_blank");
 setGmailState("success");
 } catch { setGmailState("error"); }
 };

 const handleCalendar = async () => {
 if (!meeting) return;
 setCalendarState("loading");
 
 // Open a blank window immediately before the async call to bypass popup blockers
 const newWindow = window.open('about:blank', '_blank');
 
 const buildGcalUrl = () => {
 const title = encodeURIComponent(`Follow-up: ${meeting.follow_up?.suggested_topic || meeting.title ||"Meeting"}`);
 let detailsText = `Summary:\n${meeting.summary ||""}\n\n` +
 (meeting.action_items?.length ? `Actions:\n${meeting.action_items.map((a, i) => `${i + 1}. ${a.description}`).join("\n")}\n\n` :"") +
 `Dashboard: ${window.location.href}`;
 if (detailsText.length > 1000) detailsText = detailsText.substring(0, 1000) +"...";
 
 const details = encodeURIComponent(detailsText);
 const start = new Date(Date.now() + 86400000); start.setUTCHours(10, 0, 0, 0);
 const end = new Date(start.getTime() + 3600000);
 const fmt = (d: Date) => d.toISOString().replace(/[-:]/g,"").split(".")[0] +"Z";
 const add = meeting.attendees?.length ? `&add=${encodeURIComponent(meeting.attendees.join(","))}` :"";
 return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(start)}/${fmt(end)}${add}`;
 };
 
 try {
 const token = await getAuthToken();
 const res = await fetch(`${BACKEND_URL}/calendar/add-url?meeting_id=${id}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (res.ok) {
 try {
 const data = await res.json();
 const url = data.gcal_url || data.html_link;
 if (url) { 
 if (newWindow) newWindow.location.href = url;
 else window.open(url,"_blank");
 setCalendarState("success"); 
 return; 
 }
 } catch {}
 }
 } catch { /* fall through */ }
 
 const fallbackUrl = buildGcalUrl();
 if (newWindow) newWindow.location.href = fallbackUrl;
 else window.open(fallbackUrl,"_blank");
 setCalendarState("success");
 };

 // show loading screen while we fetch data from backend lol
 if (loading) {
 return <MeetingSkeleton />;
 }

 // if no meeting found, show this weird processing state
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
 <div className="w-3 h-3 bg-white rounded-full animate-bounce"style={{ animationDelay:"-0.3s"}}></div>
 <div className="w-3 h-3 bg-white rounded-full animate-bounce"style={{ animationDelay:"-0.15s"}}></div>
 <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
 </div>
 )}
 <div className="flex flex-col items-center gap-2">
 <p className="text-[14px] text-text-muted font-medium tracking-wide">
 {errorMsg ?"Failed to load meeting":"AI is processing this meeting transcript"}
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
 <ArrowLeft className="w-4 h-4"/>
 Back to Dashboard
 </Link>
 <button
 onClick={loadMeeting}
 className="w-10 h-10 rounded-full bg-surface2 hover:bg-surface3 text-text flex items-center justify-center spring"
 title="Refresh"
 >
 <RefreshCw className="w-4 h-4"/>
 </button>
 </div>
 </div>
 </div>
 );
 }

 // the main UI code starts here. it's very long sry
 return (
 <div className="min-h-screen bg-bg text-text font-sans pb-16">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-5">


 {/* big header card thing */}
 <MeetingHeader 
 meeting={meeting} 
 gmailState={gmailState} 
 calendarState={calendarState} 
 handleGmail={handleGmail} 
 handleCalendar={handleCalendar} 
 />

 <MeetingFollowUpForm meeting={meeting} onScheduled={loadMeeting} />

 {/* ai summary box */}
 <MeetingSummary meeting={meeting} />

 {/* decisions made in the meeting */}
 <MeetingDecisions decisions={meeting.decisions} />

 {/* things people need to do */}
 <MeetingActionItems
 actionItems={actionItems}
 toggleItemStatus={toggleItemStatus}
 onPriorityChange={changePriority}
 />

 {/* transcript section is huge */}
 <MeetingTranscript transcriptData={meeting.transcript_data} />

 </div>
 </div>
 );
}
