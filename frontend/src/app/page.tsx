"use client";

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
import { useDashboardManager } from "./_hooks/useDashboardManager";

export default function Dashboard() {
  const {
    meetings,
    loading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    deleteTarget,
    setDeleteTarget,
    deleteBusy,
    editTarget,
    setEditTarget,
    editBusy,
    filtered,
    load,
    handleMultiDelete,
    handleDelete,
    handleEdit,
    totalMinutes,
    formatTime,
  } = useDashboardManager();

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        <DashboardHero 
          loading={loading} 
          meetingsCount={meetings.length} 
          totalMinutes={totalMinutes} 
          formatTime={formatTime} 
        />

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
                  className="h-10 px-6 bg-surface2 hover:bg-surface3 border border-border rounded-full text-sm font-semibold spring-colors active:opacity-80"
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

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="relative flex-1 sm:flex-none sm:w-[140px]">
                            <select 
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as "date" | "name" | "duration")}
                              className="w-full h-9 bg-surface2 border border-border rounded-full pl-4 pr-8 text-[13px] text-text font-medium focus:outline-none focus:border-primary spring-colors cursor-pointer appearance-none"
                            >
                              <option value="date">Sort by Date</option>
                              <option value="name">Sort by Name</option>
                              <option value="duration">Sort by Duration</option>
                            </select>
                            <RiArrowDropDownLine className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                          </div>

                          <button
                            onClick={() => setManualSelectionMode(true)}
                            className="flex-1 sm:flex-none h-9 px-4 rounded-full bg-surface2 hover:bg-surface3 border border-border text-[13px] font-bold text-text transition-colors active:opacity-80 flex items-center justify-center gap-2"
                          >
                            <RiCheckLine className="w-4 h-4" />
                            Select
                          </button>
                        </div>

                        <div className="relative w-full sm:w-auto">
                          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search meetings…"
                            className="h-9 w-full sm:w-56 bg-surface2 border border-border rounded-full pl-9 pr-4 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors"
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
                      className={`transition-transform duration-300 ${selected ? "opacity-80" : "opacity-100"}`}
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
