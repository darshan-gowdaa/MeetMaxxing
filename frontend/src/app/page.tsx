"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchMeetings, deleteMeeting, updateMeeting } from "@/lib/api";

import {
  RiVideoChatLine,
  RiSearchLine,
  RiTimeLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowDropDownLine,
} from "@remixicon/react";
import type { Meeting } from "@/types";


import DeleteDialog from "@/components/organisms/DeleteDialog";
import EditDialog from "@/components/organisms/EditDialog";
import MeetingCard from "@/components/molecules/MeetingCard";
import { SelectableGrid } from "@/components/organisms/SelectableGrid";
import DashboardHero from "@/components/organisms/DashboardHero";


// omg this is the dashboard component i think
export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name" | "duration">("date");

  // i need these for the popups lol
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
      })
      .catch((err) => setError(err.message || "Failed to load meetings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line
    load();
  }, []);

  // this filters and sorts the stuff. pls dont break this
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return meetings
      .filter((m) => !q || m.title?.toLowerCase().includes(q) || m.summary?.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "duration") {
          const dA = a.end_at && a.start_at ? new Date(a.end_at).getTime() - new Date(a.start_at).getTime() : 0;
          const dB = b.end_at && b.start_at ? new Date(b.end_at).getTime() - new Date(b.start_at).getTime() : 0;
          return dB - dA;
        }
        return new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime();
      });
  }, [search, sortBy, meetings]);

  // this deletes multiple things at once!! very dangerous
  const handleMultiDelete = async (selectedMeetings: Meeting[]) => {
    try {
      await Promise.all(selectedMeetings.map(m => deleteMeeting(m.id, "dev_token")));
      setMeetings(prev => prev.filter(m => !selectedMeetings.some(s => s.id === m.id)));
    } catch (e) {
      console.error(e);
    }
  };

  // this deletes just one thing. i hope it works
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

  // edit handler from tutorial
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

  const totalMinutes = meetings.reduce((acc, m) => 
    acc + (m.start_at && m.end_at ? (new Date(m.end_at).getTime() - new Date(m.start_at).getTime()) / 60000 : 0)
  , 0);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* hero section i made it look cool */}
        <DashboardHero 
          loading={loading} 
          meetingsCount={meetings.length} 
          totalMinutes={totalMinutes} 
          formatTime={formatTime} 
        />

        {/* list of all meetings here */}
        <section className="flex flex-col gap-5 mt-2">
          <div className="min-h-[280px]">
            {error ? (
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
            ) : !loading && filtered.length === 0 ? (
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
                <SelectableGrid<Meeting>
                  storeKey="dashboard"
                  itemTypeName="Meeting"
                  items={filtered}
                  loading={loading}
                  skeletonCount={6}
                  getKey={(m) => m.id}
                  getDate={(m) => (m.start_at ? new Date(m.start_at) : new Date())}
                  onDelete={handleMultiDelete}
                  renderHeader={({ setManualSelectionMode, activeGroup }) => (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                      <h2 className="text-[17px] font-bold tracking-tight flex items-center gap-2">
                        <RiTimeLine className="w-5 h-5 text-text-muted" />
                        {activeGroup || "Recent Meetings"}
                        <span className="text-[12px] font-semibold text-text-muted bg-surface2 border border-border rounded-full px-2.5 py-0.5 ml-1">
                          {filtered.length}
                        </span>
                      </h2>

                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center">
                          <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as "date" | "name" | "duration")}
                            className="w-[140px] h-9 bg-surface2 border border-border rounded-full pl-4 pr-8 text-[13px] text-text font-medium focus:outline-none focus:border-primary spring-colors cursor-pointer appearance-none"
                          >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="duration">Sort by Duration</option>
                          </select>
                          <RiArrowDropDownLine className="absolute right-2.5 w-8 h-8 text-text-muted pointer-events-none" />
                        </div>

                        <button
                          onClick={() => setManualSelectionMode(true)}
                          className="h-9 px-4 rounded-full bg-surface2 hover:bg-surface3 border border-border text-[13px] font-bold text-text transition-colors active:scale-95 flex items-center gap-2"
                        >
                          <RiCheckLine className="w-4 h-4" />
                          Select
                        </button>

                        <div className="relative">
                          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search meetings…"
                            className="h-9 w-56 bg-surface2 border border-border rounded-full pl-9 pr-4 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors"
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
                    </div>
                  )}
                  renderItem={(meeting, selected, selectionMode, onToggle) => (
                    <div 
                      className={`transition-transform duration-300 ${selected ? "scale-95 opacity-80" : "scale-100 opacity-100"}`}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggle();
                        }
                      }}
                    >
                      <MeetingCard
                        meeting={meeting}
                        index={filtered.indexOf(meeting)}
                        onDelete={setDeleteTarget}
                        onEdit={setEditTarget}
                        onSelect={() => onToggle()}
                      />
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* all my dialogs go here at the bottom */}
      {deleteTarget && (
        <DeleteDialog
          title={deleteTarget.title || ""}
          itemName="Meeting"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}
      {editTarget && (
        <EditDialog
          initialTitle={editTarget.title || ""}
          itemName="Meeting"
          onSave={handleEdit}
          onCancel={() => setEditTarget(null)}
          busy={editBusy}
        />
      )}
    </div>
  );
}

