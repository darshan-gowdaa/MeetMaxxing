"use client";

import {
  RiFolderOpenFill, RiSearchLine, RiCloseLine,
  RiCheckLine, RiArrowDropDownLine, RiFileLine,
  RiCheckboxCircleFill, RiErrorWarningFill
} from "@remixicon/react";

import DeleteDialog from "@/components/organisms/DeleteDialog";
import EditDialog from "@/components/organisms/EditDialog";
import UploadDialog from "@/components/organisms/UploadDialog";
import ViewContentDialog from "@/components/organisms/ViewContentDialog";
import { SelectableGrid } from "@/components/organisms/SelectableGrid";
import ContextCard from "@/components/organisms/ContextCard";
import ContextHero from "@/components/organisms/ContextHero";
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
    toast,
    load,
    handleMultiDelete,
    handleDelete,
    handleEdit,
    handleUpload,
    totalSizeKB,
  } = useContextManager();

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        
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
                  <RiFolderOpenFill className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-[15px] font-bold text-text">
                  {search ? "No matching files" : "No files uploaded"}
                </p>
                <p className="text-[12.5px] text-text-muted max-w-xs leading-relaxed">
                  {search
                    ? "Try a different search term."
                    : "Upload documents to empower the AI Context Agent with custom knowledge."}
                </p>
                {!search && (
                  <button 
                    onClick={() => setShowUpload(true)}
                    className="mt-4 h-10 px-6 bg-primary-container text-on-primary-container hover:brightness-125 border border-primary/20 rounded-full text-sm font-semibold spring-colors active:opacity-80"
                  >
                    Upload First File
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <SelectableGrid<ContextFile>
                  storeKey="context-manager"
                  itemTypeName="File"
                  items={filtered}
                  loading={loading}
                  skeletonCount={6}
                  getKey={(f) => `${f.meeting_id}-${f.filename}`}
                  getDate={(f) => new Date(f.date)}
                  onDelete={handleMultiDelete}
                  renderHeader={({ setManualSelectionMode }) => (
                    <div className="flex items-center justify-between gap-4 w-full overflow-x-auto hide-scrollbar pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                      <h2 className="text-[17px] font-bold tracking-tight flex items-center gap-2 shrink-0 whitespace-nowrap">
                        <RiFileLine className="w-5 h-5 text-text-muted" />
                        Uploaded Contexts
                        <span className="text-[12px] font-semibold text-text-muted bg-surface2 border border-border rounded-full px-2.5 py-0.5 ml-1">
                          {filtered.length}
                        </span>
                      </h2>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="relative w-[140px]">
                            <select 
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as "date" | "name" | "size")}
                              className="w-full h-9 bg-surface2 border border-border rounded-full pl-4 pr-8 text-[13px] text-text font-medium focus:outline-none focus:border-primary spring-colors cursor-pointer appearance-none"
                            >
                              <option value="date">Sort by Date</option>
                              <option value="name">Sort by Name</option>
                              <option value="size">Sort by Size</option>
                            </select>
                            <RiArrowDropDownLine className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" /> 
                          </div>

                          <button
                            onClick={() => setManualSelectionMode(true)}
                            className="h-9 px-4 rounded-full bg-surface2 hover:bg-surface3 border border-border text-[13px] font-bold text-text transition-colors active:opacity-80 flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <RiCheckLine className="w-4 h-4" />
                            Select
                          </button>
                        </div>

                        <div className="relative w-48 sm:w-56">
                          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search files…"
                            className="h-9 w-full bg-surface2 border border-border rounded-full pl-9 pr-4 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary spring-colors"
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
                  renderItem={(f, selected, selectionMode, onToggle) => (
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
      </main>

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

      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-5 py-3 rounded-full shadow-sm border border-border border text-[13px] font-semibold animate-fade-scale ${
          toast.type === "success"
            ? "bg-success-container border-success/30 text-success"
            : "bg-risk-container border-risk/30 text-risk"
        }`}>
          {toast.type === "success"
            ? <RiCheckboxCircleFill className="w-4 h-4 shrink-0" />
            : <RiErrorWarningFill className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
