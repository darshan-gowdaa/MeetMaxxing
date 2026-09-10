"use client";

import {
  RiVideoChatLine,
  RiTimeLine,
  RiCloseLine,
  RiSearchLine,
  RiCalendarLine,
  RiSortDesc,
} from "@remixicon/react";
import type { Meeting } from "@/types";

import dynamic from "next/dynamic";
import MeetingCard from "@/components/molecules/MeetingCard";

const DeleteDialog = dynamic(() => import("@/components/organisms/DeleteDialog"), { ssr: false });
const EditDialog = dynamic(() => import("@/components/organisms/EditDialog"), { ssr: false });
import { SelectableGrid } from "@/components/organisms/SelectableGrid";
import DashboardHero from "@/components/organisms/DashboardHero";
import FloatingPillToolbar from "@/components/molecules/FloatingPillToolbar";
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
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        <DashboardHero 
          loading={loading} 
          meetingsCount={meetings.length} 
          totalMinutes={totalMinutes} 
          formatTime={formatTime} 
        />

        <section className="flex flex-col gap-5 mt-2">
          <div className="min-h-[280px]">
            {error ? (
              <div className="h-72 flex flex-col items-center justify-center gap-4 rounded-[32px] border border-risk/30 bg-risk-container/20 text-center p-6">
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
            ) : (
              <div className="flex flex-col gap-8">
                <SelectableGrid<Meeting>
                  storeKey="dashboard"
                  itemTypeName="Meeting"
                  items={filtered}
                  loading={loading}
                  skeletonCount={6}
                  getKey={(m) => m.id}
                  getDate={(m) => (m.start_at && !isNaN(new Date(m.start_at).getTime()) ? new Date(m.start_at) : new Date(0))}
                  groupBy={sortBy === "date" ? undefined : () => ""}
                  onDelete={handleMultiDelete}
                  emptyState={
                    <div className="h-72 flex flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-border bg-surface-dim text-center p-6">
                      <div className="w-16 h-16 rounded-[24px] bg-surface2 border border-border flex items-center justify-center mb-1">
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
                  }
                  renderHeader={({ setManualSelectionMode, activeGroup }) => {
                    // Decide what title and icon to show based on search, sort mode, or active scroll group
                    let title = "Recent Meetings";
                    let HeaderIcon = RiTimeLine;

                    if (search.trim()) {
                      title = "Search Results";
                      HeaderIcon = RiSearchLine;
                    } else if (sortBy === "name") {
                      title = "All Meetings (A–Z)";
                      HeaderIcon = RiSortDesc;
                    } else if (sortBy === "duration") {
                      title = "By Duration";
                      HeaderIcon = RiTimeLine;
                    } else if (activeGroup) {
                      title = activeGroup;
                      HeaderIcon = RiCalendarLine;
                    }

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full">
                        <div className="inline-flex items-center justify-between sm:justify-start gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-surface-container-high/90 backdrop-blur-xl border border-border/70 shadow-sm min-w-0 w-fit">
                          <h2 className="text-[13.5px] sm:text-[15px] font-bold tracking-tight flex items-center gap-2 text-text truncate">
                            <HeaderIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary shrink-0 transition-transform duration-200" />
                            <span className="truncate transition-opacity duration-200">{title}</span>
                          </h2>
                          <span className="text-[11px] sm:text-[12px] font-semibold text-text-muted bg-surface-container-highest border border-border/80 rounded-full px-2.5 py-0.5 shrink-0">
                            {filtered.length}
                          </span>
                        </div>

                        <FloatingPillToolbar
                          search={search}
                          onSearchChange={setSearch}
                          searchPlaceholder="Search meetings…"
                          sortBy={sortBy}
                          onSortChange={setSortBy}
                          sortOptions={[
                            { value: "date", label: "Date" },
                            { value: "name", label: "Name" },
                            { value: "duration", label: "Duration" },
                          ]}
                          onSelectClick={() => setManualSelectionMode(true)}
                        />
                      </div>
                    );
                  }}
                  renderItem={(meeting, selected, selectionMode, onToggle) => (
                    <div 
                      className={`transition-transform duration-300 ${selected ? "opacity-80" : "opacity-100"} ${selectionMode ? "cursor-pointer" : ""}`}
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
      </div>

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
