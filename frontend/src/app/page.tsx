"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { fetchMeetings, deleteMeeting, updateMeeting } from "@/lib/api";
import { format, isToday, isYesterday } from "date-fns";
import {
  RiVideoChatLine,
  RiBrainLine,
  RiCalendarLine,
  RiArrowRightLine,
  RiSearchLine,
  RiTimeLine,
  RiGroupLine,
  RiSparklingLine,
  RiDeleteBinLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiMoreLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import type { Meeting } from "@/types";
import { Md3LoadingIndicator, Md3Skeleton } from "@/components/Md3Loading";

import DeleteDialog from "@/components/DeleteDialog";
import EditDialog from "@/components/EditDialog";
import MeetingCard from "@/components/MeetingCard";
import AnimatedNumber from "@/components/AnimatedNumber";

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filtered, setFiltered] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Dialogs
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchMeetings("dev_token")
      .then((data) => {
        const list: Meeting[] = Array.isArray(data) ? data : data.meetings || [];
        setMeetings(list);
        setFiltered(list);
      })
      .catch((err) => setError(err.message || "Failed to load meetings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line
    load();
  }, []);

  // Search filter
  useEffect(() => {
    const q = search.toLowerCase();
    // eslint-disable-next-line
    setFiltered(
      q
        ? meetings.filter(
            (m) =>
              (m.title || "").toLowerCase().includes(q) ||
              (m.summary || "").toLowerCase().includes(q)
          )
        : meetings
    );
  }, [search, meetings]);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteMeeting(deleteTarget.id, "dev_token");
      setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    } catch {
      // optimistic UI rollback not needed here — just close dialog
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  };

  // Edit handler
  const handleEdit = async (title: string) => {
    if (!editTarget) return;
    setEditBusy(true);
    try {
      await updateMeeting(editTarget.id, { title }, "dev_token");
      setMeetings((prev) =>
        prev.map((m) => (m.id === editTarget.id ? { ...m, title } : m))
      );
    } catch {
      // ignore — optimistic already applied to title
    } finally {
      setEditBusy(false);
      setEditTarget(null);
    }
  };

  const totalMinutes = meetings.reduce((acc, m) => {
    if (m.start_at && m.end_at) {
      return acc + (new Date(m.end_at).getTime() - new Date(m.start_at).getTime()) / 1000 / 60;
    }
    return acc;
  }, 0);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* ── Hero section ─────────────────────────────────────────────── */}
        <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 md:p-10">
          {/* Gradient blob */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
               style={{ background: "radial-gradient(circle, var(--grad-primary) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
               style={{ background: "radial-gradient(circle, var(--grad-tertiary) 0%, transparent 70%)" }} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-tertiary uppercase tracking-widest">
                <RiSparklingLine className="w-3.5 h-3.5" />
                AI Meeting Intelligence
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text leading-tight">
                Your Meeting
                <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent"> Dashboard</span>
              </h1>
              <p className="text-[14px] text-text-muted max-w-md leading-relaxed">
                Every call summarized, every decision tracked, every action item captured — powered by Gemini.
              </p>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-surface2 border border-border">
                <span className="text-2xl font-bold text-text">
                  <AnimatedNumber value={loading ? 0 : meetings.length} />
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1">Meetings</span>
              </div>
              <div className="flex flex-col items-center justify-center min-w-[6rem] px-4 h-20 rounded-[20px] bg-surface2 border border-border">
                <span className="text-xl font-bold text-text">
                  <AnimatedNumber value={loading ? 0 : totalMinutes} formatFn={formatTime} />
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1">Recorded</span>
              </div>
              <div className="relative flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-primary-container/20 border border-primary/20 overflow-hidden group">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] z-0">
                  <div className="w-full h-full animate-spin-once bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)] opacity-0" />
                </div>
                <div className="absolute inset-[1px] bg-surface-container rounded-[19px] z-10" />
                
                <div className="relative z-20 flex flex-col items-center justify-center">
                  <RiShieldCheckLine className="w-7 h-7 text-primary mb-1.5" />
                  <span className="text-[12px] text-text font-bold">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Meetings list ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-5 mt-2">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[17px] font-bold tracking-tight flex items-center gap-2">
              <RiTimeLine className="w-5 h-5 text-text-muted" />
              Recent Meetings
              {!loading && meetings.length > 0 && (
                <span className="text-[12px] font-semibold text-text-muted bg-surface2 border border-border rounded-full px-2.5 py-0.5 ml-1">
                  {filtered.length}
                </span>
              )}
            </h2>

            {/* Search */}
            <div className="relative">
              <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search meetings…"
                className="h-10 w-56 bg-surface2 border border-border rounded-full pl-9 pr-4 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text spring-sm"
                >
                  <RiCloseLine className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* States */}
          <div className="min-h-[280px]">
            {loading ? (
              <div className="h-72 flex flex-col items-center justify-center gap-5 rounded-[24px] border border-dashed border-border bg-surface-dim">
                <Md3LoadingIndicator size="lg" />
                <p className="text-[13px] text-text-muted font-medium">Loading your meetings…</p>
              </div>
            ) : error ? (
              <div className="h-72 flex flex-col items-center justify-center gap-4 rounded-[24px] border border-risk/30 bg-risk-container/20 text-center p-6">
                <div className="w-14 h-14 rounded-full bg-risk-container flex items-center justify-center">
                  <RiCloseLine className="w-7 h-7 text-risk" />
                </div>
                <p className="text-risk font-semibold text-sm">{error}</p>
                <button
                  onClick={load}
                  className="h-10 px-6 bg-surface2 hover:bg-surface3 border border-border rounded-full text-sm font-semibold spring-colors active:scale-[0.97]"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-surface-dim text-center p-6">
                <div className="w-16 h-16 rounded-[20px] bg-surface2 border border-border flex items-center justify-center mb-1">
                  <RiVideoChatLine className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-[15px] font-bold text-text">
                  {search ? "No matching meetings" : "No meetings yet"}
                </p>
                <p className="text-[12.5px] text-text-muted max-w-xs leading-relaxed">
                  {search
                    ? "Try a different search term."
                    : "Start a Google Meet with the MeetMaxxing extension active to record your first meeting."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {(() => {
                  const today: Meeting[] = [];
                  const yesterday: Meeting[] = [];
                  const older: Record<string, Meeting[]> = {};
                  const order: string[] = [];

                  filtered.forEach(m => {
                    const d = m.start_at ? new Date(m.start_at) : new Date();
                    if (isToday(d)) {
                      today.push(m);
                    } else if (isYesterday(d)) {
                      yesterday.push(m);
                    } else {
                      const dateStr = format(d, "MMMM d, yyyy");
                      if (!older[dateStr]) {
                        older[dateStr] = [];
                        order.push(dateStr);
                      }
                      older[dateStr].push(m);
                    }
                  });

                  let globalIdx = 0;
                  
                  const renderGroup = (title: string, list: Meeting[]) => {
                    if (!list.length) return null;
                    return (
                      <div key={title} className="flex flex-col gap-4">
                        <h3 className="text-[13px] font-bold text-text-muted tracking-wider">{title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {list.map((meeting) => {
                            const currentIdx = globalIdx++;
                            return (
                              <div
                                key={meeting.id}
                                className="animate-slide-up"
                                style={{ animationDelay: `${(currentIdx % 10) * 40}ms` }}
                              >
                                <MeetingCard
                                  meeting={meeting}
                                  index={currentIdx}
                                  onDelete={setDeleteTarget}
                                  onEdit={setEditTarget}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <>
                      {renderGroup("Today", today)}
                      {renderGroup("Yesterday", yesterday)}
                      {order.map(dateStr => renderGroup(dateStr, older[dateStr]))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteDialog
          meeting={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}
      {editTarget && (
        <EditDialog
          meeting={editTarget}
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
          busy={editBusy}
        />
      )}
    </div>
  );
}
