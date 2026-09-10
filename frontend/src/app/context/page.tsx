"use client";

import {
  RiFolderOpenFill,
  RiFileLine,
  RiErrorWarningFill,
  RiSearchLine,
  RiCalendarLine,
  RiSortDesc,
} from "@remixicon/react";

import DeleteDialog from "@/components/organisms/DeleteDialog";
import EditDialog from "@/components/organisms/EditDialog";
import UploadDialog from "@/components/organisms/UploadDialog";
import ViewContentDialog from "@/components/organisms/ViewContentDialog";
import { SelectableGrid } from "@/components/organisms/SelectableGrid";
import ContextCard from "@/components/organisms/ContextCard";
import ContextHero from "@/components/organisms/ContextHero";
import FloatingPillToolbar from "@/components/molecules/FloatingPillToolbar";
import { useContextManager, type ContextFile } from "./_hooks/useContextManager";

export default function ContextManagerPage() {
  const {
    files,
    filtered,
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
    editError,
    showUpload,
    setShowUpload,
    uploadBusy,
    viewTarget,
    setViewTarget,
    load,
    handleMultiDelete,
    handleDelete,
    handleEdit,
    handleUpload,
    totalSizeKB,
  } = useContextManager();

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
        <ContextHero 
          loading={loading}
          filesCount={files.length}
          totalSizeKB={totalSizeKB}
          setShowUpload={setShowUpload}
        />

        {/* List Section */}
        <section className="flex flex-col gap-5 mt-2">
          <div className="min-h-[280px]">
            {error ? (
              <div className="h-72 flex flex-col items-center justify-center gap-4 rounded-[32px] border border-risk/30 bg-risk-container/20 text-center p-6">
                <div className="w-14 h-14 rounded-full bg-risk-container flex items-center justify-center">
                  <RiErrorWarningFill className="w-7 h-7 text-risk" />
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
                <SelectableGrid<ContextFile>
                  storeKey="context"
                  itemTypeName="File"
                  items={filtered}
                  loading={loading}
                  skeletonCount={6}
                  getKey={(f) => `${f.meeting_id}-${f.filename}`}
                  getDate={(f) => (f.date && !isNaN(new Date(f.date).getTime()) ? new Date(f.date) : new Date(0))}
                  groupBy={sortBy === "date" ? undefined : () => ""}
                  onDelete={handleMultiDelete}
                  emptyState={
                    <div className="h-72 flex flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-border bg-surface-dim text-center p-6">
                      <div className="w-16 h-16 rounded-[24px] bg-surface2 border border-border flex items-center justify-center mb-1">
                        <RiFolderOpenFill className="w-8 h-8 text-text-muted" />
                      </div>
                      <p className="text-[15px] font-bold text-text">
                        {search ? "No matching files" : "No files yet"}
                      </p>
                      <p className="text-[12.5px] text-text-muted max-w-xs leading-relaxed">
                        {search
                          ? "Try a different search term."
                          : "Upload documents or code files to provide context for your meetings."}
                      </p>
                    </div>
                  }
                  renderHeader={({ setManualSelectionMode, activeGroup }) => {
                    // Decide what title and icon to show based on search, sort mode, or active scroll group
                    let title = "All Files";
                    let HeaderIcon = RiFileLine;

                    if (search.trim()) {
                      title = "Search Results";
                      HeaderIcon = RiSearchLine;
                    } else if (sortBy === "name") {
                      title = "All Files (A–Z)";
                      HeaderIcon = RiSortDesc;
                    } else if (sortBy === "size") {
                      title = "Files by Size";
                      HeaderIcon = RiSortDesc;
                    } else if (activeGroup) {
                      title = activeGroup;
                      HeaderIcon = RiCalendarLine;
                    }

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full">
                        <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
                          <h2 className="text-[17px] sm:text-[19px] font-bold tracking-tight flex items-center gap-2 text-text truncate">
                            <HeaderIcon className="w-5 h-5 text-primary shrink-0 transition-transform duration-200" />
                            <span className="truncate transition-opacity duration-200">{title}</span>
                          </h2>
                          <span className="text-[12px] font-semibold text-text-muted bg-surface-container-high border border-border rounded-full px-2.5 py-0.5 shrink-0">
                            {filtered.length}
                          </span>
                        </div>

                        <FloatingPillToolbar
                          search={search}
                          onSearchChange={setSearch}
                          searchPlaceholder="Search files…"
                          sortBy={sortBy}
                          onSortChange={setSortBy}
                          sortOptions={[
                            { value: "date", label: "Date" },
                            { value: "name", label: "Name" },
                            { value: "size", label: "Size" },
                          ]}
                          onSelectClick={() => setManualSelectionMode(true)}
                        />
                      </div>
                    );
                  }}
                  renderItem={(f, selected, selectionMode, onToggle) => (
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
                      <ContextCard
                        file={f}
                        index={filtered.indexOf(f)}
                        onView={setViewTarget}
                        onEdit={setEditTarget}
                        onDelete={setDeleteTarget}
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

      {/* Dialogs */}
      {viewTarget && (
        <ViewContentDialog
          filename={viewTarget.filename}
          meetingId={viewTarget.meeting_id}
          onClose={() => setViewTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          title={deleteTarget.filename}
          itemName="File"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}
      
      {editTarget && (
        <EditDialog
          initialTitle={editTarget.filename.replace(/\.[^/.]+$/, "")}
          itemName="File"
          onSave={handleEdit}
          onCancel={() => { setEditTarget(null); }}
          busy={editBusy}
          error={editError}
        />
      )}

      {showUpload && (
        <UploadDialog
          onUpload={handleUpload}
          onCancel={() => setShowUpload(false)}
          busy={uploadBusy}
        />
      )}
    </div>
  );
}
