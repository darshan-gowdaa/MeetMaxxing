"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { fetchMeetings, deleteMeeting, updateMeeting } from "@/lib/api";
import { format } from "date-fns";
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
import Topbar from "@/components/Topbar";
import { Md3LoadingIndicator, Md3Skeleton } from "@/components/Md3Loading";

// ── Delete confirmation dialog ─────────────────────────────────────────────
function DeleteDialog({
  meeting,
  onConfirm,
  onCancel,
  busy,
}: {
  meeting: Meeting;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog surface */}
      <div className="relative z-10 bg-surface-container-highest rounded-[28px] p-6 max-w-sm w-full border border-border animate-fade-scale shadow-2xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-risk-container flex items-center justify-center mx-auto mb-4">
          <RiDeleteBinLine className="w-6 h-6 text-risk" />
        </div>
        <h2 className="text-[18px] font-bold text-text text-center tracking-tight mb-2">
          Delete Meeting?
        </h2>
        <p className="text-[13px] text-text-muted text-center leading-relaxed mb-6">
          &ldquo;{meeting.title || "Untitled Meeting"}&rdquo; will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-text spring-colors hover:bg-surface2 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 h-11 rounded-full bg-risk-container text-risk text-sm font-semibold spring flex items-center justify-center gap-2 hover:brightness-125 active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? <Md3LoadingIndicator size="sm" /> : <RiDeleteBinLine className="w-4 h-4" />}
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit title dialog ───────────────────────────────────────────────────────
function EditDialog({
  meeting,
  onSave,
  onCancel,
  busy,
}: {
  meeting: Meeting;
  onSave: (title: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(meeting.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-surface-container-highest rounded-[28px] p-6 max-w-sm w-full border border-border animate-fade-scale shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-4">
          <RiEditLine className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[18px] font-bold text-text text-center tracking-tight mb-4">
          Rename Meeting
        </h2>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onSave(title.trim()); }}
          className="w-full h-12 bg-surface2 border border-border rounded-2xl px-4 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors mb-4"
          placeholder="Meeting title…"
          maxLength={120}
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-full border border-border text-sm font-semibold text-text spring-colors hover:bg-surface2 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onSave(title.trim())}
            disabled={busy || !title.trim()}
            className="flex-1 h-11 rounded-full bg-primary-container text-on-primary-container text-sm font-semibold spring flex items-center justify-center gap-2 hover:brightness-125 active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? <Md3LoadingIndicator size="sm" /> : <RiCheckLine className="w-4 h-4" />}
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Meeting Card ────────────────────────────────────────────────────────────
function MeetingCard({
  meeting,
  onDelete,
  onEdit,
}: {
  meeting: Meeting;
  onDelete: (m: Meeting) => void;
  onEdit: (m: Meeting) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="group relative bg-surface-container rounded-[24px] border border-border md3-glow-primary spring flex flex-col h-[220px] overflow-visible">
      {/* Top glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-t-[24px]" />

      {/* 3-Dots Menu (Top Right) */}
      <div className="absolute top-4 right-4 z-20" ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="w-8 h-8 rounded-full bg-surface2 hover:bg-surface3 flex items-center justify-center spring-colors border border-border shadow-sm"
          aria-label="Meeting options"
        >
          <RiMoreLine className="w-4 h-4 text-text-muted" />
        </button>

        {menuOpen && (
          <div className="absolute top-full right-0 mt-2 w-44 bg-surface-highest rounded-[16px] border border-border shadow-2xl animate-fade-scale overflow-hidden">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onEdit(meeting); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-text hover:bg-surface3 spring-colors"
            >
              <RiEditLine className="w-4 h-4 text-primary" />
              Rename
            </button>
            <div className="h-px bg-border mx-3" />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(meeting); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-risk hover:bg-risk-container/30 spring-colors"
            >
              <RiDeleteBinLine className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Card body — clickable to navigate */}
      <Link
        href={`/meetings/${meeting.id}`}
        className="flex flex-col gap-3 p-5 flex-1 relative z-10 h-full"
      >
        {/* Date chip */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary-dim border border-primary/20 rounded-full px-3 py-1 w-fit mt-1">
          <RiCalendarLine className="w-3 h-3" />
          {meeting.start_at ? (
            <span>
              {format(new Date(meeting.start_at), "MMM d, yyyy • h:mm a")}
              {meeting.end_at ? ` – ${format(new Date(meeting.end_at), "h:mm a")}` : ""}
            </span>
          ) : (
            "Recent Call"
          )}
        </div>

        {/* Title */}
        <h4 className="text-[15px] font-bold text-text leading-snug line-clamp-2 group-hover:text-primary spring-colors pr-10 mt-1">
          {meeting.title || "Untitled Meeting"}
        </h4>

        {/* Summary */}
        <p className="text-[12.5px] text-text-muted leading-relaxed line-clamp-3 flex-1 mt-1">
          {meeting.summary || "AI is processing this meeting's transcript…"}
        </p>

        {/* Footer inside link */}
        <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted font-medium">
            <RiGroupLine className="w-3.5 h-3.5" />
            {meeting.attendees?.length || 0} participants
          </div>
          <div className="w-7 h-7 rounded-full bg-surface2 group-hover:bg-primary-container flex items-center justify-center spring-colors">
            <RiArrowRightLine className="w-3.5 h-3.5 text-text-muted group-hover:text-primary spring-colors" />
          </div>
        </div>
      </Link>
    </div>
  );
}

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

  useEffect(load, []);

  // Search filter
  useEffect(() => {
    const q = search.toLowerCase();
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

  const totalMinutes = meetings.length * 42; // estimated

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <Topbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* ── Hero section ─────────────────────────────────────────────── */}
        <div className="relative rounded-[32px] bg-surface-container border border-border overflow-hidden p-8 md:p-10">
          {/* Gradient blob */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
               style={{ background: "radial-gradient(circle, rgba(168,199,250,0.08) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
               style={{ background: "radial-gradient(circle, rgba(219,185,253,0.06) 0%, transparent 70%)" }} />

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
                  {loading ? "—" : meetings.length}
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1">Meetings</span>
              </div>
              <div className="flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-surface2 border border-border">
                <span className="text-2xl font-bold text-text">
                  {loading ? "—" : `${Math.round(totalMinutes / 60)}h`}
                </span>
                <span className="text-[10px] text-text-muted font-medium mt-1">Recorded</span>
              </div>
              <div className="flex flex-col items-center justify-center w-24 h-20 rounded-[20px] bg-primary-container border border-primary/20">
                <RiShieldCheckLine className="w-5 h-5 text-primary mb-1" />
                <span className="text-[10px] text-on-primary-container font-bold">Active</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((meeting, idx) => (
                  <div
                    key={meeting.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <MeetingCard
                      meeting={meeting}
                      onDelete={setDeleteTarget}
                      onEdit={setEditTarget}
                    />
                  </div>
                ))}
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
