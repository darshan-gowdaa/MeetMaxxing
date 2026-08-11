"use client";

import { useState, useEffect } from"react";
import { scheduleFollowUp } from"@/lib/api";
import type { Meeting } from"@/types";

interface MeetingFollowUpFormProps {
 meeting: Meeting;
 onScheduled: () => void;
}

export default function MeetingFollowUpForm({ meeting, onScheduled }: MeetingFollowUpFormProps) {
 const result = meeting.scheduling_result;
 const needsUserInput = result?.needs_user_input === true;
 const isScheduled = result?.scheduled === true || result?.status ==="scheduled"|| result?.status ==="success"|| result?.status ==="gcal_url_generated";
 
 const [dateTime, setDateTime] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");

 useEffect(() => {
 if (result?.suggested_payload?.start?.dateTime) {
 // Convert to YYYY-MM-DDThh:mm
 try {
 const dateObj = new Date(result.suggested_payload.start.dateTime);
 const yyyy = dateObj.getFullYear();
 const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
 const dd = String(dateObj.getDate()).padStart(2, '0');
 const hh = String(dateObj.getHours()).padStart(2, '0');
 const min = String(dateObj.getMinutes()).padStart(2, '0');
 setDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
 } catch {
 console.error("Invalid date from suggested_payload");
 }
 }
 }, [result?.suggested_payload]);

 if (!needsUserInput || isScheduled) return null;

 const handleSchedule = async () => {
 if (!dateTime) {
 setError("Please select a date and time.");
 return;
 }
 setLoading(true);
 setError("");

 try {
 // payload properties
 const payload = {
 ...result?.suggested_payload,
 start_time: new Date(dateTime).toISOString(),
 duration_minutes: result?.suggested_payload?.duration_minutes || 30,
 title: result?.suggested_payload?.title || `Follow-up: ${meeting.title || 'Meeting'}`,
 description: result?.suggested_payload?.description ||"",
 attendees: result?.suggested_payload?.attendees || meeting.attendees || [],
 };

 await scheduleFollowUp(meeting.id, payload);
 onScheduled();
 } catch (err: unknown) {
 setError((err as Error).message ||"Failed to schedule follow-up.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="bg-surface-container rounded-[32px] p-6 mb-5 border border-outline-variant/30 flex flex-col gap-4 shadow-sm">
 <div className="flex flex-col gap-1">
 <h3 className="text-[18px] font-semibold text-text">Follow-up Needed</h3>
 <p className="text-[14px] text-text-muted">
 Please confirm the date and time to schedule the follow-up meeting.
 </p>
 </div>

 <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
 <div className="flex flex-col gap-1.5 flex-1 w-full">
 <label className="text-[12px] font-medium text-text-muted ml-1">
 Date & Time
 </label>
 <input
 type="datetime-local"
 value={dateTime}
 onChange={(e) => setDateTime(e.target.value)}
 className="w-full h-12 bg-surface2 border border-outline-variant/50 rounded-2xl px-4 text-[14px] text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary spring transition-colors"
 />
 </div>
 
 <button
 onClick={handleSchedule}
 disabled={loading}
 className="h-12 px-6 bg-primary hover:bg-primary-hover text-on-primary rounded-2xl text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap spring"
 >
 {loading ?"Scheduling...":"Schedule Event"}
 </button>
 </div>

 {error && (
 <p className="text-[12px] text-risk ml-1 mt-1">{error}</p>
 )}
 </div>
 );
}
