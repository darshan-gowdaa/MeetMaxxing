"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMeetings } from "@/lib/api";
import { format } from "date-fns";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiCalendarLine,
  RiArrowRightLine,
  RiSearchLine,
  RiTimeLine,
  RiGroupLine,
} from "@remixicon/react";
import "@material/web/progress/circular-progress.js";
import type { Meeting } from "@/types";
import Topbar from "@/components/Topbar";

export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMeetings("dev_token")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.meetings || [];
        setMeetings(list);
      })
      .catch((err) => {
        setError(err.message || "Failed to load meetings");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <Topbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden bg-surface2 border border-border rounded-3xl p-8 flex flex-col gap-3 shadow-md group transition-colors hover:bg-surface3">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
            <RiVideoChatLine className="w-10 h-10 text-primary mb-2" />
            <h2 className="text-3xl font-bold tracking-tight text-text">
              {loading ? "-" : meetings.length}
            </h2>
            <p className="text-text-muted font-medium">Total Meetings</p>
          </div>

          <div className="relative overflow-hidden bg-surface2 border border-border rounded-3xl p-8 flex flex-col gap-3 shadow-md transition-colors hover:bg-surface3">
            <RiBrainLine className="w-10 h-10 text-primary mb-2" />
            <h2 className="text-3xl font-bold tracking-tight text-text">100%</h2>
            <p className="text-text-muted font-medium">Insights Processed</p>
          </div>

          <div className="relative overflow-hidden bg-surface2 border border-border rounded-3xl p-8 flex flex-col gap-3 shadow-md transition-colors hover:bg-surface3">
            <RiGroupLine className="w-10 h-10 text-primary mb-2" />
            <h2 className="text-3xl font-bold tracking-tight text-text">Active</h2>
            <p className="text-text-muted font-medium">System Status</p>
          </div>
        </div>

        {/* Meetings Grid */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between h-10">
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <RiTimeLine className="w-6 h-6 text-text-muted" />
              Recent Meetings
            </h3>
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                placeholder="Search meetings..."
                className="bg-surface border border-border rounded-full pl-10 pr-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors shadow-sm w-64 h-10"
              />
            </div>
          </div>

          <div className="min-h-[16rem]">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 bg-surface/50 border border-border border-dashed rounded-2xl transition-opacity">
                <md-circular-progress indeterminate style={{ "--md-circular-progress-size": "48px" } as React.CSSProperties} />
                <p className="text-text-muted text-sm font-medium">Loading your meetings...</p>
              </div>
            ) : error ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 bg-risk-bg/10 border border-risk/30 rounded-2xl text-center p-6">
                <p className="text-risk font-bold">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-surface2 hover:bg-surface3 border border-border rounded-full text-sm font-bold transition-colors h-10"
                >
                  Retry Connection
                </button>
              </div>
            ) : meetings.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 bg-surface border border-border rounded-2xl text-center p-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-surface2 flex items-center justify-center border border-border mb-2">
                  <RiVideoChatLine className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-text font-bold text-lg">No meetings found</p>
                <p className="text-text-muted text-sm max-w-sm">
                  Start a Google Meet call with the MeetMaxxing extension active to record your first meeting.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {meetings.map((meeting) => (
                  <Link
                    href={`/meetings/${meeting.id}`}
                    key={meeting.id}
                    className="group bg-surface hover:bg-surface2 border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm transition-colors duration-300 min-h-[180px]"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary-container w-fit px-2.5 py-1 rounded-md h-6">
                        <RiCalendarLine className="w-3.5 h-3.5" />
                        {meeting.start_at
                          ? format(new Date(meeting.start_at), "MMM d, yyyy • h:mm a")
                          : "Recent Call"}
                      </div>
                      <h4 className="text-base font-bold text-text leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {meeting.title || "Untitled Meeting"}
                      </h4>
                    </div>

                    <p className="text-sm text-text-muted leading-relaxed line-clamp-3 flex-1 font-medium">
                      {meeting.summary ||
                        "No summary available for this meeting yet. AI is processing the transcript."}
                    </p>

                    <div className="pt-4 border-t border-border flex items-center justify-between mt-auto h-8">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold">
                        <RiGroupLine className="w-4 h-4" />
                        {meeting.attendees?.length || 0} Participants
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary-container group-hover:bg-primary text-primary group-hover:text-bg flex items-center justify-center transition-colors">
                        <RiArrowRightLine className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
