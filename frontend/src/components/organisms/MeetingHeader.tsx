"use client";

import { format } from "date-fns";
import {
  RiCalendarLine as Calendar,
  RiRadioButtonLine as Radio,
  RiExternalLinkLine as ExternalLink,
  RiUserLine as UserIcon,
} from "@remixicon/react";
import { ActionButton, GmailIcon, GoogleCalendarIcon, type BtnState } from "@/components/molecules/ActionButtons";
import type { Meeting } from "@/types";

interface MeetingHeaderProps {
  meeting: Meeting;
  gmailState: BtnState;
  calendarState: BtnState;
  handleGmail: () => void;
  handleCalendar: () => void;
}

export default function MeetingHeader({
  meeting,
  gmailState,
  calendarState,
  handleGmail,
  handleCalendar,
}: MeetingHeaderProps) {
  const set = new Set<string>(meeting.attendees || []);
  if (meeting.transcript_data && Array.isArray(meeting.transcript_data)) {
    meeting.transcript_data.forEach((t) => {
      if (t.speaker && t.speaker !== "Unknown" && t.speaker !== "System") set.add(t.speaker);
    });
  }
  const participantsList = Array.from(set);

  return (
    <div className="relative bg-surface-container rounded-[28px] border border-border overflow-hidden p-6 md:p-8">
      {/* some ambient light effect, stackoverflow ftw */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
           style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-5 justify-between">
        <div className="flex flex-col gap-3 max-w-2xl">
          {/* date goes here */}
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

          {/* little chips for status */}
          <div className="flex flex-wrap items-center gap-2">
            {meeting.summary && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/20 rounded-full px-3 py-1">
                <Radio className="w-3 h-3 animate-pulse" />
                Completed & Summarized
              </span>
            )}
          </div>
        </div>

        {/* buttons for gmail and cal */}
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

      {/* list of people who attended */}
      {participantsList.length > 0 && (
        <div className="relative z-10 flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-border">
          <div className="flex items-center gap-1.5 text-[12px] text-text-muted font-medium">
            <UserIcon className="w-4 h-4 text-primary" />
            <span className="text-text font-semibold">Participants ({participantsList.length}):</span>
          </div>
          {participantsList.map((a) => (
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
  );
}
